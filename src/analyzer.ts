import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompts.js";

export interface AnalysisResult {
  report: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
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
    messages: [
      {
        role: "user",
        content: `Analyze the following Solidity smart contract for security vulnerabilities, gas optimizations, and best practice violations:\n\n\`\`\`solidity\n${source}\n\`\`\``,
      },
    ],
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
