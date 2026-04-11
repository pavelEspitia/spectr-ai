import { SeverityBadge } from "./severity-badge";

interface Issue {
  severity: string;
  title: string;
  location: string;
  description: string;
  recommendation: string;
  codefix?: string;
}

const BG: Record<string, string> = {
  critical: "border-red-600/40 bg-red-950/30",
  high: "border-orange-600/40 bg-orange-950/30",
  medium: "border-yellow-600/40 bg-yellow-950/30",
  low: "border-cyan-600/40 bg-cyan-950/30",
  info: "border-zinc-600/40 bg-zinc-900/30",
};

export function IssueCard({
  issue,
  index,
}: {
  issue: Issue;
  index: number;
}) {
  const border = BG[issue.severity] ?? "border-zinc-700 bg-zinc-900";

  return (
    <div className={`border-l-4 rounded-lg p-4 space-y-2 ${border}`}>
      <div className="flex items-center gap-2">
        <SeverityBadge severity={issue.severity} />
        <span className="font-semibold">
          #{index + 1} {issue.title}
        </span>
      </div>
      <p className="text-zinc-400 text-sm">{issue.location}</p>
      <p className="text-zinc-300">{issue.description}</p>
      <p className="text-emerald-400 text-sm">
        <span className="text-zinc-500">Fix:</span> {issue.recommendation}
      </p>
      {issue.codefix && (
        <details className="mt-2">
          <summary className="text-emerald-500 text-sm cursor-pointer hover:underline">
            Show suggested fix
          </summary>
          <pre className="mt-2 bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-3 text-sm text-emerald-300 overflow-x-auto">
            {issue.codefix}
          </pre>
        </details>
      )}
    </div>
  );
}
