import { describe, it, expect } from "vitest";
import { toHtml } from "./html.js";
import type { JsonReport } from "./analyzer.js";

const report: JsonReport = {
  issues: [
    {
      severity: "critical",
      title: "Reentrancy",
      location: "withdraw()",
      description: "Unsafe external call",
      recommendation: "Use CEI pattern",
      codefix: "balances[msg.sender] = 0;",
    },
    {
      severity: "low",
      title: "No events",
      location: "deposit()",
      description: "Missing events",
      recommendation: "Add events",
    },
  ],
  summary: {
    riskRating: "critical",
    counts: { critical: 1, high: 0, medium: 0, low: 1, info: 0 },
    topFixes: ["Fix reentrancy"],
  },
};

const meta = { model: "test-model", date: "2026-04-09" };

describe("toHtml", () => {
  it("produces valid HTML document", () => {
    const html = toHtml([{ file: "Vault.sol", report }], meta);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
    expect(html).toContain("spectr-ai Security Report");
  });

  it("includes file name", () => {
    const html = toHtml([{ file: "Vault.sol", report }], meta);
    expect(html).toContain("Vault.sol");
  });

  it("renders issues with severity badges", () => {
    const html = toHtml([{ file: "Vault.sol", report }], meta);
    expect(html).toContain("critical");
    expect(html).toContain("Reentrancy");
    expect(html).toContain("Unsafe external call");
  });

  it("includes codefix in collapsible section", () => {
    const html = toHtml([{ file: "Vault.sol", report }], meta);
    expect(html).toContain("suggested fix");
    expect(html).toContain("balances[msg.sender] = 0;");
  });

  it("renders summary table", () => {
    const html = toHtml([{ file: "Vault.sol", report }], meta);
    expect(html).toContain("RISK: CRITICAL");
    expect(html).toContain("Priority fixes");
  });

  it("includes model and date metadata", () => {
    const html = toHtml([{ file: "Vault.sol", report }], meta);
    expect(html).toContain("test-model");
    expect(html).toContain("2026-04-09");
  });

  it("handles multiple files", () => {
    const html = toHtml(
      [
        { file: "A.sol", report },
        { file: "B.sol", report },
      ],
      meta,
    );
    expect(html).toContain("A.sol");
    expect(html).toContain("B.sol");
  });

  it("escapes HTML in user content", () => {
    const xssReport: JsonReport = {
      issues: [
        {
          severity: "info",
          title: '<script>alert("xss")</script>',
          location: "test()",
          description: "test",
          recommendation: "test",
        },
      ],
      summary: {
        riskRating: "info",
        counts: { critical: 0, high: 0, medium: 0, low: 0, info: 1 },
        topFixes: [],
      },
    };
    const html = toHtml([{ file: "X.sol", report: xssReport }], meta);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
