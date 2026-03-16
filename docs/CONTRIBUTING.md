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

You should see: build passes, 139+ tests pass, 6 reference skills lint clean.

## Test Infrastructure

Tests use [vitest](https://vitest.dev/) and live next to the source code. Currently 139 tests across 9 test files:

```
packages/core/src/__tests__/
  skillParser.test.ts      # 15 tests — SKILL.md parser
  agentSkillsSpec.test.ts  # 8 tests — spec validation utilities

packages/linter/src/__tests__/
  rules.test.ts            # 49 tests — all 15 lint rules
  engine.test.ts           # 8 tests — lint engine + presets

packages/test-harness/src/__tests__/
  assertions.test.ts       # Assertion evaluation (all 8 types: contains, notContains, matchesPattern, severity, completes, noErrors, noCriticalIssues, maxTokens)
  loader.test.ts           # YAML test definition parsing and validation

packages/benchmarks/src/__tests__/
  scorer.test.ts           # Precision/recall/F1 scoring
  tracker.test.ts          # Regression detection
  comparator.test.ts       # A/B skill comparison
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
3. Add to appropriate preset(s) in `packages/linter/src/presets/`
4. Write tests in `packages/linter/src/__tests__/rules.test.ts` — add a `describe` block
5. Verify: `npm test && npm run lint:self`

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
