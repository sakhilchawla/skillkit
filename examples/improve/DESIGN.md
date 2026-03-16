# Improve Skill — Design Decisions

## Problem
Skill configurations accumulate debt: stale references, redundant skills, missing coverage, security oversights. Without periodic auditing, the skill set degrades.

## Key Decisions

### Report only, never auto-apply
**Why:** Auto-improvement without measurable quality metrics leads to infinite meta-optimization — the skill rewrites itself endlessly without improving outcomes. Human review ensures changes are intentional.

### Measurable criteria only
Each audit check has a concrete pass/fail condition:
- Staleness: last modified > 90 days (concrete, measurable)
- Redundancy: >60% description overlap (measurable via string similarity)
- Path accuracy: referenced file exists or doesn't (binary)

### Avoiding infinite meta-optimization
The improve skill does NOT audit itself. It audits project skills and context files. Self-referential improvement is a philosophical trap that produces busywork.

## Quality Criteria
- Identifies >90% of stale references (paths to deleted files)
- Zero false positives on redundancy (only flags genuinely overlapping skills)
- Recommendations are specific and actionable (not "consider improving")
- Completes in <30 seconds for repos with <20 skills
