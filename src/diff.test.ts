import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { getChangedSolFiles, DiffError } from "./diff.js";

describe("getChangedSolFiles", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "spectr-diff-"));
    execSync("git init", { cwd: tempDir });
    execSync("git config user.email 'test@test.com'", { cwd: tempDir });
    execSync("git config user.name 'Test'", { cwd: tempDir });

    writeFileSync(join(tempDir, "A.sol"), "contract A {}");
    writeFileSync(join(tempDir, "B.sol"), "contract B {}");
    writeFileSync(join(tempDir, "readme.md"), "# readme");
    execSync("git add -A && git commit -m init", { cwd: tempDir });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns changed .sol files since a ref", () => {
    writeFileSync(join(tempDir, "A.sol"), "contract A { uint x; }");
    writeFileSync(join(tempDir, "C.sol"), "contract C {}");
    execSync("git add -A", { cwd: tempDir });

    const files = getChangedSolFiles("HEAD", tempDir);
    expect(files).toHaveLength(2);
    expect(files.some((f) => f.endsWith("A.sol"))).toBe(true);
    expect(files.some((f) => f.endsWith("C.sol"))).toBe(true);
  });

  it("excludes non-.sol files", () => {
    writeFileSync(join(tempDir, "readme.md"), "# updated");
    writeFileSync(join(tempDir, "A.sol"), "contract A { uint x; }");
    execSync("git add -A", { cwd: tempDir });

    const files = getChangedSolFiles("HEAD", tempDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toContain("A.sol");
  });

  it("returns empty array when no .sol files changed", () => {
    writeFileSync(join(tempDir, "readme.md"), "# updated");
    execSync("git add -A", { cwd: tempDir });

    const files = getChangedSolFiles("HEAD", tempDir);
    expect(files).toEqual([]);
  });

  it("throws DiffError on invalid ref", () => {
    expect(() =>
      getChangedSolFiles("nonexistent-ref", tempDir),
    ).toThrow(DiffError);
  });
});
