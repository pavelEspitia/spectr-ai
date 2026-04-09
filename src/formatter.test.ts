import { describe, it, expect } from "vitest";
import { formatReport } from "./formatter.js";
import type { JsonReport } from "./analyzer.js";

const report: JsonReport = {
  issues: [
    {
      severity: "critical",
      title: "Reentrancy in withdraw",
      location: "withdraw()",
      description: "External call before state update",
      recommendation: "Use checks-effects-interactions",
      codefix:
        "balances[msg.sender] = 0;\n(bool success, ) = msg.sender.call{value: amount}(\"\");",
    },
    {
      severity: "low",
      title: "Missing event",
      location: "deposit()",
      description: "No event emitted",
      recommendation: "Add Deposit event",
    },
    {
      severity: "critical",
      title: "No access control on drain",
      location: "drain()",
      description: "Anyone can call drain",
      recommendation: "Add onlyOwner modifier",
    },
  ],
  summary: {
    riskRating: "critical",
    counts: { critical: 2, high: 0, medium: 0, low: 1, info: 0 },
    topFixes: ["Fix reentrancy", "Add access control", "Add events"],
  },
};

describe("formatReport", () => {
  it("groups issues by severity with critical first", () => {
    const output = formatReport(report);
    const criticalPos = output.indexOf("CRITICAL");
    const lowPos = output.indexOf("LOW");
    expect(criticalPos).toBeLessThan(lowPos);
  });

  it("shows severity counts in headers", () => {
    const output = formatReport(report);
    expect(output).toContain("CRITICAL");
    expect(output).toContain("2 issues");
    expect(output).toContain("LOW");
    expect(output).toContain("1 issue");
  });

  it("includes issue details", () => {
    const output = formatReport(report);
    expect(output).toContain("Reentrancy in withdraw");
    expect(output).toContain("withdraw()");
    expect(output).toContain("External call before state update");
  });

  it("includes codefix when present", () => {
    const output = formatReport(report);
    expect(output).toContain("suggested fix");
    expect(output).toContain("balances[msg.sender] = 0;");
  });

  it("does not show codefix when absent", () => {
    const output = formatReport(report);
    const missingEventSection = output.substring(
      output.indexOf("Missing event"),
    );
    const nextSection = missingEventSection.indexOf("Summary");
    const chunk =
      nextSection > -1
        ? missingEventSection.substring(0, nextSection)
        : missingEventSection;
    expect(chunk).not.toContain("suggested fix");
  });

  it("includes summary table", () => {
    const output = formatReport(report);
    expect(output).toContain("Summary");
    expect(output).toContain("Total");
    expect(output).toContain("Priority fixes:");
  });

  it("includes file header when filePath provided", () => {
    const output = formatReport(report, "contracts/Vault.sol");
    expect(output).toContain("contracts/Vault.sol");
  });

  it("handles empty report", () => {
    const empty: JsonReport = {
      issues: [],
      summary: {
        riskRating: "info",
        counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        topFixes: [],
      },
    };
    const output = formatReport(empty);
    expect(output).toContain("No issues found");
  });
});
