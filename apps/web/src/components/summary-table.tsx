import { SeverityBadge } from "./severity-badge";

interface Summary {
  riskRating: string;
  counts: Record<string, number>;
  topFixes: string[];
}

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

const BAR_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-cyan-500",
  info: "bg-zinc-500",
};

export function SummaryTable({ summary }: { summary: Summary }) {
  const maxCount = Math.max(
    ...Object.values(summary.counts),
    1,
  );
  const total = Object.values(summary.counts).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800">
        <h3 className="font-semibold">Summary</h3>
      </div>
      <div className="p-4 space-y-3">
        {SEVERITY_ORDER.filter((s) => summary.counts[s]).map((s) => {
          const count = summary.counts[s] ?? 0;
          const pct = Math.round((count / maxCount) * 100);
          const bar = BAR_COLORS[s] ?? "bg-zinc-600";
          return (
            <div key={s} className="flex items-center gap-3">
              <span className="text-sm text-zinc-400 w-16 capitalize">
                {s}
              </span>
              <span className="text-sm font-bold w-6 text-right">
                {count}
              </span>
              <div className="flex-1 bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`${bar} h-full rounded-full transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Risk:</span>
            <SeverityBadge severity={summary.riskRating} />
          </div>
          <span className="text-sm text-zinc-400">
            {total} issue{total !== 1 ? "s" : ""} total
          </span>
        </div>
      </div>
      {summary.topFixes.length > 0 && (
        <div className="bg-yellow-950/20 border-t border-yellow-800/30 px-4 py-3">
          <p className="text-sm font-semibold text-yellow-400 mb-2">
            Priority fixes:
          </p>
          <ol className="text-sm text-zinc-300 space-y-1 list-decimal list-inside">
            {summary.topFixes.map((fix, i) => (
              <li key={i}>{fix}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
