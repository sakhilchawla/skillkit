# Roadmap

## Release History

| Version | Date | Tag | Key Deliverables |
|---------|------|-----|-----------------|
| v0.1.0 | 2026-03-16 | `v0.1.0` | Core parser, linter (15 rules, 3 presets), CLI (`lint`, `init`), 80 tests, CI pipeline |
| v0.2.0 | 2026-03-16 | `v0.2.0` | Test harness with YAML scenarios, 8 assertion types, mock mode, console+JSON reporters |
| v0.3.0 | 2026-03-16 | `v0.3.0` | Benchmarks package (precision/recall/F1 scorer, A/B comparator, regression tracker, 3 reporters) |
| v0.4.0 | 2026-03-16 | `v0.4.0` | Adapters package (stack detector, convention detector, template engine, 3 built-in templates) |
| v0.4.1 | 2026-03-16 | — | Bug fix: monorepo support for stack/convention detection, `{{else}}` in template engine |
| v0.5.0 | 2026-03-17 | `v0.5.0` | Real skill execution (subprocess invocation, provider flags), working bench CLI (YAML config, --compare, --save, --baseline, --format) |

## Current State — What Actually Works

| Feature | Status | Notes |
|---------|--------|-------|
| `skillkit lint` | **Production-ready** | Tested against 17 real skills, found real issues |
| `skillkit init` | **Production-ready** | Simple scaffolding, works as expected |
| `skillkit test` (mock) | **Working** | Validates test structure, runs assertions against SKILL.md body as simulated output |
| `skillkit test` (real) | **Working** | Supports --real --provider --command --timeout flags for subprocess skill invocation |
| `skillkit bench` CLI | **Working** | Loads YAML config, runs benchmarks, supports --compare, --save, --baseline, --format |
| `skillkit bench` API | **Working** | Math is correct (28 tests), CLI integration complete |
| `skillkit adapt` | **Working** | Tested against real monorepo (microfrontends), correctly detects TS/Next/Tailwind/Vitest/Zustand |

## What's Next

### v0.5 — Real Skill Execution (shipped)

**Goal:** `skillkit test` and `skillkit bench` work against actual AI model output, not simulated.

| Task | Complexity | Status |
|------|-----------|--------|
| Subprocess skill invocation | Hard | **Done** — `--real --provider --command --timeout` flags on `skillkit test` |
| API key management | Medium | **Done** — reads from env vars, provider-aware |
| Output capture | Medium | **Done** — captures full skill output for assertion evaluation |
| Fixture lifecycle | Medium | **Done** — fixture manager clones to temp dirs, applies setup, cleans up |
| Built-in fixtures | Medium | Planned for v0.6 |
| Real mode for bench | Medium | **Done** — `skillkit bench` CLI loads YAML, runs benchmarks, scores output |
| Rate limiting | Easy | Planned for v0.6 |

**Approach (implemented):**
```bash
# Via CLI flags
skillkit test examples/ --real --provider claude-code --timeout 120000

# Or in skillkit.config.yaml
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

### Design Decisions

| Area | Status | Details |
|------|--------|---------|
| Infrastructure over content | Core principle | skillkit ships tools for building skills, not a library of skills. Reference skills exist as examples only. |
| Mock-first testing | **Partially addressed** | Mock mode validates structure and assertion logic. Real mode (actual AI invocation) not yet implemented. |
| Measurable improvement only | Principle | The `/improve` example uses concrete, measurable criteria (file existence, git age, description overlap) — not subjective quality judgments. |
| Maintenance sustainability | **Open risk** | Open source projects need active contributors. Community building is a priority. |
| Spec compatibility | **Open risk** | The Agent Skills spec is evolving. Upstream changes could require updates to the linter and parser. |
| Portable scaffold skills | Addressed | `skillkit adapt` generates project-specific skills from templates rather than shipping non-portable hardcoded skills. |

### Bugs Fixed in v0.4.1

| Bug | Root cause | Fix |
|-----|-----------|-----|
| Stack detector missed dependencies in monorepos | Only read root package.json, not child workspace packages | Now scans all workspace child package.json files |
| Convention detector missed directories in monorepos | Only searched root-level directories | Now searches inside monorepo child packages |
| Template `{{/if}}` leaked into generated output | Template engine didn't support `{{else}}` in conditionals | Added `{{else}}` support and refactored templates to avoid nesting |

### Untested Scenarios (Help Wanted)

- Python projects (pyproject.toml detection implemented but not tested against real repos)
- Go projects (go.mod detection implemented but not tested)
- Rust projects (Cargo.toml detection implemented but not tested)
- Non-monorepo Node.js projects (should work but not verified end-to-end)
- Windows paths (forward slash handling)
- Very large repos (10,000+ files — performance of convention scanning)
- Skills with hooks or agent mode (test harness doesn't handle these)

---

## Metrics

### Current (v0.5.0)

| Metric | Value |
|--------|-------|
| Packages | 6 |
| Tests | 195+ |
| Test execution time | ~350ms |
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
