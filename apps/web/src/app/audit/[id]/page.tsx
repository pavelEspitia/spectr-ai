import { notFound } from "next/navigation";
import { getAudit } from "@/lib/actions";
import { ReportView } from "@/components/report-view";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const audit = await getAudit(id);

  if (!audit) {
    notFound();
  }

  const report = JSON.parse(audit.report);

  return (
    <div className="space-y-6">
      <ReportView
        report={report}
        fileName={audit.fileName}
        model={audit.model}
        createdAt={audit.createdAt}
      />
      <div className="flex items-center gap-4 pt-4 border-t border-zinc-800">
        <a href="/" className="text-sm text-zinc-400 hover:text-zinc-100">
          Analyze another contract
        </a>
        <span className="text-zinc-700">|</span>
        <span className="text-sm text-zinc-500">
          Tokens: {audit.inputTokens} in / {audit.outputTokens} out
        </span>
      </div>
    </div>
  );
}
