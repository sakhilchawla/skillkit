# @skillkit/benchmarks

Precision/recall/F1 scoring for Agent Skills. Score skill output against ground truth, A/B compare skill versions, track regressions. Supports mock and real mode with keyword + regex matching.

## Usage

```ts
import { runBenchmark } from '@skillkit/benchmarks';

const result = await runBenchmark(config, { mock: false, invoker: { provider: 'claude-code' } });
console.log(result.scores.f1);
```

Or via CLI: `npx @skillkit/cli bench config.yaml --real --provider claude-code`

Part of the [skillkit](https://github.com/sakhilchawla/skillkit) monorepo.
