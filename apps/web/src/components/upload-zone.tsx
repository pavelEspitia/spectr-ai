"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export function UploadZone() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.name.endsWith(".sol") && !file.name.endsWith(".vy")) {
        setError("Only .sol and .vy files are supported");
        return;
      }

      if (file.size > 100_000) {
        setError("File too large (max 100KB)");
        return;
      }

      setLoading(true);
      try {
        const source = await file.text();
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, source }),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          setError(result.error ?? "Analysis failed");
          return;
        }

        router.push(`/audit/${result.id}`);
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
          ${loading ? "opacity-50 pointer-events-none" : ""}
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

        {loading ? (
          <div className="text-center space-y-2">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-zinc-600 border-t-emerald-500" />
            <p className="text-zinc-400">Analyzing contract...</p>
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
