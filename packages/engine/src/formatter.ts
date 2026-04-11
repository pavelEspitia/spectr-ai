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
  low: pc.cyan,
  info: pc.dim,
};

const SEVERITY_BG: Record<Severity, (s: string) => string> = {
  critical: (s) => pc.bold(pc.bgRed(pc.white(` ${s} `))),
  high: (s) => pc.bold(pc.bgRed(pc.white(` ${s} `))),
  medium: (s) => pc.bold(pc.bgYellow(pc.black(` ${s} `))),
  low: (s) => pc.bgCyan(pc.black(` ${s} `)),
  info: (s) => pc.bgWhite(pc.black(` ${s} `)),
};

const SEVERITY_ICONS: Record<Severity, string> = {
  critical: "\u25CF",  // ●
  high: "\u25CF",      // ●
  medium: "\u25B2",    // ▲
  low: "\u25CB",       // ○
  info: "\u2139",      // ℹ
};

const BAR_CHAR = "\u2588"; // █

function formatFileRef(
  filePath: string,
  line?: number,
): string {
  const display = line ? `${filePath}:${line}` : filePath;
  return pc.underline(pc.cyan(display));
}

function formatLocation(
  location: string,
  filePath?: string,
): string {
  const lineMatch = /(?:line\s+|L|:)(\d+)/i.exec(location);
  const line = lineMatch?.[1] ? Number(lineMatch[1]) : undefined;

  if (filePath) {
    const ref = formatFileRef(filePath, line);
    const funcMatch = /^(\w+\([^)]*\))/.exec(location);
    if (funcMatch?.[1]) {
      return `${pc.bold(pc.white(funcMatch[1]))} ${pc.dim("at")} ${ref}`;
    }
    return ref;
  }

  const funcMatch = /^(\w+\([^)]*\))/.exec(location);
  if (funcMatch?.[1]) {
    return pc.bold(pc.white(funcMatch[1])) +
      (line ? pc.dim(` line ${line}`) : "");
  }

  return pc.white(location);
}

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

function formatIssue(
  issue: Issue,
  index: number,
  filePath?: string,
): string {
  const color = SEVERITY_COLORS[issue.severity];
  const icon = SEVERITY_ICONS[issue.severity];
  const lines: string[] = [];

  const loc = formatLocation(issue.location, filePath);
  lines.push(
    `  ${color(icon)} ${pc.bold(pc.white(issue.title))}`,
  );
  lines.push(`    ${pc.dim(`#${index + 1}`)} ${loc}`);
  lines.push("");
  lines.push(`    ${issue.description}`);
  lines.push(
    `    ${pc.dim("\u2192")} ${pc.green(issue.recommendation)}`,
  );

  if (issue.codefix) {
    lines.push("");
    lines.push(`    ${pc.dim("\u250C\u2500")} suggested fix`);
    for (const line of issue.codefix.split("\n")) {
      lines.push(`    ${pc.dim("\u2502")} ${pc.green(line)}`);
    }
    lines.push(`    ${pc.dim("\u2514\u2500")}`);
  }

  return lines.join("\n");
}

function formatSeverityHeader(
  severity: Severity,
  count: number,
): string {
  const badge = SEVERITY_BG[severity](severity.toUpperCase());
  return `\n  ${badge} ${pc.dim(`\u2014 ${count} issue${count !== 1 ? "s" : ""}`)}`;
}

function formatSummaryTable(report: JsonReport): string {
  const lines: string[] = [];

  lines.push(
    `\n  ${pc.bold(pc.white("\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510"))}`,
  );
  lines.push(
    `  ${pc.bold(pc.white("\u2502"))} ${pc.bold(pc.white("Summary"))}${" ".repeat(32)}${pc.bold(pc.white("\u2502"))}`,
  );
  lines.push(
    `  ${pc.bold(pc.white("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524"))}`,
  );

  const maxCount = Math.max(
    ...Object.values(report.summary.counts),
    1,
  );

  for (const sev of SEVERITY_ORDER) {
    const count = report.summary.counts[sev];
    if (count > 0) {
      const color = SEVERITY_COLORS[sev];
      const icon = SEVERITY_ICONS[sev];
      const barLen = Math.max(
        Math.round((count / maxCount) * 16),
        1,
      );
      const bar = color(BAR_CHAR.repeat(barLen));
      const label = `${icon} ${sev}`.padEnd(12);
      const num = String(count).padStart(3);
      lines.push(
        `  ${pc.bold(pc.white("\u2502"))} ${color(label)} ${num}  ${bar}${" ".repeat(Math.max(16 - barLen, 0))}   ${pc.bold(pc.white("\u2502"))}`,
      );
    }
  }

  const total = Object.values(report.summary.counts).reduce(
    (a, b) => a + b,
    0,
  );
  lines.push(
    `  ${pc.bold(pc.white("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524"))}`,
  );
  lines.push(
    `  ${pc.bold(pc.white("\u2502"))} ${pc.bold("Total")}${" ".repeat(7)} ${pc.bold(String(total).padStart(3))}${" ".repeat(23)}${pc.bold(pc.white("\u2502"))}`,
  );

  const riskBadge = SEVERITY_BG[report.summary.riskRating](
    `RISK: ${report.summary.riskRating.toUpperCase()}`,
  );
  lines.push(
    `  ${pc.bold(pc.white("\u2502"))} ${riskBadge}${" ".repeat(Math.max(24 - report.summary.riskRating.length, 0))}${pc.bold(pc.white("\u2502"))}`,
  );
  lines.push(
    `  ${pc.bold(pc.white("\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518"))}`,
  );

  if (report.summary.topFixes.length > 0) {
    lines.push("");
    lines.push(`  ${pc.bold(pc.white("\u26A0 Priority fixes:"))}`);
    for (let i = 0; i < report.summary.topFixes.length; i++) {
      lines.push(
        `  ${pc.yellow(`${i + 1}.`)} ${report.summary.topFixes[i]}`,
      );
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
    const ref = formatFileRef(filePath);
    lines.push(`\n  ${pc.bold(pc.white("\u2500\u2500\u2500"))} ${ref}`);
  }

  if (report.issues.length === 0) {
    lines.push(
      pc.green(`\n  ${pc.bold("\u2713")} No issues found.`),
    );
    return lines.join("\n");
  }

  const groups = groupBySeverity(report.issues);
  let idx = 0;

  for (const [severity, issues] of groups) {
    lines.push(formatSeverityHeader(severity, issues.length));
    lines.push("");
    for (const issue of issues) {
      lines.push(formatIssue(issue, idx, filePath));
      lines.push("");
      idx += 1;
    }
  }

  lines.push(formatSummaryTable(report));

  return lines.join("\n");
}
