import { JSON_SYSTEM_PROMPT } from "./prompts.js";
import { parseReport } from "./schema.js";
import type { Provider } from "./provider.js";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Issue {
  severity: Severity;
  title: string;
  location: string;
  description: string;
  recommendation: string;
  codefix?: string;
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

export async function analyzeContractJson(
  source: string,
  provider: Provider,
): Promise<JsonAnalysisResult> {
  const result = await provider.complete(
    JSON_SYSTEM_PROMPT,
    buildUserMessage(source),
  );

  const validated = parseReport(result.text);
  const report: JsonReport = {
    ...validated,
    issues: validated.issues.map((i) => ({
      severity: i.severity,
      title: i.title,
      location: i.location,
      description: i.description,
      recommendation: i.recommendation,
      ...(i.codefix !== undefined ? { codefix: i.codefix } : {}),
    })),
  };

  return {
    report,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}
