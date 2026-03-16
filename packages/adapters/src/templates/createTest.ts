import type { SkillTemplate } from '../types.js';

/**
 * Built-in template for creating test files.
 *
 * Adapts to the project's test framework, test location,
 * and naming conventions.
 */
export const createTestTemplate: SkillTemplate = {
  name: 'create-test',
  description: 'Create a test file for an existing module or component',
  type: 'create-test',
  supportedLanguages: ['typescript', 'javascript', 'python', 'go', 'rust'],
  template: `---
name: create-test
description: Create a test file following {{projectName}} conventions
user-invocable: true
allowed-tools: Read, Write, Glob, Grep
argument-hint: "<TargetFile>"
---

# Create Test for: $ARGUMENTS

## Locate the target
First, read the file \`$ARGUMENTS\` to understand its exports and behavior.

## Test file location
{{#if (eq conventions.naming.tests "__tests__")}}
Create the test at \`{{conventions.paths.tests}}/\` mirroring the source file name with a \`{{conventions.testSuffix}}\` suffix.
{{/if}}
{{#if (eq conventions.naming.tests "co-located")}}
Create the test adjacent to the source file with a \`{{conventions.testSuffix}}\` suffix.
{{/if}}
{{#if (eq conventions.naming.tests "separate-dir")}}
Create the test in the \`{{conventions.paths.tests}}/\` directory mirroring the source structure.
{{/if}}

## Test framework
{{#if (eq stack.testing "vitest")}}
Use **vitest**:
- Import from \`vitest\`: \`describe\`, \`it\`, \`expect\`, \`vi\`
- Use \`vi.mock()\` for mocking dependencies
- Use \`vi.fn()\` for spy functions
{{/if}}
{{#if (eq stack.testing "jest")}}
Use **jest**:
- Import from \`@jest/globals\` if using ESM, otherwise globals are available
- Use \`jest.mock()\` for mocking dependencies
- Use \`jest.fn()\` for spy functions
{{/if}}
{{#if (eq stack.testing "pytest")}}
Use **pytest**:
- Use fixtures for setup/teardown
- Use \`pytest.raises\` for exception testing
- Use \`unittest.mock.patch\` for mocking
{{/if}}
{{#if (eq stack.testing "go-test")}}
Use Go's **testing** package:
- Function names: \`TestXxx(t *testing.T)\`
- Use \`t.Run()\` for subtests
- Use \`t.Errorf()\` for failures
{{/if}}
{{#if (eq stack.testing "cargo-test")}}
Use Rust's built-in **test** framework:
- Add \`#[cfg(test)]\` module
- Use \`#[test]\` attribute
- Use \`assert!\`, \`assert_eq!\`, \`assert_ne!\`
{{/if}}

## Conventions
- Test all exported functions/components
- Include at least one happy-path and one error-path test
- Use descriptive test names that explain the expected behavior
- Follow patterns from existing tests in the project
`,
};
