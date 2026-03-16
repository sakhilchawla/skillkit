import type { SkillTemplate } from '../types.js';

/**
 * Built-in template for creating UI components.
 *
 * Adapts to the project's language, styling, testing framework,
 * and naming conventions.
 */
export const createComponentTemplate: SkillTemplate = {
  name: 'create-component',
  description: 'Create a new UI component following project conventions',
  type: 'create-component',
  supportedLanguages: ['typescript', 'javascript'],
  template: `---
name: create-component
description: Create a new UI component following {{projectName}} conventions
user-invocable: true
allowed-tools: Read, Write, Glob, Grep
argument-hint: "<ComponentName>"
---

# Create Component: $ARGUMENTS

Create a new component in \`{{conventions.paths.components}}/\`.

## File naming
Use {{conventions.naming.files}} for file names.
{{#if (eq conventions.naming.components "PascalCase")}}
Component name: Use PascalCase (e.g., MyComponent).
{{/if}}

## Files to create

### Component file
Create \`{{conventions.paths.components}}/$ARGUMENTS{{#if (eq stack.language "typescript")}}.tsx{{else}}.jsx{{/if}}\`

{{#if (eq stack.styling "tailwind")}}
Use Tailwind CSS classes for styling. Do not create a separate CSS file.
{{/if}}
{{#if (eq stack.styling "css-modules")}}
Create a companion \`$ARGUMENTS.module.css\` file in the same directory.
{{/if}}
{{#if (eq stack.styling "styled-components")}}
Use styled-components. Define styled elements at the top of the file.
{{/if}}

### Test file
{{#if (eq conventions.naming.tests "__tests__")}}
Create test at \`{{conventions.paths.tests}}/$ARGUMENTS.test{{#if (eq stack.language "typescript")}}.tsx{{else}}.jsx{{/if}}\`
{{else}}
Create test at \`{{conventions.paths.components}}/$ARGUMENTS.test{{#if (eq stack.language "typescript")}}.tsx{{else}}.jsx{{/if}}\`
{{/if}}
{{#if (eq stack.testing "vitest")}}
Use vitest for testing.
{{/if}}
{{#if (eq stack.testing "jest")}}
Use jest for testing.
{{/if}}

## Conventions
- Export the component as a named export
- Props interface named \`$ARGUMENTS\` + \`Props\`
- Follow patterns from existing components in \`{{conventions.paths.components}}/\`
`,
};
