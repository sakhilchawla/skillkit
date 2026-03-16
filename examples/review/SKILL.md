---
name: review
description: Pre-landing code review with two-pass severity analysis for any codebase
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep
argument-hint: "[base-branch]"
---

# Code Review

Review the current branch's changes against the base branch (default: main).

## Phase 1: Gather Context

1. Determine the base branch: use $ARGUMENTS if provided, otherwise detect main/master
2. Run `git diff <base>...HEAD --stat` to see changed files
3. Run `git diff <base>...HEAD` to see the full diff
4. Read any modified files in full for surrounding context

## Phase 2: Critical Review (MUST complete first)

Check for issues that would block merging. For each finding, cite the file and line.

**Security:** SQL injection, XSS, command injection, hardcoded secrets, unsafe deserialization
**Correctness:** Logic errors, null access, race conditions, missing error handling
**Data Loss:** Destructive operations without confirmation, missing transactions
**Breaking Changes:** Public API changes, removed exports, changed behavior

## Phase 3: Suggestions Review

**Performance:** N+1 queries, unnecessary re-renders, missing memoization
**Maintainability:** Dead code, duplicated logic, complex functions, missing types
**Testing:** Untested critical paths, brittle assertions, missing edge cases

## Output Format

```
## Critical Issues (must fix before merge)
- [CRITICAL] <file>:<line> — <description>

## Warnings (should fix)
- [WARNING] <file>:<line> — <description>

## Suggestions (consider)
- [SUGGESTION] <file>:<line> — <description>

## Summary
<1-2 sentence overall assessment>
```

## Rules

- Never approve code with Critical issues
- Be specific: cite file, line, and the problematic code
- Suggest fixes, not just problems
- If the diff is clean, say so — do not invent issues
