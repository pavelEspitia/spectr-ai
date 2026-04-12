"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface ProgressState {
  step: string;
  percent: number;
}

export function UploadZone() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setProgress(null);

      if (!file.name.endsWith(".sol") && !file.name.endsWith(".vy")) {
        setError("Only .sol and .vy files are supported");
        return;
      }

      if (file.size > 100_000) {
        setError("File too large (max 100KB)");
        return;
      }

      setLoading(true);
      setProgress({ step: "Reading file...", percent: 5 });

      try {
        const source = await file.text();

        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ fileName: file.name, source }),
        });

        if (!response.ok) {
          const body = await response.json();
          setError(body.error ?? "Analysis failed");
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

            setProgress({
              step: json.step,
              percent: json.percent,
            });

            if (json.status === "done" && json.id) {
              router.push(`/audit/${json.id}`);
              return;
            }
          }
        }
      } catch {
        setError("Analysis failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={`
          flex flex-col items-center justify-center
          border-2 border-dashed rounded-xl p-12 cursor-pointer
          transition-colors duration-200
          ${dragging ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-700 hover:border-zinc-500"}
          ${loading ? "pointer-events-none" : ""}
        `}
      >
        <input
          type="file"
          accept=".sol,.vy"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {loading && progress ? (
          <div className="w-full max-w-sm space-y-4">
            <div className="text-center space-y-1">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-zinc-600 border-t-emerald-500" />
              <p className="text-zinc-300 font-medium">{progress.step}</p>
              <p className="text-zinc-500 text-sm">{progress.percent}%</p>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <div className="text-4xl">
              {dragging ? "\u2193" : "\u21e7"}
            </div>
            <p className="text-zinc-300 font-medium">
              Drop a .sol or .vy file here
            </p>
            <p className="text-zinc-500 text-sm">
              or click to browse (max 100KB)
            </p>
          </div>
        )}
      </label>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
