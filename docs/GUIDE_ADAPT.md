# `skillkit adapt` -- Project-Aware Skill Generation

> Planned for v0.4. This guide documents the full design. See [Current Status](#current-status) at the bottom for what you can use today.

## What It Does

`skillkit adapt` takes a generic skill template and generates a version customized for YOUR project's conventions.

One command:

```bash
npx skillkit adapt create-component
```

It reads your repo, figures out that you use Next.js + Tailwind + Vitest + Zustand, and produces a `/create-component` skill that generates components exactly the way your team already writes them -- correct imports, correct file naming, correct directory, correct test structure. No manual editing.

## The Problem

Scaffold skills are the most valuable skills for day-to-day work. `/create-component`, `/create-store`, `/create-endpoint` -- these save real time on every feature.

But they are impossible to share.

A `/create-component` skill written for a React/Tailwind/Vitest project is useless in a Vue/SCSS/Jest project. The imports are wrong, the file structure is wrong, the naming conventions are wrong. You cannot just swap "React" for "Vue" and call it done -- the entire skill needs to be rewritten from scratch.

This means every team, for every project, writes these skills by hand. Or worse, they don't write them at all, and every new file is a coin flip on whether it follows the project's conventions.

`skillkit adapt` fixes this. You write the template once. It works everywhere.

## How It Works

### Step 1: Scan your repo

```
Scanning...
  Found package.json
  Found tsconfig.json
  Found tailwind.config.ts
  Found apps/shell/ (Next.js app directory)
  Found packages/ (6 internal packages)
  Found vitest.config.ts (3 matches)
```

skillkit reads the files that define your project: manifest files, config files, directory layout, existing source files. It does not execute your code or install anything.

### Step 2: Detect your stack

```
Detected stack:
  Language:    TypeScript (strict mode)
  Framework:   Next.js 15 (App Router)
  Styling:     Tailwind CSS
  Testing:     Vitest
  State:       Zustand
  Monorepo:    npm workspaces + Turborepo
  Components:  packages/shared-design-system/src/components/
  Naming:      PascalCase files, named exports
```

skillkit maps what it found to a structured profile of your project. This profile drives every decision in the generated skill.

### Step 3: Fill in the template

The generic `create-component` template has placeholders like `{{styling_import}}`, `{{test_framework}}`, and `{{component_directory}}`. skillkit fills them in with your detected values. Conditional blocks (`{{#if uses_tailwind}}`) select the right patterns for your stack. Irrelevant sections are removed entirely.

### Step 4: Save the generated skill

```
$ npx skillkit adapt create-component

  Generated: .claude/skills/create-component/SKILL.md
  Template:  create-component (built-in)
  Stack:     Next.js 15 / Tailwind / Vitest / Zustand
  Output:    .claude/skills/create-component/SKILL.md

  Try it: /create-component UserProfile
```

The skill is saved to `.claude/skills/` (or `.agent/skills/` depending on your tooling). It is a plain SKILL.md file -- you can read it, edit it, commit it, and share it with your team.

---

## What It Detects

| Signal | How it detects | Values |
|--------|---------------|--------|
| **Language** | `package.json` present | Node / TypeScript |
| | `pyproject.toml` or `setup.py` | Python |
| | `Cargo.toml` | Rust |
| | `go.mod` | Go |
| | `build.gradle` or `pom.xml` | Java / Kotlin |
| **Framework** | `next` in dependencies | Next.js (detects App Router vs Pages) |
| | `react` without next | React (CRA / Vite) |
| | `vue` in dependencies | Vue (detects 2 vs 3) |
| | `svelte` or `@sveltejs/kit` | Svelte / SvelteKit |
| | `django` in requirements | Django |
| | `fastapi` in requirements | FastAPI |
| | `actix-web` or `axum` in Cargo.toml | Rust web framework |
| **Styling** | `tailwindcss` in devDependencies | Tailwind CSS |
| | `styled-components` in dependencies | styled-components |
| | `*.module.css` files present | CSS Modules |
| | `sass` or `scss` in devDependencies | SCSS |
| | None of the above | Plain CSS / unstyled |
| **Testing** | `vitest` in devDependencies | Vitest |
| | `jest` in devDependencies | Jest |
| | `pytest` in dev requirements | pytest |
| | `Cargo.toml` present | `cargo test` |
| | `go.mod` present | `go test` |
| | Co-located `*.test.*` files | Tests next to source |
| | Separate `__tests__/` or `tests/` dir | Tests in dedicated directory |
| **State** | `zustand` in dependencies | Zustand |
| | `@reduxjs/toolkit` in dependencies | Redux Toolkit |
| | `pinia` in dependencies | Pinia |
| | `@tanstack/react-query` | TanStack Query (server state) |
| | None of the above | Framework-native / none |
| **Monorepo** | `workspaces` field in package.json | npm/yarn workspaces |
| | `turbo.json` present | Turborepo |
| | `nx.json` present | Nx |
| | `lerna.json` present | Lerna |
| **Naming** | Scan existing files | PascalCase, kebab-case, snake_case, camelCase |
| **Exports** | Scan existing files | Default exports vs named exports |

---

## Skill Template Format

Templates use Handlebars-style syntax with three constructs: placeholders, conditionals, and loops.

### Placeholders

```
{{variable_name}}
```

Replaced with the detected value. Examples:

| Placeholder | Example value |
|-------------|---------------|
| `{{language}}` | `TypeScript` |
| `{{framework}}` | `Next.js` |
| `{{component_dir}}` | `packages/shared-design-system/src/components` |
| `{{test_suffix}}` | `.test.tsx` |
| `{{style_extension}}` | `.module.css` |
| `{{package_scope}}` | `@goodads-ai` |

### Conditionals

```handlebars
{{#if uses_tailwind}}
- Style with Tailwind utility classes. Do not create separate CSS files.
{{/if}}

{{#if uses_css_modules}}
- Create a `{{name}}.module.css` file alongside the component.
{{/if}}
```

Include or exclude entire blocks based on detected stack.

### Loops

```handlebars
{{#each import_patterns}}
- `{{{this}}}`
{{/each}}
```

Iterate over detected patterns (import conventions, file patterns, etc).

### Full template example

Here is a simplified version of the built-in `create-component` template:

```markdown
---
name: create-{{scaffold_type}}
description: Create a new {{framework}} {{scaffold_type}} following project conventions
user-invocable: true
allowed-tools: Read, Write, Glob, Grep
argument-hint: "<ComponentName>"
---

# Create {{framework}} Component

Create a new component at `{{component_dir}}/` following this project's conventions.

## File Structure

Create these files for the component `$ARGUMENTS`:

{{#if uses_typescript}}
- `{{component_dir}}/$ARGUMENTS/$ARGUMENTS.tsx` -- component implementation
- `{{component_dir}}/$ARGUMENTS/index.ts` -- re-export
{{else}}
- `{{component_dir}}/$ARGUMENTS/$ARGUMENTS.jsx` -- component implementation
- `{{component_dir}}/$ARGUMENTS/index.js` -- re-export
{{/if}}
{{#if uses_css_modules}}
- `{{component_dir}}/$ARGUMENTS/$ARGUMENTS.module.css` -- styles
{{/if}}
{{#if has_tests}}
- `{{test_dir}}/$ARGUMENTS{{test_suffix}}` -- tests
{{/if}}

## Component Pattern

{{#if uses_typescript}}
```tsx
{{#if uses_client_components}}
'use client';

{{/if}}
{{#each import_patterns}}
{{{this}}}
{{/each}}

interface $ARGUMENTSProps {
  // Define props here
}

export function $ARGUMENTS({ }: $ARGUMENTSProps) {
{{#if uses_tailwind}}
  return <div className=""></div>;
{{else if uses_css_modules}}
  return <div className={styles.root}></div>;
{{else}}
  return <div></div>;
{{/if}}
}
```
{{/if}}

## Checklist

- [ ] Component created with correct naming ({{naming_convention}})
- [ ] Exports match project pattern ({{export_style}})
{{#if has_tests}}
- [ ] Test file created using {{test_framework}}
{{/if}}
{{#if has_barrel_exports}}
- [ ] Barrel export updated in `{{component_dir}}/index.ts`
{{/if}}
```

---

## Built-in Templates

skillkit ships with three templates that cover the most common scaffold needs.

### `create-component`

Generates a skill for creating UI components.

- **React-aware**: functional components, hooks, `'use client'` directive (Next.js App Router)
- **Vue-aware**: `<script setup>`, Composition API, SFC structure
- **Svelte-aware**: `.svelte` files, reactive declarations
- Handles styling (Tailwind, CSS Modules, styled-components, SCSS)
- Generates co-located or separate test files based on project convention
- Updates barrel exports if the project uses them

### `create-module`

Generates a skill for creating API modules, services, or utility libraries.

- Detects API patterns (fetch wrappers, axios instances, tRPC routers)
- Matches validation approach (Zod schemas, io-ts, class-validator)
- Follows the project's module structure (flat files vs directory-per-module)
- Includes error handling patterns from existing modules

### `create-test`

Generates a skill for creating test files that match your project's test conventions.

- Detects test framework (Vitest, Jest, pytest, cargo test, go test)
- Matches naming patterns (`*.test.ts`, `*.spec.ts`, `test_*.py`)
- Includes correct setup/teardown patterns from existing tests
- Handles mocking approach (vi.mock, jest.mock, unittest.mock, etc.)
- Respects co-located vs dedicated test directory convention

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
description: Create a new custom {{framework}} hook following project conventions
user-invocable: true
allowed-tools: Read, Write, Glob, Grep
argument-hint: "<hookName>"
---

# Create Custom Hook

Create a new hook at `{{hooks_dir}}/` following project conventions.

## Naming

Hook must start with `use` prefix: `use$ARGUMENTS`

## File

Create `{{hooks_dir}}/use$ARGUMENTS.ts` with this structure:

```ts
{{#each import_patterns}}
{{{this}}}
{{/each}}

export function use$ARGUMENTS() {
  // Implementation
}
```

{{#if has_tests}}
## Test

Create `{{test_dir}}/use$ARGUMENTS{{test_suffix}}` using {{test_framework}}.
{{/if}}
```

### Step 3: Define custom detection (optional)

If your template needs values beyond the defaults, add a `detect` block at the top of the template:

```yaml
# In skillkit.config.yaml
adapt:
  templates:
    - path: templates/create-hook.skill.md
      detect:
        hooks_dir:
          glob: "**/hooks/"
          pick: "most-files"   # Use the hooks dir with the most files
```

### Step 4: Run adapt

```bash
npx skillkit adapt create-hook
```

skillkit merges the built-in detection (language, framework, testing, etc.) with your custom detection rules, fills in the template, and saves the result.

### Step 5: Commit and share

The generated skill is a plain SKILL.md. Commit it to your repo so the whole team gets it.

---

## Complete Example

Let's walk through adapting `create-component` for a real project: a Next.js 15 monorepo with Tailwind CSS, Vitest, and Zustand.

### The Generic Template (input)

This is what the built-in `create-component` template looks like before adaptation:

```markdown
---
name: create-component
description: Create a new {{framework}} component following project conventions
user-invocable: true
allowed-tools: Read, Write, Glob, Grep
argument-hint: "<ComponentName>"
---

# Create {{framework}} Component

## Files to create

{{#if uses_typescript}}
1. `{{component_dir}}/$ARGUMENTS.tsx`
{{else}}
1. `{{component_dir}}/$ARGUMENTS.jsx`
{{/if}}
{{#if uses_css_modules}}
2. `{{component_dir}}/$ARGUMENTS.module.css`
{{/if}}
{{#if has_tests}}
{{#if uses_typescript}}
3. `{{test_dir}}/$ARGUMENTS{{test_suffix}}`
{{else}}
3. `{{test_dir}}/$ARGUMENTS{{test_suffix}}`
{{/if}}
{{/if}}

## Component structure

{{#if uses_client_components}}
Add `'use client'` directive only if the component needs interactivity.
{{/if}}

{{#if uses_tailwind}}
Style with Tailwind utility classes. Do not create separate style files.
{{/if}}
{{#if uses_css_modules}}
Create a co-located `.module.css` file for styles.
{{/if}}
{{#if uses_styled_components}}
Define styled components in the same file or a `$ARGUMENTS.styles.ts` file.
{{/if}}

{{#if uses_typescript}}
Define a `$ARGUMENTSProps` interface for the component's props.
{{/if}}

Use {{export_style}} exports.

{{#if has_tests}}
## Test

Write tests using {{test_framework}}.
- Test file: `{{test_dir}}/$ARGUMENTS{{test_suffix}}`
- Import the component and test its rendering and behavior.
{{/if}}

{{#if has_barrel_exports}}
## Registration

Add the component to the barrel export at `{{component_dir}}/index.ts`.
{{/if}}
```

### Detected Values (what skillkit finds)

```yaml
language:              TypeScript
uses_typescript:       true
framework:             Next.js
component_dir:         packages/shared-design-system/src/components
test_dir:              packages/shared-design-system/src/components  # co-located
test_suffix:           .test.tsx
test_framework:        Vitest
uses_tailwind:         true
uses_css_modules:      false
uses_styled_components: false
uses_client_components: true
has_tests:             true
has_barrel_exports:    true
export_style:          named
naming_convention:     PascalCase
package_scope:         "@goodads-ai"
import_patterns:
  - "import { cn } from '@goodads-ai/shared-design-system';"
```

### Generated Skill (output)

This is what gets saved to `.claude/skills/create-component/SKILL.md`:

```markdown
---
name: create-component
description: Create a new Next.js component following project conventions
user-invocable: true
allowed-tools: Read, Write, Glob, Grep
argument-hint: "<ComponentName>"
---

# Create Next.js Component

## Files to create

1. `packages/shared-design-system/src/components/$ARGUMENTS.tsx`
3. `packages/shared-design-system/src/components/$ARGUMENTS.test.tsx`

## Component structure

Add `'use client'` directive only if the component needs interactivity.

Style with Tailwind utility classes. Do not create separate style files.

Define a `$ARGUMENTSProps` interface for the component's props.

Use named exports.

## Test

Write tests using Vitest.
- Test file: `packages/shared-design-system/src/components/$ARGUMENTS.test.tsx`
- Import the component and test its rendering and behavior.

## Registration

Add the component to the barrel export at `packages/shared-design-system/src/components/index.ts`.
```

Notice what happened:

- `{{framework}}` became `Next.js`
- `{{component_dir}}` became the real path from the project
- The CSS Modules and styled-components sections were removed entirely (the project uses Tailwind)
- `{{test_framework}}` became `Vitest`
- `{{export_style}}` became `named`
- The `'use client'` instruction was included (Next.js App Router detected)
- Everything references real paths and real conventions. No placeholders remain.

The generated skill is ready to use immediately:

```
/create-component UserAvatar
```

And the agent will create `UserAvatar.tsx`, `UserAvatar.test.tsx`, and update the barrel export -- all matching the patterns your team already uses.

---

## Current Status

`skillkit adapt` is planned for **v0.4**. It is not yet available as a CLI command.

**What you can use today:**

The [/scaffold](../examples/scaffold/) reference skill does the same job at runtime. Instead of pre-generating a skill from a template, it reads your repo on every invocation and generates a scaffold skill on the fly.

```bash
# Copy the scaffold skill to your project
cp -r examples/scaffold/ .claude/skills/scaffold/

# Use it to generate project-specific scaffold skills
# (invoke from your AI coding tool)
/scaffold component
/scaffold module
/scaffold endpoint
```

The difference between `/scaffold` and `skillkit adapt`:

| | `/scaffold` (available now) | `skillkit adapt` (v0.4) |
|---|---|---|
| When it runs | Every time you invoke it | Once, then you use the generated skill |
| Speed | Slower (scans repo each time) | Instant (pre-generated) |
| Consistency | May vary between runs | Locked in, deterministic |
| Customization | Edit the scaffold skill | Edit the template or the output |
| Requires AI tool | Yes | No (CLI command) |

Both produce the same end result: a skill tailored to your project. `skillkit adapt` just does the detection step ahead of time so the generated skill is faster and more consistent.
