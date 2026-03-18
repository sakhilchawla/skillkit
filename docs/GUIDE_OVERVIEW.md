# Getting Started with skillkit

## What is skillkit?

skillkit is a development toolkit for Agent Skills -- the markdown-based instruction files that AI coding tools like Claude Code, Cursor, Codex CLI, Gemini CLI, and GitHub Copilot use to perform specialized tasks. If you have ever written a SKILL.md file (or wanted to), skillkit helps you create, validate, and test those files.

The AI coding ecosystem already has thousands of skills floating around in community repos, but until now there has been no way to check if a skill is well-formed, no way to test if it actually works, and no way to measure its quality. skillkit is the missing developer toolchain -- think of it as ESLint plus a test runner, but for Agent Skills instead of JavaScript.

## What is an Agent Skill?

An Agent Skill is a file named `SKILL.md` that tells an AI coding agent how to perform a specific task. It follows the [Agent Skills open standard](https://agentskills.io), which is supported by 27+ AI coding tools.

A SKILL.md file has two parts:

### Frontmatter

The top of the file contains YAML metadata between `---` fences. This metadata tells the AI tool what the skill is called, what it does, and what permissions it needs:

```yaml
---
name: review
description: Pre-landing code review with severity-based analysis
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep
argument-hint: "[base-branch]"
---
```

- **name** -- The slash-command identifier. Users type `/review` to invoke this skill.
- **description** -- A plain-English summary. The AI tool reads this to decide when to auto-invoke the skill.
- **user-invocable** -- Whether users can trigger it with a slash command.
- **allowed-tools** -- Which tools (Read, Write, Edit, Bash, Glob, Grep, etc.) the skill is allowed to use. This is a security boundary.
- **argument-hint** -- Help text showing what arguments the skill accepts.

### Body

Everything after the frontmatter is a markdown document containing the actual instructions the AI agent follows. This typically includes step-by-step procedures, output format definitions, and constraints:

```markdown
# Code Review

## Steps
1. Run `git diff` to see changes
2. Check for security issues
3. Check for correctness issues

## Output Format
- [CRITICAL] file:line -- description
- [WARNING] file:line -- description

## Constraints
- Never approve code with critical issues
- Cite specific files and line numbers
```

When a user types `/review` in Claude Code (or another compatible tool), the tool finds the matching SKILL.md, loads the frontmatter and body into the AI's context window, and the agent follows the instructions.

## Installation

You can run skillkit directly with `npx` (no installation required):

```bash
npx skillkit lint .claude/skills/
npx skillkit init review
```

Or install it globally for faster access:

```bash
npm install -g skillkit
```

After global installation, you can run commands directly:

```bash
skillkit lint .claude/skills/
skillkit init review
```

skillkit requires **Node.js 20 or later**.

## Your first 5 minutes

This walkthrough takes you from zero to a working skill. Each step builds on the previous one.

### Step 1: Lint your existing skills

If you already have SKILL.md files in your project, start by checking them:

```bash
skillkit lint .claude/skills/
```

skillkit finds every SKILL.md file in the directory (and subdirectories), then checks each one against 20 rules covering spec compliance, security, best practices, and performance. The output looks like this:

```
Found 2 skill(s) in .claude/skills/

  .claude/skills/review/SKILL.md
  ✓ No issues found

  .claude/skills/deploy/SKILL.md
  ✖ Skill has Bash access but body contains no safety constraints (no-unrestricted-bash)
    → Add instructions about what commands are forbidden
  ⚠ Description too short (12 chars, minimum 20) (require-description)

  FAIL 1 error(s), 1 warning(s) across 2 file(s)
```

Errors (marked with a cross) must be fixed. Warnings (marked with a triangle) are recommendations. Each finding includes the rule name in parentheses so you can look it up.

If you do not have any skills yet, skip to Step 2.

### Step 2: Create a new skill

```bash
skillkit init review
```

This creates a `review/` directory with two files:

- `review/SKILL.md` -- The skill definition, pre-filled with a template.
- `review/review.test.yaml` -- A test file with a basic scenario.

### Step 3: Edit the skill

Open `review/SKILL.md` in your editor. You need to change three things at minimum:

1. **Replace the description.** The template says "TODO: Describe what review does." Write a specific summary instead, like "Pre-landing code review with severity-based analysis for security, correctness, and style."

2. **Write the steps.** Replace the generic "gather context, analyze, take action" with the actual procedure your skill should follow.

3. **Define the output format.** Describe exactly what the skill should produce so the AI gives consistent results.

See [GUIDE_INIT.md](GUIDE_INIT.md) for a complete walkthrough of every field and section, and [WRITING_SKILLS.md](WRITING_SKILLS.md) for best practices.

### Step 4: Lint the skill

```bash
skillkit lint review/
```

Fix any errors that come up. Common issues for new skills:

- Description too short or too vague
- Bash access without safety constraints in the body
- Missing argument hint

### Step 5: Test the skill

```bash
skillkit test review/
```

This runs your skill's test scenarios in mock mode. In mock mode, the SKILL.md body is used as simulated output and all assertions are evaluated against it. This validates that your test file is structurally correct and that your assertions match content in the skill definition.

Open `review/review.test.yaml` and add scenarios that reflect how your skill will be used:

```yaml
name: review tests
skill: ./SKILL.md

scenarios:
  - name: output includes severity levels
    invoke: "/review main"
    assertions:
      - contains: "[CRITICAL]"
      - contains: "[WARNING]"

  - name: follows phased approach
    invoke: "/review main"
    assertions:
      - contains: "Critical Review"
      - completes: true
```

Note: In mock mode, assertions must match strings present in the SKILL.md body itself. See [GUIDE_TEST.md](GUIDE_TEST.md) for details on writing mock-compatible tests.

### Step 6: Generate project-specific skills

If you want scaffold skills (like `/create-component`) tailored to your project's conventions:

```bash
skillkit adapt component
```

This scans your repo, detects your stack (framework, styling, testing, etc.), and generates a SKILL.md customized for your project. See [GUIDE_ADAPT.md](GUIDE_ADAPT.md) for the full guide.

## Command reference

| Command | Description | Status | Detailed guide |
|---------|-------------|--------|----------------|
| `skillkit lint [path]` | Validate SKILL.md files against 20 rules for spec compliance, security, best practices, and performance. Four presets: `strict`, `recommended`, `minimal`, `research`. | Working | [GUIDE_LINT.md](GUIDE_LINT.md) |
| `skillkit init <name>` | Scaffold a new skill with a SKILL.md template and test file. | Working | [GUIDE_INIT.md](GUIDE_INIT.md) |
| `skillkit test [path]` | Run declarative test scenarios defined in `.test.yaml` files. Mock mode evaluates assertions against the SKILL.md body. Real mode invokes the actual AI. | Working (mock + real mode) | [GUIDE_TEST.md](GUIDE_TEST.md) |
| `skillkit bench [path]` | Measure skill quality with precision, recall, and token efficiency scoring. Compare skills and detect regressions. | Working | [GUIDE_BENCH.md](GUIDE_BENCH.md) |
| `skillkit adapt <template> [repo]` | Scan a repository, detect its stack, and generate skills tailored to its conventions. Templates: `component`, `module`, `test`. | Working | [GUIDE_ADAPT.md](GUIDE_ADAPT.md) |

Run `skillkit --help` to see all commands and options. Run `skillkit --version` to check the installed version.

## Where skills live

AI coding tools look for SKILL.md files in specific directories. Where you place your skill determines who can use it.

### Project skills

```
your-project/
  .claude/skills/
    review/SKILL.md
    create-component/SKILL.md
```

Skills in `.claude/skills/` inside a project directory are **project-specific**. They are only available when the AI tool is working in that project. This is the right place for skills tied to your codebase's conventions -- for example, a `/create-component` skill that generates components matching your project's file structure, naming patterns, and styling approach.

### Global skills

```
~/.claude/skills/
  review/SKILL.md
  ship/SKILL.md
```

Skills in `~/.claude/skills/` (your home directory) are **global**. They are available in every project you work on. This is the right place for general-purpose skills that are not tied to any specific codebase -- for example, a `/review` skill for code review or a `/ship` skill for the commit-test-push-PR workflow.

### The Agent Skills standard

The directory conventions above are defined by the [Agent Skills open standard](https://agentskills.io). The standard is supported by 27+ AI coding tools including Claude Code, Codex CLI, Gemini CLI, Cursor, VS Code, GitHub Copilot, Windsurf, Aider, and OpenCode. A skill written to this standard works across all of them without modification.

Each skill lives in its own directory alongside its test file and any supporting documents:

```
review/
  SKILL.md              # The skill definition (required)
  review.test.yaml      # Test scenarios (optional, used by skillkit)
  DESIGN.md             # Design notes (optional, for humans)
```

## Development

If you want to contribute or hack on skillkit itself:

```bash
git clone https://github.com/sakhilchawla/skillkit
cd skillkit
npm install

npm run build          # TypeScript compilation
npm test               # 247+ unit tests (~200ms)
npm run lint:self      # Lint reference skills
```

CI runs automatically on push/PR: build → self-lint → test. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Links to detailed guides

- [GUIDE_INIT.md](GUIDE_INIT.md) -- Scaffolding new skills with `skillkit init`
- [GUIDE_LINT.md](GUIDE_LINT.md) -- Validating skills with `skillkit lint`
- [GUIDE_TEST.md](GUIDE_TEST.md) -- Testing skills with `skillkit test`
- [GUIDE_BENCH.md](GUIDE_BENCH.md) -- Benchmarking skill quality with `skillkit bench`
- [GUIDE_ADAPT.md](GUIDE_ADAPT.md) -- Generating project-specific skills with `skillkit adapt`
- [WRITING_SKILLS.md](WRITING_SKILLS.md) -- Best practices for writing excellent Agent Skills
- [ARCHITECTURE.md](ARCHITECTURE.md) -- How skillkit is built internally
- [CONTRIBUTING.md](CONTRIBUTING.md) -- How to contribute to skillkit
