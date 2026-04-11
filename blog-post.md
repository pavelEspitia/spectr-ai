---
title: I Built an AI Smart Contract Auditor in a Weekend — Here's How
published: false
description: How I built spectr-ai, a CLI tool that uses Claude and local models to find vulnerabilities in Solidity and Vyper contracts
tags: web3, ai, security, typescript
cover_image: 
---

Smart contract audits cost $5K-$50K and take weeks. I built a CLI tool that catches the same classes of vulnerabilities in seconds, using AI — and it works with free local models too.

## What is spectr-ai?

[spectr-ai](https://github.com/pavelEspitia/spectr-ai) is a command-line tool that analyzes Solidity and Vyper smart contracts for security vulnerabilities, gas optimizations, and best practice violations. It uses Claude (Anthropic's API) or local models via Ollama.

```bash
spectr-ai contracts/Vault.sol
```

Output:

```
   CRITICAL  — 2 issues

  ● Reentrancy vulnerability in withdraw()
    #1 withdraw() at contracts/Vault.sol:20

    External call via msg.sender.call() before updating balances.
    → Apply checks-effects-interactions pattern.

    ┌─ suggested fix
    │ function withdraw() public {
    │     uint256 amount = balances[msg.sender];
    │     balances[msg.sender] = 0;
    │     (bool success, ) = msg.sender.call{value: amount}("");
    │     require(success, "Transfer failed");
    │ }
    └─

  ┌────────────────────────────────────────┐
  │ Summary                                │
  │ ● critical     2  ████████████████     │
  │ ● high         1  ████████             │
  │ ▲ medium       1  ████████             │
  │  RISK: CRITICAL                        │
  └────────────────────────────────────────┘
```

## Why I Built It

I'm a fullstack TypeScript developer getting deeper into blockchain and AI. The intersection of these two fields has a clear gap: **security tooling that's accessible to individual developers**.

Static analyzers like Slither and Mythril are powerful but limited to pattern matching. They can't reason about business logic or explain *why* something is dangerous. LLMs can.

The question was: can an LLM reliably audit smart contracts and produce structured, actionable output?

## The Architecture

spectr-ai is intentionally simple — ~800 lines of TypeScript across 12 source files:

```
src/
  cli.ts          → Arg parsing, orchestration
  analyzer.ts     → Sends contract to provider, parses response
  provider.ts     → Anthropic + Ollama abstraction
  schema.ts       → Zod validation of model responses
  prompts.ts      → Language-specific system prompts
  validator.ts    → Input validation (Solidity + Vyper)
  formatter.ts    → Color terminal output
  sarif.ts        → SARIF format for GitHub Code Scanning
  html.ts         → Self-contained HTML reports
  files.ts        → Recursive file finder
  diff.ts         → Git diff integration
  watcher.ts      → File watch mode
```

### Key Design Decisions

**1. Provider abstraction over SDK lock-in**

Instead of coupling to the Anthropic SDK, I created a `Provider` interface:

```typescript
interface Provider {
  complete(system: string, userMessage: string): Promise<CompletionResult>;
}
```

This let me add Ollama support in ~50 lines. The `OllamaProvider` uses the OpenAI-compatible endpoint at `localhost:11434` — zero additional dependencies.

```bash
# Free, local, no API key
spectr-ai --model ollama:qwen2.5-coder:7b contracts/
```

**2. Structured output with Zod validation**

LLMs sometimes return malformed JSON, especially smaller models. Instead of blindly `JSON.parse`-ing, every response is validated against a Zod schema:

```typescript
const issueSchema = z.object({
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  title: z.string(),
  location: z.string(),
  description: z.string(),
  recommendation: z.string(),
  codefix: z.string().optional(),
});
```

When validation fails, the error message tells you exactly what the model got wrong — instead of a cryptic `undefined is not an object` deep in the formatter.

**3. Multiple output formats for different workflows**

- **Text** (default): Color-coded terminal output grouped by severity
- **JSON**: Structured data for scripting
- **SARIF**: GitHub Code Scanning integration
- **HTML**: Self-contained audit report you can share

This means spectr-ai fits into CI pipelines, PR reviews, and manual audits.

**4. Language-specific prompts**

Solidity and Vyper have different vulnerability profiles. The system prompt adapts:

- **Solidity**: reentrancy, tx.origin, delegatecall, selfdestruct
- **Vyper**: raw_call misuse, storage collisions, default visibility, @nonreentrant limitations

## What I Learned

### LLMs are surprisingly good at security analysis

The model consistently catches the OWASP-equivalent vulnerabilities in smart contracts — reentrancy, access control, integer handling, input validation. For a contract like the classic "VulnerableVault", it finds every intentional vulnerability and suggests correct fixes.

### Smaller models are usable but not great

I tested with `qwen2.5-coder:1.5b` (runs on CPU, free). It finds the right vulnerabilities but the code fixes are generic ("add access control" instead of actual code). The 7B model is better but needs a GPU or patience. Claude Sonnet produces the best output by far.

### Structured output is the hard part

Getting the model to return valid JSON with the exact schema you want is the main engineering challenge. The combination of a strict system prompt + Zod validation + markdown fence stripping handles 99% of cases.

### CI integration is the killer feature

The `--fail-on` flag with exit codes makes spectr-ai a CI gate:

```bash
# Fail the pipeline if medium+ issues are found
spectr-ai --fail-on medium --json contracts/ || exit 1
```

Combined with `--diff HEAD~1`, you only analyze changed contracts per PR — saving tokens and time.

## Try It

```bash
# With Claude
export ANTHROPIC_API_KEY=sk-ant-...
npx spectr-ai examples/vulnerable.sol

# With Ollama (free)
ollama pull qwen2.5-coder:1.5b
npx spectr-ai --model ollama:qwen2.5-coder:1.5b examples/vulnerable.sol
```

The full source is at [github.com/pavelEspitia/spectr-ai](https://github.com/pavelEspitia/spectr-ai). MIT licensed.

## What's Next

- Rate limit retry with exponential backoff for multi-file analysis
- Streaming output (see results as the model generates)
- Comparative mode (before/after analysis)
- Support for more chains (Cairo for StarkNet, Move for Aptos)

---

If you're building with smart contracts and want to catch vulnerabilities before deployment, give spectr-ai a try. And if you have ideas or find bugs, [open an issue](https://github.com/pavelEspitia/spectr-ai/issues).
