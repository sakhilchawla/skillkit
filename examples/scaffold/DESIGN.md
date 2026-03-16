# Scaffold Skill — Design Decisions

## Problem
Scaffold skills are the most useful skills for daily work but the least portable. A /create-component skill for a React/Tailwind project is useless for a Vue/SCSS project. Every team ends up writing their own from scratch.

## Key Decision: Teach to fish, not give a fish
Instead of providing one hardcoded scaffold, this meta-skill reads YOUR repo and generates a scaffold skill that matches YOUR conventions. The generated skill is the product, not this one.

## How detection works
1. Find 3-5 existing examples of the target type
2. Extract structural patterns (imports, naming, directory placement)
3. Generate instructions that reproduce those exact patterns

## Quality Criteria
- Generated skill produces output indistinguishable from hand-written code
- Conventions detected match actual codebase (verified against examples)
- Works for any language/framework with sufficient examples in the repo

## Known Limitations
- Needs at least 2 examples to detect patterns reliably
- Cannot detect unwritten conventions (things the team knows but hasn't codified)
- Generated skill may need manual tuning for edge cases
