# Testing Skills with `skillkit test`

## What It Does

`skillkit test` runs your skill against sample scenarios and checks that the output meets your expectations. Think of it as unit tests for your AI skills.

You write a YAML file that says "when I invoke my skill with this input, the output should contain these things." skillkit runs each scenario, captures the output, and tells you which passed and which failed.

```
$ skillkit test examples/review/

  examples/review/review.test.yaml
  ✓ catches security vulnerability
  ✓ no false positives on clean diff
  ✓ provides actionable output

  PASS 3 scenario(s) passed
```

## Why Test Skills?

Skills look simple -- they are markdown files. But they break in ways that are hard to catch by reading them.

**Prompt changes cause regressions.** You tweak the review skill to be "more concise" and it stops reporting severity levels. Without a test that checks for `[CRITICAL]` in the output, you ship a broken skill.

**Skills work in one repo but fail in another.** Your `/review` skill works perfectly in your Node.js monorepo. Someone uses it in a Python project and it crashes because it assumes `package.json` exists. A test with a Python fixture catches this before users do.

**Skills stop catching real issues.** Your review skill used to flag SQL injection. After a refactor of the prompt, it silently ignores it. A test scenario with injected vulnerable code would catch the regression immediately.

**You cannot manually QA an AI skill.** Running `/review` by hand and eyeballing the output is not repeatable. Tests give you a repeatable, automatable check that your skill still does what you designed it to do.

## Quick Start

### 1. Create a test file

Test files live next to your skill and are named `<skill-name>.test.yaml`:

```
.claude/skills/review/
  SKILL.md              # Your skill
  review.test.yaml      # Tests for your skill
```

Create `review.test.yaml` with a single scenario:

```yaml
name: review skill tests
skill: ./SKILL.md

scenarios:
  - name: output includes severity levels
    invoke: "/review main"
    assertions:
      - matchesPattern: "\\[CRITICAL|WARNING|SUGGESTION\\]"
```

### 2. Run the tests

```bash
npx skillkit test .claude/skills/review/
```

That command finds every `*.test.yaml` file under the path you give it and runs each scenario inside.

### 3. See results

```
  .claude/skills/review/review.test.yaml
  ✓ output includes severity levels

  PASS 1 scenario(s) passed
```

If a scenario fails, you get the assertion that failed and the actual output so you can debug it.

## Test File Format

A test file is YAML with four top-level fields:

```yaml
name: review skill tests       # Human-readable name for this test suite
skill: ./SKILL.md              # Path to the skill being tested (relative to test file)
fixtures:                       # (Optional) Sample repos to test against
  - ./fixtures/node-app
  - ./fixtures/python-app
scenarios:                      # List of test scenarios
  - name: ...
    invoke: ...
    assertions: [...]
```

### Top-Level Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | A label for the test suite. Shows up in output. |
| `skill` | Yes | string | Relative path from the test file to the SKILL.md being tested. |
| `fixtures` | No | list of strings | Paths to fixture directories (sample repos). |
| `scenarios` | Yes | list | The individual test cases. |

### Scenario Fields

Each scenario describes one invocation of the skill and what you expect to see (or not see) in the output.

```yaml
scenarios:
  - name: catches XSS vulnerability
    description: The skill should flag innerHTML usage as a security issue
    fixture: ./fixtures/xss-app
    setup:
      - injectFile:
          path: src/app.js
          content: |
            document.getElementById('output').innerHTML = userInput;
    invoke: "/review main"
    assertions:
      - contains: "CRITICAL"
      - contains: "XSS"
```

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Short label for this scenario. Keep it under 60 characters. |
| `description` | No | string | Longer explanation of what this scenario tests and why. |
| `fixture` | No | string | Path to a fixture directory to use for this scenario. Overrides the suite-level fixture. |
| `setup` | No | list | Actions to run before invoking the skill. See [Setup Actions](#setup-actions). |
| `invoke` | Yes | string | The slash command to run, exactly as a user would type it. |
| `assertions` | Yes | list | Checks to run against the skill's output. See [Assertion Types](#assertion-types). |

### Setup Actions

Setup actions prepare the environment before the skill runs. They modify files inside the fixture directory so you can test specific scenarios without creating a separate fixture for each one.

#### `injectFile` -- Add or overwrite a file

```yaml
setup:
  - injectFile:
      path: src/utils.js
      content: |
        export function query(sql) {
          return db.raw(sql);  // SQL injection vulnerability
        }
```

This creates `src/utils.js` inside the fixture directory with the given content. If the file already exists, it is overwritten. The original is restored after the scenario completes.

#### `removeFile` -- Delete a file

```yaml
setup:
  - removeFile:
      path: package.json
```

This removes `package.json` from the fixture directory for the duration of this scenario. Useful for testing how your skill handles missing files.

Setup actions are applied in order and reversed after the scenario finishes, so each scenario starts with a clean fixture.

### Assertion Types

Assertions check properties of the skill's output. Every assertion in a scenario must pass for the scenario to pass.

#### `contains` -- Output includes a string

```yaml
assertions:
  - contains: "CRITICAL"
```

Passes if the skill's output contains the string "CRITICAL" anywhere. Case-sensitive.

Use this for: checking that specific keywords, labels, or phrases appear.

#### `notContains` -- Output does NOT include a string

```yaml
assertions:
  - notContains: "git push --force"
```

Passes if the string is absent from the output. Case-sensitive.

Use this for: verifying the skill does not suggest dangerous commands, does not produce false positives, or does not leak sensitive information.

#### `matchesPattern` -- Output matches a regular expression

```yaml
assertions:
  - matchesPattern: "\\[CRITICAL\\].*sql injection"
```

Passes if the regex finds a match anywhere in the output. Uses standard regex syntax (backslashes must be doubled in YAML).

Use this for: checking structured output formats, severity labels followed by specific issues, or patterns that `contains` cannot express.

#### `severity` -- Output contains issues at a specific severity

```yaml
assertions:
  - severity:
      level: CRITICAL
      min: 1
      max: 3
```

Passes if the output contains between `min` and `max` issues at the given severity level. The runner counts occurrences of `[CRITICAL]`, `[WARNING]`, or `[SUGGESTION]` in the output.

| Sub-field | Required | Type | Description |
|-----------|----------|------|-------------|
| `level` | Yes | string | `CRITICAL`, `WARNING`, or `SUGGESTION` |
| `min` | No | number | Minimum count (default: 1) |
| `max` | No | number | Maximum count (default: unlimited) |

Use this for: ensuring the skill reports the right number of issues at each severity.

#### `completes` -- Skill finishes without crashing

```yaml
assertions:
  - completes: true
```

Passes if the skill runs to completion and produces output without throwing an error or timing out.

Use this for: basic smoke tests to verify the skill does not crash on a given input.

#### `noErrors` -- No error messages in output

```yaml
assertions:
  - noErrors: true
```

Passes if the output contains no error indicators (stack traces, "Error:", uncaught exceptions).

Use this for: verifying clean execution without hidden failures.

#### `noCriticalIssues` -- No CRITICAL findings in output

```yaml
assertions:
  - noCriticalIssues: true
```

Passes if the output contains zero `[CRITICAL]` findings. This is a shorthand for `severity: { level: CRITICAL, max: 0 }`.

Use this for: testing that clean code produces no critical findings (false positive detection).

#### `maxTokens` -- Output stays within a token budget

```yaml
assertions:
  - maxTokens: 2000
```

Passes if the skill's output is under the specified token count (estimated at ~4 characters per token).

Use this for: ensuring the skill produces concise output and does not dump excessive context.

## Fixtures

A fixture is a sample repository that your skill runs against. It provides the files, directory structure, and git history that the skill will read.

### Why use fixtures?

Without a fixture, the skill runs against whatever directory you happen to be in. That makes tests non-reproducible. Fixtures give every scenario a known starting point.

### Built-in fixtures

skillkit will ship with several built-in fixtures for common project types:

| Fixture | Description |
|---------|-------------|
| `@skillkit/fixture-node-app` | Minimal Node.js project with package.json, src/, tests/ |
| `@skillkit/fixture-python-app` | Python project with setup.py, src/, tests/ |
| `@skillkit/fixture-empty` | Empty git repository (for testing edge cases) |
| `@skillkit/fixture-monorepo` | Multi-package workspace |

Use them in your test file:

```yaml
fixtures:
  - "@skillkit/fixture-node-app"
```

### Creating custom fixtures

A custom fixture is just a directory. Create it anywhere and point your test file at it:

```
my-skill/
  SKILL.md
  my-skill.test.yaml
  fixtures/
    vulnerable-app/
      package.json
      src/
        app.js        # Contains a known vulnerability
      .git/           # (optional) Include git history for diff-based skills
```

```yaml
# my-skill.test.yaml
name: my skill tests
skill: ./SKILL.md
fixtures:
  - ./fixtures/vulnerable-app

scenarios:
  - name: catches the known vulnerability
    fixture: ./fixtures/vulnerable-app
    invoke: "/my-skill"
    assertions:
      - contains: "vulnerability"
```

Tips for good fixtures:

- Keep them small. A fixture with 3 files is better than one with 300.
- Include only what the skill needs to read. If your skill checks git diffs, include `.git/` history. If it reads source files, include source files.
- Name them after what they represent, not what test they are for: `vulnerable-app` not `test-case-1`.

### Fixture directory in config

You can set a global fixtures directory in `skillkit.config.yaml`:

```yaml
test:
  fixtures:
    - ./test-fixtures
```

All directories inside `./test-fixtures/` become available as fixtures by name.

## Writing Good Test Scenarios

### Test the happy path first

Start with a scenario that covers the most common use case. If your skill is a code reviewer, test that it produces a review with the expected format:

```yaml
- name: produces structured review output
  invoke: "/review main"
  assertions:
    - matchesPattern: "## (Critical Issues|Warnings|Suggestions|Summary)"
    - completes: true
```

### Test edge cases

What happens when there is nothing to review? When the input is unusual? When files are missing?

```yaml
- name: handles empty diff gracefully
  invoke: "/review main"
  assertions:
    - notContains: "CRITICAL"
    - contains: "No issues found"
    - completes: true
```

### Test what should NOT appear

Negative assertions are just as valuable as positive ones. They catch false positives, dangerous suggestions, and output that should never be there:

```yaml
- name: does not suggest force push
  invoke: "/ship"
  assertions:
    - notContains: "git push --force"
    - notContains: "git reset --hard"

- name: does not hallucinate issues on clean code
  invoke: "/review main"
  assertions:
    - noCriticalIssues: true
```

### Keep scenarios focused

Each scenario should test one thing. If a scenario has 8 assertions checking different aspects of the output, split it into multiple scenarios:

```yaml
# Bad: one scenario testing everything
- name: full review test
  assertions:
    - contains: "CRITICAL"
    - contains: "security"
    - matchesPattern: "\\d+ issues"
    - notContains: "force push"
    - completes: true
    - noErrors: true
    - maxTokens: 3000
    - noCriticalIssues: false

# Good: separate focused scenarios
- name: flags security issues as critical
  assertions:
    - contains: "CRITICAL"
    - contains: "security"

- name: output is concise
  assertions:
    - maxTokens: 3000

- name: completes without errors
  assertions:
    - completes: true
    - noErrors: true
```

### Name scenarios like test cases

The name should describe the expected behavior, not the input:

```yaml
# Bad
- name: test 1
- name: run review on main

# Good
- name: catches SQL injection in query builder
- name: no false positives on clean diff
- name: stops execution on main branch
```

## Mock Mode vs Real Mode

skillkit test supports two execution modes.

### Mock mode (default)

```bash
npx skillkit test examples/       # Uses mock mode by default
```

In mock mode, skillkit does not call an AI model. Instead, it reads the SKILL.md body (everything after the YAML frontmatter) and uses it as the simulated output. All assertions are then evaluated against this text.

This means mock mode validates:

1. That the test file parses correctly (valid YAML, required fields)
2. That the SKILL.md file exists and is well-formed
3. That assertions use recognized types with valid parameters
4. That assertions actually match content in the skill's own instruction text

Mock mode is fast (milliseconds), free (no API calls), and runs anywhere (no API key needed). Use it in CI/CD pipelines to catch structural problems early.

**What mock mode catches:**
- Typos in assertion types (`contain` instead of `contains`)
- Missing required fields (`name`, `skill`, `invoke`)
- Invalid YAML syntax
- Broken skill file references (`skill: ./MISSING.md`)
- Invalid regex patterns in `matchesPattern`
- Assertions that reference strings not present in the skill definition

**What mock mode cannot catch:**
- Whether the skill produces the expected output when run against real code
- Whether assertions pass against real AI output
- Prompt regressions (the skill generates different output after a change)

### Real mode

```bash
npx skillkit test examples/ --real
```

In real mode, skillkit invokes the actual AI model for each scenario via subprocess. This means:

1. The configured provider CLI is spawned as a subprocess with the skill's instructions and the invoke command
2. The model's response is captured from stdout
3. All assertions are evaluated against the real response

Real mode requires an API key and costs money per run. It is slower (seconds to minutes per scenario) but catches real regressions.

#### Provider flags

Real mode supports the following flags:

| Flag | Default | Description |
|------|---------|-------------|
| `--real` | off | Enable real mode (required) |
| `--provider <name>` | `claude-code` | Which AI coding tool to invoke |
| `--command <cmd>` | auto-detected from provider | Custom command override |
| `--timeout <ms>` | `120000` | Per-scenario timeout in milliseconds |

#### Available providers

| Provider | Command | Notes |
|----------|---------|-------|
| `claude-code` | `claude` | Default. Anthropic's Claude Code CLI |
| `codex` | `codex` | OpenAI Codex CLI |
| `gemini-cli` | `gemini` | Google Gemini CLI |
| `custom` | (set via `--command`) | Any CLI that accepts skill input on stdin |

#### Examples

```bash
# Run with Claude Code (default provider)
npx skillkit test examples/ --real

# Run with a specific provider
npx skillkit test examples/ --real --provider codex

# Run with a custom command and longer timeout
npx skillkit test examples/ --real --command ./my-cli --timeout 180000

# Run just one test directory with real mode
npx skillkit test examples/review/ --real --provider claude-code
```

#### Example output

```
$ skillkit test examples/review/ --real --provider claude-code

  Found 1 test file(s) in examples/review/
  Mode: real
  Provider: claude-code
  Timeout: 120000ms

  review skill tests
    ✓ catches security vulnerability (4230ms)
    ✓ no false positives on clean diff (3810ms)
    ✓ provides actionable output (5120ms)

  PASS 3 passed, 3 total (13160ms)
```

Configure defaults in `skillkit.config.yaml`:

```yaml
test:
  mock: false                    # Use real mode by default
  provider: claude-code          # Which provider to use
  command: "claude"              # Custom command override
  timeout: 120000                # Per-scenario timeout in milliseconds
```

Or override per run:

```bash
npx skillkit test examples/ --real --provider codex --timeout 90000
```

**When to use each mode:**

| Situation | Mode |
|-----------|------|
| CI/CD pipeline on every push | Mock |
| Pre-commit hook | Mock |
| After editing a skill's prompt | Real |
| Before publishing a skill | Real |
| Debugging a failing scenario | Real |

## Complete Example

Here is a full test file for a review skill with five scenarios. Each line is annotated.

```yaml
# ------------------------------------------------------------------
# review.test.yaml
# Tests for the /review skill
# ------------------------------------------------------------------

name: review skill tests                  # Suite name, shown in output
skill: ./SKILL.md                         # Path to the skill (relative to this file)

fixtures:                                 # Fixture repos used by scenarios
  - ./fixtures/node-app                   # Clean Node.js app (no issues)
  - ./fixtures/vulnerable-app             # App with known security issues

scenarios:

  # Scenario 1: Verify the skill catches a known vulnerability.
  # This is the most important test -- if the skill cannot find
  # a real issue, everything else is moot.
  - name: catches XSS vulnerability
    description: >
      The vulnerable-app fixture contains an innerHTML assignment
      using unsanitized user input. The skill must flag this as
      a critical security issue.
    fixture: ./fixtures/vulnerable-app     # Run against the vulnerable fixture
    invoke: "/review main"                 # Invoke exactly as a user would
    assertions:
      - contains: "CRITICAL"              # Must use the CRITICAL label
      - contains: "XSS"                   # Must identify the issue type
      - severity:                          # Expect 1-3 critical findings
          level: CRITICAL
          min: 1
          max: 3

  # Scenario 2: Verify no false positives on clean code.
  # A skill that flags everything as critical is useless.
  - name: no false positives on clean code
    description: >
      The node-app fixture has clean, well-written code.
      The skill should not report any critical issues.
    fixture: ./fixtures/node-app           # Run against the clean fixture
    invoke: "/review main"
    assertions:
      - noCriticalIssues: true            # Zero critical findings
      - completes: true                    # Must finish without crashing

  # Scenario 3: Verify the output format matches the spec.
  # The SKILL.md defines a specific output format with sections.
  # This test ensures the skill follows its own format.
  - name: follows output format spec
    invoke: "/review main"
    assertions:
      - matchesPattern: "## Critical Issues"      # Section header present
      - matchesPattern: "## Summary"               # Summary section present
      - matchesPattern: "\\[CRITICAL|WARNING|SUGGESTION\\]"  # Severity labels used

  # Scenario 4: Verify the output is concise.
  # Review output that runs to 10,000 tokens is not useful.
  - name: output stays concise
    invoke: "/review main"
    assertions:
      - maxTokens: 3000                   # Hard cap on output length
      - completes: true

  # Scenario 5: Verify the skill handles injected bad code.
  # Uses setup to inject a vulnerable file into a clean fixture,
  # then checks the skill catches it.
  - name: catches injected SQL injection
    fixture: ./fixtures/node-app           # Start with the clean fixture
    setup:
      - injectFile:                        # Inject a file before running
          path: src/db.js
          content: |
            export function getUser(id) {
              const query = `SELECT * FROM users WHERE id = ${id}`;
              return db.query(query);
            }
    invoke: "/review main"
    assertions:
      - contains: "SQL injection"          # Must identify the injected issue
      - contains: "CRITICAL"               # Must rate it as critical
      - notContains: "no issues"           # Must NOT say the code is clean
```

## Reading Test Output

### All scenarios pass

```
$ skillkit test .claude/skills/review/

  .claude/skills/review/review.test.yaml
  ✓ catches XSS vulnerability
  ✓ no false positives on clean code
  ✓ follows output format spec
  ✓ output stays concise
  ✓ catches injected SQL injection

  PASS 5 scenario(s) passed
```

Each green checkmark is one scenario where all assertions passed.

### Some scenarios fail

```
$ skillkit test .claude/skills/review/

  .claude/skills/review/review.test.yaml
  ✓ catches XSS vulnerability
  ✖ no false positives on clean code
    FAILED: noCriticalIssues
    Expected: zero [CRITICAL] findings
    Actual output contained: [CRITICAL] src/index.js:12 — Unused variable
  ✓ follows output format spec
  ✓ output stays concise
  ✖ catches injected SQL injection
    FAILED: contains "SQL injection"
    The string "SQL injection" was not found in the output.
    Output (first 500 chars):
      ## Critical Issues
      - [CRITICAL] src/db.js:2 — Unsanitized input in database query
      ...

  FAIL 2 of 5 scenario(s) failed
```

Each failure shows:

1. **Which assertion failed** -- the assertion type and expected value.
2. **What actually happened** -- the actual output or a relevant excerpt.
3. **Enough output to debug** -- the first 500 characters of the skill's response, so you can see what it actually said.

### How to debug a failure

1. **Read the "Actual output" section.** Often the skill did produce the right content but used different wording. If it said "database query injection" instead of "SQL injection", update your assertion to match what the skill actually says, or update the skill to use the term you want.

2. **Run the skill manually.** Invoke the skill yourself to see the full output:
   ```bash
   # In the fixture directory
   /review main
   ```

3. **Check your assertion.** A `matchesPattern` with an unescaped regex character is a common mistake. Remember that backslashes must be doubled in YAML: `"\\[CRITICAL\\]"` not `"[CRITICAL]"`.

4. **Check your fixture.** If the scenario uses a fixture, make sure the fixture contains what you think it contains. A missing file or unexpected git state can change the skill's output.

5. **Run in real mode.** If you are debugging a failure from mock mode, try real mode to see actual model output:
   ```bash
   npx skillkit test .claude/skills/review/ --real
   ```

## Writing Tests for Mock Mode

In mock mode, the SKILL.md body IS the output. This means your assertions must match strings that actually appear in the skill's own instruction text.

For example, if your SKILL.md body contains:

```markdown
## Output Format
- [CRITICAL] <file>:<line> -- <description>
- [WARNING] <file>:<line> -- <description>
```

Then these assertions will pass in mock mode:

```yaml
assertions:
  - contains: "[CRITICAL]"        # This string is in the SKILL.md body
  - contains: "[WARNING]"         # This string is in the SKILL.md body
  - matchesPattern: "\\[CRITICAL|WARNING\\]"  # Pattern matches the body
```

But these will fail:

```yaml
assertions:
  - contains: "SQL injection found"   # Not in the SKILL.md body
  - notContains: "git push"           # Fails if "git push" IS in the body
  - noErrors: true                    # Fails if "error" appears anywhere in the body
  - noCriticalIssues: true            # Fails if "critical" appears anywhere (case-insensitive)
```

**Tips for mock-compatible tests:**

1. Use `contains` assertions that match keywords from your skill's output format section or phase headings
2. Avoid `noErrors: true` if your skill text mentions "error" in any context (like "error handling" or "syntax errors")
3. Avoid `noCriticalIssues: true` if your skill defines critical-level output formats
4. Use `matchesPattern` for structural checks against the skill's documented format
5. Use `completes: true` freely -- it always passes in mock mode

## Real Example

Running all 6 reference skills (13 scenarios total) in mock mode:

```
$ skillkit test examples/

  improve skill tests
  ✓ produces structured audit report
  ✓ detects stale skills

  investigate skill tests
  ✓ follows phased approach
  ✓ does not skip to fix

  review skill tests
  ✓ catches security vulnerability
  ✓ provides actionable output
  ✓ includes severity categories

  scaffold skill tests
  ✓ detects project conventions
  ✓ generates a valid skill file

  ship skill tests
  ✓ checks branch before shipping
  ✓ follows failure protocol

  tdd skill tests
  ✓ writes test before implementation
  ✓ follows RED GREEN REFACTOR cycle

  PASS 13 passed, 13 total (9ms)
```

## Current Status

**v0.2 (shipped):** Full test execution in mock mode. The `@skillkit/test-harness` package parses test YAML, runs scenarios against the SKILL.md body, evaluates all assertion types (contains, notContains, matchesPattern, severity, completes, noErrors, noCriticalIssues, maxTokens), and reports pass/fail results with diagnostics.

**v0.5.1 (current):** Real mode execution. The test runner invokes the actual AI model via subprocess for each scenario using the `--real` flag. Supports `--provider`, `--command`, and `--timeout` flags. Provider abstraction handles Claude Code, Codex, Gemini CLI, and custom commands. Captures stdout, evaluates assertions against real output, and reports results with timing. The companion `skillkit bench` command also supports real mode with the same provider flags -- see [GUIDE_BENCH.md](./GUIDE_BENCH.md) for precision/recall scoring against ground truth.
