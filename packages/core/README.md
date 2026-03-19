# @skillkit/core

Core parser and types for [Agent Skills](https://github.com/sakhilchawla/skillkit). Parses SKILL.md files (YAML frontmatter + markdown body) into structured `SkillDefinition` objects.

## Usage

```ts
import { parseSkill, parseSkillFile } from '@skillkit/core';

const result = await parseSkillFile('./SKILL.md');
console.log(result.skill.frontmatter.name);
console.log(result.skill.body);
console.log(result.metadata.estimatedTokens);
```

Part of the [skillkit](https://github.com/sakhilchawla/skillkit) monorepo.
