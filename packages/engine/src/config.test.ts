import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig, shouldExcludeFile } from "./config.js";

describe("loadConfig", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "spectr-config-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns defaults when no config file exists", () => {
    const config = loadConfig(tempDir);
    expect(config.failOn).toBe("high");
    expect(config.format).toBe("text");
    expect(config.ignore).toEqual([]);
    expect(config.exclude).toEqual([]);
  });

  it("reads .spectr-ai.yml", () => {
    writeFileSync(
      join(tempDir, ".spectr-ai.yml"),
      [
        "failOn: medium",
        "format: json",
        "ignore:",
        "  - reentrancy",
        "  - gas-optimization",
        "exclude:",
        "  - test/",
        "  - mocks/",
      ].join("\n"),
    );

    const config = loadConfig(tempDir);
    expect(config.failOn).toBe("medium");
    expect(config.format).toBe("json");
    expect(config.ignore).toEqual(["reentrancy", "gas-optimization"]);
    expect(config.exclude).toEqual(["test/", "mocks/"]);
  });

  it("reads .spectr-ai.yaml", () => {
    writeFileSync(
      join(tempDir, ".spectr-ai.yaml"),
      "failOn: critical\n",
    );

    const config = loadConfig(tempDir);
    expect(config.failOn).toBe("critical");
  });

  it("supports fail-on with hyphen", () => {
    writeFileSync(
      join(tempDir, ".spectr-ai.yml"),
      "fail-on: low\n",
    );

    const config = loadConfig(tempDir);
    expect(config.failOn).toBe("low");
  });

  it("ignores comments", () => {
    writeFileSync(
      join(tempDir, ".spectr-ai.yml"),
      "# This is a comment\nfailOn: critical\n",
    );

    const config = loadConfig(tempDir);
    expect(config.failOn).toBe("critical");
  });

  it("prefers .yml over .yaml", () => {
    writeFileSync(
      join(tempDir, ".spectr-ai.yml"),
      "failOn: critical\n",
    );
    writeFileSync(
      join(tempDir, ".spectr-ai.yaml"),
      "failOn: low\n",
    );

    const config = loadConfig(tempDir);
    expect(config.failOn).toBe("critical");
  });
});

describe("shouldExcludeFile", () => {
  it("excludes files matching patterns", () => {
    expect(shouldExcludeFile("test/Mock.sol", ["test/"])).toBe(true);
    expect(shouldExcludeFile("mocks/Token.sol", ["mocks/"])).toBe(
      true,
    );
  });

  it("does not exclude non-matching files", () => {
    expect(shouldExcludeFile("src/Token.sol", ["test/"])).toBe(false);
  });

  it("handles empty patterns", () => {
    expect(shouldExcludeFile("src/Token.sol", [])).toBe(false);
  });
});
