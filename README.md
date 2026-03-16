# skillkit

**Build, test, lint, and benchmark Agent Skills for 27+ AI coding tools.**

skillkit is a development toolkit for the [Agent Skills](https://agentskills.io) open standard — the same format used by Claude Code, Codex CLI, Gemini CLI, Cursor, VS Code, and GitHub Copilot.

> **Not a skill library.** The ecosystem has 1,000+ skills already. What it doesn't have is a way to test, validate, and measure skill quality. skillkit is `pytest + eslint` for Agent Skills.

## Why

- **100K+ skills exist** across anthropics/skills, superpowers, gstack, and community repos
- **Zero of them are tested.** Nobody can verify a skill works before shipping it
- **Zero quality metrics.** "Good skill" is subjective — no precision/recall, no regression detection
- **Scaffold skills are non-portable.** A /create-component for React/Tailwind is useless for Vue/SCSS

skillkit solves all four problems.

## Quick Start

```bash
# Lint your skills
npx skillkit lint .claude/skills/

# Scaffold a new skill
npx skillkit init review

# Run skill tests (mock mode)
npx skillkit test examples/

# Generate a project-adapted skill
npx skillkit adapt component
```

## Features

### `skillkit lint` — Validate skills against spec and best practices

15 built-in rules across 4 categories:

| Category | Rules | Examples |
|----------|-------|---------|
| Spec compliance | 5 | Required fields, valid frontmatter, known tools |
| Security | 4 | Unrestricted Bash, sensitive paths, data exfiltration |
| Best practices | 4 | Description quality, argument hints, heading structure |
| Performance | 2 | Token budget, hardcoded paths |

Three presets: `strict`, `recommended`, `minimal`.

```
$ skillkit lint .claude/skills/

  .claude/skills/review/SKILL.md
  ✓ No issues found

  .claude/skills/deploy/SKILL.md
  ✖ Skill has Bash access but body contains no safety constraints (no-unrestricted-bash)
    → Add instructions about what commands are forbidden
  ⚠ Description too short (12 chars, minimum 20) (require-description)

  FAIL 1 error(s), 1 warning(s) across 2 file(s)
```

### `skillkit init` — Scaffold new skills

```bash
$ skillkit init review
✓ Created skill review:
  review/SKILL.md
  review/review.test.yaml

Next: edit SKILL.md, then run skillkit lint review/
```

### `skillkit test` — Test skills with declarative scenarios

```yaml
# review.test.yaml
name: review skill tests
skill: ./SKILL.md

scenarios:
  - name: catches security vulnerability
    invoke: "/review main"
    assertions:
      - contains: "CRITICAL"
      - contains: "Security"

  - name: includes severity categories
    invoke: "/review main"
    assertions:
      - contains: "[CRITICAL]"
      - contains: "[WARNING]"
      - contains: "[SUGGESTION]"
```

Mock mode (default) evaluates assertions against the SKILL.md body. 8 assertion types: `contains`, `notContains`, `matchesPattern`, `severity`, `completes`, `noErrors`, `noCriticalIssues`, `maxTokens`.

### `skillkit adapt` — Generate project-specific skills

Scans your repo, detects your stack, and generates skills tailored to YOUR conventions.

```
$ skillkit adapt component

Scanning /path/to/my-project

Detected stack:
  Language:       typescript
  Framework:      next (App Router)
  Styling:        tailwind
  Testing:        vitest
  State:          zustand
  Build tool:     turborepo
  Monorepo:       yes
  Package manager: npm

Generating skill from template: create-component

Generated: .claude/skills/create-component/SKILL.md
  Template:  create-component
  Stack:     typescript / next / tailwind / vitest
  Output:    .claude/skills/create-component/SKILL.md

  Try it: /create-component MyItem
```

Three built-in templates: `component`, `module`, `test`. The generated skill uses your real paths, your real naming conventions, and your real test framework -- no manual editing required.

### `skillkit bench` — Quality benchmarking (v0.3)

Measure precision, recall, and token efficiency. Compare skills. Detect regressions.

## Reference Skills

6 production-quality skills included as examples (not the product):

| Skill | What it does |
|-------|-------------|
| [review](examples/review/) | Two-pass code review with severity levels |
| [ship](examples/ship/) | Auto-detect project type, test, lint, push, create PR |
| [tdd](examples/tdd/) | Strict RED-GREEN-REFACTOR enforcement |
| [investigate](examples/investigate/) | Evidence-based debugging (Reproduce → Hypothesize → Verify → Fix) |
| [scaffold](examples/scaffold/) | Meta-skill: generates project-specific scaffold skills |
| [improve](examples/improve/) | Audit skill configurations for staleness, gaps, quality |

Each includes a SKILL.md, test definition, and design document explaining trade-offs.

## Architecture

```
packages/
  core/          @skillkit/core      — SKILL.md parser, types, spec validation
  linter/        @skillkit/linter    — 15 lint rules, 3 presets, engine
  cli/           @skillkit/cli       — CLI commands (lint, test, init, bench, adapt)
  test-harness/  @skillkit/test-harness — Test runner, assertions, fixtures (v0.2)
  benchmarks/    @skillkit/benchmarks   — Quality scoring, comparison (v0.3)
  adapters/      @skillkit/adapters     — Repo scanning, stack detection, skill generation (v0.4)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

## Roadmap

| Version | Features | Status |
|---------|----------|--------|
| v0.1 | `lint` (15 rules), `init`, core parser, CI | Shipped |
| v0.2 | `test` with YAML scenarios, mock mode, 8 assertion types | Shipped |
| v0.3 | `bench` with quality scoring and regression tracking | Shipped |
| v0.4 | `adapt` with repo scanning, stack detection, and skill generation | **Current** |
| v1.0 | Plugin API, CI/CD integration, cross-tool testing | Planned |

## Compatibility

Works with any tool that supports the Agent Skills standard:

Claude Code · Codex CLI · Gemini CLI · Cursor · VS Code · GitHub Copilot · Windsurf · Aider · OpenCode · and 18+ more

## Documentation

| Guide | What it covers |
|-------|---------------|
| [Getting Started](docs/GUIDE_OVERVIEW.md) | What skillkit is, what Agent Skills are, your first 5 minutes |
| [Linting Skills](docs/GUIDE_LINT.md) | All 15 rules explained with examples, presets, CI/CD setup |
| [Testing Skills](docs/GUIDE_TEST.md) | YAML test format, assertions, fixtures, mock vs real mode |
| [Benchmarking Skills](docs/GUIDE_BENCH.md) | Precision/recall scoring, A/B comparison, regression tracking |
| [Adapting Skills](docs/GUIDE_ADAPT.md) | Stack detection, templates, generating project-specific skills |
| [Creating Skills](docs/GUIDE_INIT.md) | Scaffolding new skills, naming tips, full workflow |
| [Writing Excellent Skills](docs/WRITING_SKILLS.md) | Best practices, anti-patterns, quality rubric |
| [Architecture](docs/ARCHITECTURE.md) | Package design, data flow, extension points |
| [Contributing](docs/CONTRIBUTING.md) | How to add rules, fixtures, templates |

## Development

```bash
git clone https://github.com/sakhilchawla/skillkit
cd skillkit
npm install

npm run build          # TypeScript build (tsc --build)
npm test               # Run 175+ unit tests (vitest)
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
npm run lint:self      # Lint the reference skills
npm run typecheck      # Type-check without emitting
npm run clean          # Clean build artifacts
```

CI runs automatically on push/PR to main: build → self-lint → test.

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md).

## License

MIT
