# Ship Skill — Design Decisions

## Problem
Shipping involves 6+ steps. Developers skip tests and self-review under pressure.

## Key Decisions
- **Auto-detect project type** from config files for cross-ecosystem support
- **Strict stop-on-failure** — no --force or --no-verify
- **Self-review step** catches debug code and secrets before PR

## Quality Criteria
- Completes in <3 minutes, never pushes failing tests, clear error messages
