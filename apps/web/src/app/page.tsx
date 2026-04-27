import { UploadZone } from "@/components/upload-zone";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center space-y-5 pt-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Audit smart contracts with AI —{" "}
          <span className="text-emerald-400">locally or in the cloud</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Drop a Solidity or Vyper file here for an instant report powered by
          Claude. Or install the open-source CLI and run fully local with
          Ollama — your code never leaves your machine.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500 pt-1">
          <span className="rounded-full border border-zinc-800 px-3 py-1">
            Open source on GitHub
          </span>
          <span className="rounded-full border border-zinc-800 px-3 py-1">
            CLI runs locally via Ollama
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
