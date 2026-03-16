# Guide: `skillkit init`

## What it does

The `skillkit init` command scaffolds a new Agent Skill. It creates a directory containing two files:

1. **SKILL.md** -- the skill definition file, with YAML frontmatter and a markdown body that AI coding tools read as instructions.
2. **A test file** (`.test.yaml`) -- a declarative test definition you can use to verify your skill works correctly.

You get a working starting point instead of a blank file. Every generated field has a sensible default, and the markdown body includes section headings that guide you toward writing a complete skill.

## Quick start

```bash
skillkit init my-skill
```

This creates:

```
my-skill/
  SKILL.md
  my-skill.test.yaml
```

That is it. You now have a valid skill that passes `skillkit lint`. Open `SKILL.md` in your editor and start writing instructions.

## Generated files explained

### SKILL.md

Here is the exact file that `skillkit init review` produces, with every part explained:

```markdown
---
name: review
description: TODO: Describe what review does
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep
argument-hint: "<arguments>"
---

# review

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
```

#### Frontmatter (the YAML between `---` fences)

The frontmatter is metadata that AI coding tools read to decide when and how to invoke your skill. Every field is explained below.

| Field | Generated value | What it means |
|-------|----------------|---------------|
| `name` | The name you passed to `init` | The slash-command identifier. When a user types `/review` in Claude Code, Cursor, or another tool, this field is how the tool finds your skill. Use lowercase, hyphen-separated words. |
| `description` | `TODO: Describe what review does` | A plain-English summary of what the skill does. This is loaded into the AI's context window so it can decide whether to auto-invoke the skill. **Replace this immediately** -- a vague description means the tool cannot match your skill to the right task. Aim for 20-80 words. |
| `user-invocable` | `true` | Whether users can trigger this skill by typing `/name`. Set to `false` if the skill should only be invoked automatically by the AI model (for example, a background validation skill). |
| `allowed-tools` | `Read, Bash, Glob, Grep` | A comma-separated list of tools the skill is allowed to use. This is a security boundary -- the AI agent will only have access to these tools when running your skill. Common tools: `Read` (read files), `Write` (write files), `Edit` (edit files), `Bash` (run shell commands), `Glob` (find files by pattern), `Grep` (search file contents), `Agent` (spawn sub-agents), `WebFetch` (fetch URLs), `WebSearch` (search the web). Only request what you need. |
| `argument-hint` | `"<arguments>"` | Hint text shown to the user about what arguments the skill accepts. For example, a review skill might use `"[base-branch]"` to tell users they can optionally pass a branch name. Replace `<arguments>` with something meaningful, or remove the field if your skill takes no arguments. |

There are additional optional fields you can add by hand. These are not included in the template because most skills do not need them:

| Field | Type | What it means |
|-------|------|---------------|
| `model` | string | Override the AI model used for this skill (e.g., `"claude-sonnet-4-20250514"`). Useful if your skill needs a specific model's capabilities. |
| `agent` | boolean | If `true`, the skill runs as a sub-agent with isolated context, rather than in the main conversation. Useful for skills that should not see or modify the user's current conversation state. |
| `context` | string | Context injection mode. Set to `"fork"` to run the skill in a forked context. |
| `disable-model-invocation` | boolean | If `true`, the AI model cannot auto-invoke this skill. Users must type the slash command explicitly. |
| `hooks` | object | Lifecycle hooks configuration for advanced use cases. |

#### Markdown body (everything after the frontmatter)

The body is the actual instructions the AI agent follows. The template gives you four sections:

- **Instructions** -- A high-level summary. Replace the placeholder with 1-2 sentences describing the skill's purpose.
- **Steps** -- A numbered list of actions. AI agents perform better with explicit, ordered steps. Replace the generic steps with your skill's actual workflow.
- **Output Format** -- Define what the skill should produce. Agents give more consistent results when they know the expected shape of the output (e.g., a markdown checklist, a severity-tagged list, a code block).
- **Constraints** -- Safety boundaries and rules. Tell the agent what it must NOT do. The defaults ("do not modify files without confirmation" and "avoid destructive operations") are good starting points.

### Test file (`.test.yaml`)

Here is the generated test file for `skillkit init review`:

```yaml
name: review tests
skill: ./SKILL.md

scenarios:
  - name: basic invocation
    description: Skill completes without errors
    invoke: "/review"
    assertions:
      - completes: true
      - noErrors: true
```

- `name` -- Human-readable name for this test suite.
- `skill` -- Relative path to the SKILL.md file being tested.
- `scenarios` -- A list of test cases. Each scenario has a name, an invocation command, and assertions about the output.
- `assertions` -- Conditions that must be true for the test to pass. `completes: true` means the skill finishes without crashing. `noErrors: true` means no error messages appear in the output.

Full test execution is coming in v0.2. For now, `skillkit test` validates that your test file is structurally correct.

## What to do next

After running `skillkit init`, follow these steps:

1. **Replace the description.** Open `SKILL.md` and write a specific, actionable description. Bad: "A helper tool." Good: "Pre-landing code review with severity-based analysis for security, correctness, and style."

2. **Write your instructions.** Replace the placeholder Steps section with the actual workflow your skill should follow. Be specific -- numbered steps produce better results than vague paragraphs.

3. **Define the output format.** Decide what the skill's output looks like and write it out explicitly. Use a code block with an example if possible.

4. **Set constraints.** Add rules about what the agent must not do. If the skill uses `Bash`, list forbidden commands (e.g., "Never run `rm -rf`, `git push --force`, or `DROP TABLE`").

5. **Trim allowed-tools.** Remove any tools your skill does not need. If it only reads files, use `allowed-tools: Read, Glob, Grep` and drop `Bash`.

6. **Update the argument-hint.** Replace `<arguments>` with a description of what your skill accepts, or remove the field entirely.

7. **Lint it.** Run `skillkit lint my-skill/` to catch problems early.

8. **Add test scenarios.** Open the `.test.yaml` file and add scenarios that reflect real usage of your skill.

## Tips for naming skills

The skill name becomes the slash command (`/name`), so choose carefully.

### Good names

| Name | Why it works |
|------|-------------|
| `review` | Clear verb, one job |
| `ship` | Short, memorable, specific action |
| `scaffold-component` | Descriptive, says exactly what it creates |
| `tdd` | Well-known acronym in the domain |
| `investigate` | Specific verb that implies a process |
| `create-api-route` | Action + object, no ambiguity |

### Bad names

| Name | Problem | Better alternative |
|------|---------|-------------------|
| `my-tool` | Says nothing about what it does | Name it after the action |
| `helper` | Too vague to be useful | What does it help with? |
| `misc` | Violates "one skill, one job" | Split into focused skills |
| `do-stuff` | Not descriptive | Name the specific stuff |
| `v2` | Version info is not a name | Use the actual skill name |
| `test` | Conflicts with `skillkit test` command | `run-tests` or `test-suite` |

### Naming rules

- Use **lowercase letters and hyphens** only. No spaces, underscores, or uppercase.
- Use a **verb or verb-noun** pattern: `review`, `ship`, `create-component`, `run-migration`.
- Keep it **short** -- you will type this often. One or two words is ideal.
- Make it **unambiguous** -- another developer should guess what `/name` does without reading the skill.

## Complete workflow

Here is the full lifecycle of creating a skill, from scaffold to use:

```
1. INIT        skillkit init review
                 Creates review/SKILL.md and review/review.test.yaml

2. EDIT        Open review/SKILL.md in your editor
                 Write description, steps, output format, constraints

3. LINT        skillkit lint review/
                 Fix any errors or warnings

4. TEST        skillkit test review/
                 (v0.1: validates test file structure)
                 (v0.2: runs scenarios against fixtures)

5. USE         Copy to .claude/skills/review/ (or ~/.claude/skills/review/)
                 Invoke with /review in your AI coding tool
```

### Where to put the finished skill

AI coding tools look for skills in specific directories:

| Location | Scope | Example |
|----------|-------|---------|
| `.claude/skills/` (in your project) | Project-specific -- available only in this repo | `.claude/skills/review/SKILL.md` |
| `~/.claude/skills/` (in your home directory) | Global -- available in every project | `~/.claude/skills/ship/SKILL.md` |

Project skills are best for skills tied to your codebase (e.g., a `/create-component` skill that uses your project's conventions). Global skills are best for generic workflows you use everywhere (e.g., `/review`, `/ship`).
