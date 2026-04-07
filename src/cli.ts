import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeContract } from "./analyzer.js";

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

async function main(): Promise<void> {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("Usage: spectr-ai <contract.sol>");
    console.error("Example: spectr-ai contracts/Token.sol");
    process.exit(1);
  }

  const source = readContract(filePath);
  const apiKey = getApiKey();

  console.log(`\n  spectr-ai — analyzing ${filePath}...\n`);

  try {
    const result = await analyzeContract(source, apiKey);

    console.log(result.report);
    console.log("\n---");
    console.log(
      `Model: ${result.model} | Tokens: ${result.inputTokens} in / ${result.outputTokens} out`,
    );
  } catch (error) {
    if (error instanceof Anthropic.BadRequestError) {
      console.error(
        "Error: API request failed. Check your credit balance at https://console.anthropic.com",
      );
    } else if (error instanceof Anthropic.AuthenticationError) {
      console.error("Error: invalid API key. Check your ANTHROPIC_API_KEY.");
    } else if (error instanceof Anthropic.RateLimitError) {
      console.error("Error: rate limited. Wait a moment and try again.");
    } else {
      console.error(
        `Error: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
    process.exit(1);
  }
}

main();
