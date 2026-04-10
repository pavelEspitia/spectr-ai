import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const CONTRACT_EXTENSIONS = new Set([".sol", ".vy"]);

export function findContractFiles(dirPath: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory() && entry !== "node_modules") {
      const nested = findContractFiles(fullPath);
      for (const file of nested) {
        results.push(file);
      }
    } else if (stat.isFile() && CONTRACT_EXTENSIONS.has(extname(entry))) {
      results.push(fullPath);
    }
  }

  return results.sort();
}

// Backward-compatible alias
export function findSolidityFiles(dirPath: string): string[] {
  return findContractFiles(dirPath);
}
