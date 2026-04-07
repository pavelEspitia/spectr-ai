import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  analyzeContract,
  analyzeContractJson,
} from "./analyzer.js";
import type { Severity, JsonReport } from "./analyzer.js";
import { validateSolidityFile } from "./validator.js";
import { findSolidityFiles } from "./files.js";
import { toSarif } from "./sarif.js";

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

interface CliArgs {
  paths: string[];
  json: boolean;
  sarif: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const sarif = args.includes("--sarif");
  const positional = args.filter((a) => !a.startsWith("--"));

  if (positional.length === 0) {
    console.error(
      "Usage: spectr-ai [--json|--sarif] <contract.sol|directory> [...]",
    );
    console.error("Examples:");
    console.error("  spectr-ai contracts/Token.sol");
    console.error("  spectr-ai --json contracts/");
    console.error("  spectr-ai --sarif contracts/Token.sol");
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
          console.error(`Error: no .sol files found in "${resolved}"`);
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

  return { paths, json, sarif };
}

const HIGH_SEVERITY: Set<Severity> = new Set(["critical", "high"]);

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

async function main(): Promise<void> {
  const { paths, json, sarif } = parseArgs(process.argv);
  const apiKey = getApiKey();

  for (const filePath of paths) {
    const source = readContract(filePath);
    const validation = validateSolidityFile(filePath, source);
    if (!validation.valid) {
      console.error(`Error: ${validation.error}`);
      process.exit(1);
    }
  }

  if (json) {
    const reports: Array<{ file: string; report: JsonReport }> = [];
    let hasHighSeverity = false;

    for (const filePath of paths) {
      console.error(`  spectr-ai — analyzing ${filePath}...`);
      try {
        const source = readContract(filePath);
        const result = await analyzeContractJson(source, apiKey);
        reports.push({ file: filePath, report: result.report });
        console.error(
          `  Tokens: ${result.inputTokens} in / ${result.outputTokens} out`,
        );
        if (
          result.report.issues.some((i) => HIGH_SEVERITY.has(i.severity))
        ) {
          hasHighSeverity = true;
        }
      } catch (error) {
        handleApiError(error);
      }
    }

    if (reports.length === 1) {
      console.log(JSON.stringify(reports[0]?.report, null, 2));
    } else {
      console.log(JSON.stringify(reports, null, 2));
    }
    process.exit(hasHighSeverity ? 2 : 0);
  }

  if (sarif) {
    const reports: Array<{ file: string; report: JsonReport }> = [];
    let hasHighSeverity = false;

    for (const filePath of paths) {
      console.error(`  spectr-ai — analyzing ${filePath}...`);
      try {
        const source = readContract(filePath);
        const result = await analyzeContractJson(source, apiKey);
        reports.push({ file: filePath, report: result.report });
        if (
          result.report.issues.some((i) => HIGH_SEVERITY.has(i.severity))
        ) {
          hasHighSeverity = true;
        }
      } catch (error) {
        handleApiError(error);
      }
    }

    const sarifLog = toSarif(reports, "0.1.0");
    console.log(JSON.stringify(sarifLog, null, 2));
    process.exit(hasHighSeverity ? 2 : 0);
  }

  // Text output
  for (const filePath of paths) {
    console.error(`\n  spectr-ai — analyzing ${filePath}...\n`);
    try {
      const source = readContract(filePath);
      const result = await analyzeContract(source, apiKey);

      if (paths.length > 1) {
        console.log(`\n${"=".repeat(60)}`);
        console.log(`File: ${filePath}`);
        console.log(`${"=".repeat(60)}\n`);
      }

      console.log(result.report);
      console.log("\n---");
      console.log(
        `Model: ${result.model} | Tokens: ${result.inputTokens} in / ${result.outputTokens} out`,
      );
    } catch (error) {
      handleApiError(error);
    }
  }
}

main();
