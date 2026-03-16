# Architecture

## Vision

skillkit is infrastructure for the Agent Skills ecosystem. It provides tools for building, testing, and validating skills — not a library of skills to consume.

The Agent Skills open standard (agentskills.io) is adopted by 27+ AI coding tools. skillkit works with all of them.

## System Overview

```
┌──────────────────────────────────────────────────────┐
│                    @skillkit/cli                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌───────┐ ┌───────┐   │
│  │ lint │ │ test │ │ init │ │ bench │ │ adapt │    │
│  └──┬───┘ └──┬───┘ └──────┘ └───┬───┘ └───┬───┘   │
│     │        │                   │          │        │
├─────┼────────┼───────────────────┼──────────┼────────┤
│     ▼        ▼                   ▼          ▼        │
│ @skillkit/ @skillkit/      @skillkit/  @skillkit/    │
│  linter    test-harness    benchmarks   adapters     │
│     │        │                   │          │        │
├─────┼────────┼───────────────────┼──────────┼────────┤
│     └────────┴───────────────────┴──────────┘        │
│                  @skillkit/core                       │
│             (parser, types, spec)                     │
└──────────────────────────────────────────────────────┘
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

### @skillkit/test-harness (v0.2 -- shipped)
YAML-based test definitions for skills. In mock mode, reads the SKILL.md body and evaluates assertions against it. Supports 8 assertion types.

Key concepts:
- **Test Definition**: YAML file listing scenarios for a skill
- **Scenario**: Input (skill invocation) + assertions (expected output properties)
- **Fixture**: A sample repository to run the skill against (used in real mode)
- **Assertion**: Matcher functions (contains, notContains, matchesPattern, severity, completes, noErrors, noCriticalIssues, maxTokens)
- **Mock mode**: Uses SKILL.md body as simulated output (fast, free, no API key)
- **Real mode**: Planned for v0.3 (invokes actual AI model)

### @skillkit/benchmarks (v0.3 -- shipped)
Quality scoring: run skills against known-good and known-bad inputs, measure precision/recall/F1, track regressions. Package at `packages/benchmarks/`.

### @skillkit/adapters (v0.4 -- current)
Repo scanning and project-adapted skill generation. Detects your tech stack and conventions, then renders parameterized templates into project-specific skills.

Architecture:

```
packages/adapters/src/
├── types.ts                    # DetectedStack, TemplateContext, AdaptResult
├── detectors/
│   ├── stackDetector.ts        # Scans package.json, Cargo.toml, go.mod, etc.
│   │                           # Detects: language, framework, styling, testing,
│   │                           # state management, build tool, monorepo, package manager
│   ├── conventionDetector.ts   # Scans source files for naming, directories, patterns
│   │                           # Detects: naming conventions, component/test/module dirs,
│   │                           # export style, barrel exports, test suffix, CSS modules
│   └── index.ts                # Re-exports detectStack, detectConventions
├── templates/
│   ├── createComponent.ts      # Component scaffold template (React/Vue/Svelte-aware)
│   ├── createModule.ts         # API module/service template (TS/JS/Python)
│   ├── createTest.ts           # Test file template (Vitest/Jest/pytest/Go/Rust)
│   └── index.ts                # Template registry with alias resolution
├── generator/
│   ├── templateEngine.ts       # Handlebars-subset renderer ({{var}}, {{#if}}, {{#if (eq)}})
│   ├── adapter.ts              # adaptTemplate() and adaptAndSave() orchestrator
│   └── index.ts                # Re-exports
└── index.ts                    # Public API
```

Key design decisions:
- **Read-only scanning**: Detectors only read files (package.json, tsconfig.json, source files). No code execution, no installs.
- **Confidence signals**: Each detection produces signals with confidence scores for debugging and conflict resolution.
- **Alias support**: Users type `skillkit adapt component` (shorthand) or `skillkit adapt create-component` (full name).
- **Minimal template engine**: Supports `{{var}}`, `{{#if var}}`, `{{#if (eq var "value")}}` -- enough for skill templates without pulling in Handlebars.

### @skillkit/cli
Command-line interface routing to the above packages. Handles file discovery, output formatting, and exit codes.

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

175+ unit tests using vitest, organized by package:

```
packages/core/src/__tests__/
  skillParser.test.ts      # 15 tests — parsing, validation, edge cases
  agentSkillsSpec.test.ts  # 8 tests — spec constants, tool validation

packages/linter/src/__tests__/
  rules.test.ts            # 49 tests — all 15 lint rules (trigger + pass cases)
  engine.test.ts           # 8 tests — engine, presets, overrides, sorting

packages/test-harness/src/__tests__/
  assertions.test.ts       # Assertion evaluation (all 8 types)
  loader.test.ts           # YAML test definition parsing and validation

packages/benchmarks/src/__tests__/
  scorer.test.ts           # Precision/recall/F1 scoring
  tracker.test.ts          # Regression detection
  comparator.test.ts       # A/B skill comparison
```

CI pipeline (GitHub Actions): `tsc --build` → `skillkit lint examples/` → `vitest run`

## Design Principles

1. **Infrastructure, not content** — We ship tools, not skills
2. **Zero/minimal dependencies** — core has one dep (yaml), linter has zero beyond core
3. **Strict TypeScript** — No `any`, full type safety
4. **Cross-tool compatibility** — Works with all 27+ Agent Skills tools
5. **Standalone packages** — Each package usable independently via import

## Roadmap

| Version | Milestone | Key Deliverable | Status |
|---------|-----------|-----------------|--------|
| v0.1 | Foundation | Parser, linter (15 rules), CLI, init, CI | Shipped |
| v0.2 | Testing | YAML test harness, mock mode, 8 assertion types | Shipped |
| v0.3 | Quality | Benchmarking, scoring, regression tracking | Shipped |
| v0.4 | Generation | Repo scanning, stack detection, adaptive skill generation | **Current** |
| v1.0 | Ecosystem | Plugin API, CI/CD, cross-tool testing | Planned |

## Competitive Positioning

| Feature | skillkit | anthropics/skills | superpowers | gstack |
|---------|---------|-------------------|-------------|--------|
| Skill library | Examples only | 17 skills | 13 skills | 8 skills |
| Linting | 15 rules, 3 presets | — | — | — |
| Testing | YAML scenarios | — | — | — |
| Benchmarking | Quality scoring | — | — | — |
| Adaptive generation | Repo-aware | — | — | — |
| Cross-tool support | 27+ tools | Claude only | 5 tools | Claude only |
