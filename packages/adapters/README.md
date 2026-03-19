# @skillkit/adapters

Detect tech stacks and generate project-specific skills from templates. Scans package.json, pyproject.toml, Cargo.toml, go.mod and detects 15+ frameworks, styling, testing, and build tools.

## Usage

```ts
import { detectStack, adaptTemplate } from '@skillkit/adapters';

const stack = await detectStack('.');
console.log(stack.framework, stack.testing, stack.styling);
```

Or via CLI: `npx @skillkit/cli adapt component`

Part of the [skillkit](https://github.com/sakhilchawla/skillkit) monorepo.
