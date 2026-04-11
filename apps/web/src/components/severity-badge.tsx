const COLORS: Record<string, string> = {
  critical: "bg-red-600",
  high: "bg-orange-600",
  medium: "bg-yellow-600",
  low: "bg-cyan-600",
  info: "bg-zinc-600",
};

export function SeverityBadge({ severity }: { severity: string }) {
  const bg = COLORS[severity] ?? "bg-zinc-600";
  return (
    <span
      className={`${bg} text-white text-xs font-bold px-2 py-0.5 rounded uppercase`}
    >
      {severity}
    </span>
  );
}
