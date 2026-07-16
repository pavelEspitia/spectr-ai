import { describe, it, expect } from "vitest";
import { parseReport, ReportParseError } from "./schema.js";

const validJson = JSON.stringify({
  issues: [
    {
      severity: "critical",
      title: "Reentrancy",
      location: "withdraw()",
      description: "Unsafe call",
      recommendation: "Use CEI",
      codefix: "balances[msg.sender] = 0;",
    },
  ],
  summary: {
    riskRating: "critical",
    counts: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
    topFixes: ["Fix reentrancy"],
  },
});

describe("parseReport", () => {
  it("parses valid JSON report", () => {
    const report = parseReport(validJson);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]?.severity).toBe("critical");
    expect(report.summary.riskRating).toBe("critical");
  });

  it("strips markdown code fences", () => {
    const report = parseReport(`\`\`\`json\n${validJson}\n\`\`\``);
    expect(report.issues).toHaveLength(1);
  });

  it("extracts JSON wrapped in prose (small local models)", () => {
    const report = parseReport(
      `Here is the audit report for the contract:\n\n${validJson}\n\nLet me know if you need more detail.`,
    );
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]?.title).toBe("Reentrancy");
  });

  it("extracts a fenced block that is not at the start of the response", () => {
    const report = parseReport(
      `I analyzed the contract and found one critical issue.\n\n\`\`\`json\n${validJson}\n\`\`\`\n\nStay safe!`,
    );
    expect(report.issues).toHaveLength(1);
  });

  it("extracts from a fence without the json language tag", () => {
    const report = parseReport(`\`\`\`\n${validJson}\n\`\`\``);
    expect(report.issues).toHaveLength(1);
  });

  it("repairs unescaped quotes inside code snippets (qwen2.5-coder:1.5b)", () => {
    // Real-world failure: the model escaped every quote except the ones in
    // call{value: amount}("") inside a codefix string.
    const withRawQuotes = `\`\`\`json
{
  "issues": [
    {
      "severity": "critical",
      "title": "Reentrancy in withdraw function",
      "location": "withdraw()",
      "description": "State is updated after the external call.",
      "recommendation": "Use checks-effects-interactions.",
      "codefix": "(bool success, ) = msg.sender.call{value: amount}("");\\nrequire(success, \\"Transfer failed\\");"
    }
  ],
  "summary": {
    "riskRating": "critical",
    "counts": { "critical": 1, "high": 0, "medium": 0, "low": 0, "info": 0 },
    "topFixes": ["Use checks-effects-interactions"]
  }
}
\`\`\``;
    const report = parseReport(withRawQuotes);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]?.codefix).toContain('call{value: amount}("")');
  });

  it("defaults omitted severity counts to zero", () => {
    const missingInfo = JSON.stringify({
      issues: [],
      summary: {
        riskRating: "low",
        counts: { critical: 0, high: 0, medium: 1, low: 2 },
        topFixes: [],
      },
    });
    const report = parseReport(missingInfo);
    expect(report.summary.counts.info).toBe(0);
    expect(report.summary.counts.medium).toBe(1);
  });

  it("still reports structural errors from prose-wrapped JSON", () => {
    const wrapped = `Sure! ${JSON.stringify({ issues: "not-an-array" })} hope that helps`;
    expect(() => parseReport(wrapped)).toThrow(ReportParseError);
    expect(() => parseReport(wrapped)).toThrow(/invalid report structure/);
  });

  it("allows optional codefix", () => {
    const json = JSON.stringify({
      issues: [
        {
          severity: "low",
          title: "No events",
          location: "deposit()",
          description: "Missing event",
          recommendation: "Add event",
        },
      ],
      summary: {
        riskRating: "low",
        counts: { critical: 0, high: 0, medium: 0, low: 1, info: 0 },
        topFixes: ["Add events"],
      },
    });
    const report = parseReport(json);
    expect(report.issues[0]?.codefix).toBeUndefined();
  });

  it("defaults omitted prose fields to empty strings", () => {
    const json = JSON.stringify({
      issues: [
        { severity: "high", title: "tx.origin auth" },
      ],
      summary: {
        riskRating: "high",
        counts: { critical: 0, high: 1, medium: 0, low: 0, info: 0 },
        topFixes: [],
      },
    });
    const report = parseReport(json);
    expect(report.issues[0]?.recommendation).toBe("");
    expect(report.issues[0]?.description).toBe("");
    expect(report.issues[0]?.location).toBe("");
  });

  it("throws ReportParseError on invalid JSON", () => {
    expect(() => parseReport("not json")).toThrow(ReportParseError);
    expect(() => parseReport("not json")).toThrow("Invalid JSON");
  });

  it("throws ReportParseError on missing fields", () => {
    const bad = JSON.stringify({ issues: [] });
    expect(() => parseReport(bad)).toThrow(ReportParseError);
    expect(() => parseReport(bad)).toThrow("invalid report structure");
  });

  it("throws ReportParseError on invalid severity", () => {
    const bad = JSON.stringify({
      issues: [
        {
          severity: "super-critical",
          title: "X",
          location: "X",
          description: "X",
          recommendation: "X",
        },
      ],
      summary: {
        riskRating: "info",
        counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        topFixes: [],
      },
    });
    expect(() => parseReport(bad)).toThrow(ReportParseError);
  });

  it("handles empty issues array", () => {
    const json = JSON.stringify({
      issues: [],
      summary: {
        riskRating: "info",
        counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        topFixes: [],
      },
    });
    const report = parseReport(json);
    expect(report.issues).toEqual([]);
  });
});
