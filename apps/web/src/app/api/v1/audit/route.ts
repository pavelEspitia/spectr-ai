import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { audits } from "@/lib/schema";
import { authenticateApiKey, incrementUsage } from "@/lib/api-auth";
import { analyzeContractJson } from "@spectr-ai/engine";
import {
  createProvider,
  parseModelFlag,
} from "@spectr-ai/engine/provider";
import { validateContractFile } from "@spectr-ai/engine/validator";
import type { ContractLanguage } from "@spectr-ai/engine/validator";

function getProvider() {
  const modelStr =
    process.env["SPECTR_MODEL"] ?? "ollama:qwen2.5-coder:1.5b";
  const config = parseModelFlag(modelStr);
  const apiKey =
    config.provider === "anthropic"
      ? process.env["ANTHROPIC_API_KEY"]
      : undefined;
  return createProvider(config, apiKey);
}

export async function POST(request: Request) {
  // Authenticate
  const auth = await authenticateApiKey(request);
  if (!auth.valid || !auth.apiKey) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401 },
    );
  }

  // Parse body
  let body: { fileName?: string; source?: string; format?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.fileName || !body.source) {
    return NextResponse.json(
      { error: "fileName and source are required" },
      { status: 400 },
    );
  }

  if (body.source.length > 100_000) {
    return NextResponse.json(
      { error: "File too large (max 100KB)" },
      { status: 400 },
    );
  }

  // Validate
  const validation = validateContractFile(body.fileName, body.source);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 422 },
    );
  }

  const language: ContractLanguage = validation.language ?? "solidity";

  // Check format permissions
  const format = body.format ?? "json";
  if (
    (format === "sarif" || format === "html") &&
    auth.apiKey.plan === "free"
  ) {
    return NextResponse.json(
      { error: `${format} output requires Pro plan or higher` },
      { status: 403 },
    );
  }

  try {
    const provider = getProvider();
    const result = await analyzeContractJson(
      body.source,
      provider,
      language,
    );

    // Save audit
    const id = nanoid(12);
    await db.insert(audits).values({
      id,
      apiKeyId: auth.apiKey.id,
      fileName: body.fileName,
      language,
      source: body.source,
      report: JSON.stringify(result.report),
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      createdAt: new Date().toISOString(),
    });

    // Increment usage
    await incrementUsage(auth.apiKey.id);

    // Return based on format
    const response: Record<string, unknown> = {
      id,
      fileName: body.fileName,
      language,
      model: result.model,
      report: result.report,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
