"use server";

import { nanoid } from "nanoid";
import { db } from "./db";
import { audits } from "./schema";
import { eq, desc } from "drizzle-orm";
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

export async function analyzeAction(
  fileName: string,
  source: string,
): Promise<{ id?: string; error?: string }> {
  const validation = validateContractFile(fileName, source);
  if (!validation.valid) {
    return { error: validation.error ?? "Invalid file" };
  }

  const language: ContractLanguage = validation.language ?? "solidity";

  try {
    const provider = getProvider();
    const result = await analyzeContractJson(source, provider, language);

    const id = nanoid(12);
    await db.insert(audits).values({
      id,
      fileName,
      language,
      source,
      report: JSON.stringify(result.report),
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      createdAt: new Date().toISOString(),
    });

    return { id };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Analysis failed";
    return { error: msg };
  }
}

export async function getAudit(id: string) {
  const rows = await db
    .select()
    .from(audits)
    .where(eq(audits.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAuditHistory(limit = 20) {
  return db
    .select({
      id: audits.id,
      fileName: audits.fileName,
      language: audits.language,
      model: audits.model,
      createdAt: audits.createdAt,
    })
    .from(audits)
    .orderBy(desc(audits.createdAt))
    .limit(limit);
}
