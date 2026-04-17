"use client";

import { useState } from "react";

export default function ApiKeyPage() {
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setApiKey(null);
    setLoading(true);

    try {
      const response = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to create key");
        return;
      }

      setApiKey(data.apiKey);
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyKey() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-lg mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Get Your API Key</h1>
        <p className="text-zinc-400 text-sm">
          Free plan: 3 audits/day. No credit card required.
        </p>
      </div>

      {!apiKey ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {loading ? "Creating..." : "Generate API Key"}
          </button>
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-emerald-600/50 rounded-xl p-4 space-y-3">
            <p className="text-emerald-400 text-sm font-medium">
              Your API key (save it — won't be shown again):
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-zinc-950 px-3 py-2 rounded text-sm font-mono text-zinc-200 overflow-x-auto">
                {apiKey}
              </code>
              <button
                onClick={copyKey}
                className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded text-sm transition-colors shrink-0"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl p-4 text-sm font-mono">
            <p className="text-zinc-500 mb-2"># Try it:</p>
            <pre className="text-emerald-400 overflow-x-auto whitespace-pre-wrap">
{`curl -X POST https://spectr-ai.vercel.app/api/v1/audit \\
  -H "x-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"fileName":"Test.sol","source":"pragma solidity ^0.8.0; contract Test { function foo() public {} }"}'`}
            </pre>
          </div>

          <div className="flex gap-4 text-sm">
            <a
              href="/pricing"
              className="text-emerald-400 hover:underline"
            >
              Upgrade to Pro for unlimited audits
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
