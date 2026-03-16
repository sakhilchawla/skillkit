# Architecture

## Vision

skillkit is infrastructure for the Agent Skills ecosystem. It provides tools for building, testing, and validating skills — not a library of skills to consume.

The Agent Skills open standard (agentskills.io) is adopted by 27+ AI coding tools. skillkit works with all of them.

## System Overview

```
┌─────────────────────────────────────────────────┐
│                  @skillkit/cli                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌───────┐         │
│  │ lint │ │ test │ │ init │ │ adapt │          │
│  └──┬───┘ └──┬───┘ └──────┘ └───┬───┘         │
│     │        │                   │              │
├─────┼────────┼───────────────────┼──────────────┤
│     ▼        ▼                   ▼              │
│ @skillkit/ @skillkit/      @skillkit/           │
│  linter    test-harness     adapters            │
│     │        │                   │              │
├─────┼────────┼───────────────────┼──────────────┤
│     └────────┴───────────────────┘              │
│              @skillkit/core                      │
│         (parser, types, spec)                    │
└─────────────────────────────────────────────────┘
```

## Packages

### @skillkit/core
Foundation package. Parses SKILL.md files, provides TypeScript types, validates against the Agent Skills spec.

- **Parser**: Extracts YAML frontmatter and markdown body from SKILL.md files
- **Types**: SkillDefinition, SkillFrontmatter, SkillMetadata, SkillValidationError
- **Spec**: Constants and validators for the Agent Skills specification
- **Dependency**: `yaml` (single external dependency)

### @skillkit/linter
Validates SKILL.md files against rules organized in 4 categories:

| Category | Count | Purpose |
|----------|-------|---------|
| spec-compliance | 5 | Required fields, valid values, spec conformance |
| security | 4 | Dangerous permissions, sensitive paths, exfiltration |
| best-practice | 4 | Description quality, argument hints, structure |
| performance | 2 | Token budget, portability |

Rules are standalone modules. Adding a new rule = create one file + register in index.

Three presets: `strict` (all rules at default), `recommended` (balanced), `minimal` (spec only).

### @skillkit/test-harness (v0.2)
YAML-based test definitions for skills. Tests run skills against fixture repositories and evaluate output.

Key concepts:
- **Test Definition**: YAML file listing scenarios for a skill
- **Scenario**: Input (skill invocation) + assertions (expected output properties)
- **Fixture**: A sample repository to run the skill against
- **Assertion**: Matcher functions (contains, pattern, severity, completion)

### @skillkit/cli
Command-line interface routing to the above packages. Handles file discovery, output formatting, and exit codes.

### @skillkit/benchmarks (v0.3)
Quality scoring: run skills against known-good and known-bad inputs, measure precision/recall/F1, track regressions.

### @skillkit/adapters (v0.4)
Repo scanning and skill generation: detect stack, apply parameterized templates, output project-specific skills.

## Configuration

```yaml
# skillkit.config.yaml
version: 1
lint:
  preset: recommended
  rules:
    no-unrestricted-bash: error
test:
  timeout: 60000
  mock: true
```

## Test Definition Format

```yaml
name: review skill tests
skill: ./SKILL.md
scenarios:
  - name: catches XSS
    invoke: "/review main"
    assertions:
      - contains: "CRITICAL"
      - contains: "security"
```

## Lint Rule Structure

Each rule is a TypeScript module implementing the LintRule interface:

```typescript
export const myRule: LintRule = {
  id: 'my-rule',
  description: 'What this rule checks',
  severity: LintSeverity.WARN,
  category: LintCategory.BEST_PRACTICE,
  check(ctx: LintContext): LintResult[] {
    // Return array of findings
  }
};
```

## Test Infrastructure

80 unit tests using vitest, organized by package:

```
packages/core/src/__tests__/
  skillParser.test.ts      # 15 tests — parsing, validation, edge cases
  agentSkillsSpec.test.ts  # 8 tests — spec constants, tool validation

packages/linter/src/__tests__/
  rules.test.ts            # 49 tests — all 15 lint rules (trigger + pass cases)
  engine.test.ts           # 8 tests — engine, presets, overrides, sorting
```

CI pipeline (GitHub Actions): `tsc --build` → `skillkit lint examples/` → `vitest run`

## Design Principles

1. **Infrastructure, not content** — We ship tools, not skills
2. **Zero/minimal dependencies** — core has one dep (yaml), linter has zero beyond core
3. **Strict TypeScript** — No `any`, full type safety
4. **Cross-tool compatibility** — Works with all 27+ Agent Skills tools
5. **Standalone packages** — Each package usable independently via import

## Roadmap

| Version | Milestone | Key Deliverable |
|---------|-----------|-----------------|
| v0.1 | Foundation | Parser, linter (15 rules), CLI, init, 80 tests, CI |
| v0.2 | Testing | YAML test harness, mock mode, fixtures |
| v0.3 | Quality | Benchmarking, scoring, regression tracking |
| v0.4 | Generation | Repo scanning, adaptive skill generation |
| v1.0 | Ecosystem | Plugin API, CI/CD, cross-tool testing |

## Competitive Positioning

| Feature | skillkit | anthropics/skills | superpowers | gstack |
|---------|---------|-------------------|-------------|--------|
| Skill library | Examples only | 17 skills | 13 skills | 8 skills |
| Linting | 15 rules, 3 presets | — | — | — |
| Testing | YAML scenarios | — | — | — |
| Benchmarking | Quality scoring | — | — | — |
| Adaptive generation | Repo-aware | — | — | — |
| Cross-tool support | 27+ tools | Claude only | 5 tools | Claude only |
