import { UploadZone } from "@/components/upload-zone";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center space-y-4 pt-8">
        <h1 className="text-4xl font-bold tracking-tight">
          AI-Powered Smart Contract Auditor
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Upload a Solidity or Vyper contract and get an instant security
          analysis with vulnerability detection, gas optimizations, and code
          fixes.
        </p>
      </section>
      <UploadZone />
    </div>
  );
}
