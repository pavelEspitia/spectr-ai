import type { Issue, JsonReport, Severity } from "./analyzer.js";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#0891b2",
  info: "#6b7280",
};

const SEVERITY_BG: Record<Severity, string> = {
  critical: "#fef2f2",
  high: "#fff7ed",
  medium: "#fefce8",
  low: "#ecfeff",
  info: "#f9fafb",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderIssue(issue: Issue, index: number): string {
  const color = SEVERITY_COLORS[issue.severity];
  const bg = SEVERITY_BG[issue.severity];

  let codeBlock = "";
  if (issue.codefix) {
    codeBlock = `
      <details>
        <summary style="cursor:pointer;color:#059669;margin-top:8px;">
          Show suggested fix
        </summary>
        <pre style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px;margin-top:8px;overflow-x:auto;font-size:13px;">${escapeHtml(issue.codefix)}</pre>
      </details>`;
  }

  return `
    <div style="background:${bg};border-left:4px solid ${color};border-radius:6px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="background:${color};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;">${issue.severity}</span>
        <strong style="font-size:15px;">#${index + 1} ${escapeHtml(issue.title)}</strong>
      </div>
      <div style="color:#6b7280;font-size:13px;margin-bottom:6px;">${escapeHtml(issue.location)}</div>
      <p style="margin:0 0 8px 0;">${escapeHtml(issue.description)}</p>
      <p style="margin:0;color:#059669;"><strong>Fix:</strong> ${escapeHtml(issue.recommendation)}</p>
      ${codeBlock}
    </div>`;
}

function renderSummaryTable(report: JsonReport): string {
  const severities: Severity[] = [
    "critical",
    "high",
    "medium",
    "low",
    "info",
  ];

  const rows = severities
    .filter((s) => report.summary.counts[s] > 0)
    .map((s) => {
      const count = report.summary.counts[s];
      const color = SEVERITY_COLORS[s];
      const maxCount = Math.max(
        ...Object.values(report.summary.counts),
        1,
      );
      const pct = Math.round((count / maxCount) * 100);
      return `
        <tr>
          <td style="padding:8px 12px;font-weight:600;text-transform:capitalize;">${s}</td>
          <td style="padding:8px 12px;text-align:right;font-weight:700;">${count}</td>
          <td style="padding:8px 12px;width:200px;">
            <div style="background:#e5e7eb;border-radius:4px;overflow:hidden;height:20px;">
              <div style="background:${color};height:100%;width:${pct}%;border-radius:4px;"></div>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  const total = Object.values(report.summary.counts).reduce(
    (a, b) => a + b,
    0,
  );
  const riskColor = SEVERITY_COLORS[report.summary.riskRating];

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="border-bottom:2px solid #e5e7eb;">
          <th style="padding:8px 12px;text-align:left;">Severity</th>
          <th style="padding:8px 12px;text-align:right;">Count</th>
          <th style="padding:8px 12px;text-align:left;">Distribution</th>
        </tr>
      </thead>
      <tbody>${rows}
        <tr style="border-top:2px solid #e5e7eb;">
          <td style="padding:8px 12px;font-weight:700;">Total</td>
          <td style="padding:8px 12px;text-align:right;font-weight:700;">${total}</td>
          <td style="padding:8px 12px;">
            <span style="background:${riskColor};color:white;padding:4px 12px;border-radius:4px;font-weight:700;font-size:12px;">
              RISK: ${report.summary.riskRating.toUpperCase()}
            </span>
          </td>
        </tr>
      </tbody>
    </table>`;
}

export function toHtml(
  files: Array<{ file: string; report: JsonReport }>,
  meta: { model: string; date: string },
): string {
  const fileSections = files
    .map(({ file, report }) => {
      if (report.issues.length === 0) {
        return `
          <section style="margin-bottom:32px;">
            <h2 style="color:#1f2937;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">${escapeHtml(file)}</h2>
            <p style="color:#059669;font-weight:600;">No issues found.</p>
          </section>`;
      }

      const issues = report.issues
        .map((issue, i) => renderIssue(issue, i))
        .join("");

      return `
        <section style="margin-bottom:32px;">
          <h2 style="color:#1f2937;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">${escapeHtml(file)}</h2>
          ${renderSummaryTable(report)}
          ${issues}
          ${renderTopFixes(report)}
        </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>spectr-ai Security Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 24px;
      background: #fafafa;
      color: #1f2937;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <header style="margin-bottom:32px;">
    <h1 style="margin:0 0 8px 0;">spectr-ai Security Report</h1>
    <p style="color:#6b7280;margin:0;">
      Model: ${escapeHtml(meta.model)} | Generated: ${escapeHtml(meta.date)}
    </p>
  </header>
  ${fileSections}
  <footer style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:13px;">
    Generated by <a href="https://github.com/pavelEspitia/spectr-ai" style="color:#6b7280;">spectr-ai</a>
  </footer>
</body>
</html>`;
}

function renderTopFixes(report: JsonReport): string {
  if (report.summary.topFixes.length === 0) return "";
  const items = report.summary.topFixes
    .map(
      (fix, i) =>
        `<li style="margin-bottom:4px;">${i + 1}. ${escapeHtml(fix)}</li>`,
    )
    .join("");
  return `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin-top:16px;">
      <strong>Priority fixes:</strong>
      <ul style="margin:8px 0 0 0;padding:0;list-style:none;">${items}</ul>
    </div>`;
}
