import { describe, it, expect } from "vitest";
import { SYSTEM_PROMPT } from "./prompts.js";

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
});
