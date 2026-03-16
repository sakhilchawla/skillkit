# TDD Skill — Design Decisions

## Problem
Developers write tests after implementation, producing tests that validate existing code rather than driving design. These tests catch fewer bugs.

## Key Decisions
- **One test at a time** — prevents over-planning
- **Verify failure reason** — catches false reds from broken imports
- **Framework auto-detection** — works with any test runner
- **Refactor as third step** — prevents gold-plating during GREEN

## Quality Criteria
- Every production function has a test written BEFORE the function
- No test was witnessed passing before the production code existed
- No .only/.skip/debug artifacts remain
