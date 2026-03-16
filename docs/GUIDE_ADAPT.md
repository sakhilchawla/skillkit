# `skillkit adapt` -- Project-Aware Skill Generation

> **Status: Available in v0.4.** This command is fully functional. Run `skillkit adapt component` to try it.

## What It Does

`skillkit adapt` takes a generic skill template and generates a version customized for YOUR project's conventions.

One command:

```bash
npx skillkit adapt component
```

It reads your repo, figures out that you use Next.js + Tailwind + Vitest + Zustand, and produces a `/create-component` skill that generates components exactly the way your team already writes them -- correct imports, correct file naming, correct directory, correct test structure. No manual editing.

## The Problem

Scaffold skills are the most valuable skills for day-to-day work. `/create-component`, `/create-store`, `/create-endpoint` -- these save real time on every feature.

But they are impossible to share.

A `/create-component` skill written for a React/Tailwind/Vitest project is useless in a Vue/SCSS/Jest project. The imports are wrong, the file structure is wrong, the naming conventions are wrong. You cannot just swap "React" for "Vue" and call it done -- the entire skill needs to be rewritten from scratch.

This means every team, for every project, writes these skills by hand. Or worse, they don't write them at all, and every new file is a coin flip on whether it follows the project's conventions.

`skillkit adapt` fixes this. You write the template once. It works everywhere.

## Quick Start

```bash
# Generate a /create-component skill for your project
skillkit adapt component

# Generate a /create-module skill
skillkit adapt module

# Generate a /create-test skill
skillkit adapt test

# Scan a specific directory
skillkit adapt component ./path/to/my-project
```

## How It Works

### Step 1: Scan your repo

```
Scanning /path/to/my-project
```

skillkit reads the files that define your project: package.json, tsconfig.json, config files, directory layout, existing source files. It does not execute your code or install anything.

### Step 2: Detect your stack

```
Detected stack:
  Language:       typescript
  Framework:      next (App Router)
  Styling:        tailwind
  Testing:        vitest
  State:          zustand
  Build tool:     turborepo
  Monorepo:       yes
  Package manager: npm
```

skillkit maps what it found to a structured profile of your project. This profile drives every decision in the generated skill.

### Step 3: Detect conventions

skillkit also scans your source files to detect:
- **Naming conventions**: PascalCase, kebab-case, camelCase, snake_case
- **Directory layout**: Where components, tests, modules, and styles live
- **Export style**: Named exports vs default exports
- **Barrel exports**: Whether you use index.ts re-exports
- **Test patterns**: Co-located tests vs dedicated test directories, test file suffix
- **Client components**: Whether `'use client'` directives are used (Next.js App Router)

### Step 4: Render the template

The generic template has placeholders like `{{conventions.paths.components}}`, `{{stack.testing}}`, and `{{conventions.naming.files}}`. skillkit fills them in with your detected values. Conditional blocks (`{{#if (eq stack.styling "tailwind")}}`) select the right patterns for your stack. Irrelevant sections are removed entirely.

### Step 5: Save the generated skill

```
Generated: .claude/skills/create-component/SKILL.md
  Template:  create-component
  Stack:     typescript / next / tailwind / vitest
  Output:    .claude/skills/create-component/SKILL.md

  Try it: /create-component MyItem
```

The skill is saved to `.claude/skills/` (or `.agent/skills/` depending on your tooling). It is a plain SKILL.md file -- you can read it, edit it, commit it, and share it with your team.

---

## What It Detects

| Signal | How it detects | Values |
|--------|---------------|--------|
| **Language** | `package.json` present | JavaScript / TypeScript |
| | `pyproject.toml` or `setup.py` | Python |
| | `Cargo.toml` | Rust |
| | `go.mod` | Go |
| | `build.gradle` or `pom.xml` | Java / Kotlin |
| **Framework** | `next` in dependencies | Next.js (detects App Router vs Pages) |
| | `react` without next | React (CRA / Vite) |
| | `vue` in dependencies | Vue |
| | `svelte` or `@sveltejs/kit` | Svelte / SvelteKit |
| | `django` in requirements | Django |
| | `fastapi` in requirements | FastAPI |
| **Styling** | `tailwindcss` in devDependencies | Tailwind CSS |
| | `styled-components` in dependencies | styled-components |
| | `*.module.css` files present | CSS Modules |
| | `sass` or `scss` in devDependencies | SCSS |
| **Testing** | `vitest` in devDependencies | Vitest |
| | `jest` in devDependencies | Jest |
| | `pytest` in dev requirements | pytest |
| | `Cargo.toml` present | `cargo test` |
| | `go.mod` present | `go test` |
| **State** | `zustand` in dependencies | Zustand |
| | `@reduxjs/toolkit` in dependencies | Redux Toolkit |
| | `pinia` in dependencies | Pinia |
| **Monorepo** | `workspaces` field in package.json | npm/yarn workspaces |
| | `turbo.json` present | Turborepo |
| | `nx.json` present | Nx |
| | `lerna.json` present | Lerna |
| **Naming** | Scan existing component files | PascalCase, kebab-case, snake_case, camelCase |
| **Exports** | Scan existing files | Named exports vs default exports |

---

## Built-in Templates

skillkit ships with three templates that cover the most common scaffold needs. You can use either the shorthand or full name.

| Shorthand | Full name | What it generates |
|-----------|-----------|-------------------|
| `component` | `create-component` | `/create-component` skill for UI components |
| `module` | `create-module` | `/create-module` skill for API modules/services |
| `test` | `create-test` | `/create-test` skill for test files |

### `component` (create-component)

Generates a skill for creating UI components.

- **React-aware**: functional components, hooks, `'use client'` directive (Next.js App Router)
- **Vue-aware**: SFC structure with `<script setup>`
- **Svelte-aware**: `.svelte` files, reactive declarations
- Handles styling (Tailwind, CSS Modules, styled-components, SCSS)
- Generates co-located or separate test files based on project convention
- Updates barrel exports if the project uses them

### `module` (create-module)

Generates a skill for creating API modules, services, or utility libraries.

- Detects API patterns (fetch wrappers, axios instances)
- Matches validation approach (Zod schemas, Pydantic models)
- Follows the project's module structure (flat files vs directory-per-module)
- Includes error handling patterns from existing modules

### `test` (create-test)

Generates a skill for creating test files that match your project's test conventions.

- Detects test framework (Vitest, Jest, pytest, cargo test, go test)
- Matches naming patterns (`*.test.ts`, `*.spec.ts`, `test_*.py`)
- Includes correct setup/teardown patterns
- Handles mocking approach (vi.mock, jest.mock, unittest.mock, etc.)
- Respects co-located vs dedicated test directory convention

---

## Skill Template Format

Templates use Handlebars-style syntax with three constructs: placeholders, conditionals, and equality checks.

### Placeholders

```
{{variable.path}}
```

Replaced with the detected value using dot-notation. Examples:

| Placeholder | Example value |
|-------------|---------------|
| `{{stack.language}}` | `typescript` |
| `{{stack.framework}}` | `next` |
| `{{conventions.paths.components}}` | `src/components` |
| `{{conventions.testSuffix}}` | `.test.tsx` |
| `{{conventions.naming.files}}` | `PascalCase` |
| `{{projectName}}` | `my-app` |

### Truthiness conditionals

```handlebars
{{#if conventions.usesTailwind}}
- Style with Tailwind utility classes. Do not create separate CSS files.
{{/if}}
```

Include or exclude entire blocks based on truthy/falsy values.

### Equality conditionals

```handlebars
{{#if (eq stack.testing "vitest")}}
Use vitest for testing. Import from `vitest`: describe, it, expect, vi.
{{/if}}

{{#if (eq stack.testing "jest")}}
Use jest for testing.
{{/if}}
```

Check a value against a specific string.

---

## Complete Example

Let's walk through adapting `component` for a real project: a Next.js 15 monorepo with Tailwind CSS, Vitest, and Zustand.

### Before: The generic template

The built-in `create-component` template has conditional blocks for every supported stack. It references `{{conventions.paths.components}}`, `{{stack.styling}}`, `{{stack.testing}}`, and other detected values.

### What skillkit detects

```
Detected stack:
  Language:       typescript
  Framework:      next
  Styling:        tailwind
  Testing:        vitest
  State:          zustand
  Build tool:     turborepo
  Monorepo:       yes
  Package manager: npm

Conventions:
  Component dir:  src/components
  Test location:  co-located (__tests__)
  Test suffix:    .test.tsx
  Naming:         PascalCase
  Export style:   named
  Barrel exports: yes
```

### After: The generated skill

This is what gets saved to `.claude/skills/create-component/SKILL.md`:

```markdown
---
name: create-component
description: Create a new UI component following my-app conventions
user-invocable: true
allowed-tools: Read, Write, Glob, Grep
argument-hint: "<ComponentName>"
---

# Create Component: $ARGUMENTS

Create a new component in `src/components/`.

## File naming
Use PascalCase for file names.
Component name: Use PascalCase (e.g., MyComponent).

## Files to create

### Component file
Create `src/components/$ARGUMENTS.tsx`

Use Tailwind CSS classes for styling. Do not create a separate CSS file.

### Test file
Create test at `src/__tests__/$ARGUMENTS.test.tsx`
Use vitest for testing.

## Conventions
- Export the component as a named export
- Props interface named `$ARGUMENTS` + `Props`
- Follow patterns from existing components in `src/components/`
```

Notice what happened:

- `{{conventions.paths.components}}` became `src/components`
- The CSS Modules and styled-components sections were removed entirely (Tailwind detected)
- `{{stack.testing}}` drove the test file instructions to use Vitest
- `{{conventions.naming.files}}` became `PascalCase`
- Everything references real paths and real conventions. No placeholders remain.

The generated skill is ready to use immediately:

```
/create-component UserAvatar
```

---

## Creating Custom Templates

You can write your own templates for any scaffold type your project needs.

### Step 1: Create the template file

Templates live in a `templates/` directory (configurable in `skillkit.config.yaml`). Create a new Markdown file:

```
templates/
  create-hook.skill.md
```

### Step 2: Write the template with placeholders

```markdown
---
name: create-hook
description: Create a new custom {{stack.framework}} hook following project conventions
user-invocable: true
allowed-tools: Read, Write, Glob, Grep
argument-hint: "<hookName>"
---

# Create Custom Hook

Create a new hook at `{{conventions.paths.components}}/hooks/` following project conventions.

## Naming

Hook must start with `use` prefix: `use$ARGUMENTS`

## File

Create `{{conventions.paths.components}}/hooks/use$ARGUMENTS.ts`

{{#if (eq stack.testing "vitest")}}
## Test

Create test at `{{conventions.paths.tests}}/use$ARGUMENTS.test.ts` using vitest.
{{/if}}
```

### Step 3: Run adapt

```bash
npx skillkit adapt create-hook
```

### Step 4: Commit and share

The generated skill is a plain SKILL.md. Commit it to your repo so the whole team gets it.

---

## Comparison: `/scaffold` skill vs `skillkit adapt`

The [/scaffold](../examples/scaffold/) reference skill does a similar job at runtime. Here is how they compare:

| | `/scaffold` (reference skill) | `skillkit adapt` (CLI command) |
|---|---|---|
| When it runs | Every time you invoke it | Once, then you use the generated skill |
| Speed | Slower (scans repo each time) | Instant (pre-generated) |
| Consistency | May vary between runs | Locked in, deterministic |
| Customization | Edit the scaffold skill | Edit the template or the output |
| Requires AI tool | Yes | No (CLI command) |

Both produce the same end result: a skill tailored to your project. `skillkit adapt` does the detection step ahead of time so the generated skill is faster and more consistent.
