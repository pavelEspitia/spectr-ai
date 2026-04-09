import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeContractJson } from "./analyzer.js";
import type { Severity, JsonReport } from "./analyzer.js";
import {
  parseModelFlag,
  createProvider,
  OllamaConnectionError,
  OllamaModelNotFoundError,
} from "./provider.js";
import type { Provider, ModelConfig } from "./provider.js";
import { validateSolidityFile } from "./validator.js";
import { findSolidityFiles } from "./files.js";
import { toSarif } from "./sarif.js";
import { formatReport } from "./formatter.js";
import { loadConfig, shouldExcludeFile } from "./config.js";

type OutputFormat = "text" | "json" | "sarif";

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const VALID_SEVERITIES = new Set<string>(Object.keys(SEVERITY_RANK));

const DEFAULT_MODEL = "claude-sonnet-4-6";

interface CliArgs {
  paths: string[];
  format: OutputFormat;
  failOn: Severity;
  modelConfig: ModelConfig;
}

function readContract(filePath: string): string {
  const resolved = resolve(filePath);
  try {
    return readFileSync(resolved, "utf-8");
  } catch {
    console.error(`Error: cannot read file "${resolved}"`);
    process.exit(1);
  }
}

function getValueArg(
  args: string[],
  flag: string,
): { value: string | undefined; index: number } {
  const idx = args.indexOf(flag);
  if (idx === -1) return { value: undefined, index: -1 };
  return { value: args[idx + 1], index: idx };
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);

  let format: OutputFormat = "text";
  if (args.includes("--json")) format = "json";
  if (args.includes("--sarif")) format = "sarif";

  let failOn: Severity = "high";
  const failOnArg = getValueArg(args, "--fail-on");
  if (failOnArg.index !== -1) {
    if (!failOnArg.value || !VALID_SEVERITIES.has(failOnArg.value)) {
      console.error(
        "Error: --fail-on requires: critical, high, medium, low, info",
      );
      process.exit(1);
    }
    failOn = failOnArg.value as Severity;
  }

  let modelConfig: ModelConfig = { provider: "anthropic", model: DEFAULT_MODEL };
  const modelArg = getValueArg(args, "--model");
  if (modelArg.index !== -1) {
    if (!modelArg.value) {
      console.error(
        "Error: --model requires a value (e.g. claude-sonnet-4-6, ollama:deepseek-coder-v2)",
      );
      process.exit(1);
    }
    modelConfig = parseModelFlag(modelArg.value);
  }

  const valueArgIndices = new Set<number>();
  if (failOnArg.index !== -1) valueArgIndices.add(failOnArg.index + 1);
  if (modelArg.index !== -1) valueArgIndices.add(modelArg.index + 1);

  const positional = args.filter(
    (a, i) => !a.startsWith("--") && !valueArgIndices.has(i),
  );

  if (positional.length === 0) {
    console.error(
      "Usage: spectr-ai [options] <contract.sol|directory>",
    );
    console.error("");
    console.error("Options:");
    console.error("  --json                    JSON output");
    console.error("  --sarif                   SARIF output");
    console.error(
      "  --fail-on <severity>      Exit 2 threshold (default: high)",
    );
    console.error(
      "  --model <model>           Model to use (default: claude-sonnet-4-6)",
    );
    console.error("");
    console.error("Models:");
    console.error("  claude-sonnet-4-6         Anthropic Sonnet (default)");
    console.error("  claude-haiku-4-5-20251001 Anthropic Haiku (faster, cheaper)");
    console.error(
      "  ollama:<name>             Local model via Ollama",
    );
    console.error("");
    console.error("Examples:");
    console.error("  spectr-ai contracts/Token.sol");
    console.error("  spectr-ai --model ollama:deepseek-coder-v2 contracts/");
    console.error("  spectr-ai --json --fail-on medium contracts/");
    process.exit(1);
  }

  const paths: string[] = [];
  for (const p of positional) {
    const resolved = resolve(p);
    try {
      const stat = statSync(resolved);
      if (stat.isDirectory()) {
        const solFiles = findSolidityFiles(resolved);
        if (solFiles.length === 0) {
          console.error(
            `Error: no .sol files found in "${resolved}"`,
          );
          process.exit(1);
        }
        for (const f of solFiles) {
          paths.push(f);
        }
      } else {
        paths.push(resolved);
      }
    } catch {
      console.error(`Error: path not found "${resolved}"`);
      process.exit(1);
    }
  }

  return { paths, format, failOn, modelConfig };
}

function handleError(error: unknown): never {
  if (error instanceof Anthropic.BadRequestError) {
    console.error(
      "Error: API request failed. Check your credit balance at https://console.anthropic.com",
    );
  } else if (error instanceof Anthropic.AuthenticationError) {
    console.error(
      "Error: invalid API key. Check your ANTHROPIC_API_KEY.",
    );
  } else if (error instanceof Anthropic.RateLimitError) {
    console.error("Error: rate limited. Wait a moment and try again.");
  } else if (error instanceof OllamaConnectionError) {
    console.error(`Error: ${error.message}`);
    console.error(
      "Is Ollama running? Start with: ollama serve",
    );
  } else if (error instanceof OllamaModelNotFoundError) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error(
      `Error: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
  process.exit(1);
}

async function analyzeAll(
  paths: string[],
  provider: Provider,
): Promise<Array<{ file: string; report: JsonReport }>> {
  const reports: Array<{ file: string; report: JsonReport }> = [];

  for (const filePath of paths) {
    console.error(`  spectr-ai — analyzing ${filePath}...`);
    try {
      const source = readContract(filePath);
      const result = await analyzeContractJson(source, provider);
      reports.push({ file: filePath, report: result.report });
      console.error(
        `  Tokens: ${result.inputTokens} in / ${result.outputTokens} out`,
      );
    } catch (error) {
      handleError(error);
    }
  }

  return reports;
}

function exceedsThreshold(
  reports: Array<{ report: JsonReport }>,
  failOn: Severity,
): boolean {
  const threshold = SEVERITY_RANK[failOn];
  return reports.some((r) =>
    r.report.issues.some(
      (i) => SEVERITY_RANK[i.severity] <= threshold,
    ),
  );
}

async function main(): Promise<void> {
  const config = loadConfig(process.cwd());
  const cliArgs = parseArgs(process.argv);

  const format = cliArgs.format === "text" && config.format !== "text"
    ? config.format
    : cliArgs.format;
  const failOn = cliArgs.failOn === "high" && config.failOn !== "high"
    ? config.failOn
    : cliArgs.failOn;

  // Config model is used as fallback when no --model flag is passed
  let modelConfig = cliArgs.modelConfig;
  if (
    modelConfig.model === DEFAULT_MODEL &&
    config.model
  ) {
    modelConfig = parseModelFlag(config.model);
  }

  const paths = cliArgs.paths.filter((p) => {
    if (shouldExcludeFile(p, config.exclude)) {
      console.error(`  skipping excluded file: ${p}`);
      return false;
    }
    return true;
  });

  if (paths.length === 0) {
    console.error("Error: no files to analyze after applying excludes");
    process.exit(1);
  }

  // Only require API key for Anthropic models
  const apiKey = modelConfig.provider === "anthropic"
    ? process.env["ANTHROPIC_API_KEY"]
    : undefined;

  if (modelConfig.provider === "anthropic" && !apiKey) {
    console.error(
      "Error: ANTHROPIC_API_KEY not set. Export it or use --model ollama:<model>",
    );
    process.exit(1);
  }

  const provider = createProvider(modelConfig, apiKey);

  const modelLabel = modelConfig.provider === "ollama"
    ? `ollama:${modelConfig.model}`
    : modelConfig.model;
  console.error(`  model: ${modelLabel}`);

  for (const filePath of paths) {
    const source = readContract(filePath);
    const validation = validateSolidityFile(filePath, source);
    if (!validation.valid) {
      console.error(`Error: ${validation.error}`);
      process.exit(1);
    }
  }

  console.error("");
  const reports = await analyzeAll(paths, provider);

  if (config.ignore.length > 0) {
    for (const entry of reports) {
      entry.report.issues = entry.report.issues.filter((issue) => {
        const text =
          `${issue.title} ${issue.description}`.toLowerCase();
        return !config.ignore.some((pattern) =>
          text.includes(pattern.toLowerCase()),
        );
      });
    }
  }

  const exitCode = exceedsThreshold(reports, failOn) ? 2 : 0;

  switch (format) {
    case "json": {
      const output =
        reports.length === 1 ? reports[0]?.report : reports;
      console.log(JSON.stringify(output, null, 2));
      break;
    }
    case "sarif": {
      const sarifLog = toSarif(reports, "0.1.0");
      console.log(JSON.stringify(sarifLog, null, 2));
      break;
    }
    case "text": {
      for (const { file, report } of reports) {
        console.log(
          formatReport(report, reports.length > 1 ? file : undefined),
        );
      }
      console.log("");
      break;
    }
  }

  process.exit(exitCode);
}

main();
