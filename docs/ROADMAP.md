# Roadmap

## Release History

| Version | Date | Tag | Key Deliverables |
|---------|------|-----|-----------------|
| v0.1.0 | 2026-03-16 | `v0.1.0` | Core parser, linter (15 rules, 3 presets), CLI (`lint`, `init`), 80 tests, CI pipeline |
| v0.2.0 | 2026-03-16 | `v0.2.0` | Test harness with YAML scenarios, 8 assertion types, mock mode, console+JSON reporters |
| v0.3.0 | 2026-03-16 | `v0.3.0` | Benchmarks package (precision/recall/F1 scorer, A/B comparator, regression tracker, 3 reporters) |
| v0.4.0 | 2026-03-16 | `v0.4.0` | Adapters package (stack detector, convention detector, template engine, 3 built-in templates) |
| v0.4.1 | 2026-03-16 | — | Bug fix: monorepo support for stack/convention detection, `{{else}}` in template engine |

## Current State — What Actually Works

| Feature | Status | Notes |
|---------|--------|-------|
| `skillkit lint` | **Production-ready** | Tested against 17 real skills, found real issues |
| `skillkit init` | **Production-ready** | Simple scaffolding, works as expected |
| `skillkit test` (mock) | **Working** | Validates test structure, runs assertions against SKILL.md body as simulated output |
| `skillkit test` (real) | **Not implemented** | Needs subprocess skill invocation — see v1.0 below |
| `skillkit bench` CLI | **Help only** | Package API works (scorer, comparator, tracker all tested), CLI just shows usage |
| `skillkit bench` API | **Working** | Math is correct (28 tests), needs real skill output to be useful |
| `skillkit adapt` | **Working** | Tested against real monorepo (microfrontends), correctly detects TS/Next/Tailwind/Vitest/Zustand |

## What's Next

### v0.5 — Real Skill Execution (the hard one)

**Goal:** `skillkit test` and `skillkit bench` work against actual AI model output, not simulated.

| Task | Complexity | Description |
|------|-----------|-------------|
| Subprocess skill invocation | Hard | Invoke skills via `claude --skill <name>` or equivalent subprocess call. Handle timeouts, stderr, exit codes. |
| API key management | Medium | Read from env vars (`ANTHROPIC_API_KEY`), support multiple providers |
| Output capture | Medium | Capture full skill output (stdout) for assertion evaluation |
| Fixture lifecycle | Medium | Clone fixture repos to temp dirs, apply setup modifications, clean up after |
| Built-in fixtures | Medium | Ship 3 sample repos: React/Next.js app, Python/FastAPI API, Go service |
| Real mode for bench | Medium | Wire scorer to real invocations, run against ground truth corpus |
| Rate limiting | Easy | Respect API rate limits when running multiple scenarios |

**Why this is hard:** Every AI coding tool has a different invocation mechanism. Claude Code uses `claude`, Codex uses `codex`, Cursor has no CLI. We need an abstraction layer.

**Possible approach:**
```
# skillkit.config.yaml
test:
  provider: claude-code    # or: codex, gemini-cli, custom
  command: "claude"        # override: custom command to invoke
  timeout: 120000
```

### v0.6 — Plugin API

**Goal:** Third parties can extend skillkit with custom lint rules, benchmark scenarios, adapter templates, and test fixtures.

| Task | Description |
|------|-------------|
| Plugin discovery | Load plugins from `node_modules/skillkit-plugin-*` or config file |
| Lint rule plugins | `export const rules: LintRule[]` — drop-in custom rules |
| Benchmark scenario plugins | `export const scenarios: BenchScenario[]` — custom ground truth |
| Adapter template plugins | `export const templates: SkillTemplate[]` — custom skill templates |
| Fixture plugins | `export const fixtures: TestFixture[]` — custom test repos |
| Plugin authoring guide | Documentation for writing and publishing plugins |

### v0.7 — npm Publish

**Goal:** `npm install -g skillkit` works. `npx skillkit lint` works without cloning the repo.

| Task | Description |
|------|-------------|
| Package scoping | Decide: `skillkit` (global) or `@skillkit/cli` (scoped) |
| Build pipeline | Compile TypeScript to dist/, ship compiled JS to npm |
| Bin entry | Ensure `skillkit` binary works after global install |
| Provenance | npm publish with `--provenance` for supply chain security |
| Release automation | GitHub Action: on tag push, build + publish to npm |
| Per-package publishing | Publish core, linter, test-harness, benchmarks, adapters separately |

### v0.8 — CI/CD Integration

**Goal:** One-line addition to any CI pipeline.

| Task | Description |
|------|-------------|
| GitHub Action | `uses: skillkit/lint-action@v1` — lints skills in PR, posts results as comment |
| Bench Action | `uses: skillkit/bench-action@v1` — runs benchmarks, posts regression report |
| Pre-commit hook | `skillkit lint` as a git pre-commit hook |
| Badge generation | Skill quality badge for README (like coverage badges) |

### v1.0 — Stable Release

**Goal:** Feature-complete, documented, community-ready.

| Task | Description |
|------|-------------|
| Cross-tool testing | Verify skills work across Claude Code, Codex CLI, Gemini CLI, Cursor |
| Comprehensive fixtures | 5+ built-in fixture repos covering major ecosystems |
| Adapter templates | 10+ built-in templates (component, module, test, endpoint, store, page, middleware, hook, schema, migration) |
| Stability commitment | Semantic versioning, no breaking changes without major bump |
| Community governance | GOVERNANCE.md, RFC process for new rules/features |
| Security policy | SECURITY.md, responsible disclosure process |
| Website | Landing page with interactive demo |

---

## Known Gaps & Technical Debt

### From the devil's advocate review (pre-build research)

| Concern | Severity | Current status |
|---------|----------|---------------|
| Market saturation (skill libraries) | Addressed | We pivoted to infrastructure, not a library |
| Most skills are gstack derivatives | Addressed | Reference skills are original, serve as examples only |
| No testing framework for skills | **Partially addressed** | Mock mode works, real mode not yet implemented |
| Self-improvement is a gimmick | **Mitigated** | `/improve` example uses measurable criteria only (staleness, path accuracy, redundancy) |
| Maintenance sustainability | **Open risk** | Need contributors or a dedicated maintainer |
| Compatibility fragility | **Open risk** | Agent Skills spec may change, breaking all skills |
| Scaffold skills non-portable | **Addressed** | `skillkit adapt` generates project-specific skills from templates |

### From real-world testing (microfrontends monorepo)

| Bug found | Fixed in | Root cause |
|-----------|----------|------------|
| Stack detector missed all deps in monorepo | v0.4.1 | Only read root package.json, not child packages |
| Convention detector missed component dirs | v0.4.1 | Only searched root-level directories |
| Template `{{/if}}` leaked into output | v0.4.1 | No `{{else}}` support in template engine |
| Template nesting broke regex matching | v0.4.1 | Refactored templates to avoid nesting |

### Untested scenarios

- Python projects (pyproject.toml detection implemented but not tested against real repo)
- Go projects (go.mod detection implemented but not tested)
- Rust projects (Cargo.toml detection implemented but not tested)
- Non-monorepo Node.js projects (should work but not verified end-to-end)
- Windows paths (forward slash handling)
- Very large repos (10,000+ files — performance of convention scanning)
- Skills with hooks or agent mode (test harness doesn't handle these)

---

## Metrics

### Current (v0.4.1)

| Metric | Value |
|--------|-------|
| Packages | 6 |
| Tests | 175 |
| Test execution time | ~320ms |
| Lint rules | 15 |
| Assertion types | 8 |
| Built-in templates | 3 |
| Reference skills | 6 |
| Documentation guides | 9 |
| External dependencies | 2 (yaml, typescript) |
| Lines of code | ~8,000 |

### Target (v1.0)

| Metric | Target |
|--------|--------|
| Tests | 300+ |
| Lint rules | 25+ |
| Assertion types | 12+ |
| Built-in templates | 10+ |
| Built-in fixtures | 5+ |
| GitHub stars | 500+ |
| npm weekly downloads | 100+ |
| Contributors | 5+ |

---

## How to Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

The highest-impact contributions right now:
1. **Test against your repo** — run `skillkit adapt component .` and report bugs
2. **Add lint rules** — each rule is one file, easy to contribute
3. **Add adapter templates** — write templates for your framework/stack
4. **Test Python/Go/Rust detection** — we need real-world validation
