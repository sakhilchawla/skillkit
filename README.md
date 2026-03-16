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

# Run skill tests (v0.2)
npx skillkit test examples/
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

### `skillkit test` — Test skills with declarative scenarios (v0.2)

```yaml
# review.test.yaml
name: review skill tests
skill: ./SKILL.md

scenarios:
  - name: catches XSS vulnerability
    invoke: "/review main"
    assertions:
      - contains: "CRITICAL"
      - contains: "security"

  - name: no false positives on clean code
    invoke: "/review main"
    assertions:
      - noCriticalIssues: true
```

### `skillkit adapt` — Generate project-specific skills (v0.4)

Scans your repo, detects your stack, and generates skills tailored to YOUR conventions.

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
  cli/           @skillkit/cli       — CLI commands (lint, test, init, adapt)
  test-harness/  @skillkit/test-harness — Test runner, assertions, fixtures (v0.2)
  benchmarks/    @skillkit/benchmarks   — Quality scoring, comparison (v0.3)
  adapters/      @skillkit/adapters     — Repo scanning, skill generation (v0.4)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

## Roadmap

| Version | Features | Status |
|---------|----------|--------|
| v0.1 | `lint` (15 rules), `init`, core parser | **Current** |
| v0.2 | `test` with YAML scenarios, mock mode, fixtures | Planned |
| v0.3 | `bench` with quality scoring and regression tracking | Planned |
| v0.4 | `adapt` with repo scanning and skill generation | Planned |
| v1.0 | Plugin API, CI/CD integration, cross-tool testing | Planned |

## Compatibility

Works with any tool that supports the Agent Skills standard:

Claude Code · Codex CLI · Gemini CLI · Cursor · VS Code · GitHub Copilot · Windsurf · Aider · OpenCode · and 18+ more

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md).

## License

MIT
