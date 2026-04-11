import type { Issue, JsonReport, Severity } from "./analyzer.js";

interface SarifResult {
  ruleId: string;
  level: "error" | "warning" | "note";
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region?: { startLine: number };
    };
  }>;
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: Array<{
        id: string;
        shortDescription: { text: string };
        defaultConfiguration: { level: "error" | "warning" | "note" };
      }>;
    };
  };
  results: SarifResult[];
}

interface SarifLog {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

const SEVERITY_TO_LEVEL: Record<Severity, "error" | "warning" | "note"> = {
  critical: "error",
  high: "error",
  medium: "warning",
  low: "note",
  info: "note",
};

function issueToRuleId(issue: Issue, index: number): string {
  const slug = issue.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `spectr-${slug}-${index}`;
}

export function toSarif(
  files: Array<{ file: string; report: JsonReport }>,
  version: string,
): SarifLog {
  const rules: SarifRun["tool"]["driver"]["rules"] = [];
  const results: SarifResult[] = [];
  const seenRuleIds = new Set<string>();
  let ruleIndex = 0;

  for (const { file, report } of files) {
    for (const issue of report.issues) {
      const ruleId = issueToRuleId(issue, ruleIndex);
      ruleIndex += 1;

      if (!seenRuleIds.has(ruleId)) {
        seenRuleIds.add(ruleId);
        rules.push({
          id: ruleId,
          shortDescription: { text: issue.title },
          defaultConfiguration: {
            level: SEVERITY_TO_LEVEL[issue.severity],
          },
        });
      }

      results.push({
        ruleId,
        level: SEVERITY_TO_LEVEL[issue.severity],
        message: {
          text: `${issue.description}\n\nRecommendation: ${issue.recommendation}`,
        },
        locations: [
          {
            physicalLocation: buildPhysicalLocation(
              file,
              issue.location,
            ),
          },
        ],
      });
    }
  }

  return {
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "spectr-ai",
            version,
            informationUri:
              "https://github.com/pavelEspitia/spectr-ai",
            rules,
          },
        },
        results,
      },
    ],
  };
}

function buildPhysicalLocation(
  file: string,
  location: string,
): SarifResult["locations"][number]["physicalLocation"] {
  const region = parseLineNumber(location);
  if (region) {
    return { artifactLocation: { uri: file }, region };
  }
  return { artifactLocation: { uri: file } };
}

function parseLineNumber(
  location: string,
): { startLine: number } | undefined {
  const match = /(?:line\s+|L|:)(\d+)/i.exec(location);
  if (match?.[1]) {
    return { startLine: Number(match[1]) };
  }
  return undefined;
}
