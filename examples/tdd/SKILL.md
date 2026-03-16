---
name: tdd
description: Enforce strict RED-GREEN-REFACTOR test-driven development cycle
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
argument-hint: "<feature-description>"
---

# Test-Driven Development

Implement $ARGUMENTS using strict RED-GREEN-REFACTOR discipline.

## Phase 1: RED — Write a failing test

1. Understand the requirement from $ARGUMENTS
2. Write ONE test that describes the desired behavior
3. Run the test — it MUST fail
4. Verify it fails for the RIGHT reason (not syntax/import errors)
   - If it fails for the wrong reason, fix the test setup first
5. Do NOT write any production code yet

## Phase 2: GREEN — Make it pass

1. Write the MINIMUM code to make the failing test pass
2. Do not add features beyond what the test requires
3. Run ALL tests (not just the new one) — they must ALL pass
4. If existing tests break, fix them before continuing

## Phase 3: REFACTOR — Clean up

1. Look for duplication, unclear names, overly complex logic
2. Refactor while keeping ALL tests green
3. Run tests after each refactoring step
4. If any test breaks during refactor, undo the last change

## Cycle

Repeat Phase 1-3 for each behavior. One test at a time. Never write production code without a failing test.

## Rules

- Never skip RED. Every behavior needs a failing test first.
- Never write more code than the test demands in GREEN.
- Never break existing tests.
- Remove all debug artifacts (console.log, .only, .skip) before completing.
- Detect the test framework from project config (jest, vitest, pytest, go test, cargo test, etc.)
