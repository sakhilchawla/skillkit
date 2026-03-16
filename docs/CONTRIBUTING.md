# Contributing to skillkit

## Development Setup

```bash
git clone https://github.com/skillkit/skillkit
cd skillkit
npm install
npm run build
```

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

2. Add to `packages/linter/src/rules/index.ts`
3. Add to appropriate preset(s)
4. Test against the example skills in `examples/`

## Adding a Reference Skill

1. Create `examples/<name>/SKILL.md` — the skill itself
2. Create `examples/<name>/<name>.test.yaml` — test scenarios
3. Create `examples/<name>/DESIGN.md` — design decisions
4. Verify: `npx skillkit lint examples/<name>/`

## Code Style

- TypeScript strict mode (no `any`)
- JSDoc on all public APIs
- Minimal dependencies (justify any new dep in PR)
- Each lint rule in its own file

## PR Process

1. Fork and create a feature branch
2. Make changes with tests
3. Run `npm run lint && npm run build`
4. Submit PR with description of what and why
