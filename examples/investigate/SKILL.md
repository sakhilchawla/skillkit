---
name: investigate
description: Systematic debugging with mandatory root cause analysis before proposing fixes
user-invocable: true
allowed-tools: Read, Bash, Grep, Glob, Edit
argument-hint: "<error-message or symptom>"
---

# Investigate

Systematically debug $ARGUMENTS using evidence-based root cause analysis.

## Phase 1: REPRODUCE

1. Understand the reported symptom from $ARGUMENTS
2. Find the relevant code: search for error messages, function names, or affected files
3. Attempt to reproduce: run tests, trigger the code path, check logs
4. If you cannot reproduce, gather more context before proceeding
5. Document: "Reproduced: [yes/no]. Steps: [what you did]. Observed: [what happened]."

## Phase 2: HYPOTHESIZE

1. Based on reproduction, form 2-3 hypotheses for the root cause
2. Rank hypotheses by likelihood
3. For each hypothesis, identify what evidence would confirm or refute it
4. Document: "Hypothesis 1: [description]. Evidence needed: [what to check]."

Do NOT propose fixes yet.

## Phase 3: VERIFY

1. Test the most likely hypothesis first
2. Gather evidence: read code, add logging, check state, run isolated tests
3. Confirm or refute each hypothesis with evidence
4. If all hypotheses are refuted, return to Phase 2 with new information
5. Document: "Confirmed: [hypothesis]. Evidence: [what proved it]."

## Phase 4: FIX

Only after root cause is verified:
1. Propose the minimal fix
2. Explain WHY this fix addresses the root cause
3. Write a regression test that fails without the fix and passes with it
4. Verify no other tests break

## Rules

- Never propose a fix before Phase 3 is complete
- Never guess — always gather evidence
- Prefer reading code over adding debug output
- If stuck, broaden the search: check git blame, recent changes, related files
- Document findings at each phase for future reference
