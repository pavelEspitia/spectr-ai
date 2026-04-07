import { describe, it, expect } from "vitest";
import { toSarif } from "./sarif.js";
import type { JsonReport } from "./analyzer.js";

const sampleReport: JsonReport = {
  issues: [
    {
      severity: "critical",
      title: "Reentrancy in withdraw",
      location: "withdraw(), line 20",
      description: "External call before state update",
      recommendation: "Use checks-effects-interactions pattern",
    },
    {
      severity: "low",
      title: "Missing event emission",
      location: "deposit()",
      description: "No event emitted on deposit",
      recommendation: "Add Deposit event",
    },
  ],
  summary: {
    riskRating: "critical",
    counts: { critical: 1, high: 0, medium: 0, low: 1, info: 0 },
    topFixes: ["Fix reentrancy"],
  },
};

describe("toSarif", () => {
  it("produces valid SARIF structure", () => {
    const sarif = toSarif(
      [{ file: "contracts/Vault.sol", report: sampleReport }],
      "0.1.0",
    );

    expect(sarif.version).toBe("2.1.0");
    expect(sarif.$schema).toContain("sarif-schema-2.1.0");
    expect(sarif.runs).toHaveLength(1);
  });

  it("maps issues to SARIF results", () => {
    const sarif = toSarif(
      [{ file: "Vault.sol", report: sampleReport }],
      "0.1.0",
    );
    const run = sarif.runs[0]!;

    expect(run.results).toHaveLength(2);
    expect(run.tool.driver.rules).toHaveLength(2);
  });

  it("maps severity to SARIF levels", () => {
    const sarif = toSarif(
      [{ file: "Vault.sol", report: sampleReport }],
      "0.1.0",
    );
    const results = sarif.runs[0]!.results;

    expect(results[0]!.level).toBe("error");
    expect(results[1]!.level).toBe("note");
  });

  it("extracts line numbers from location strings", () => {
    const sarif = toSarif(
      [{ file: "Vault.sol", report: sampleReport }],
      "0.1.0",
    );
    const loc = sarif.runs[0]!.results[0]!.locations[0]!;

    expect(loc.physicalLocation.region).toEqual({ startLine: 20 });
  });

  it("handles location without line number", () => {
    const sarif = toSarif(
      [{ file: "Vault.sol", report: sampleReport }],
      "0.1.0",
    );
    const loc = sarif.runs[0]!.results[1]!.locations[0]!;

    expect(loc.physicalLocation.region).toBeUndefined();
  });

  it("aggregates multiple files into one run", () => {
    const sarif = toSarif(
      [
        { file: "A.sol", report: sampleReport },
        { file: "B.sol", report: sampleReport },
      ],
      "0.1.0",
    );

    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0]!.results).toHaveLength(4);
  });

  it("includes tool metadata", () => {
    const sarif = toSarif(
      [{ file: "Vault.sol", report: sampleReport }],
      "0.1.0",
    );
    const driver = sarif.runs[0]!.tool.driver;

    expect(driver.name).toBe("spectr-ai");
    expect(driver.version).toBe("0.1.0");
    expect(driver.informationUri).toContain("spectr-ai");
  });

  it("includes recommendation in message text", () => {
    const sarif = toSarif(
      [{ file: "Vault.sol", report: sampleReport }],
      "0.1.0",
    );
    const msg = sarif.runs[0]!.results[0]!.message.text;

    expect(msg).toContain("External call before state update");
    expect(msg).toContain("checks-effects-interactions");
  });
});
