---
name: ship
description: Automated shipping workflow — sync, test, lint, review, commit, push, create PR
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep
argument-hint: "[commit-message]"
---

# Ship

Automated end-to-end shipping workflow.

## Pre-flight

1. Verify NOT on main/master — STOP if so
2. Verify there are changes to ship (staged, unstaged, or unpushed commits)

## Step 1: Sync with main
```
git fetch origin && git merge origin/main --no-edit
```
If merge conflicts, STOP and report them.

## Step 2: Run checks

Detect project type and run appropriate commands:
| File | Test | Lint |
|------|------|------|
| package.json | npm test | npm run lint |
| Makefile | make test | make lint |
| pyproject.toml | pytest | ruff check . |
| Cargo.toml | cargo test | cargo clippy |
| go.mod | go test ./... | golangci-lint run |

STOP on any failure.

## Step 3: Self-review diff

Scan `git diff origin/main...HEAD` for: debug code, TODO/FIXME, hardcoded secrets, large binaries.
If found, report and STOP.

## Step 4: Commit (if uncommitted changes)
Stage and commit. Use $ARGUMENTS as message or auto-generate conventional commit.

## Step 5: Push
`git push -u origin <current-branch>`

## Step 6: Create PR
`gh pr create --fill` (fall back to URL if gh not installed)

## Failure Protocol
On ANY failure: print error, print which step failed, do NOT continue, do NOT use --force or --no-verify.
