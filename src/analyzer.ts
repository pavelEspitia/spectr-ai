import { getJsonSystemPrompt } from "./prompts.js";
import { parseReport } from "./schema.js";
import type { Provider } from "./provider.js";
import type { ContractLanguage } from "./validator.js";

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

function buildUserMessage(
  source: string,
  language: ContractLanguage,
): string {
  const lang = language === "vyper" ? "vyper" : "solidity";
  return `Analyze the following ${lang} smart contract for security vulnerabilities, gas optimizations, and best practice violations:\n\n\`\`\`${lang}\n${source}\n\`\`\``;
}

export async function analyzeContractJson(
  source: string,
  provider: Provider,
  language: ContractLanguage = "solidity",
): Promise<JsonAnalysisResult> {
  const systemPrompt = getJsonSystemPrompt(language);
  const result = await provider.complete(
    systemPrompt,
    buildUserMessage(source, language),
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
