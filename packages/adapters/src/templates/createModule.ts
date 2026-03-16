import type { SkillTemplate } from '../types.js';

/**
 * Built-in template for creating API modules or services.
 *
 * Adapts to the project's module structure, language, and
 * testing framework.
 */
export const createModuleTemplate: SkillTemplate = {
  name: 'create-module',
  description: 'Create a new API module or service following project conventions',
  type: 'create-module',
  supportedLanguages: ['typescript', 'javascript', 'python'],
  template: `---
name: create-module
description: Create a new module/service following {{projectName}} conventions
user-invocable: true
allowed-tools: Read, Write, Glob, Grep
argument-hint: "<ModuleName>"
---

# Create Module: $ARGUMENTS

Create a new module in \`{{conventions.paths.modules}}/\`.

## File naming
Use {{conventions.naming.files}} for file names.

## Files to create

### Module file
{{#if (eq stack.language "typescript")}}
Create \`{{conventions.paths.modules}}/$ARGUMENTS.ts\` with:
- TypeScript interfaces for request/response types
- Exported async functions for each operation
- Proper error handling with typed errors
{{/if}}
{{#if (eq stack.language "javascript")}}
Create \`{{conventions.paths.modules}}/$ARGUMENTS.js\` with:
- JSDoc type annotations
- Exported async functions for each operation
- Proper error handling
{{/if}}
{{#if (eq stack.language "python")}}
Create \`{{conventions.paths.modules}}/$ARGUMENTS.py\` with:
- Type hints for all parameters and return values
- Dataclass or Pydantic models for request/response
- Async functions where appropriate
{{/if}}

### Test file
{{#if (eq conventions.naming.tests "__tests__")}}
Create test at \`{{conventions.paths.tests}}/$ARGUMENTS.test{{#if (eq stack.language "typescript")}}.ts{{else}}.js{{/if}}\`
{{else}}
Create test at \`{{conventions.paths.modules}}/$ARGUMENTS.test{{#if (eq stack.language "typescript")}}.ts{{else}}.js{{/if}}\`
{{/if}}
{{#if (eq stack.testing "vitest")}}
Use vitest for testing.
{{/if}}
{{#if (eq stack.testing "jest")}}
Use jest for testing.
{{/if}}
{{#if (eq stack.testing "pytest")}}
Use pytest for testing.
{{/if}}

## Conventions
- Use named exports for all public functions
- Follow patterns from existing modules in \`{{conventions.paths.modules}}/\`
{{#if conventions.hasBarrelExports}}
- Add the new module to the barrel export in \`src/index.ts\`
{{/if}}
`,
};
