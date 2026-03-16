# Writing Excellent Agent Skills

## Anatomy of a SKILL.md

```markdown
---
name: my-skill
description: Clear, actionable description of what this skill does
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep
argument-hint: "<what-to-pass>"
---

# Skill Title

Instructions for the AI agent...
```

## Frontmatter Reference

| Field | Required | Type | Purpose |
|-------|----------|------|---------|
| name | Yes | string | Slash command name |
| description | Yes | string | Loaded into context for auto-invocation |
| user-invocable | No | boolean | Allow `/name` invocation |
| allowed-tools | No | string | Comma-separated tool permissions |
| model | No | string | Model override |
| argument-hint | No | string | Usage hint for arguments |
| agent | No | boolean | Run as subagent |
| disable-model-invocation | No | boolean | Prevent auto-invocation |

## Best Practices

### 1. Description is your elevator pitch
The description is loaded into context budget (2% of context window). Make it specific and actionable:
- Bad: "A helper tool"
- Good: "Pre-landing code review with severity-based analysis for security, correctness, and style"

### 2. Principle of least privilege
Only request the tools you need. Bash is powerful but dangerous.

### 3. Structured output
Define your output format explicitly. Agents produce better results when they know the expected format.

### 4. Fail loudly
Include explicit stop conditions: "If X fails, STOP and report the error."

### 5. One skill, one job
A skill that reviews AND ships AND deploys is three skills. Keep them composable.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Vague description | Won't be auto-invoked correctly | Be specific about what it does |
| Unrestricted Bash | Security risk | List forbidden commands |
| Hardcoded paths | Not portable | Use relative paths |
| No output format | Inconsistent results | Define structure explicitly |
| Massive body (>5K tokens) | Wastes context budget | Split into multiple skills |

## Validate Your Skills

```bash
npx skillkit lint path/to/skill/
```
