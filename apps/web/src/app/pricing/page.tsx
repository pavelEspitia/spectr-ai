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
            href="https://noctis.lemonsqueezy.com/checkout/buy/154652af-8898-4255-85ca-6e2f018f8d49"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Subscribe — $29/mo
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
            href="https://noctis.lemonsqueezy.com/checkout/buy/f433a87f-5b81-4d25-ad34-de30add50a7f"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Subscribe — $99/mo
          </a>
        </div>
      </section>

      {/* Digital Products */}
      <section className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-xl font-bold text-center">Developer Templates</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <a
            href="https://noctis.lemonsqueezy.com/checkout/buy/81398f6d-d9e8-4721-aabe-bd41fbfd47ea"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-zinc-800 rounded-xl p-5 space-y-2 hover:border-emerald-600 transition-colors block"
          >
            <h3 className="font-bold">Next.js + Web3 Starter Kit</h3>
            <p className="text-sm text-zinc-400">
              Next.js 15 + viem + Tailwind. 6 chains, typed contract calls, dark mode.
            </p>
            <p className="text-emerald-400 font-bold">$49</p>
          </a>
          <a
            href="https://noctis.lemonsqueezy.com/checkout/buy/320e3677-0551-4f5e-a699-8f979ae69188"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-zinc-800 rounded-xl p-5 space-y-2 hover:border-emerald-600 transition-colors block"
          >
            <h3 className="font-bold">AI App Template</h3>
            <p className="text-sm text-zinc-400">
              Next.js 15 + Claude/Ollama. Provider abstraction, Zod validation, SSE streaming.
            </p>
            <p className="text-emerald-400 font-bold">$39</p>
          </a>
          <a
            href="https://noctis.lemonsqueezy.com/checkout/buy/30a45000-e7d4-4dae-be1a-3de61a0943ed"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-zinc-800 rounded-xl p-5 space-y-2 hover:border-emerald-600 transition-colors block"
          >
            <h3 className="font-bold">Security Checklist</h3>
            <p className="text-sm text-zinc-400">
              35 interactive checks for Solidity + Vyper. Severity tags, progress tracking.
            </p>
            <p className="text-emerald-400 font-bold">$19</p>
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
