import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, JSON_SYSTEM_PROMPT } from "./prompts.js";

export interface AnalysisResult {
  report: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Issue {
  severity: Severity;
  title: string;
  location: string;
  description: string;
  recommendation: string;
}

export interface JsonReport {
  issues: Issue[];
  summary: {
    riskRating: Severity;
    counts: Record<Severity, number>;
    topFixes: string[];
  };
}

export interface JsonAnalysisResult {
  report: JsonReport;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

function buildUserMessage(source: string): string {
  return `Analyze the following Solidity smart contract for security vulnerabilities, gas optimizations, and best practice violations:\n\n\`\`\`solidity\n${source}\n\`\`\``;
}

export async function analyzeContract(
  source: string,
  apiKey: string,
): Promise<AnalysisResult> {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(source) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response received from Claude");
  }

  return {
    report: textBlock.text,
    model: message.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}

export async function analyzeContractJson(
  source: string,
  apiKey: string,
): Promise<JsonAnalysisResult> {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: JSON_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(source) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response received from Claude");
  }

  const json = textBlock.text.replace(/^```json\n?|\n?```$/g, "").trim();
  const parsed = JSON.parse(json) as JsonReport;

  return {
    report: parsed,
    model: message.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
