# Plan: Ship spectr-ai v1.0

**Status:** Draft
**Created:** 2026-04-07

## Requirements

- Multi-file analysis: accept a directory or glob pattern, analyze all `.sol` files, produce a combined report
- Validate input is plausible Solidity before sending to Claude (catch obvious non-Solidity files early)
- SARIF output format for GitHub Code Scanning integration
- GitHub Actions reusable workflow so users can add `spectr-ai` to their CI in one step
- README with usage examples, CI integration guide, and badges
- npm publish-ready: correct `files`, `engines`, `repository` fields, build step produces working `dist/`
- Pin all dependency versions (no `^` or `~`)

## Approach

### Multi-file support
Add a `--dir` flag that recursively finds `.sol` files and analyzes each one. JSON mode aggregates all results into a single array. Text mode prints reports sequentially with file headers. Reuse the existing single-file analyzer — no new API abstraction needed.

### Input validation
Check file extension is `.sol` and file content contains `pragma solidity` or `contract`/`interface`/`library` keywords before sending to Claude. Fast-fail with a clear error message.

### SARIF output
Add `--sarif` flag that produces SARIF v2.1.0 JSON. This is the format GitHub Code Scanning expects. Map our severity levels to SARIF `level` values (error/warning/note). This enables `gh code-scanning upload-sarif`.

### GitHub Actions workflow
Create `.github/workflows/ci.yml` for the project itself (test + lint + typecheck). Create a reusable `action.yml` so other repos can use spectr-ai as a GitHub Action step.

### npm publish prep
Add `files` field to package.json, add `prepublishOnly` script that runs build + test + lint, add `engines` field, add `repository`/`homepage`/`bugs` URLs. Pin all dep versions.

## Files to touch

| File | Change |
|------|--------|
| `src/cli.ts` | Add `--dir` and `--sarif` flags, multi-file orchestration |
| `src/analyzer.ts` | Extract shared types, add `analyzeMultiple` function |
| `src/validator.ts` | New — input validation for Solidity files |
| `src/validator.test.ts` | New — tests for validator |
| `src/sarif.ts` | New — SARIF format converter |
| `src/sarif.test.ts` | New — tests for SARIF output |
| `src/analyzer.test.ts` | Add tests for multi-file analysis |
| `package.json` | Add `files`, `engines`, `repository`, pin versions, `prepublishOnly` |
| `.github/workflows/ci.yml` | New — CI pipeline (test, lint, typecheck) |
| `action.yml` | New — reusable GitHub Action definition |
| `README.md` | New — usage docs, CI guide, badges |
| `examples/safe.sol` | New — clean contract for testing zero-issue case |

## Risks and open questions

- **Token limits on large projects:** A directory with 50+ contracts could exceed Claude's context window. Mitigation: analyze files individually, not concatenated. Already resolved by design — each file gets its own API call.
- **SARIF spec compliance:** Need to verify SARIF schema matches what GitHub Code Scanning expects. Will validate against the official JSON schema.
- **Rate limiting on multi-file:** Many sequential API calls could hit rate limits. Mitigation: sequential calls with backoff. No parallelism in v1 — keep it simple.

## Progress log

- [ ] Pin dependency versions and add npm publish fields to package.json
- [ ] Add Solidity input validator with tests (deps: 1)
- [ ] Add multi-file support with `--dir` flag and tests (deps: 2)
- [ ] Add SARIF output format with tests (deps: 3)
- [ ] Add GitHub Actions CI workflow for the project (deps: 4)
- [ ] Create reusable GitHub Action (`action.yml`) (deps: 5)
- [ ] Add clean example contract `examples/safe.sol` (deps: 1)
- [ ] Write README with usage, CI integration, and badges (deps: 6, 7)
- [ ] Final validation: build, test, lint, typecheck all pass (deps: 8)

## Decision log

| Decision | Alternatives considered | Rationale |
|----------|------------------------|-----------|
| Analyze files individually, not concatenated | Concatenate all into one prompt | Avoids token limit issues, gives per-file granularity, simpler error handling |
| SARIF for CI integration | Custom GitHub annotations API | SARIF is a standard, works with Code Scanning, reusable beyond GitHub |
| Sequential API calls (no parallelism) | Parallel with concurrency limit | Simpler, avoids rate limit complexity, sufficient for v1 |
| Reusable GitHub Action | Only document CLI usage in CI | Lower barrier to adoption, one-line integration |

## Completion criteria

- [ ] All requirements met
- [ ] Tests pass (`pnpm test`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Typecheck clean (`pnpm typecheck`)
- [ ] Build produces working `dist/` (`pnpm build`)
- [ ] `spectr-ai --dir examples/` produces combined report
- [ ] `spectr-ai --sarif examples/vulnerable.sol` produces valid SARIF JSON
