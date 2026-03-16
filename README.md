# skillkit

**Build, test, lint, and benchmark Agent Skills for 27+ AI coding tools.**

skillkit is the developer toolkit for the [Agent Skills](https://agentskills.io) open standard — the same SKILL.md format used by Claude Code, Codex CLI, Gemini CLI, Cursor, VS Code, GitHub Copilot, Windsurf, Aider, and 18+ more.

> **Not a skill library.** The ecosystem already has thousands of skills. What it doesn't have is infrastructure — no way to test if a skill works, no way to measure quality, no way to catch regressions. skillkit is **pytest + eslint for Agent Skills**.

---

## The Problem

The Agent Skills ecosystem is booming — Anthropic's official repo, superpowers, gstack, and hundreds of community collections. But:

| Problem | Impact |
|---------|--------|
| **No testing** | You edit a skill prompt and have no idea if you made it better or worse |
| **No validation** | Skills ship with missing fields, security risks, and hardcoded paths |
| **No quality metrics** | "Good skill" is a vibe, not a number. No precision, no recall, no regression detection |
| **Non-portable scaffolds** | A `/create-component` for React/Tailwind is useless for Vue/SCSS. Every team rewrites from scratch |

skillkit solves all four.

---

## Quick Start

```bash
# Lint your existing skills
npx skillkit lint .claude/skills/

# Create a new skill with proper structure
npx skillkit init review

# Run skill tests
npx skillkit test examples/

# Generate a skill tailored to YOUR project
npx skillkit adapt component
```

---

## What It Does

### 1. `skillkit lint` — Catch problems before they ship

15 rules across 4 categories find real issues in your skills:

```
$ skillkit lint .claude/skills/

  review/SKILL.md
  ✓ No issues found

  deploy/SKILL.md
  ✖ Missing required field: description                    (require-description)
    → Add a description explaining what this skill does
  ✖ Skill references sensitive path: ~/.ssh (SSH keys)     (no-sensitive-paths)
    → Remove references to sensitive paths
  ⚠ Bash access but body contains no safety constraints    (no-unrestricted-bash)
    → Add instructions about what commands are forbidden
  ⚠ Destructive command found: rm -rf                      (no-destructive-commands)
    → Add confirmation step before destructive operations

  FAIL 2 error(s), 2 warning(s) across 2 file(s)
```

**What it catches:**

| Category | Rules | Examples |
|----------|-------|---------|
| **Spec compliance** | 5 | Missing name/description, unknown frontmatter fields, invalid tools |
| **Security** | 4 | Unrestricted Bash, sensitive paths (`.ssh`, `.env`), data exfiltration (`curl`), destructive commands (`rm -rf`, `DROP TABLE`) |
| **Best practices** | 4 | Vague descriptions, missing argument hints, skipped heading levels, empty body |
| **Performance** | 2 | Token budget exceeded (>5000 tokens), hardcoded absolute paths |

Three presets: **strict** (all rules as errors), **recommended** (balanced, default), **minimal** (spec compliance only).

Configure via `skillkit.config.yaml`:
```yaml
lint:
  preset: recommended
  rules:
    no-unrestricted-bash: error    # Promote to error
    consistent-headings: off       # Turn off
```

### 2. `skillkit test` — Verify skills work

Write YAML test scenarios, run them:

```yaml
# review.test.yaml
name: review skill tests
skill: ./SKILL.md

scenarios:
  - name: catches security issues
    invoke: "/review main"
    assertions:
      - contains: "CRITICAL"
      - contains: "Security"

  - name: includes all severity levels
    invoke: "/review main"
    assertions:
      - contains: "[CRITICAL]"
      - contains: "[WARNING]"
      - contains: "[SUGGESTION]"

  - name: stays within token budget
    invoke: "/review main"
    assertions:
      - completes: true
      - maxTokens: 2000
```

```
$ skillkit test examples/

  review skill tests
    ✓ catches security issues (0ms)
    ✓ includes all severity levels (0ms)
    ✓ stays within token budget (0ms)

  ship skill tests
    ✓ checks branch before shipping (0ms)
    ✓ follows failure protocol (0ms)

  tdd skill tests
    ✓ writes test before implementation (0ms)
    ✓ follows RED GREEN REFACTOR cycle (0ms)

  PASS 13 passed, 13 total (9ms)
```

**8 assertion types:**

| Assertion | What it checks |
|-----------|---------------|
| `contains: "text"` | Output includes this string |
| `notContains: "text"` | Output does NOT include this string |
| `matchesPattern: "regex"` | Output matches this regular expression |
| `severity: "CRITICAL"` | Output mentions this severity level |
| `completes: true` | Skill finished without crashing |
| `noErrors: true` | No "error" anywhere in output |
| `noCriticalIssues: true` | No "critical" or "blocker" in output |
| `maxTokens: 500` | Output stays under token budget |

### 3. `skillkit bench` — Measure quality with numbers

Define a ground truth (known issues in a test repo), run your skill, get scores:

| Metric | What it answers | Example |
|--------|----------------|---------|
| **Precision** | Of issues reported, how many were real? | 4 reported, 3 real = 75% |
| **Recall** | Of real issues, how many did it find? | 5 bugs planted, found 4 = 80% |
| **F1** | Overall accuracy (harmonic mean) | 77.4% |

Plus **A/B comparison** (skill v1 vs v2 on same inputs) and **regression tracking** (did this prompt edit make quality drop?).

Three output formats: colored console, JSON for CI, markdown for PR comments.

### 4. `skillkit adapt` — Generate skills for YOUR project

Scans your repo, detects your stack, generates a skill that matches your conventions:

```
$ skillkit adapt component

Detected stack:
  Language:       typescript
  Framework:      next
  Styling:        tailwind
  Testing:        vitest
  State:          zustand
  Build tool:     turborepo
  Monorepo:       yes

Generated: .claude/skills/create-component/SKILL.md
  Try it: /create-component MyButton
```

**What it detects:**

| Signal | Sources checked |
|--------|----------------|
| Language | package.json, pyproject.toml, Cargo.toml, go.mod, pom.xml |
| Framework | next, react, vue, svelte, express, django, fastapi, gin |
| Styling | tailwindcss, styled-components, sass, css-modules |
| Testing | vitest, jest, pytest, go test, cargo test |
| State | zustand, redux, pinia, mobx |
| Build tool | turborepo, nx, vite, webpack |
| Monorepo | workspaces field, turbo.json, nx.json, lerna.json |

Three built-in templates: `component`, `module`, `test`. The generated skill uses your actual directory paths, naming conventions, and test patterns.

**Monorepo-aware:** In monorepos, it scans all workspace child packages to find the real dependencies — not just the root package.json.

### 5. `skillkit init` — Start with the right structure

```bash
$ skillkit init review

✓ Created skill review:
  review/SKILL.md          # Properly structured template
  review/review.test.yaml  # Test skeleton ready to fill in

Next: edit SKILL.md, then run skillkit lint review/
```

---

## The Complete Workflow

```bash
skillkit init my-skill           # 1. Scaffold with proper structure
vim my-skill/SKILL.md            # 2. Write your instructions
skillkit lint my-skill/           # 3. Catch problems
vim my-skill/my-skill.test.yaml  # 4. Write test scenarios
skillkit test my-skill/           # 5. Verify it works
```

Or generate a project-specific skill automatically:

```bash
skillkit adapt component          # Scan repo → detect stack → generate skill
skillkit lint .claude/skills/     # Verify it's clean
```

---

## Reference Skills

6 production-quality skills included as **teaching examples** (not the product):

| Skill | What it does | Design doc |
|-------|-------------|------------|
| [review](examples/review/) | Two-pass code review: critical issues first, then suggestions | [DESIGN.md](examples/review/DESIGN.md) |
| [ship](examples/ship/) | Auto-detect project type → test → lint → commit → push → create PR | [DESIGN.md](examples/ship/DESIGN.md) |
| [tdd](examples/tdd/) | Strict RED-GREEN-REFACTOR with phase verification | [DESIGN.md](examples/tdd/DESIGN.md) |
| [investigate](examples/investigate/) | Reproduce → Hypothesize → Verify → Fix (no skipping to fix) | [DESIGN.md](examples/investigate/DESIGN.md) |
| [scaffold](examples/scaffold/) | Meta-skill: reads your repo and generates scaffold skills for you | [DESIGN.md](examples/scaffold/DESIGN.md) |
| [improve](examples/improve/) | Audit skills for staleness, redundancy, spec issues, gaps | [DESIGN.md](examples/improve/DESIGN.md) |

Each includes a SKILL.md, test definition (`.test.yaml`), and a design document explaining trade-offs. All tests pass: `skillkit test examples/` → 13/13 green.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  @skillkit/cli                   │
│  ┌──────┐ ┌──────┐ ┌───────┐ ┌──────┐ ┌─────┐ │
│  │ lint │ │ test │ │ bench │ │ init │ │adapt│ │
│  └──┬───┘ └──┬───┘ └───┬───┘ └──────┘ └──┬──┘ │
├─────┼────────┼─────────┼─────────────────┼─────┤
│     ▼        ▼         ▼                 ▼     │
│ @skillkit/ @skillkit/ @skillkit/    @skillkit/  │
│  linter    test-      benchmarks    adapters    │
│            harness                              │
├─────────────────────────────────────────────────┤
│                 @skillkit/core                   │
│           parser · types · spec                  │
└─────────────────────────────────────────────────┘
```

| Package | What it does |
|---------|-------------|
| **@skillkit/core** | SKILL.md parser, TypeScript types, Agent Skills spec validation |
| **@skillkit/linter** | 15 lint rules, 3 presets (strict/recommended/minimal), engine |
| **@skillkit/test-harness** | YAML test loader, 8 assertion matchers, test runner, reporters |
| **@skillkit/benchmarks** | Precision/recall scorer, A/B comparator, regression tracker |
| **@skillkit/adapters** | Stack detector, convention detector, template engine, 3 templates |
| **@skillkit/cli** | CLI entry point routing to all packages |

Each package is usable independently:
```typescript
import { parseSkill } from '@skillkit/core';
import { LintEngine } from '@skillkit/linter';
import { runTests } from '@skillkit/test-harness';
import { scoreOutput } from '@skillkit/benchmarks';
import { detectStack } from '@skillkit/adapters';
```

---

## Compatibility

Works with **any tool** that supports the [Agent Skills](https://agentskills.io) open standard:

Claude Code · Codex CLI · Gemini CLI · Cursor · VS Code · GitHub Copilot · Windsurf · Aider · OpenCode · and 18+ more

---

## Roadmap

| Version | Features | Status |
|---------|----------|--------|
| v0.1 | `lint` (15 rules), `init`, core parser, CI | Shipped |
| v0.2 | `test` with YAML scenarios, mock mode, 8 assertion types | Shipped |
| v0.3 | `bench` with quality scoring and regression tracking | Shipped |
| v0.4 | `adapt` with repo scanning, stack detection, skill generation | Shipped |
| v0.5 | Real skill execution (subprocess invocation, fixture repos) | Next |
| v0.6 | Plugin API for custom rules, scenarios, templates | Planned |
| v0.7 | npm publish (`npm install -g skillkit`) | Planned |
| v0.8 | CI/CD integration (GitHub Actions, pre-commit hooks) | Planned |
| v1.0 | Stable release, cross-tool testing, community governance | Planned |

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full plan with task breakdowns and contribution opportunities.

---

## Documentation

| Guide | What it covers |
|-------|---------------|
| [Getting Started](docs/GUIDE_OVERVIEW.md) | What skillkit is, what Agent Skills are, your first 5 minutes |
| [Linting Skills](docs/GUIDE_LINT.md) | All 15 rules with bad/good examples, presets, CI/CD setup |
| [Testing Skills](docs/GUIDE_TEST.md) | YAML test format, all assertion types, fixtures, mock vs real mode |
| [Benchmarking Skills](docs/GUIDE_BENCH.md) | Precision/recall scoring, A/B comparison, regression tracking |
| [Adapting Skills](docs/GUIDE_ADAPT.md) | Stack detection, templates, generating project-specific skills |
| [Creating Skills](docs/GUIDE_INIT.md) | Scaffolding new skills, naming tips, full workflow |
| [Writing Excellent Skills](docs/WRITING_SKILLS.md) | Best practices, anti-patterns, quality rubric |
| [Architecture](docs/ARCHITECTURE.md) | Package design, data flow, extension points |
| [Roadmap](docs/ROADMAP.md) | v0.5–v1.0 plan, known gaps, metrics, contribution opportunities |
| [Contributing](docs/CONTRIBUTING.md) | How to add rules, templates, fixtures |

---

## Development

```bash
git clone https://github.com/sakhilchawla/skillkit
cd skillkit
npm install

npm run build          # TypeScript build
npm test               # 175 unit tests (~320ms)
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
npm run lint:self      # Lint the reference skills
npm run typecheck      # Type-check without emitting
npm run clean          # Clean build artifacts
```

CI runs automatically on push/PR to main: build → self-lint → test.

---

## Contributing

We welcome contributions! The highest-impact areas right now:

1. **Test against your repo** — run `skillkit adapt component .` and [report bugs](https://github.com/sakhilchawla/skillkit/issues)
2. **Add lint rules** — each rule is one file, easy to contribute
3. **Add adapter templates** — write templates for your framework
4. **Test Python/Go/Rust detection** — implemented but needs real-world validation

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for development setup and guidelines.

---

## License

MIT
