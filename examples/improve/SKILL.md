---
name: improve
description: Audit skills and context configuration for staleness, gaps, and quality issues
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep
argument-hint: "[scope: skills|context|all]"
---

# Improve

Audit the current project's AI agent configuration for quality issues.

Scope: $ARGUMENTS (default: all)

## Audit 1: Skill Quality (scope: skills or all)

For each SKILL.md found in the project:
1. **Spec compliance** — Has name, description, valid frontmatter fields?
2. **Staleness** — When was it last modified? (`git log -1 --format=%cr -- <file>`)
3. **Redundancy** — Are any skills doing substantially the same thing?
4. **Security** — Does it request Bash without safety constraints?
5. **Token budget** — Is the body unreasonably large?

## Audit 2: Context Quality (scope: context or all)

Check CLAUDE.md, .cursorrules, and similar context files:
1. **Accuracy** — Do referenced files/paths still exist?
2. **Freshness** — Does git history show significant changes since context was written?
3. **Completeness** — Are there major directories or patterns not mentioned?

## Audit 3: Gap Analysis (scope: all)

Check for common workflows that could benefit from skills:
- Does the project have a shipping/PR workflow skill?
- Does it have a testing discipline skill?
- Does it have a review/quality skill?
- Does it have scaffold skills for common creation tasks?

## Output Format

```
## Skill Audit
| Skill | Status | Issues |
|-------|--------|--------|
| review | ✓ Good | None |
| ship | ⚠ Stale | Not modified in 90+ days |

## Context Audit
| File | Status | Issues |
|------|--------|--------|
| CLAUDE.md | ⚠ Outdated | References deleted directory |

## Recommendations
1. [Priority] <specific action with expected impact>
2. ...

## Gaps
- Missing: /scaffold skill — would save ~15min per new component
```

## Rules

- Report findings, do NOT auto-apply changes
- Each recommendation must include: what to change, why, expected impact
- Prioritize by impact: security > correctness > freshness > completeness
- Do not recommend adding skills the project doesn't need
