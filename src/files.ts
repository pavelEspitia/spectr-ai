import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

export function findSolidityFiles(dirPath: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory() && entry !== "node_modules") {
      const nested = findSolidityFiles(fullPath);
      for (const file of nested) {
        results.push(file);
      }
    } else if (stat.isFile() && extname(entry) === ".sol") {
      results.push(fullPath);
    }
  }

  return results.sort();
}
