import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeContractJson } from "./analyzer.js";
import type { Severity, JsonReport } from "./analyzer.js";
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

interface CliArgs {
  paths: string[];
  format: OutputFormat;
  failOn: Severity;
}

function getApiKey(): string {
  const key = process.env["ANTHROPIC_API_KEY"];
  if (!key) {
    console.error(
      "Error: ANTHROPIC_API_KEY not set. Export it or add to .env",
    );
    process.exit(1);
  }
  return key;
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

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  let format: OutputFormat = "text";
  if (args.includes("--json")) format = "json";
  if (args.includes("--sarif")) format = "sarif";

  let failOn: Severity = "high";
  const failOnIdx = args.indexOf("--fail-on");
  if (failOnIdx !== -1) {
    const value = args[failOnIdx + 1];
    if (!value || !VALID_SEVERITIES.has(value)) {
      console.error(
        "Error: --fail-on requires a severity: critical, high, medium, low, info",
      );
      process.exit(1);
    }
    failOn = value as Severity;
  }

  const positional = args.filter(
    (a, i) =>
      !a.startsWith("--") && i !== failOnIdx + 1,
  );

  if (positional.length === 0) {
    console.error(
      "Usage: spectr-ai [--json|--sarif] [--fail-on <severity>] <contract.sol|directory>",
    );
    console.error("Examples:");
    console.error("  spectr-ai contracts/Token.sol");
    console.error("  spectr-ai --json contracts/");
    console.error("  spectr-ai --sarif contracts/Token.sol");
    console.error(
      "  spectr-ai --fail-on medium contracts/Token.sol",
    );
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

  return { paths, format, failOn };
}

function handleApiError(error: unknown): never {
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
  } else {
    console.error(
      `Error: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
  process.exit(1);
}

async function analyzeAll(
  paths: string[],
  apiKey: string,
): Promise<Array<{ file: string; report: JsonReport }>> {
  const reports: Array<{ file: string; report: JsonReport }> = [];

  for (const filePath of paths) {
    console.error(`  spectr-ai — analyzing ${filePath}...`);
    try {
      const source = readContract(filePath);
      const result = await analyzeContractJson(source, apiKey);
      reports.push({ file: filePath, report: result.report });
      console.error(
        `  Tokens: ${result.inputTokens} in / ${result.outputTokens} out`,
      );
    } catch (error) {
      handleApiError(error);
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

  // CLI flags override config file
  const format = cliArgs.format === "text" && config.format !== "text"
    ? config.format
    : cliArgs.format;
  const failOn = cliArgs.failOn === "high" && config.failOn !== "high"
    ? config.failOn
    : cliArgs.failOn;

  // Filter excluded files
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

  const apiKey = getApiKey();

  for (const filePath of paths) {
    const source = readContract(filePath);
    const validation = validateSolidityFile(filePath, source);
    if (!validation.valid) {
      console.error(`Error: ${validation.error}`);
      process.exit(1);
    }
  }

  console.error("");
  const reports = await analyzeAll(paths, apiKey);

  // Filter ignored issues
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
