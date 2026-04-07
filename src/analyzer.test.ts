import { describe, it, expect, vi, beforeEach } from "vitest";
import { SYSTEM_PROMPT, JSON_SYSTEM_PROMPT } from "./prompts.js";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

describe("prompts", () => {
  it("system prompt includes severity levels", () => {
    expect(SYSTEM_PROMPT).toContain("Critical");
    expect(SYSTEM_PROMPT).toContain("High");
    expect(SYSTEM_PROMPT).toContain("Medium");
    expect(SYSTEM_PROMPT).toContain("Low");
  });

  it("system prompt covers key vulnerability categories", () => {
    expect(SYSTEM_PROMPT).toContain("reentrancy");
    expect(SYSTEM_PROMPT).toContain("access control");
    expect(SYSTEM_PROMPT).toContain("Gas Optimizations");
  });

  it("JSON prompt requires structured output", () => {
    expect(JSON_SYSTEM_PROMPT).toContain('"issues"');
    expect(JSON_SYSTEM_PROMPT).toContain('"severity"');
    expect(JSON_SYSTEM_PROMPT).toContain('"summary"');
  });
});

describe("analyzeContract", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns structured result from Claude response", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "## Security Report\nNo issues." }],
      model: "claude-sonnet-4-6",
      usage: { input_tokens: 500, output_tokens: 200 },
    });

    const { analyzeContract } = await import("./analyzer.js");
    const result = await analyzeContract("contract Foo {}", "test-key");

    expect(result).toEqual({
      report: "## Security Report\nNo issues.",
      model: "claude-sonnet-4-6",
      inputTokens: 500,
      outputTokens: 200,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: expect.stringContaining("contract Foo {}"),
          },
        ],
      }),
    );
  });

  it("throws when response has no text block", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [],
      model: "claude-sonnet-4-6",
      usage: { input_tokens: 100, output_tokens: 0 },
    });

    const { analyzeContract } = await import("./analyzer.js");

    await expect(
      analyzeContract("contract Foo {}", "test-key"),
    ).rejects.toThrow("No text response received from Claude");
  });

  it("propagates API errors", async () => {
    mockCreate.mockRejectedValueOnce(new Error("rate limited"));

    const { analyzeContract } = await import("./analyzer.js");

    await expect(
      analyzeContract("contract Foo {}", "test-key"),
    ).rejects.toThrow("rate limited");
  });
});

describe("analyzeContractJson", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  const validJson = JSON.stringify({
    issues: [
      {
        severity: "critical",
        title: "Reentrancy in withdraw",
        location: "withdraw()",
        description: "External call before state update",
        recommendation: "Use checks-effects-interactions",
      },
    ],
    summary: {
      riskRating: "critical",
      counts: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
      topFixes: ["Fix reentrancy in withdraw"],
    },
  });

  it("parses JSON response into structured report", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: validJson }],
      model: "claude-sonnet-4-6",
      usage: { input_tokens: 500, output_tokens: 300 },
    });

    const { analyzeContractJson } = await import("./analyzer.js");
    const result = await analyzeContractJson("contract Foo {}", "test-key");

    expect(result.report.issues).toHaveLength(1);
    expect(result.report.issues[0]?.severity).toBe("critical");
    expect(result.report.summary.riskRating).toBe("critical");
    expect(result.model).toBe("claude-sonnet-4-6");
  });

  it("strips markdown code fences from response", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: `\`\`\`json\n${validJson}\n\`\`\`` }],
      model: "claude-sonnet-4-6",
      usage: { input_tokens: 500, output_tokens: 300 },
    });

    const { analyzeContractJson } = await import("./analyzer.js");
    const result = await analyzeContractJson("contract Foo {}", "test-key");

    expect(result.report.issues).toHaveLength(1);
  });

  it("throws on invalid JSON response", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "not valid json" }],
      model: "claude-sonnet-4-6",
      usage: { input_tokens: 500, output_tokens: 100 },
    });

    const { analyzeContractJson } = await import("./analyzer.js");

    await expect(
      analyzeContractJson("contract Foo {}", "test-key"),
    ).rejects.toThrow();
  });
});
