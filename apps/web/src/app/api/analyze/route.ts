import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { audits } from "@/lib/schema";
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
  return { provider: createProvider(config, apiKey), modelStr };
}

function sseMessage(
  step: string,
  percent: number,
  status: "progress" | "done" | "error" = "progress",
  data?: Record<string, unknown>,
): string {
  const payload = JSON.stringify({ step, percent, status, ...data });
  return `data: ${payload}\n\n`;
}

export async function POST(request: Request) {
  let body: { fileName?: string; source?: string };
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

  const { fileName, source } = body;

  // Check Accept header — if SSE requested, stream progress
  const wantsStream = request.headers
    .get("accept")
    ?.includes("text/event-stream");

  if (!wantsStream) {
    // Non-streaming fallback for tests and simple clients
    const { analyzeAction } = await import("@/lib/actions");
    const result = await analyzeAction(fileName, source);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json({ id: result.id });
  }

  // Streaming SSE response
  const stream = new ReadableStream({
    async start(controller) {
      const send = (step: string, pct: number, status?: "progress" | "done" | "error", data?: Record<string, unknown>) => {
        controller.enqueue(
          new TextEncoder().encode(sseMessage(step, pct, status, data)),
        );
      };

      try {
        // Step 1: Validate
        send("Validating file...", 10);
        const validation = validateContractFile(fileName, source);
        if (!validation.valid) {
          send(validation.error ?? "Invalid file", 10, "error");
          controller.close();
          return;
        }
        const language: ContractLanguage =
          validation.language ?? "solidity";

        // Step 2: Connect to model
        send("Connecting to model...", 20);
        const { provider, modelStr } = getProvider();

        // Step 3: Analyze
        send("Analyzing vulnerabilities...", 40);
        const result = await analyzeContractJson(
          source,
          provider,
          language,
        );

        // Step 4: Parse
        send("Parsing results...", 80);

        // Step 5: Save
        send("Saving report...", 90);
        const id = nanoid(12);
        await db.insert(audits).values({
          id,
          fileName,
          language,
          source,
          report: JSON.stringify(result.report),
          model: result.model || modelStr,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          createdAt: new Date().toISOString(),
        });

        // Done
        send("Complete", 100, "done", { id });
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Analysis failed";
        send(msg, 0, "error");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
