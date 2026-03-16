# Investigate Skill — Design Decisions

## Problem
Developers jump to fixes without understanding root causes. This leads to patches that mask bugs, create regressions, or fix symptoms while the real issue persists.

## Key Decisions
- **Four mandatory phases** — cannot skip to fix
- **Evidence-based** — every hypothesis needs confirming evidence
- **Documentation at each phase** — creates audit trail
- **Regression test required** — prevents the same bug from recurring

## Quality Criteria
- Root cause identified in >90% of cases
- Fix addresses cause, not symptom
- Regression test proves the fix
- No existing tests broken
