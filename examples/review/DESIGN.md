# Review Skill — Design Decisions

## Problem
AI-assisted review often produces noise — flagging style nitpicks while missing real bugs.

## Key Decisions

### Two-pass approach
Separate critical issues from suggestions. Complete critical pass first.
**Why:** Mixed severity causes alert fatigue. Two-pass forces the model to prioritize correctness.

### Language-agnostic
No framework-specific checks. Customize via project-level checklist files.

## Quality Criteria
- True positive rate > 80% on known-bad diffs
- False positive rate < 10% on clean diffs
- Every finding has file:line and fix suggestion
- Completes in under 60 seconds
