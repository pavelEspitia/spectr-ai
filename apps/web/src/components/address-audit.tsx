"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface ProgressState {
  step: string;
  percent: number;
}

const CHAINS: Array<{ id: string; name: string }> = [
  { id: "ethereum", name: "Ethereum" },
  { id: "base", name: "Base" },
  { id: "arbitrum", name: "Arbitrum" },
  { id: "polygon", name: "Polygon" },
  { id: "optimism", name: "Optimism" },
  { id: "sepolia", name: "Sepolia (testnet)" },
];

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function AddressAudit() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audit = useCallback(async () => {
    setError(null);
    setProgress(null);

    const trimmed = address.trim();
    if (!ADDRESS_RE.test(trimmed)) {
      setError("Enter a valid 0x contract address");
      return;
    }

    setLoading(true);
    setProgress({ step: "Connecting to chain...", percent: 5 });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ address: trimmed, chain }),
      });

      if (!response.ok) {
        const body = await response.json();
        setError(body.error ?? "Audit failed");
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("Streaming not supported");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const chunk of lines) {
          const dataLine = chunk
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!dataLine) continue;

          const json = JSON.parse(dataLine.slice(6));

          if (json.status === "error") {
            setError(json.step);
            setLoading(false);
            return;
          }

          setProgress({ step: json.step, percent: json.percent });

          if (json.status === "done" && json.id) {
            router.push(`/audit/${json.id}`);
            return;
          }
        }
      }
    } catch {
      setError("Audit failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [address, chain, router]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={chain}
          onChange={(e) => setChain(e.target.value)}
          disabled={loading}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
        >
          {CHAINS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") audit();
          }}
          disabled={loading}
          placeholder="0x… deployed contract address"
          spellCheck={false}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={audit}
          disabled={loading}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? "Auditing…" : "Audit"}
        </button>
      </div>

      {loading && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>{progress.step}</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
