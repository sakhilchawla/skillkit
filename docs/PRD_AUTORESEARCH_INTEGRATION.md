# PRD: Skillkit x Autoresearch Integration

## Status: Draft
## Author: Sakhil Chawla
## Date: 2026-03-18

---

## 1. Problem Statement

### What is autoresearch?

Karpathy's [autoresearch](https://github.com/karpathy/autoresearch) gives an AI coding agent (Claude Code, Cursor, etc.) a single instruction file (`program.md`) that says:

> "Here is a GPU training script. Edit it to try an experiment. Run it. Check if the result improved. If yes, keep the change. If no, undo it. Repeat forever."

The agent runs autonomously — the human sleeps while the AI runs 100+ experiments overnight, each one modifying the training code, measuring the outcome (a metric called `val_bpb` — lower is better), and keeping only the improvements.

### What's the problem?

`program.md` is **untested, unlinted, and unmeasured**. It's a ~200-line natural-language program that controls an autonomous agent with access to shell commands, git, and GPU resources. If there's a subtle bug in these instructions:

- The agent might forget to revert bad experiments → your git history is ruined
- The agent might modify files it shouldn't → your evaluation code is corrupted
- The agent might not handle crashes properly → it stops after one failure
- The agent might push to remote → your collaborators get 100 junk commits
- The agent might ignore the time budget → a single run eats 2 hours of GPU time

**Nobody finds out until they've wasted hours of compute.** There is no way to test these instructions before running them for real.

### Why does this matter beyond autoresearch?

The "experiment loop" pattern (edit → run → measure → keep/revert) is universal:

| Domain | What gets edited | What gets measured |
|--------|-----------------|-------------------|
| ML training | Model architecture, hyperparameters | Validation loss (val_bpb) |
| Frontend performance | Bundle config, code splitting | Bundle size (KB) |
| API optimization | Query logic, caching, indexing | Response time (p99 ms) |
| Test coverage | Test files, test strategies | Coverage percentage |
| Compiler optimization | Compiler passes, flags | Benchmark throughput (ops/sec) |

Anyone who wants an AI agent to autonomously optimize code against a metric has this problem: **how do you know the agent will follow your instructions correctly?**

---

## 2. Solution Overview

Extend skillkit to support **research skills** — agent instructions that run autonomous experiment loops. Three capabilities:

### Capability 1: Lint research skills before running them

Catch dangerous patterns and missing safeguards in the instructions *before* the agent starts executing.

**User story**: "As a researcher, I want to validate that my experiment-loop instructions have proper safeguards (branch isolation, revert strategy, time limits, bounded mutation surface) so that I don't waste GPU hours on a broken protocol."

**Example**:
```
$ skillkit lint program.md --preset research

  program.md
    ✓ valid-experiment-loop: branch isolation found
    ✓ mutation-surface-bounded: only train.py is editable
    ✓ has-revert-strategy: git reset on regression
    ✓ has-resource-budget: TIME_BUDGET=300s defined
    ⚠ no-destructive-commands: 'git reset --hard' (allowed in research preset)
    0 errors, 1 warning
```

### Capability 2: Test research skills without a GPU

Replace the real training script with a **stub** that finishes in 2 seconds and returns fake results. Test whether the agent follows the protocol correctly — commits before running, reverts on regression, handles crashes, logs results — without any GPU cost.

**User story**: "As a researcher, I want to test that my agent follows the experiment protocol correctly using cheap fake training runs, so I can catch behavioral bugs before committing real compute."

**Example**:
```
$ skillkit test autoresearch.test.yaml --real --provider claude-code

  autoresearch skill tests
    Fixture: stub-training (fake train.py, 2s execution)
    ✓ follows experiment protocol        [5/5 runs passed]
    ✓ handles OOM crash                  [4/5 runs passed]
    ✓ reverts on regression              [5/5 runs passed]
    ✓ never modifies frozen files        [5/5 runs passed]
    4 scenarios passed (42.1s)
```

### Capability 3: Benchmark and compare research skill versions

Measure how well different versions of experiment-loop instructions perform on two dimensions:

1. **Protocol compliance** — does the agent follow the instructions? (precision/recall/F1)
2. **Effectiveness** — does the agent produce better results? (metric improvement)

**User story**: "As a researcher, I want to A/B test two versions of my experiment instructions to see which one produces better research outcomes and more reliable agent behavior."

**Example**:
```
$ skillkit bench research-bench.yaml --compare ./v2/SKILL.md

  Protocol Compliance (did the agent follow instructions?):
              Precision  Recall   F1
    v1:       90.0%     81.8%    85.7%
    v2:       100.0%    90.9%    95.2%

  Effectiveness (did the agent get good results?):
              Best val_bpb   Experiments kept
    v1:       1.0142         60%
    v2:       0.9987         70%

  Winner: v2 (better on both dimensions)
```

---

## 3. User Personas

### Persona 1: ML Researcher (primary)

**Who**: Someone using autoresearch or a similar setup to run autonomous ML experiments.

**Pain**: Wastes GPU hours when the agent doesn't follow instructions properly. No way to test the instructions cheaply. No way to compare different prompting strategies.

**Needs**: Lint for safety, cheap testing with stubs, A/B comparison of instruction variants.

### Persona 2: Performance Engineer

**Who**: Someone who wants an AI agent to autonomously optimize their code against a benchmark (latency, throughput, bundle size).

**Pain**: Writing experiment-loop instructions from scratch is error-prone. No tooling exists for this pattern.

**Needs**: Generated experiment-loop skills from `skillkit adapt`, with built-in safeguards.

### Persona 3: Skill Author (existing skillkit user)

**Who**: Someone already writing SKILL.md files who wants to adopt the experiment-loop pattern.

**Pain**: Existing skills are one-shot (do a task, done). The experiment loop is a new pattern with different safety requirements.

**Needs**: Templates, examples, and lint rules specific to the loop pattern.

---

## 4. What We Are NOT Building

| Out of scope | Why |
|-------------|-----|
| A training framework | Autoresearch already has train.py and prepare.py. We don't touch ML infrastructure. |
| A hyperparameter search tool | The agent decides what to try. We test whether the agent follows instructions, not which experiments it picks. |
| GPU resource management | We test with stubs. Real GPU scheduling is the user's problem. |
| A replacement for program.md | We extend skillkit to support program.md as a skill. The user keeps their existing workflow. |
| Multi-GPU / distributed support | Autoresearch is single-GPU. We follow that constraint. |

---

## 5. Success Metrics

| Metric | Target | How to measure |
|--------|--------|---------------|
| Detectable issues in program.md | ≥3 actionable warnings from lint | Run skillkit lint on current program.md |
| Stub test coverage of protocol | ≥80% of protocol steps testable with stubs | Count testable vs untestable protocol steps |
| Cost reduction for testing | 99% less than real GPU runs | Compare: stub test time vs real training time |
| A/B benchmark discriminates skill versions | Correctly identifies the better version in ≥80% of comparisons | Run known-better vs known-worse skill variants |

---

## 6. Rollout Plan

### Phase 1: Lint (2 weeks)
Ship new `research` lint preset with 5 rules. Users can run `skillkit lint program.md --preset research` immediately. No GPU needed, no breaking changes.

**Deliverable**: program.md gets linted. Issues get flagged.

### Phase 2: Test (2 weeks)
Ship stub fixture system and statistical test scenarios. Users can write .test.yaml files for research skills and test them with `--real --provider claude-code` using stub fixtures.

**Deliverable**: Research skills get tested cheaply.

### Phase 3: Benchmark (3 weeks)
Ship trace-based scorer, scalar metric scorer, and dual-dimension reporting. Users can A/B compare research skill variants.

**Deliverable**: Research skills get quantitatively compared.

### Phase 4: Generalize (3 weeks)
Ship `experiment-loop` template in the adapter system. Users can run `skillkit adapt experiment-loop` to generate safe experiment-loop skills for their own projects.

**Deliverable**: Any project with a benchmark gets experiment-loop skills.

---

## 7. Open Questions

| # | Question | Impact | Who decides |
|---|----------|--------|-------------|
| 1 | Should stub fixtures be bundled in skillkit or in autoresearch? | Packaging, maintenance ownership | Us + Karpathy (if engaged) |
| 2 | How many real-mode runs are needed for statistical significance? | GPU cost vs confidence | Data from early users |
| 3 | Should the experiment-loop template support multi-file mutation surfaces? | Complexity, safety | Based on demand |
| 4 | Should we support providers beyond Claude Code for real-mode testing? | Already supported (codex, gemini-cli) but untested for long-running loops | Test coverage |
| 5 | Can we upstream any of this into autoresearch itself? | Community impact, maintenance | Karpathy's interest |
