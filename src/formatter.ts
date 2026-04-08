import pc from "picocolors";
import type { Issue, JsonReport, Severity } from "./analyzer.js";

const SEVERITY_ORDER: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

const SEVERITY_COLORS: Record<Severity, (s: string) => string> = {
  critical: (s) => pc.bold(pc.red(s)),
  high: pc.red,
  medium: pc.yellow,
  low: pc.dim,
  info: pc.dim,
};

const SEVERITY_ICONS: Record<Severity, string> = {
  critical: "!!",
  high: " !",
  medium: " ~",
  low: " -",
  info: " .",
};

function groupBySeverity(issues: Issue[]): Map<Severity, Issue[]> {
  const groups = new Map<Severity, Issue[]>();
  for (const sev of SEVERITY_ORDER) {
    const matching = issues.filter((i) => i.severity === sev);
    if (matching.length > 0) {
      groups.set(sev, matching);
    }
  }
  return groups;
}

function formatIssue(issue: Issue): string {
  const color = SEVERITY_COLORS[issue.severity];
  const icon = SEVERITY_ICONS[issue.severity];
  const lines: string[] = [];

  lines.push(
    color(`  ${icon} ${issue.title}`) +
      pc.dim(` (${issue.location})`),
  );
  lines.push(`     ${issue.description}`);
  lines.push(
    `     ${pc.dim("Fix:")} ${issue.recommendation}`,
  );

  if (issue.codefix) {
    lines.push("");
    lines.push(pc.dim("     Suggested fix:"));
    for (const line of issue.codefix.split("\n")) {
      lines.push(`     ${pc.green(line)}`);
    }
  }

  return lines.join("\n");
}

function formatSeverityHeader(
  severity: Severity,
  count: number,
): string {
  const color = SEVERITY_COLORS[severity];
  const label = severity.toUpperCase();
  return color(`\n  ${label} (${count})`);
}

function formatSummaryTable(report: JsonReport): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(pc.bold("  Summary"));
  lines.push(pc.dim("  " + "-".repeat(40)));

  for (const sev of SEVERITY_ORDER) {
    const count = report.summary.counts[sev];
    if (count > 0) {
      const color = SEVERITY_COLORS[sev];
      const bar = color("#".repeat(Math.min(count, 20)));
      lines.push(
        `  ${sev.padEnd(9)} ${String(count).padStart(3)}  ${bar}`,
      );
    }
  }

  const total = Object.values(report.summary.counts).reduce(
    (a, b) => a + b,
    0,
  );
  lines.push(pc.dim("  " + "-".repeat(40)));
  lines.push(`  Total    ${String(total).padStart(3)}`);

  const riskColor = SEVERITY_COLORS[report.summary.riskRating];
  lines.push(
    `\n  Risk: ${riskColor(report.summary.riskRating.toUpperCase())}`,
  );

  if (report.summary.topFixes.length > 0) {
    lines.push(pc.bold("\n  Priority fixes:"));
    for (let i = 0; i < report.summary.topFixes.length; i++) {
      lines.push(`  ${i + 1}. ${report.summary.topFixes[i]}`);
    }
  }

  return lines.join("\n");
}

export function formatReport(
  report: JsonReport,
  filePath?: string,
): string {
  const lines: string[] = [];

  if (filePath) {
    lines.push(pc.bold(`\n  ${filePath}`));
    lines.push(pc.dim("  " + "=".repeat(50)));
  }

  if (report.issues.length === 0) {
    lines.push(pc.green("\n  No issues found."));
    return lines.join("\n");
  }

  const groups = groupBySeverity(report.issues);

  for (const [severity, issues] of groups) {
    lines.push(formatSeverityHeader(severity, issues.length));
    lines.push("");
    for (const issue of issues) {
      lines.push(formatIssue(issue));
      lines.push("");
    }
  }

  lines.push(formatSummaryTable(report));

  return lines.join("\n");
}
