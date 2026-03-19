# @skillkit/test-harness

YAML-driven test framework for Agent Skills. Mock mode for fast iteration, real mode for actual AI provider invocation. 8 assertion types, fixture system, multi-provider support.

## Usage

```ts
import { runTests } from '@skillkit/test-harness';

const report = await runTests('./review.test.yaml');
console.log(report.passed, report.passCount, report.failCount);
```

Or via CLI: `npx @skillkit/cli test . --real --provider claude-code`

Part of the [skillkit](https://github.com/sakhilchawla/skillkit) monorepo.
