import { describe, it, expect } from "vitest";
import { parseModelFlag } from "./provider.js";

describe("parseModelFlag", () => {
  it("parses Anthropic model", () => {
    const config = parseModelFlag("claude-sonnet-4-6");
    expect(config).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-4-6",
    });
  });

  it("parses Ollama model", () => {
    const config = parseModelFlag("ollama:deepseek-coder-v2");
    expect(config).toEqual({
      provider: "ollama",
      model: "deepseek-coder-v2",
    });
  });

  it("parses Ollama model with slashes", () => {
    const config = parseModelFlag("ollama:qwen2.5-coder:7b");
    expect(config).toEqual({
      provider: "ollama",
      model: "qwen2.5-coder:7b",
    });
  });

  it("throws on empty Ollama model name", () => {
    expect(() => parseModelFlag("ollama:")).toThrow(
      "Invalid model format",
    );
  });

  it("treats unknown models as Anthropic", () => {
    const config = parseModelFlag("claude-haiku-4-5-20251001");
    expect(config.provider).toBe("anthropic");
  });
});
