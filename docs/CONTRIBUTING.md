# Contributing to skillkit

## Development Setup

```bash
git clone https://github.com/sakhilchawla/skillkit
cd skillkit
npm install
```

### Available Scripts

```bash
npm run build          # TypeScript build (tsc --build)
npm test               # Run all unit tests (vitest)
npm run test:watch     # Watch mode for development
npm run test:coverage  # Tests with coverage report (80% threshold)
npm run lint:self      # Lint the reference skills in examples/
npm run typecheck      # Type-check without emitting files
npm run clean          # Clean all build artifacts
```

### Verify everything works

```bash
npm run build && npm test && npm run lint:self
```

You should see: build passes, 247+ tests pass, 6 reference skills lint clean.

## Test Infrastructure

Tests use [vitest](https://vitest.dev/) and live next to the source code. Currently 247+ tests across 16 test files:

```
packages/core/src/__tests__/
  skillParser.test.ts      # 15 tests — SKILL.md parser
  agentSkillsSpec.test.ts  # 8 tests — spec validation utilities

packages/linter/src/__tests__/
  rules.test.ts            # 49+ tests — all 20 lint rules
  engine.test.ts           # 8 tests — lint engine + presets

packages/test-harness/src/__tests__/
  assertions.test.ts       # Assertion evaluation (all 8 types: contains, notContains, matchesPattern, severity, completes, noErrors, noCriticalIssues, maxTokens)
  loader.test.ts           # YAML test definition parsing and validation
  runner.test.ts           # Test runner (mock + real mode, invoker config)

packages/benchmarks/src/__tests__/
  scorer.test.ts           # Precision/recall/F1 scoring
  tracker.test.ts          # Regression detection
  comparator.test.ts       # A/B skill comparison

packages/adapters/src/__tests__/
  (tests for stack detection, convention detection, and template rendering)
```

**When adding code, add tests.** Every lint rule needs at least:
- A test that triggers the rule (returns results)
- A test that passes clean (returns empty array)

## Adding a New Lint Rule

1. Create `packages/linter/src/rules/my-rule.ts`:
```typescript
import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

export const myRule: LintRule = {
  id: 'my-rule',
  description: 'What this checks',
  severity: LintSeverity.WARN,
  category: LintCategory.BEST_PRACTICE,
  check(ctx: LintContext): LintResult[] {
    // Your validation logic
    return [];
  },
};
```

2. Register in `packages/linter/src/rules/index.ts` — import and add to `allRules` array
3. Add to appropriate preset(s) in `packages/linter/src/presets/` (4 presets: strict, recommended, minimal, research)
4. Write tests in `packages/linter/src/__tests__/rules.test.ts` — add a `describe` block
5. Verify: `npm test && npm run lint:self`

## Adding a New Detector

Stack and convention detectors live in `packages/adapters/src/detectors/`.

1. Open `packages/adapters/src/detectors/stackDetector.ts` to add a new detection rule:
   - Add a new entry to `NODE_DEP_RULES` for dependency-based detection
   - Or add a new file-existence check in the `detectStack` function
2. Each detection should produce a `DetectionSignal` with a confidence score (0-1)
3. Add tests in `packages/adapters/src/__tests__/`
4. Verify: `npm test`

Example — detecting a new framework:

```typescript
// In NODE_DEP_RULES array:
{ pattern: 'remix', category: 'framework', field: 'framework', value: 'remix', confidence: 0.9 },
```

## Adding a New Template

Templates define the skill structure that gets customized per-project.

1. Create `packages/adapters/src/templates/createMyThing.ts`:
```typescript
import type { SkillTemplate } from '../types.js';

export const createMyThingTemplate: SkillTemplate = {
  name: 'create-my-thing',
  description: 'Create a new thing following project conventions',
  type: 'create-my-thing',
  supportedLanguages: ['typescript', 'javascript'],
  template: `---
name: create-my-thing
description: Create a new thing following {{projectName}} conventions
user-invocable: true
allowed-tools: Read, Write, Glob, Grep
argument-hint: "<Name>"
---

# Create: $ARGUMENTS

{{#if (eq stack.language "typescript")}}
Create a TypeScript file...
{{/if}}
`,
};
```

2. Register in `packages/adapters/src/templates/index.ts`:
   - Import the template
   - Add it to the `builtInTemplates` array
   - Add a shorthand alias in `TEMPLATE_ALIASES` if desired
3. Add tests for the template rendering
4. Verify: `npm test`

Templates support three constructs:
- `{{variable.path}}` — simple replacement with dot-notation
- `{{#if variable}}...{{/if}}` — truthiness conditionals
- `{{#if (eq variable "value")}}...{{/if}}` — equality conditionals

## Adding a Reference Skill

1. Create `examples/<name>/SKILL.md` — the skill itself
2. Create `examples/<name>/<name>.test.yaml` — test scenarios
3. Create `examples/<name>/DESIGN.md` — design decisions explaining trade-offs
4. Verify: `npm run lint:self` (lints all skills in examples/)

## Code Style

- TypeScript strict mode (no `any`)
- JSDoc comments on all public APIs
- Minimal dependencies (justify any new dep in PR)
- Each lint rule in its own file
- Tests next to source code in `__tests__/` directories

## CI Pipeline

GitHub Actions runs on every push/PR to main:
1. `npm install`
2. `tsc --build` — TypeScript compilation
3. `skillkit lint examples/` — self-lint reference skills
4. `vitest run` — all unit tests

Your PR must pass all 3 checks to merge.

## PR Process

1. Fork and create a feature branch
2. Make changes **with tests**
3. Run `npm run build && npm test && npm run lint:self`
4. Submit PR with description of what and why
5. CI will verify automatically
