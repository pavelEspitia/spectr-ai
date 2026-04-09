import { execSync } from "node:child_process";
import { resolve } from "node:path";

export function getChangedSolFiles(
  gitRef: string,
  cwd: string,
): string[] {
  try {
    const output = execSync(
      `git diff --name-only --diff-filter=ACMR ${gitRef} -- "*.sol"`,
      { cwd, encoding: "utf-8" },
    );

    return output
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
      .map((f) => resolve(cwd, f));
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown error";
    throw new DiffError(`Failed to get changed files: ${msg}`);
  }
}

export class DiffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiffError";
  }
}
