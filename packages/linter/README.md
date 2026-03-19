# @skillkit/linter

Lint and validate Agent Skills against the spec and best practices. 20 rules across 5 categories, 4 presets (strict, recommended, minimal, research).

## Usage

```ts
import { LintEngine } from '@skillkit/linter';

const engine = new LintEngine({ preset: 'recommended' });
const report = await engine.lintFile('./SKILL.md');
console.log(report.errorCount, report.warnCount);
```

Or via CLI: `npx @skillkit/cli lint .`

Part of the [skillkit](https://github.com/sakhilchawla/skillkit) monorepo.
