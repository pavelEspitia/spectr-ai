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
