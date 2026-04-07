# spectr-ai

AI-powered smart contract security analyzer. Uses Claude to audit Solidity contracts for vulnerabilities, gas optimizations, and best practice violations.

[![CI](https://github.com/pavelEspitia/spectr-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/pavelEspitia/spectr-ai/actions/workflows/ci.yml)

## Install

```bash
pnpm add -g spectr-ai
```

Requires Node.js 22+ and an [Anthropic API key](https://console.anthropic.com/).

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

### Single file

```bash
spectr-ai contracts/Token.sol
```

### Directory (all .sol files)

```bash
spectr-ai contracts/
```

### JSON output

```bash
spectr-ai --json contracts/Token.sol
```

Returns structured JSON with `issues[]` and `summary`:

```json
{
  "issues": [
    {
      "severity": "critical",
      "title": "Reentrancy in withdraw",
      "location": "withdraw()",
      "description": "External call before state update",
      "recommendation": "Use checks-effects-interactions pattern"
    }
  ],
  "summary": {
    "riskRating": "critical",
    "counts": { "critical": 1, "high": 0, "medium": 0, "low": 0, "info": 0 },
    "topFixes": ["Fix reentrancy in withdraw"]
  }
}
```

### SARIF output (for GitHub Code Scanning)

```bash
spectr-ai --sarif contracts/Token.sol > results.sarif
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0`  | No critical or high issues found |
| `1`  | Error (bad input, API failure, etc.) |
| `2`  | Critical or high severity issues found |

Exit code `2` enables CI gating — fail the pipeline when serious vulnerabilities are detected.

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
spectr-ai --json contracts/ || exit 1
```

## Development

```bash
git clone https://github.com/pavelEspitia/spectr-ai.git
cd spectr-ai
pnpm install
pnpm run dev examples/vulnerable.sol
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Run CLI in development mode |
| `pnpm run build` | Compile TypeScript to `dist/` |
| `pnpm run test` | Run tests |
| `pnpm run lint` | Lint with oxlint |
| `pnpm run typecheck` | Type-check with tsc |

## License

MIT
