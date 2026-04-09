# spectr-ai

AI-powered smart contract security analyzer. Uses Claude or local models (Ollama) to audit Solidity contracts for vulnerabilities, gas optimizations, and best practice violations.

[![CI](https://github.com/pavelEspitia/spectr-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/pavelEspitia/spectr-ai/actions/workflows/ci.yml)

## Demo

```
$ spectr-ai examples/vulnerable.sol

   CRITICAL  — 2 issues

  ● Reentrancy vulnerability in withdraw()
    #1 withdraw() at examples/vulnerable.sol:20

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

  ● Missing access control on drain()
    #2 drain() at examples/vulnerable.sol:26

    Any address can call drain() and steal the contract balance.
    → Add require(msg.sender == owner).

   HIGH  — 1 issue

  ● tx.origin used for authentication
    #3 transferOwnership() at examples/vulnerable.sol:31

  ┌────────────────────────────────────────┐
  │ Summary                                │
  ├────────────────────────────────────────┤
  │ ● critical     2  ████████████████     │
  │ ● high         1  ████████             │
  │ ▲ medium       1  ████████             │
  │ ○ low          2  ████████████████     │
  ├────────────────────────────────────────┤
  │ Total          6                       │
  │  RISK: CRITICAL                        │
  └────────────────────────────────────────┘

  ⚠ Priority fixes:
  1. Fix reentrancy in withdraw()
  2. Add access control to drain()
  3. Replace tx.origin with msg.sender
```

## Install

```bash
pnpm add -g spectr-ai
```

Requires Node.js 22+.

## Models

spectr-ai supports Claude (via API) and local models (via Ollama):

```bash
# Claude (default, requires ANTHROPIC_API_KEY)
export ANTHROPIC_API_KEY=sk-ant-...
spectr-ai contracts/Token.sol

# Local model (free, no API key needed)
ollama pull qwen2.5-coder:1.5b
spectr-ai --model ollama:qwen2.5-coder:1.5b contracts/Token.sol
```

## Usage

```bash
spectr-ai [options] <contract.sol|directory>
```

### Options

| Flag | Description |
|------|-------------|
| `--json` | Structured JSON output |
| `--sarif` | SARIF v2.1.0 for GitHub Code Scanning |
| `--html` | Self-contained HTML audit report |
| `--diff <ref>` | Only analyze .sol files changed since git ref |
| `--fail-on <severity>` | Exit code 2 threshold (default: `high`) |
| `--model <model>` | Model to use (default: `claude-sonnet-4-6`) |

### Examples

```bash
# Analyze a directory
spectr-ai contracts/

# Only changed files (great for PRs)
spectr-ai --diff HEAD~1

# JSON output with stricter threshold
spectr-ai --json --fail-on medium contracts/Token.sol

# HTML report
spectr-ai --html contracts/ > report.html

# SARIF for GitHub Code Scanning
spectr-ai --sarif contracts/ > results.sarif

# Local model
spectr-ai --model ollama:qwen2.5-coder:7b contracts/
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | No issues at or above `--fail-on` threshold |
| `1` | Error (bad input, API failure, etc.) |
| `2` | Issues found at or above threshold |

### Config file

Create `.spectr-ai.yml` in your project root:

```yaml
model: ollama:qwen2.5-coder:7b
failOn: medium
format: text
ignore:
  - gas-optimization
  - missing-event
exclude:
  - test/
  - mocks/
```

CLI flags always override config file values.

## CI Integration

### GitHub Actions (reusable action)

```yaml
- uses: pavelEspitia/spectr-ai@main
  with:
    path: contracts/
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    format: sarif

- uses: github/codeql-action/upload-sarif@v3
  if: always()
  with:
    sarif_file: spectr-ai-results.sarif
```

### Generic CI

```bash
spectr-ai --json --fail-on medium contracts/ || exit 1
```

## Development

```bash
git clone https://github.com/pavelEspitia/spectr-ai.git
cd spectr-ai
pnpm install
pnpm run dev examples/vulnerable.sol
```

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Run CLI in development mode |
| `pnpm run build` | Compile TypeScript to `dist/` |
| `pnpm run test` | Run tests (69 tests) |
| `pnpm run lint` | Lint with oxlint |
| `pnpm run typecheck` | Type-check with tsc |

## License

MIT
