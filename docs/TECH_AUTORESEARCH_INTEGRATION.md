# Technical Design: Skillkit x Autoresearch Integration

## Status: Draft
## Date: 2026-03-18

---

## Table of Contents

1. [How the Two Systems Work Today](#1-how-the-two-systems-work-today)
2. [What Changes in Skillkit](#2-what-changes-in-skillkit)
3. [Phase 1: Research Lint Preset](#3-phase-1-research-lint-preset)
4. [Phase 2: Stub Testing](#4-phase-2-stub-testing)
5. [Phase 3: Dual-Dimension Benchmarking](#5-phase-3-dual-dimension-benchmarking)
6. [Phase 4: Experiment-Loop Adapter](#6-phase-4-experiment-loop-adapter)
7. [Data Flow Diagrams](#7-data-flow-diagrams)
8. [Package-by-Package Changes](#8-package-by-package-changes)
9. [New Types](#9-new-types)
10. [Migration & Compatibility](#10-migration--compatibility)

---

## 1. How the Two Systems Work Today

### Autoresearch (Karpathy)

```
program.md  ──→  AI Agent (Claude Code / Cursor)
                      │
                      ├── reads train.py
                      ├── edits train.py (proposes experiment)
                      ├── git commit
                      ├── runs: uv run train.py > run.log
                      ├── parses val_bpb from run.log
                      ├── if improved → keep commit
                      ├── if worse → git reset (revert)
                      ├── logs to results.tsv
                      └── repeat forever
```

**Key files**:
- `program.md` — the agent instructions (natural language)
- `train.py` — the ONLY file the agent edits (GPT model + training loop)
- `prepare.py` — FROZEN, never modified (data loading, tokenizer, evaluation)
- `results.tsv` — experiment log (commit, val_bpb, memory, status, description)

**Key constraints**:
- Single GPU (designed for H100)
- 5-minute time budget per experiment
- Single metric: val_bpb (validation bits per byte, lower = better)
- No new dependencies allowed
- Agent must never stop, never ask questions

### Skillkit (This Project)

```
SKILL.md  ──→  skillkit lint   → errors/warnings
          ──→  skillkit test   → pass/fail per scenario
          ──→  skillkit bench  → precision/recall/F1
```

**Key concepts**:
- A skill = YAML frontmatter + markdown body in a SKILL.md file
- Lint = static analysis against 15 rules in 4 categories
- Test = YAML-defined scenarios with 8 assertion types, mock or real mode
- Bench = score skill output against ground truth (known bugs), compute P/R/F1

**The gap**: Skillkit's lint rules, test assertions, and benchmark scoring are designed for **task skills** (review code, ship a PR, scaffold a project). Research skills have different safety requirements, different testing needs, and a different quality metric (continuous scalar, not discrete findings).

---

## 2. What Changes in Skillkit

### Nothing breaks. Everything is additive.

| Component | What exists | What we add |
|-----------|------------|-------------|
| **Linter** | 15 rules, 3 presets (strict, recommended, minimal) | 5 new rules, 1 new preset (`research`) |
| **Test harness** | 8 assertion types, mock + real mode, fixtures | Stub fixtures, statistical scenarios, 1 new assertion type |
| **Benchmarks** | Finding-based scorer (P/R/F1), A/B comparison | Trace-based scorer, scalar metric scorer, dual-dimension reports |
| **Adapters** | Stack detection, 3 templates (component, module, test) | Optimization target detection, 1 new template (`experiment-loop`) |
| **CLI** | lint, test, bench, init, adapt | No new commands. New flags: `--preset research` for lint |
| **Core** | Skill parser, types, spec | New type: `ExperimentLoopConfig` in skill frontmatter (optional) |

---

## 3. Phase 1: Research Lint Preset

### Why this first

Linting is the cheapest, fastest, zero-dependency way to improve safety. A user can `skillkit lint program.md --preset research` today without a GPU, without real-mode execution, without any external setup.

### New lint rules

#### Rule 1: `valid-experiment-loop`

**What it checks**: The skill body describes a keep/revert protocol with git branch isolation.

**How it works**: Scans the markdown body for presence of required protocol elements.

```typescript
// packages/linter/src/rules/validExperimentLoop.ts

interface ProtocolElement {
  name: string
  patterns: RegExp[]     // at least one must match
  required: boolean
}

const PROTOCOL_ELEMENTS: ProtocolElement[] = [
  {
    name: 'branch-isolation',
    patterns: [
      /git\s+(checkout|switch)\s+-[bc]/i,
      /git\s+branch\s+/i,
      /create\s+(a\s+)?branch/i,
    ],
    required: true,
  },
  {
    name: 'commit-before-run',
    patterns: [
      /git\s+commit/i,
      /commit\s+(before|prior|first)/i,
    ],
    required: true,
  },
  {
    name: 'revert-on-failure',
    patterns: [
      /git\s+reset/i,
      /git\s+revert/i,
      /revert.*worse/i,
      /undo.*regress/i,
    ],
    required: true,
  },
  {
    name: 'metric-check',
    patterns: [
      /if.*(improv|better|lower|higher)/i,
      /compar.*(baseline|previous|before)/i,
    ],
    required: true,
  },
]
```

**Output**:
```
✓ valid-experiment-loop: all 4 protocol elements found
✗ valid-experiment-loop: missing 'revert-on-failure' — skill must define how to undo failed experiments
```

#### Rule 2: `mutation-surface-bounded`

**What it checks**: The skill explicitly states which files the agent may modify and which are frozen.

**How it works**: Looks for file references in the skill body and checks for explicit permission/restriction language.

```typescript
// Looks for patterns like:
// "only modify train.py"
// "do not edit prepare.py"
// "frozen: prepare.py, evaluate.py"
// "mutable: train.py"
// "never change anything in prepare.py"

const MUTATION_ALLOW = /(?:only\s+(?:modify|edit|change)|mutable|can\s+(?:modify|edit))[:\s]+([^\n.]+)/gi
const MUTATION_DENY = /(?:do\s+not\s+(?:modify|edit|change)|frozen|never\s+(?:modify|edit|change|touch))[:\s]+([^\n.]+)/gi
```

**Output**:
```
✓ mutation-surface-bounded: mutable=[train.py], frozen=[prepare.py]
✗ mutation-surface-bounded: no explicit mutation boundaries found — skill should declare which files can be edited
```

#### Rule 3: `has-revert-strategy`

**What it checks**: The skill defines how to undo a failed experiment.

**How it works**: Checks for git reset, git revert, backup/restore, or similar rollback patterns.

```typescript
const REVERT_PATTERNS = [
  /git\s+reset\s+(--hard\s+)?HEAD/i,
  /git\s+revert/i,
  /restore.*backup/i,
  /cp.*\.bak/i,
  /rollback/i,
]
```

#### Rule 4: `has-resource-budget`

**What it checks**: The skill defines time limits, cost limits, or iteration limits.

**How it works**: Looks for budget-related constants or instructions.

```typescript
const BUDGET_PATTERNS = [
  /time.?budget|TIME_BUDGET/i,
  /timeout|max.?time|time.?limit/i,
  /\d+\s*(seconds?|minutes?|hours?)\s*(budget|limit|max)/i,
  /max.?(iterations?|experiments?|runs?|steps?)/i,
  /kill.*exceed/i,
]
```

#### Rule 5: `no-remote-push`

**What it checks**: Research loop skills should not push to remote during autonomous execution.

**How it works**: Flags `git push` unless explicitly in a "finalize" or "done" section.

```typescript
const PUSH_PATTERN = /git\s+push/gi
const SAFE_CONTEXT = /final|done|complete|finish|ship|publish/i
```

### New preset: `research`

```typescript
// packages/linter/src/presets/research.ts

export const researchPreset: PresetConfig = {
  // Existing rules — adjusted severity for research context
  'require-name': 'error',
  'require-description': 'error',
  'valid-frontmatter-fields': 'error',
  'valid-allowed-tools': 'warn',      // research skills may need broad tool access
  'valid-model': 'warn',
  'no-unrestricted-bash': 'warn',      // downgraded: research skills NEED bash
  'no-sensitive-paths': 'error',
  'no-data-exfiltration': 'error',
  'no-destructive-commands': 'warn',    // downgraded: git reset is expected
  'description-quality': 'warn',
  'body-not-empty': 'error',
  'reasonable-token-estimate': 'warn',
  'has-argument-hint': 'info',
  'no-hardcoded-paths': 'warn',
  'consistent-headings': 'info',

  // New research-specific rules
  'valid-experiment-loop': 'error',
  'mutation-surface-bounded': 'error',
  'has-revert-strategy': 'error',
  'has-resource-budget': 'error',
  'no-remote-push': 'warn',
}
```

### File changes summary (Phase 1)

```
packages/linter/
  src/
    rules/
      validExperimentLoop.ts     (NEW — ~80 lines)
      mutationSurfaceBounded.ts  (NEW — ~60 lines)
      hasRevertStrategy.ts       (NEW — ~40 lines)
      hasResourceBudget.ts       (NEW — ~40 lines)
      noRemotePush.ts            (NEW — ~50 lines)
      index.ts                   (EDIT — add 5 new rules to allRules)
    presets/
      research.ts                (NEW — ~40 lines)
      index.ts                   (EDIT — export research preset)
    engine.ts                    (EDIT — accept 'research' as preset name)
  src/__tests__/
    researchRules.test.ts        (NEW — ~200 lines)
```

**Estimated new code**: ~510 lines (production) + ~200 lines (tests)

---

## 4. Phase 2: Stub Testing

### The problem with testing research skills

Research skills run **long, expensive, non-deterministic processes**. Real-mode testing (where skillkit actually invokes the AI agent) can't use the real training script because:

1. It takes 5 minutes per training run
2. It requires a GPU
3. The AI agent's behavior varies between runs

### Solution: Stub fixtures

A **stub** is a fake version of the training script that:
- Runs in 1-2 seconds (no GPU)
- Outputs results in the same format as the real script
- Can simulate different outcomes (success, crash, OOM, NaN, timeout)

```
packages/test-harness/
  fixtures/
    autoresearch-stubs/          (NEW directory)
      success/
        train.py                 # prints val_bpb: 1.0234, peak_vram_mb: 40000
        prepare.py               # minimal stub (frozen, agent shouldn't touch)
      improvement/
        train.py                 # prints val_bpb: 0.9987 (better than baseline)
      regression/
        train.py                 # prints val_bpb: 1.1500 (worse than baseline)
      crash-oom/
        train.py                 # prints "CUDA out of memory" and exits 1
      crash-nan/
        train.py                 # prints "val_bpb: nan"
      timeout/
        train.py                 # sleeps for 600 seconds (exceeds budget)
```

**Example stub** (`success/train.py`):
```python
#!/usr/bin/env python3
"""Stub training script for testing. Simulates a successful training run."""
import time
import sys

# Simulate brief training
time.sleep(1.5)

# Output in the exact same format as real train.py
print("---")
print("val_bpb:          1.023400")
print("training_seconds: 300.1")
print("total_seconds:    325.9")
print("peak_vram_mb:     45060.2")
print("mfu_percent:      39.80")
print("total_tokens_M:   499.6")
print("num_steps:        953")
print("num_params_M:     50.3")
print("depth:            8")
```

### Statistical test scenarios

Research skills involve an AI agent making decisions. The same input can produce different agent behavior. One run passing doesn't mean the skill works. Five runs passing with 4/5 success gives real confidence.

**New fields in test YAML**:

```yaml
scenarios:
  - name: follows experiment protocol
    invoke: "/autoresearch test-run"
    runs: 5                   # NEW: run this scenario 5 times
    pass_threshold: 0.8       # NEW: 4 out of 5 must pass
    assertions:
      - contains: "git commit"
      - contains: "val_bpb"
      - matchesPattern: "results\\.tsv"
```

**Implementation**:

```typescript
// packages/test-harness/src/types.ts — additions

interface TestScenario {
  name: string
  description?: string
  fixture?: string
  setup?: TestSetupAction[] | 'none'
  invoke: string
  assertions: TestAssertion[]
  runs?: number             // NEW — default: 1
  passThreshold?: number    // NEW — default: 1.0 (all must pass)
}

interface ScenarioResult {
  name: string
  passed: boolean
  duration: number
  // existing fields...
  runResults?: RunResult[]  // NEW — individual run outcomes when runs > 1
  passRate?: number         // NEW — fraction of runs that passed
}

interface RunResult {
  passed: boolean
  duration: number
  failedAssertions: string[]
}
```

**Runner changes** (`packages/test-harness/src/runner.ts`):

```typescript
// Current: runs scenario once
// New: runs scenario N times, computes pass rate

async function runScenario(scenario, skillPath, options, fixtures) {
  const totalRuns = scenario.runs ?? 1
  const threshold = scenario.passThreshold ?? 1.0

  if (totalRuns === 1) {
    // existing behavior — unchanged
    return runSingleScenario(scenario, skillPath, options, fixtures)
  }

  const runResults: RunResult[] = []
  for (let i = 0; i < totalRuns; i++) {
    const result = await runSingleScenario(scenario, skillPath, options, fixtures)
    runResults.push({
      passed: result.passed,
      duration: result.duration,
      failedAssertions: result.failedAssertions ?? [],
    })
  }

  const passRate = runResults.filter(r => r.passed).length / totalRuns

  return {
    name: scenario.name,
    passed: passRate >= threshold,
    duration: runResults.reduce((sum, r) => sum + r.duration, 0),
    runResults,
    passRate,
  }
}
```

### New assertion type: `executesCommand`

Existing assertions check what the skill's OUTPUT text contains. For research skills, we also need to check what COMMANDS the agent actually executed.

```yaml
assertions:
  - executesCommand: "git commit"    # agent must have run git commit
  - executesCommand: "git reset"     # agent must have run git reset
  - notExecutesCommand: "git push"   # agent must NOT have run git push
```

**How it works**: In real mode, the agent's execution produces a log of tool calls (commands run, files edited, etc.). The assertion checks this execution trace.

```typescript
// packages/test-harness/src/assertions.ts — additions

interface TestAssertion {
  // existing...
  contains?: string
  notContains?: string
  matchesPattern?: string
  severity?: string
  completes?: boolean
  noErrors?: boolean
  noCriticalIssues?: boolean
  maxTokens?: number
  // new
  executesCommand?: string      // NEW
  notExecutesCommand?: string   // NEW
}

function evaluateAssertion(
  output: string,
  assertion: TestAssertion,
  completed: boolean,
  executionTrace?: string[]     // NEW — list of commands the agent ran
): AssertionResult {
  // ... existing checks ...

  if (assertion.executesCommand) {
    const found = executionTrace?.some(cmd =>
      cmd.includes(assertion.executesCommand!)
    )
    if (!found) {
      return {
        passed: false,
        message: `Expected agent to execute: ${assertion.executesCommand}`,
      }
    }
  }

  if (assertion.notExecutesCommand) {
    const found = executionTrace?.some(cmd =>
      cmd.includes(assertion.notExecutesCommand!)
    )
    if (found) {
      return {
        passed: false,
        message: `Agent should not execute: ${assertion.notExecutesCommand}`,
      }
    }
  }
}
```

**Execution trace capture**: When running in real mode, the invoker already captures stdout/stderr. For Claude Code specifically, commands appear in the output (e.g., "Running: git commit -m ..."). We parse these into a structured trace.

```typescript
// packages/test-harness/src/invoker/traceParser.ts (NEW)

function parseExecutionTrace(output: string): string[] {
  const commands: string[] = []

  // Claude Code format: tool use appears as specific patterns
  const patterns = [
    /^>\s*(.+)$/gm,                    // > git commit -m "..."
    /Running:\s*(.+)$/gm,              // Running: git commit
    /\$ (.+)$/gm,                       // $ git commit
    /Executing:\s*(.+)$/gm,            // Executing: git commit
    /Tool: Bash\nCommand:\s*(.+)$/gm,  // Tool: Bash\nCommand: git commit
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(output)) !== null) {
      commands.push(match[1].trim())
    }
  }

  return commands
}
```

### File changes summary (Phase 2)

```
packages/test-harness/
  fixtures/
    autoresearch-stubs/              (NEW directory — 6 stub variants)
      success/train.py
      improvement/train.py
      regression/train.py
      crash-oom/train.py
      crash-nan/train.py
      timeout/train.py
  src/
    types.ts                         (EDIT — add runs, passThreshold, executesCommand)
    runner.ts                        (EDIT — multi-run loop, pass rate calculation)
    assertions.ts                    (EDIT — executesCommand, notExecutesCommand)
    invoker/
      traceParser.ts                 (NEW — ~60 lines)
    loader.ts                        (EDIT — validate new YAML fields)
    reporters/
      console.ts                     (EDIT — display pass rates)
  src/__tests__/
    statisticalRunner.test.ts        (NEW — ~150 lines)
    traceParser.test.ts              (NEW — ~100 lines)
    executesCommand.test.ts          (NEW — ~80 lines)
```

**Estimated new code**: ~400 lines (production) + ~330 lines (tests) + 6 stub files

---

## 5. Phase 3: Dual-Dimension Benchmarking

### The type mismatch problem

Skillkit's current benchmark system scores **discrete findings**:
- Ground truth: "there's an SQL injection on line 42 of auth.ts"
- Skill output: "Found SQL injection in auth.ts"
- Score: true positive → contributes to precision and recall

Autoresearch's quality metric is a **continuous scalar**:
- val_bpb = 1.0142 (lower is better)
- There are no "findings" to match

These are fundamentally different. We need two scoring modes.

### Scoring Mode 1: Trace-based protocol compliance

Instead of matching findings in output text, we match **behavioral events** in an execution trace.

**Ground truth for protocol compliance**:
```yaml
groundTruth:
  expectedBehaviors:           # NEW — replaces expectedFindings for trace mode
    - id: branch-creation
      type: protocol
      description: "Creates a git branch before first experiment"
      commandPattern: "git (checkout -b|switch -c|branch)"

    - id: commit-before-run
      type: protocol
      description: "Commits changes before running training"
      commandPattern: "git commit"
      before: "train.py"       # must appear before train.py execution

    - id: parse-metric
      type: protocol
      description: "Extracts val_bpb from run.log"
      commandPattern: "grep.*val_bpb.*run.log"

    - id: revert-on-regression
      type: protocol
      description: "Reverts commit when val_bpb is worse"
      commandPattern: "git reset"
      condition: "after-regression"   # only expected after a regression result

    - id: log-results
      type: protocol
      description: "Appends to results.tsv"
      outputPattern: "results\\.tsv"

  forbiddenBehaviors:          # NEW — things that should NOT happen
    - id: no-push
      description: "Never pushes to remote"
      commandPattern: "git push"

    - id: no-modify-frozen
      description: "Never modifies prepare.py"
      commandPattern: "(edit|write|sed|awk).*prepare\\.py"
```

**Scoring**:
```typescript
// packages/benchmarks/src/scorer/traceScorer.ts (NEW)

interface TraceScoreResult {
  protocolCompliance: {
    precision: number    // correct actions / total actions
    recall: number       // fulfilled expectations / total expectations
    f1: number
    expectedMet: string[]
    expectedMissed: string[]
    forbiddenViolated: string[]
  }
}

function scoreTrace(
  executionTrace: string[],
  groundTruth: TraceGroundTruth
): TraceScoreResult {
  const met: string[] = []
  const missed: string[] = []
  const violated: string[] = []

  // Check each expected behavior
  for (const expected of groundTruth.expectedBehaviors) {
    const pattern = new RegExp(expected.commandPattern, 'i')
    const found = executionTrace.some(cmd => pattern.test(cmd))

    if (found) {
      met.push(expected.id)
    } else {
      missed.push(expected.id)
    }
  }

  // Check forbidden behaviors
  for (const forbidden of groundTruth.forbiddenBehaviors) {
    const pattern = new RegExp(forbidden.commandPattern, 'i')
    const found = executionTrace.some(cmd => pattern.test(cmd))

    if (found) {
      violated.push(forbidden.id)
    }
  }

  const truePositives = met.length
  const falseNegatives = missed.length
  const falsePositives = violated.length

  const precision = truePositives / (truePositives + falsePositives) || 0
  const recall = truePositives / (truePositives + falseNegatives) || 0
  const f1 = precision + recall > 0
    ? 2 * (precision * recall) / (precision + recall)
    : 0

  return {
    protocolCompliance: { precision, recall, f1, expectedMet: met, expectedMissed: missed, forbiddenViolated: violated }
  }
}
```

### Scoring Mode 2: Scalar metric tracking

For the actual research quality (val_bpb), we add a simple scalar scorer.

```typescript
// packages/benchmarks/src/scorer/scalarScorer.ts (NEW)

interface ScalarMetricConfig {
  name: string                    // "val_bpb"
  source: string                  // "results.tsv" or "run.log"
  extractPattern: string          // regex with capture group: "val_bpb:\\s*(\\S+)"
  direction: 'lower' | 'higher'  // lower_is_better for val_bpb
  aggregate: 'best' | 'last' | 'mean'
}

interface ScalarScoreResult {
  metric: string
  value: number
  values: number[]       // all extracted values
  direction: 'lower' | 'higher'
  aggregate: string
}

function scoreScalar(
  output: string,
  config: ScalarMetricConfig
): ScalarScoreResult {
  const pattern = new RegExp(config.extractPattern, 'g')
  const values: number[] = []

  let match
  while ((match = pattern.exec(output)) !== null) {
    const val = parseFloat(match[1])
    if (!isNaN(val)) values.push(val)
  }

  let aggregated: number
  switch (config.aggregate) {
    case 'best':
      aggregated = config.direction === 'lower'
        ? Math.min(...values)
        : Math.max(...values)
      break
    case 'last':
      aggregated = values[values.length - 1]
      break
    case 'mean':
      aggregated = values.reduce((a, b) => a + b, 0) / values.length
      break
  }

  return {
    metric: config.name,
    value: aggregated,
    values,
    direction: config.direction,
    aggregate: config.aggregate,
  }
}
```

### Dual-dimension benchmark config

```yaml
# autoresearch-bench.yaml
name: autoresearch-benchmark
skillPath: ./SKILL.md
runs: 3

scoring:
  protocol:                        # Dimension 1: behavioral compliance
    mode: trace
    groundTruth:
      expectedBehaviors:
        - id: branch-creation
          commandPattern: "git (checkout -b|switch -c)"
        # ... more behaviors
      forbiddenBehaviors:
        - id: no-push
          commandPattern: "git push"

  effectiveness:                   # Dimension 2: research quality
    mode: scalar
    metrics:
      - name: val_bpb
        source: results.tsv
        extractPattern: "\\t([\\d.]+)\\t"
        direction: lower
        aggregate: best
      - name: experiments_kept
        source: results.tsv
        extractPattern: "kept"
        direction: higher
        aggregate: count
```

### A/B comparison with dual dimensions

```typescript
// packages/benchmarks/src/comparator/comparator.ts — extended

interface DualDimensionComparison {
  protocol: {
    skillA: TraceScoreResult
    skillB: TraceScoreResult
    winner: 'A' | 'B' | 'tie'
  }
  effectiveness: {
    skillA: ScalarScoreResult[]
    skillB: ScalarScoreResult[]
    winner: 'A' | 'B' | 'tie'
  }
  overall: {
    winner: 'A' | 'B' | 'tie' | 'tradeoff'
    reason: string
  }
}

// Winner logic:
// - If one skill wins BOTH dimensions → clear winner
// - If one wins protocol, other wins effectiveness → 'tradeoff' (user decides)
// - If tied on one, other wins → winner on the non-tied dimension
```

### Console output format

```
$ skillkit bench autoresearch-bench.yaml --compare ./v2/SKILL.md

  ═══ Protocol Compliance ═══
                Precision  Recall   F1
    Skill A:    90.0%     81.8%    85.7%
    Skill B:    100.0%    90.9%    95.2%
    △ F1: +9.5% (Skill B better)

    Skill A missed: revert-on-regression
    Skill B missed: (none)

  ═══ Effectiveness ═══
                val_bpb (best)   Experiments kept
    Skill A:    1.0142           6/10
    Skill B:    0.9987           7/10
    △ val_bpb: -0.0155 (Skill B better, lower is better)

  ═══ Overall ═══
    Winner: Skill B (better on both dimensions)
```

### File changes summary (Phase 3)

```
packages/benchmarks/
  src/
    types.ts                        (EDIT — add trace and scalar types)
    scorer/
      traceScorer.ts                (NEW — ~120 lines)
      scalarScorer.ts               (NEW — ~80 lines)
      scorer.ts                     (EDIT — dispatch to correct scorer based on mode)
    comparator/
      comparator.ts                 (EDIT — dual-dimension comparison logic)
    runner.ts                       (EDIT — support dual scoring config)
    reporters/
      console.ts                    (EDIT — dual-dimension output format)
      json.ts                       (EDIT — include both dimensions)
      markdown.ts                   (EDIT — include both dimensions)
  src/__tests__/
    traceScorer.test.ts             (NEW — ~150 lines)
    scalarScorer.test.ts            (NEW — ~100 lines)
    dualComparison.test.ts          (NEW — ~120 lines)
```

**Estimated new code**: ~500 lines (production) + ~370 lines (tests)

---

## 6. Phase 4: Experiment-Loop Adapter

### What it detects

The adapter scans a project for optimization targets — things that can be measured with a script and improved by modifying code.

```typescript
// packages/adapters/src/detectors/optimizationDetector.ts (NEW)

interface OptimizationTarget {
  metric: string              // "benchmark score", "test coverage", "bundle size"
  measureScript: string       // "npm run bench", "pytest --cov", "npm run build"
  extractPattern: string      // regex to pull the metric from output
  direction: 'lower' | 'higher'
  mutationSurface: string[]   // files the agent should edit
  frozenFiles: string[]       // files the agent must not touch
  confidence: number          // 0-1
}

async function detectOptimizationTargets(repoPath: string): Promise<OptimizationTarget[]> {
  const targets: OptimizationTarget[] = []

  // Check for vitest bench
  const pkg = await readPackageJson(repoPath)
  if (pkg?.scripts?.bench || pkg?.scripts?.benchmark) {
    targets.push({
      metric: 'benchmark score',
      measureScript: pkg.scripts.bench ? 'npm run bench' : 'npm run benchmark',
      extractPattern: '([\\d.]+)\\s*ops/sec',
      direction: 'higher',
      mutationSurface: await findSourceFiles(repoPath),
      frozenFiles: await findTestFiles(repoPath),
      confidence: 0.8,
    })
  }

  // Check for pytest-benchmark
  if (await fileContains(repoPath, 'pyproject.toml', 'pytest-benchmark')) {
    targets.push({
      metric: 'benchmark time',
      measureScript: 'pytest --benchmark-only',
      extractPattern: 'Mean:\\s*([\\d.]+)',
      direction: 'lower',
      mutationSurface: ['src/'],
      frozenFiles: ['tests/', 'conftest.py'],
      confidence: 0.7,
    })
  }

  // Check for Criterion (Rust)
  if (await fileExists(repoPath, 'benches/')) {
    targets.push({
      metric: 'benchmark throughput',
      measureScript: 'cargo bench',
      extractPattern: 'time:\\s*\\[([\\d.]+)',
      direction: 'lower',
      mutationSurface: ['src/'],
      frozenFiles: ['benches/', 'tests/'],
      confidence: 0.7,
    })
  }

  // Check for ML training scripts
  if (await fileExists(repoPath, 'train.py') || await fileExists(repoPath, 'training/')) {
    targets.push({
      metric: 'validation loss',
      measureScript: 'python train.py',
      extractPattern: 'val_loss[:\\s]*([\\d.]+)',
      direction: 'lower',
      mutationSurface: ['train.py', 'model.py', 'config.py'],
      frozenFiles: ['data/', 'evaluate.py'],
      confidence: 0.6,
    })
  }

  // Check for bundle size scripts
  if (pkg?.scripts?.build && (
    pkg?.dependencies?.webpack || pkg?.dependencies?.vite || pkg?.dependencies?.esbuild
  )) {
    targets.push({
      metric: 'bundle size',
      measureScript: 'npm run build',
      extractPattern: '([\\d.]+)\\s*[kK][bB]',
      direction: 'lower',
      mutationSurface: ['src/'],
      frozenFiles: ['tests/', 'public/'],
      confidence: 0.5,
    })
  }

  return targets.filter(t => t.confidence >= 0.5)
}
```

### What it generates

When `skillkit adapt experiment-loop` is run, it:
1. Detects optimization targets
2. Asks the user to confirm/customize (if multiple found)
3. Generates a SKILL.md from the experiment-loop template

**Template** (`packages/adapters/src/templates/experiment-loop.md`):

```markdown
---
name: optimize-{{metric_slug}}
description: Autonomous experiment loop optimizing {{metric}} by modifying {{mutation_surface}}
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
argument-hint: "run tag, e.g. 'opt-mar18'"
---

# Autonomous Optimization: {{metric}}

You are an autonomous optimization agent. Your goal is to improve **{{metric}}**
({{direction}}) by making targeted changes to the codebase.

## Setup

1. Create branch: `git checkout -b optimize/$ARGUMENTS`
2. Establish baseline: run `{{measure_script}}` and record the metric
3. Initialize results log: `results.tsv` (untracked)
   - Header: `commit\t{{metric_slug}}\tstatus\tdescription`

## Constraints

**Mutable files** (you may edit these):
{{#each mutation_surface}}
- `{{this}}`
{{/each}}

**Frozen files** (NEVER modify these):
{{#each frozen_files}}
- `{{this}}`
{{/each}}

**Resource budget**: Maximum {{budget}} per experiment run.
**Dependencies**: Do NOT add or remove dependencies.

## Experiment Loop

Repeat the following forever. Never stop. Never ask for input.

### 1. Propose a change
- Review current code and past results
- Identify a specific, testable hypothesis
- Make a targeted edit to one of the mutable files

### 2. Commit
- `git add` the changed files
- `git commit -m "experiment: <brief description>"`

### 3. Run and measure
- Execute: `{{measure_script}}`
- Extract {{metric}} from the output
- If the run crashes, read the error, attempt a fix, and retry once.
  If it crashes again, mark as "crash" and revert.

### 4. Evaluate
- Compare {{metric}} to the best known value
- {{#if (eq direction "lower")}}If lower → improvement. If higher or equal → regression.{{/if}}
- {{#if (eq direction "higher")}}If higher → improvement. If lower or equal → regression.{{/if}}

### 5. Keep or revert
- **Improvement**: Log to results.tsv with status "kept". Update best known value.
- **Regression**: `git reset --hard HEAD~1`. Log with status "reverted".
- **Crash**: `git reset --hard HEAD~1`. Log with status "crash".

### 6. Log
Append to `results.tsv`:
```
<commit-hash>\t<metric-value>\t<status>\t<description>
```

## Safety Rules

- NEVER run `git push`
- NEVER modify frozen files
- NEVER add dependencies
- NEVER exceed the resource budget
- If in doubt, revert and try something else
```

### Validation before generation

The adapter refuses to generate if requirements aren't met:

```typescript
function validateExperimentLoopRequirements(
  target: OptimizationTarget
): { valid: boolean; missing: string[] } {
  const missing: string[] = []

  if (!target.measureScript) missing.push('No measurement script found')
  if (!target.extractPattern) missing.push('Cannot extract metric from output')
  if (target.mutationSurface.length === 0) missing.push('No mutable files identified')
  if (target.confidence < 0.5) missing.push('Low confidence in detection')

  return { valid: missing.length === 0, missing }
}
```

### File changes summary (Phase 4)

```
packages/adapters/
  src/
    detectors/
      optimizationDetector.ts       (NEW — ~200 lines)
    templates/
      experiment-loop.md            (NEW — ~80 lines template)
    generator/
      adapter.ts                    (EDIT — handle experiment-loop template)
    types.ts                        (EDIT — OptimizationTarget type)
  src/__tests__/
    optimizationDetector.test.ts    (NEW — ~200 lines)

packages/cli/
  src/
    commands/adapt.ts               (EDIT — experiment-loop subcommand)
```

**Estimated new code**: ~350 lines (production) + ~200 lines (tests) + 80 lines (template)

---

## 7. Data Flow Diagrams

### Lint flow (Phase 1)

```
program.md
    │
    ▼
parseSkill()              ← @skillkit/core
    │
    ├── frontmatter: { name, description, allowed-tools, ... }
    ├── body: "# Experiment Loop\n..."
    │
    ▼
LintEngine(preset: 'research')    ← @skillkit/linter
    │
    ├── [existing 15 rules]
    │     ├── require-name           ✓
    │     ├── no-destructive-cmds    ⚠ (downgraded to warn)
    │     └── ...
    │
    ├── [new 5 rules]
    │     ├── valid-experiment-loop       ✓ or ✗
    │     ├── mutation-surface-bounded    ✓ or ✗
    │     ├── has-revert-strategy         ✓ or ✗
    │     ├── has-resource-budget         ✓ or ✗
    │     └── no-remote-push             ✓ or ✗
    │
    ▼
LintReport
    │
    ▼
Console output (colored, with suggestions)
```

### Test flow (Phase 2)

```
autoresearch.test.yaml
    │
    ▼
loadTestDefinition()           ← @skillkit/test-harness
    │
    ├── scenarios (with runs: N, passThreshold: P)
    │
    ▼
For each scenario:
    │
    ├── createFixture(stub)     ← picks from autoresearch-stubs/
    │     └── copies fake train.py + prepare.py to temp dir
    │
    ├── For each run (1..N):
    │     │
    │     ├── invokeSkill()     ← spawns AI agent with --real
    │     │     └── agent reads SKILL.md, operates on stub fixture
    │     │
    │     ├── parseExecutionTrace(output)  ← NEW
    │     │     └── extracts commands from agent output
    │     │
    │     ├── evaluateAssertions()
    │     │     ├── contains / notContains / matchesPattern
    │     │     ├── executesCommand / notExecutesCommand  ← NEW
    │     │     └── completes / noErrors
    │     │
    │     └── RunResult { passed, duration, failedAssertions }
    │
    ├── passRate = passed_runs / total_runs
    ├── passed = passRate >= threshold
    │
    ▼
ScenarioResult { passed, passRate, runResults }
    │
    ▼
TestReport (aggregated across all scenarios)
```

### Benchmark flow (Phase 3)

```
autoresearch-bench.yaml
    │
    ├── scoring.protocol (trace mode)
    ├── scoring.effectiveness (scalar mode)
    │
    ▼
runBenchmark()                     ← @skillkit/benchmarks
    │
    ├── Invoke skill N times (real mode with stub fixtures)
    │
    ├── For each run:
    │     │
    │     ├── Capture output + execution trace
    │     │
    │     ├── scoreTrace(trace, groundTruth)      ← NEW
    │     │     ├── Check expectedBehaviors (matched → TP, missed → FN)
    │     │     ├── Check forbiddenBehaviors (found → FP)
    │     │     └── Return { precision, recall, f1 }
    │     │
    │     ├── scoreScalar(output, metricConfig)    ← NEW
    │     │     ├── Extract metric values via regex
    │     │     ├── Aggregate (best / last / mean)
    │     │     └── Return { metric, value, values }
    │     │
    │     └── CombinedRunResult
    │
    ├── Average across N runs
    │
    ▼
DualDimensionResult
    ├── protocol: { precision, recall, f1 }
    ├── effectiveness: { metric_name, value }
    │
    ▼
Reporter (console / json / markdown)
```

### Adapter flow (Phase 4)

```
$ skillkit adapt experiment-loop
    │
    ▼
detectStack(repoPath)              ← existing @skillkit/adapters
    │
    ▼
detectOptimizationTargets(repoPath)  ← NEW
    │
    ├── Check package.json scripts (bench, benchmark, test:perf)
    ├── Check pyproject.toml (pytest-benchmark)
    ├── Check Cargo.toml (criterion)
    ├── Check for train.py / training/
    ├── Check for build scripts (bundle size)
    │
    ▼
OptimizationTarget[]
    │
    ├── validateExperimentLoopRequirements()
    │     └── Refuse if: no measure script, no metric extraction, no mutable files
    │
    ▼
renderTemplate('experiment-loop', {
    metric, metric_slug, direction,
    measure_script, mutation_surface,
    frozen_files, budget
})
    │
    ▼
Write → .claude/skills/optimize-<metric>/SKILL.md
```

---

## 8. Package-by-Package Changes

### @skillkit/core (minimal changes)

```
Types to add:
  - ExperimentLoopConfig (optional frontmatter extension)

Files changed: 1
New files: 0
Lines added: ~20
```

### @skillkit/linter (Phase 1)

```
New rules: 5
New preset: 1 (research)
New test file: 1

Files changed: 3 (engine.ts, rules/index.ts, presets/index.ts)
New files: 7 (5 rules + 1 preset + 1 test file)
Lines added: ~710
```

### @skillkit/test-harness (Phase 2)

```
New features: statistical runs, executesCommand assertion, trace parser
New fixture directory: autoresearch-stubs/ (6 variants)

Files changed: 5 (types.ts, runner.ts, assertions.ts, loader.ts, reporters/console.ts)
New files: 4 (traceParser.ts + 3 test files)
Lines added: ~730
```

### @skillkit/benchmarks (Phase 3)

```
New scorers: 2 (trace-based, scalar)
Extended comparator: dual-dimension comparison

Files changed: 5 (types.ts, scorer.ts, comparator.ts, runner.ts, reporters/*)
New files: 5 (traceScorer.ts, scalarScorer.ts + 3 test files)
Lines added: ~870
```

### @skillkit/adapters (Phase 4)

```
New detector: optimizationDetector
New template: experiment-loop

Files changed: 3 (types.ts, adapter.ts, cli adapt command)
New files: 3 (optimizationDetector.ts, experiment-loop.md, test file)
Lines added: ~630
```

### @skillkit/cli (minimal changes)

```
Files changed: 2 (lint command accepts --preset, adapt command accepts experiment-loop)
Lines added: ~30
```

### Total across all phases

```
New production code:   ~1,760 lines
New test code:         ~1,100 lines
New files:             ~19 files
Changed files:         ~19 files
New fixture files:     ~6 stub scripts
New template files:    ~1
```

---

## 9. New Types

All new TypeScript types introduced, organized by package:

```typescript
// ── @skillkit/core ──

interface ExperimentLoopConfig {
  metric: string
  direction: 'lower' | 'higher'
  mutationSurface: string[]
  frozenFiles: string[]
  budget?: string
}


// ── @skillkit/linter ──

// (No new exported types — rules follow existing LintRule interface)


// ── @skillkit/test-harness ──

// Extended
interface TestScenario {
  // ... existing fields
  runs?: number                 // default: 1
  passThreshold?: number        // default: 1.0
}

interface TestAssertion {
  // ... existing fields
  executesCommand?: string
  notExecutesCommand?: string
}

// New
interface RunResult {
  passed: boolean
  duration: number
  failedAssertions: string[]
}

interface ScenarioResult {
  // ... existing fields
  runResults?: RunResult[]
  passRate?: number
}


// ── @skillkit/benchmarks ──

// New scoring modes
type ScoringMode = 'findings' | 'trace' | 'scalar'

interface TraceGroundTruth {
  expectedBehaviors: ExpectedBehavior[]
  forbiddenBehaviors: ForbiddenBehavior[]
}

interface ExpectedBehavior {
  id: string
  type: string
  description: string
  commandPattern: string
  before?: string
  condition?: string
}

interface ForbiddenBehavior {
  id: string
  description: string
  commandPattern: string
}

interface TraceScoreResult {
  protocolCompliance: {
    precision: number
    recall: number
    f1: number
    expectedMet: string[]
    expectedMissed: string[]
    forbiddenViolated: string[]
  }
}

interface ScalarMetricConfig {
  name: string
  source: string
  extractPattern: string
  direction: 'lower' | 'higher'
  aggregate: 'best' | 'last' | 'mean' | 'count'
}

interface ScalarScoreResult {
  metric: string
  value: number
  values: number[]
  direction: 'lower' | 'higher'
  aggregate: string
}

interface DualDimensionResult {
  protocol: TraceScoreResult
  effectiveness: ScalarScoreResult[]
}

interface DualDimensionComparison {
  protocol: { skillA: TraceScoreResult; skillB: TraceScoreResult; winner: string }
  effectiveness: { skillA: ScalarScoreResult[]; skillB: ScalarScoreResult[]; winner: string }
  overall: { winner: string; reason: string }
}


// ── @skillkit/adapters ──

interface OptimizationTarget {
  metric: string
  measureScript: string
  extractPattern: string
  direction: 'lower' | 'higher'
  mutationSurface: string[]
  frozenFiles: string[]
  confidence: number
}
```

---

## 10. Migration & Compatibility

### Zero breaking changes

Every addition is:
- **New files** (rules, scorers, detectors, templates)
- **Additive type extensions** (optional fields on existing interfaces)
- **New preset** (doesn't affect existing presets)
- **New scoring modes** (existing `findings` mode unchanged)

### Backward compatibility guarantees

| Concern | Guarantee |
|---------|-----------|
| Existing lint presets (strict, recommended, minimal) | Unchanged. New rules only activate in `research` preset. |
| Existing test YAML files | `runs` and `passThreshold` default to 1 and 1.0 — existing behavior preserved. |
| Existing benchmark configs | `scoring` section is optional. Without it, existing findings-based scoring is used. |
| Existing adapter templates | Unchanged. `experiment-loop` is a new template, not a modification. |
| CLI commands | No changes to existing command signatures. New `--preset` flag is optional. |

### How to test the migration

```bash
# Verify existing tests still pass
npm test

# Verify existing linting still works
npx skillkit lint examples/ --preset recommended

# Verify existing benchmarks still work
npx skillkit bench existing-bench.yaml

# Then test new features
npx skillkit lint program.md --preset research
npx skillkit test autoresearch.test.yaml --real
npx skillkit bench autoresearch-bench.yaml
npx skillkit adapt experiment-loop
```
