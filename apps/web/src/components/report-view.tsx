import { IssueCard } from "./issue-card";
import { SummaryTable } from "./summary-table";

interface Issue {
  severity: string;
  title: string;
  location: string;
  description: string;
  recommendation: string;
  codefix?: string;
}

interface Report {
  issues: Issue[];
  summary: {
    riskRating: string;
    counts: Record<string, number>;
    topFixes: string[];
  };
}

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

export function ReportView({
  report,
  fileName,
  model,
  createdAt,
}: {
  report: Report;
  fileName: string;
  model: string;
  createdAt: string;
}) {
  const grouped = new Map<string, Issue[]>();
  for (const sev of SEVERITY_ORDER) {
    const matching = report.issues.filter((i) => i.severity === sev);
    if (matching.length > 0) {
      grouped.set(sev, matching);
    }
  }

  let issueIndex = 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{fileName}</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Model: {model} | {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>

      <SummaryTable summary={report.summary} />

      {report.issues.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-emerald-400 text-lg font-semibold">
            No issues found
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([severity, issues]) => (
            <div key={severity} className="space-y-3">
              <h2 className="text-sm font-bold uppercase text-zinc-500 tracking-wider">
                {severity} ({issues.length})
              </h2>
              {issues.map((issue) => {
                const idx = issueIndex;
                issueIndex += 1;
                return (
                  <IssueCard key={idx} issue={issue} index={idx} />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
