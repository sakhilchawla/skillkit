import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { bold, green, dim } from '../utils/formatter.js';

const SKILL_TEMPLATE = `---
name: {{name}}
description: {{description}}
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep
argument-hint: "<arguments>"
---

# {{name}}

## Instructions

Describe what this skill does, step by step.

## Steps

1. First, gather context by reading relevant files
2. Then, analyze the situation
3. Finally, take action

## Output Format

Describe the expected output format.

## Constraints

- Do not modify files without confirmation
- Avoid destructive operations
`;

const TEST_TEMPLATE = `name: {{name}} tests
skill: ./SKILL.md

scenarios:
  - name: basic invocation
    description: Skill completes without errors
    invoke: "/{{name}}"
    assertions:
      - completes: true
      - noErrors: true
`;

/**
 * `skillkit init [name]` — Scaffold a new skill with SKILL.md and test.yaml.
 */
export async function initCommand(args: string[]): Promise<void> {
  const name = args[0];
  if (!name) {
    console.log('Usage: skillkit init <skill-name>');
    console.log('Example: skillkit init review');
    process.exit(1);
  }

  const dir = join('.', name);
  await mkdir(dir, { recursive: true });

  const description = `TODO: Describe what ${name} does`;

  const skillContent = SKILL_TEMPLATE
    .replaceAll('{{name}}', name)
    .replaceAll('{{description}}', description);

  const testContent = TEST_TEMPLATE.replaceAll('{{name}}', name);

  await writeFile(join(dir, 'SKILL.md'), skillContent);
  await writeFile(join(dir, `${name}.test.yaml`), testContent);

  console.log(`\n${green('✓')} Created skill ${bold(name)}:`);
  console.log(`  ${dim(join(dir, 'SKILL.md'))}`);
  console.log(`  ${dim(join(dir, `${name}.test.yaml`))}`);
  console.log(`\n${dim('Next: edit SKILL.md, then run')} skillkit lint ${name}/`);
}
