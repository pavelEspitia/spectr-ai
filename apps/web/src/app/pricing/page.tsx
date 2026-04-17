export default function PricingPage() {
  return (
    <div className="space-y-12 py-8">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          spectr-ai API
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          AI-powered smart contract security analysis via API.
          Audit Solidity and Vyper contracts programmatically.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {/* Free */}
        <div className="border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">Free</h2>
          <div className="text-3xl font-bold">
            $0<span className="text-sm text-zinc-500 font-normal">/mo</span>
          </div>
          <ul className="text-sm text-zinc-400 space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">&#10003;</span> 3 audits/day
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">&#10003;</span> JSON output
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">&#10003;</span> Solidity + Vyper
            </li>
            <li className="flex items-center gap-2">
              <span className="text-zinc-600">&#10005;</span>
              <span className="text-zinc-600">SARIF / HTML output</span>
            </li>
          </ul>
          <a
            href="/api-key"
            className="block text-center bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Get Free API Key
          </a>
        </div>

        {/* Pro */}
        <div className="border-2 border-emerald-600 rounded-xl p-6 space-y-4 relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            Most Popular
          </span>
          <h2 className="text-lg font-bold">Pro</h2>
          <div className="text-3xl font-bold">
            $29<span className="text-sm text-zinc-500 font-normal">/mo</span>
          </div>
          <ul className="text-sm text-zinc-400 space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">&#10003;</span> Unlimited audits
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">&#10003;</span> JSON + SARIF + HTML
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">&#10003;</span> Solidity + Vyper
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">&#10003;</span> Priority processing
            </li>
          </ul>
          <a
            href="https://noctis.lemonsqueezy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Subscribe
          </a>
        </div>

        {/* Enterprise */}
        <div className="border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">Enterprise</h2>
          <div className="text-3xl font-bold">
            $99<span className="text-sm text-zinc-500 font-normal">/mo</span>
          </div>
          <ul className="text-sm text-zinc-400 space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">&#10003;</span> Everything in Pro
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">&#10003;</span> Webhook notifications
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">&#10003;</span> Custom models
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">&#10003;</span> Priority support
            </li>
          </ul>
          <a
            href="https://noctis.lemonsqueezy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Subscribe
          </a>
        </div>
      </section>

      {/* API Docs Preview */}
      <section className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-xl font-bold">Quick Start</h2>
        <div className="bg-zinc-900 rounded-xl p-6 space-y-4 text-sm font-mono">
          <p className="text-zinc-500"># 1. Get your API key</p>
          <pre className="text-emerald-400 overflow-x-auto">
{`curl -X POST https://spectr-ai.vercel.app/api/v1/keys \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@example.com"}'`}
          </pre>
          <p className="text-zinc-500"># 2. Audit a contract</p>
          <pre className="text-emerald-400 overflow-x-auto">
{`curl -X POST https://spectr-ai.vercel.app/api/v1/audit \\
  -H "x-api-key: sk_spectr_..." \\
  -H "Content-Type: application/json" \\
  -d '{"fileName": "Token.sol", "source": "pragma solidity ^0.8.0; ..."}'`}
          </pre>
        </div>

        <div className="bg-zinc-900 rounded-xl p-6 text-sm font-mono">
          <p className="text-zinc-500 mb-3">Response:</p>
          <pre className="text-zinc-300 overflow-x-auto">
{`{
  "id": "abc123",
  "report": {
    "issues": [
      {
        "severity": "critical",
        "title": "Reentrancy in withdraw()",
        "location": "withdraw(), line 20",
        "recommendation": "Use checks-effects-interactions",
        "codefix": "balances[msg.sender] = 0; ..."
      }
    ],
    "summary": {
      "riskRating": "critical",
      "counts": { "critical": 1, "high": 0, ... }
    }
  }
}`}
          </pre>
        </div>
      </section>
    </div>
  );
}
