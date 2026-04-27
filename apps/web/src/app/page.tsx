import { UploadZone } from "@/components/upload-zone";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center space-y-5 pt-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Audit smart contracts with AI —{" "}
          <span className="text-emerald-400">on your machine, if you want</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Upload a Solidity or Vyper contract and get an instant security
          report: vulnerabilities, gas optimizations, and concrete code fixes.
          Run with Claude in the cloud or fully local with Ollama — your code
          never leaves your machine.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500 pt-1">
          <span className="rounded-full border border-zinc-800 px-3 py-1">
            Open source on GitHub
          </span>
          <span className="rounded-full border border-zinc-800 px-3 py-1">
            Runs locally via Ollama
          </span>
          <span className="rounded-full border border-zinc-800 px-3 py-1">
            Solidity + Vyper
          </span>
          <span className="rounded-full border border-zinc-800 px-3 py-1">
            JSON · SARIF · HTML
          </span>
        </div>
      </section>
      <UploadZone />
    </div>
  );
}
