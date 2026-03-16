---
name: scaffold
description: Meta-skill that generates project-specific scaffold skills by reading your repo conventions
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Bash
argument-hint: "<scaffold-type: component|module|endpoint|store>"
---

# Scaffold Generator

Generate a project-specific scaffold skill by analyzing the current repository.

This is a meta-skill: it creates OTHER skills tailored to your project's conventions.

## Step 1: Detect project stack

Read and analyze:
- `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` — language and dependencies
- Directory structure — where components, modules, tests live
- Existing files — naming conventions (PascalCase, kebab-case, snake_case)
- Test files — which framework, naming pattern, co-located or separate directory
- Styling — Tailwind, CSS modules, styled-components, or none
- State management — Redux, Zustand, Pinia, or framework-native

## Step 2: Find patterns

For the requested scaffold type ($ARGUMENTS):
1. Find 3-5 existing examples of that type in the repo
2. Extract common patterns: imports, structure, exports, naming
3. Identify required boilerplate: type definitions, test setup, config registration

## Step 3: Generate the scaffold skill

Create a SKILL.md file at `.claude/skills/create-$ARGUMENTS/SKILL.md` that:
- Uses the detected conventions exactly (not generic templates)
- Includes proper frontmatter with allowed-tools
- Has step-by-step instructions referencing actual project paths
- Includes a checklist of files to create and update
- References real patterns found in Step 2

## Step 4: Verify

1. Read the generated skill back
2. Confirm it references real directories and patterns
3. Confirm it would produce output consistent with existing code

## Output

Report what was generated:
```
Generated: .claude/skills/create-$ARGUMENTS/SKILL.md
Based on: [list of example files analyzed]
Conventions detected: [summary]

Try it: /$ARGUMENTS MyNewThing
```

## Rules

- ONLY use patterns actually found in the repo — never assume conventions
- If fewer than 2 examples exist, warn that the generated skill may need manual adjustment
- Do not overwrite existing skills without confirmation
