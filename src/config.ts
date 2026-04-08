import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Severity } from "./analyzer.js";

export interface Config {
  failOn: Severity;
  format: "text" | "json" | "sarif";
  ignore: string[];
  exclude: string[];
}

const DEFAULTS: Config = {
  failOn: "high",
  format: "text",
  ignore: [],
  exclude: [],
};

const CONFIG_FILENAMES = [
  ".spectr-ai.yml",
  ".spectr-ai.yaml",
];

function parseYamlValue(line: string): string {
  return line.split(":").slice(1).join(":").trim()
    .replace(/^["']|["']$/g, "");
}

function parseYamlList(
  lines: string[],
  startIdx: number,
): { items: string[]; endIdx: number } {
  const items: string[] = [];
  let i = startIdx;
  while (i < lines.length) {
    const line = lines[i]!.trim();
    if (line.startsWith("- ")) {
      items.push(line.slice(2).trim().replace(/^["']|["']$/g, ""));
      i += 1;
    } else {
      break;
    }
  }
  return { items, endIdx: i };
}

export function loadConfig(cwd: string): Config {
  const config = { ...DEFAULTS };

  for (const filename of CONFIG_FILENAMES) {
    const filePath = resolve(cwd, filename);
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    const lines = content.split("\n");
    let i = 0;
    while (i < lines.length) {
      const line = lines[i]!;
      const trimmed = line.trim();

      if (trimmed.startsWith("#") || trimmed === "") {
        i += 1;
        continue;
      }

      if (trimmed.startsWith("failOn:") || trimmed.startsWith("fail-on:")) {
        const value = parseYamlValue(trimmed) as Severity;
        if (value) config.failOn = value;
        i += 1;
      } else if (trimmed.startsWith("format:")) {
        const value = parseYamlValue(trimmed);
        if (value === "text" || value === "json" || value === "sarif") {
          config.format = value;
        }
        i += 1;
      } else if (trimmed.startsWith("ignore:")) {
        i += 1;
        const { items, endIdx } = parseYamlList(lines, i);
        config.ignore = items;
        i = endIdx;
      } else if (trimmed.startsWith("exclude:")) {
        i += 1;
        const { items, endIdx } = parseYamlList(lines, i);
        config.exclude = items;
        i = endIdx;
      } else {
        i += 1;
      }
    }

    return config;
  }

  return config;
}

export function shouldExcludeFile(
  filePath: string,
  excludePatterns: string[],
): boolean {
  for (const pattern of excludePatterns) {
    if (filePath.includes(pattern)) {
      return true;
    }
  }
  return false;
}
