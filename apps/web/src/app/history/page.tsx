import { getAuditHistory } from "@/lib/actions";
import { SeverityBadge } from "@/components/severity-badge";

export default async function HistoryPage() {
  const history = await getAuditHistory();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit History</h1>

      {history.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500">No audits yet.</p>
          <a
            href="/"
            className="text-emerald-400 hover:underline text-sm mt-2 inline-block"
          >
            Analyze your first contract
          </a>
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-900/50 text-sm text-zinc-400">
                <th className="text-left px-4 py-3 font-medium">File</th>
                <th className="text-left px-4 py-3 font-medium">Language</th>
                <th className="text-left px-4 py-3 font-medium">Model</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((audit) => (
                <tr
                  key={audit.id}
                  className="border-t border-zinc-800 hover:bg-zinc-900/30"
                >
                  <td className="px-4 py-3">
                    <a
                      href={`/audit/${audit.id}`}
                      className="text-emerald-400 hover:underline font-medium"
                    >
                      {audit.fileName}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={audit.language} />
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {audit.model}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {new Date(audit.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
