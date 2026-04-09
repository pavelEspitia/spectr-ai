import { describe, it, expect, vi } from "vitest";
import { JSON_SYSTEM_PROMPT } from "./prompts.js";
import { analyzeContractJson } from "./analyzer.js";
import type { Provider } from "./provider.js";

function mockProvider(
  overrides: Partial<Awaited<ReturnType<Provider["complete"]>>> = {},
): Provider {
  return {
    complete: vi.fn().mockResolvedValue({
      text: '{"issues":[],"summary":{"riskRating":"info","counts":{"critical":0,"high":0,"medium":0,"low":0,"info":0},"topFixes":[]}}',
      model: "test-model",
      inputTokens: 100,
      outputTokens: 50,
      ...overrides,
    }),
  };
}

describe("prompts", () => {
  it("JSON prompt requires structured output", () => {
    expect(JSON_SYSTEM_PROMPT).toContain('"issues"');
    expect(JSON_SYSTEM_PROMPT).toContain('"severity"');
    expect(JSON_SYSTEM_PROMPT).toContain('"summary"');
    expect(JSON_SYSTEM_PROMPT).toContain('"codefix"');
  });
});

describe("analyzeContractJson", () => {
  it("returns structured result from provider", async () => {
    const provider = mockProvider({
      text: JSON.stringify({
        issues: [
          {
            severity: "critical",
            title: "Reentrancy",
            location: "withdraw()",
            description: "Unsafe external call",
            recommendation: "Use CEI pattern",
          },
        ],
        summary: {
          riskRating: "critical",
          counts: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
          topFixes: ["Fix reentrancy"],
        },
      }),
      model: "claude-sonnet-4-6",
      inputTokens: 500,
      outputTokens: 200,
    });

    const result = await analyzeContractJson("contract Foo {}", provider);

    expect(result.report.issues).toHaveLength(1);
    expect(result.report.issues[0]?.severity).toBe("critical");
    expect(result.model).toBe("claude-sonnet-4-6");
    expect(result.inputTokens).toBe(500);
  });

  it("strips markdown code fences from response", async () => {
    const json = JSON.stringify({
      issues: [],
      summary: {
        riskRating: "info",
        counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        topFixes: [],
      },
    });
    const provider = mockProvider({ text: `\`\`\`json\n${json}\n\`\`\`` });

    const result = await analyzeContractJson("contract Foo {}", provider);
    expect(result.report.issues).toHaveLength(0);
  });

  it("throws on invalid JSON response", async () => {
    const provider = mockProvider({ text: "not valid json" });

    await expect(
      analyzeContractJson("contract Foo {}", provider),
    ).rejects.toThrow();
  });

  it("propagates provider errors", async () => {
    const provider: Provider = {
      complete: vi.fn().mockRejectedValue(new Error("rate limited")),
    };

    await expect(
      analyzeContractJson("contract Foo {}", provider),
    ).rejects.toThrow("rate limited");
  });

  it("passes system prompt to provider", async () => {
    const provider = mockProvider();

    await analyzeContractJson("contract Foo {}", provider);

    expect(provider.complete).toHaveBeenCalledWith(
      JSON_SYSTEM_PROMPT,
      expect.stringContaining("contract Foo {}"),
    );
  });
});
