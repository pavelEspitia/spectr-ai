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
import {
  ChainFetchError,
  fetchContractSource,
  isContractAddress,
  SUPPORTED_CHAINS,
} from "@spectr-ai/engine/chain";

const MAX_SOURCE_BYTES = 200_000;

interface ResolvedContract {
  fileName: string;
  source: string;
  language: ContractLanguage;
}

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
  let body: {
    fileName?: string;
    source?: string;
    address?: string;
    chain?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const auditByAddress = Boolean(body.address);

  if (auditByAddress) {
    if (!isContractAddress(body.address ?? "")) {
      return NextResponse.json(
        { error: "Invalid contract address" },
        { status: 400 },
      );
    }
    if (body.chain && !(body.chain in SUPPORTED_CHAINS)) {
      return NextResponse.json(
        { error: "Unsupported chain" },
        { status: 400 },
      );
    }
  } else {
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
  }

  const address = body.address ?? "";
  const chain = body.chain ?? "ethereum";

  // Check Accept header — if SSE requested, stream progress
  const wantsStream = request.headers
    .get("accept")
    ?.includes("text/event-stream");

  if (!wantsStream) {
    // Non-streaming fallback for tests and simple clients
    let fileName = body.fileName ?? "";
    let source = body.source ?? "";
    if (auditByAddress) {
      try {
        const fetched = await fetchContractSource(address, chain);
        fileName = `${fetched.name}.${fetched.language === "vyper" ? "vy" : "sol"}`;
        source = fetched.source;
      } catch (error) {
        const message =
          error instanceof ChainFetchError ? error.message : "Fetch failed";
        return NextResponse.json({ error: message }, { status: 422 });
      }
    }
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
        // Step 1: Resolve the contract source — from the chain or the upload.
        let contract: ResolvedContract;
        if (auditByAddress) {
          send(`Fetching ${address} from chain...`, 10);
          const fetched = await fetchContractSource(address, chain);
          if (fetched.source.length > MAX_SOURCE_BYTES) {
            send("Contract source too large to audit", 10, "error");
            controller.close();
            return;
          }
          contract = {
            fileName: `${fetched.name}.${fetched.language === "vyper" ? "vy" : "sol"}`,
            source: fetched.source,
            language: fetched.language,
          };
          send(`Loaded ${fetched.name} from ${fetched.chain}`, 15);
        } else {
          send("Validating file...", 10);
          const fileName = body.fileName ?? "";
          const source = body.source ?? "";
          const validation = validateContractFile(fileName, source);
          if (!validation.valid) {
            send(validation.error ?? "Invalid file", 10, "error");
            controller.close();
            return;
          }
          contract = {
            fileName,
            source,
            language: validation.language ?? "solidity",
          };
        }

        const { fileName, source, language } = contract;

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
        console.error("[analyze] stream failure:", error);
        const message =
          error instanceof ChainFetchError
            ? error.message
            : "Analysis failed. Please try again in a moment.";
        send(message, 0, "error");
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
