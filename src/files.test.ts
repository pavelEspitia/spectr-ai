import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findSolidityFiles } from "./files.js";

describe("findSolidityFiles", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "spectr-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("finds .sol files in a flat directory", () => {
    writeFileSync(join(tempDir, "Token.sol"), "contract Token {}");
    writeFileSync(join(tempDir, "Vault.sol"), "contract Vault {}");
    writeFileSync(join(tempDir, "README.md"), "# readme");

    const files = findSolidityFiles(tempDir);
    expect(files).toHaveLength(2);
    expect(files[0]).toContain("Token.sol");
    expect(files[1]).toContain("Vault.sol");
  });

  it("finds .sol files recursively", () => {
    mkdirSync(join(tempDir, "sub"));
    writeFileSync(join(tempDir, "A.sol"), "contract A {}");
    writeFileSync(join(tempDir, "sub", "B.sol"), "contract B {}");

    const files = findSolidityFiles(tempDir);
    expect(files).toHaveLength(2);
  });

  it("skips node_modules", () => {
    mkdirSync(join(tempDir, "node_modules"));
    writeFileSync(
      join(tempDir, "node_modules", "dep.sol"),
      "contract Dep {}",
    );
    writeFileSync(join(tempDir, "Real.sol"), "contract Real {}");

    const files = findSolidityFiles(tempDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toContain("Real.sol");
  });

  it("returns empty array for directory with no .sol files", () => {
    writeFileSync(join(tempDir, "readme.md"), "hello");
    expect(findSolidityFiles(tempDir)).toEqual([]);
  });

  it("returns sorted results", () => {
    writeFileSync(join(tempDir, "Z.sol"), "contract Z {}");
    writeFileSync(join(tempDir, "A.sol"), "contract A {}");

    const files = findSolidityFiles(tempDir);
    expect(files[0]).toContain("A.sol");
    expect(files[1]).toContain("Z.sol");
  });
});
