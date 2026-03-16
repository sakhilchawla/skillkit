# Benchmarking Skills with `skillkit bench`

> **Status:** Planned for v0.3. This guide documents the full design so you can start preparing test corpora now. See [Current Status](#current-status) at the bottom for what is available today.

## What It Does

Think of `skillkit bench` as **Lighthouse for AI skills**. Lighthouse gives your website a performance score out of 100 so you stop arguing about whether it is "fast enough." `skillkit bench` does the same thing for skill quality -- it replaces vibes with numbers.

You give it a skill, a set of test scenarios with known correct answers, and it runs the skill against each scenario, compares the output to the ground truth, and produces scores for precision, recall, F1, and token cost.

```
$ skillkit bench examples/review/

  review skill benchmark
  ────────────────────────────────
  Precision:   83.3%   (5/6 findings were real)
  Recall:      71.4%   (5/7 real issues found)
  F1 Score:    76.9%
  Avg Tokens:  2,847 per scenario
  ────────────────────────────────
  3 scenarios, 3 runs each (averaged)

  PASS  Quality above threshold (F1 >= 70%)
```

No more "I think the skill got better." You will know.

## Why Benchmark Skills?

### You edit a prompt and unknowingly make it worse

You reword the review skill's instructions to be "clearer." Precision drops from 83% to 61% because the new wording makes the model flag style nitpicks as Critical issues. Without a benchmark, you ship the regression and find out weeks later when your team starts ignoring review output.

### You want to compare two versions

You wrote a review skill v1 that is thorough but slow. You wrote v2 that is faster but you are not sure if it catches as much. Running `skillkit bench --compare v1/ v2/` gives you a side-by-side table instead of anecdotal guessing.

### You want to track quality over time

Every time you push a skill change, CI runs the benchmark and records the scores. A dashboard shows you whether quality is trending up or down, the same way you track test coverage over time.

## Key Concepts

### Precision -- "Of the issues it reported, how many were real?"

Your `/review` skill analyzes a diff and reports 6 issues. You check each one against the known ground truth. 5 of them are real problems; 1 is a false alarm the model invented.

```
Precision = real findings / total findings reported
          = 5 / 6
          = 83.3%
```

**Analogy:** Precision is like a spam filter's accuracy. If it flags 100 emails as spam and 90 actually are, that is 90% precision. The other 10 were legitimate emails your user never saw.

A skill with low precision wastes your time. You stop trusting it because too many findings are noise.

### Recall -- "Of the real issues, how many did it find?"

The test repository has 7 known bugs planted in it. Your skill found 5 of them and missed 2.

```
Recall = issues found / total real issues
       = 5 / 7
       = 71.4%
```

**Analogy:** Recall is like test coverage. If you have 50 functions and tests for 40 of them, your coverage is 80%. The other 10 functions could break silently.

A skill with low recall gives you false confidence. It says "looks good" when problems are hiding.

### F1 Score -- "Overall accuracy combining both"

Precision and recall trade off against each other. A skill that reports everything has 100% recall but terrible precision. A skill that only reports one obvious bug has great precision but low recall. F1 balances them into a single number.

```
F1 = 2 * (precision * recall) / (precision + recall)
   = 2 * (0.833 * 0.714) / (0.833 + 0.714)
   = 2 * 0.595 / 1.547
   = 76.9%
```

**Analogy:** F1 is like the overall Lighthouse score. You could have a fast site with terrible accessibility, or an accessible site that loads in 12 seconds. The combined score tells you the whole story.

| F1 Range | What It Means |
|----------|---------------|
| 90-100%  | Excellent -- catches almost everything, almost no false alarms |
| 75-89%   | Good -- reliable for daily use |
| 60-74%   | Mediocre -- misses things or cries wolf too often |
| Below 60% | Needs significant work |

### Token Efficiency -- "How much did it cost to run?"

Every skill invocation consumes tokens. `skillkit bench` tracks average input and output tokens per scenario.

```
Token Efficiency
  Avg input tokens:   1,920
  Avg output tokens:     927
  Avg total tokens:    2,847
  Cost estimate:       $0.012 per run (at $3/M input, $15/M output)
```

Two skills with identical F1 scores are not equal if one uses 3x the tokens. Token efficiency helps you compare cost-to-quality tradeoffs, like comparing two algorithms that produce the same result but one runs in O(n) and the other in O(n^2).

### Regression -- "Did this edit make things worse?"

When you run a benchmark that has historical results, `skillkit bench` compares the new scores to the previous run and flags drops.

```
$ skillkit bench examples/review/

  Regression detected!
  ────────────────────
  F1:        76.9% → 62.1%  (-14.8%)  REGRESSED
  Precision: 83.3% → 58.3%  (-25.0%)  REGRESSED
  Recall:    71.4% → 66.7%  ( -4.8%)  within threshold
  Tokens:    2,847 → 3,102  ( +8.9%)  within threshold

  FAIL  F1 dropped below threshold (62.1% < 70%)
```

**Analogy:** This is like your CI test suite going from 47 passing to 41 passing. The red X tells you the latest change broke something, even if the tests it broke were not the ones you touched.

## Setting Up a Benchmark

### Step 1: Create a Test Corpus

A test corpus is a repository (or directory) with **known, planted issues**. You know exactly what is wrong because you put it there on purpose.

```
benchmarks/
  review-corpus/
    xss-vulnerability/
      diff.patch          # A diff containing an XSS bug
      ground-truth.yaml   # What the skill SHOULD find
    sql-injection/
      diff.patch
      ground-truth.yaml
    clean-code/
      diff.patch
      ground-truth.yaml   # expected: no critical issues
```

Good test corpora have:
- **Known-bad scenarios** with specific, documented issues (security bugs, logic errors, missing error handling)
- **Known-good scenarios** where the code is clean -- testing that the skill does NOT cry wolf
- **Edge cases** like empty diffs, massive diffs, or binary file changes

### Step 2: Define the Ground Truth

Each scenario needs a `ground-truth.yaml` that specifies what the skill should find:

```yaml
# ground-truth.yaml for xss-vulnerability scenario
expected-findings:
  - severity: CRITICAL
    category: security
    pattern: "XSS|cross-site|innerHTML|dangerouslySetInnerHTML"
    file: "src/components/UserProfile.tsx"

  - severity: WARNING
    category: correctness
    pattern: "missing.*sanitiz|unsanitized"

expected-no-findings:
  - severity: CRITICAL
    category: performance    # Should NOT flag perf issues as critical

minimum-findings: 1           # At least 1 finding expected
maximum-findings: 5           # More than 5 suggests noise
```

### Step 3: Create the Benchmark Configuration

```yaml
# review.bench.yaml
name: review skill benchmark
skill: ./examples/review/SKILL.md

# How many times to run each scenario (results are averaged)
runs: 3

# Quality thresholds -- bench fails if scores drop below these
thresholds:
  f1: 0.70
  precision: 0.60
  recall: 0.60

# Path to previous results for regression detection
baseline: ./benchmark-results/review-latest.json

scenarios:
  - name: XSS vulnerability
    description: Diff introduces innerHTML without sanitization
    fixture: ./benchmarks/review-corpus/xss-vulnerability/
    invoke: "/review main"
    ground-truth: ./benchmarks/review-corpus/xss-vulnerability/ground-truth.yaml

  - name: SQL injection
    description: Raw user input in SQL query
    fixture: ./benchmarks/review-corpus/sql-injection/
    invoke: "/review main"
    ground-truth: ./benchmarks/review-corpus/sql-injection/ground-truth.yaml

  - name: Clean code (no issues)
    description: Well-written diff with no bugs
    fixture: ./benchmarks/review-corpus/clean-code/
    invoke: "/review main"
    ground-truth: ./benchmarks/review-corpus/clean-code/ground-truth.yaml
```

### Step 4: Run the Benchmark

```bash
# Run the benchmark
skillkit bench review.bench.yaml

# Run with a specific output format
skillkit bench review.bench.yaml --format markdown

# Run and save results for future regression comparison
skillkit bench review.bench.yaml --save-baseline
```

### Full Config in `skillkit.config.yaml`

```yaml
version: 1

bench:
  runs: 3                          # Runs per scenario (averaged)
  output: ./benchmark-results      # Where to save results
  format: json                     # Default output: json | html | markdown
  thresholds:                      # Global defaults (overridable per-benchmark)
    f1: 0.70
    precision: 0.60
    recall: 0.60
  regression:
    enabled: true                  # Compare against last saved baseline
    tolerance: 0.05                # Allow up to 5% drop without failing
```

## Benchmark Scenario Format

Here is the TypeScript interface for a benchmark scenario, explained field by field:

```typescript
interface BenchmarkScenario {
  /** Human-readable name shown in output. Example: "XSS vulnerability" */
  name: string;

  /** What this scenario tests. Example: "Diff introduces innerHTML without sanitization" */
  description?: string;

  /** Path to a fixture directory the skill will analyze */
  fixture: string;

  /** How to invoke the skill. Example: "/review main" */
  invoke: string;

  /** Path to ground truth YAML defining expected findings */
  groundTruth: string;

  /** Tags for filtering scenarios. Example: ["security", "critical"] */
  tags?: string[];

  /** Override the global timeout for this scenario (milliseconds) */
  timeout?: number;
}

interface GroundTruth {
  /** Findings the skill SHOULD produce */
  expectedFindings: ExpectedFinding[];

  /** Findings the skill should NOT produce (false positive traps) */
  expectedNoFindings?: ExpectedFinding[];

  /** Minimum number of findings. Below this = low recall. */
  minimumFindings?: number;

  /** Maximum number of findings. Above this = too noisy. */
  maximumFindings?: number;
}

interface ExpectedFinding {
  /** Severity level: CRITICAL, WARNING, or SUGGESTION */
  severity: string;

  /** Category to match: security, correctness, performance, etc. */
  category?: string;

  /** Regex pattern the finding text should match */
  pattern?: string;

  /** File path the finding should reference */
  file?: string;
}

interface BenchmarkResult {
  /** Precision: correct findings / total findings */
  precision: number;

  /** Recall: found issues / total real issues */
  recall: number;

  /** F1: harmonic mean of precision and recall */
  f1: number;

  /** Average tokens consumed per scenario */
  avgTokens: {
    input: number;
    output: number;
    total: number;
  };

  /** Per-scenario breakdown */
  scenarios: ScenarioResult[];

  /** ISO timestamp of this run */
  timestamp: string;

  /** Comparison to baseline, if available */
  regression?: RegressionResult;
}
```

In plain English:

- **BenchmarkScenario** is one test case: "Run this skill against this fixture and check the output against this answer key."
- **GroundTruth** is the answer key: "The skill should find these issues and should not report those."
- **ExpectedFinding** is one answer: "There should be a CRITICAL security finding mentioning XSS in UserProfile.tsx."
- **BenchmarkResult** is the report card: precision, recall, F1, tokens, and details per scenario.

## A/B Comparison

Compare two versions of a skill side by side:

```bash
skillkit bench --compare skill-v1/review.bench.yaml skill-v2/review.bench.yaml
```

Output:

```
  A/B Comparison: review skill
  ═══════════════════════════════════════════════════════════════
  Metric          │ v1 (baseline)  │ v2 (candidate) │ Delta
  ────────────────┼────────────────┼────────────────┼──────────
  Precision       │ 83.3%          │ 87.5%          │ +4.2%  ▲
  Recall          │ 71.4%          │ 85.7%          │ +14.3% ▲
  F1 Score        │ 76.9%          │ 86.6%          │ +9.7%  ▲
  Avg Tokens      │ 2,847          │ 3,210          │ +12.7% ▼
  Avg Latency     │ 4.2s           │ 5.1s           │ +21.4% ▼
  ═══════════════════════════════════════════════════════════════

  Per-scenario breakdown:
  ─────────────────────────────────────────────────────────────
  XSS vulnerability      │ v1: ✓ found  │ v2: ✓ found  │ tie
  SQL injection           │ v1: ✗ missed │ v2: ✓ found  │ v2 wins
  Clean code (no issues)  │ v1: ✓ clean  │ v2: ✓ clean  │ tie
  Race condition          │ v1: ✗ missed │ v2: ✓ found  │ v2 wins
  Style-only diff         │ v1: ✓ clean  │ v2: ⚠ 1 FP   │ v1 wins

  Verdict: v2 is better on quality (+9.7% F1) but costs more tokens (+12.7%)
```

Read it like a spreadsheet. Arrows pointing up on quality metrics are good. Arrows pointing down on cost metrics are good. The per-scenario breakdown shows you exactly where each version wins or loses, so you can decide whether the tradeoff is worth it.

## Tracking Quality Over Time

Every time you run `skillkit bench --save-baseline`, the results are saved with a timestamp. On the next run, the tool loads the last baseline and compares.

### How Regression Detection Works

1. You run `skillkit bench review.bench.yaml --save-baseline` and get F1 = 76.9%. This becomes the baseline.
2. You edit the skill's SKILL.md, tweaking the instructions.
3. You run `skillkit bench review.bench.yaml` again. The tool loads the saved baseline and compares.
4. If any metric drops beyond the tolerance threshold (default: 5%), it flags a regression.

### What a Regression Looks Like

When quality drops:

```
$ skillkit bench review.bench.yaml

  review skill benchmark
  ────────────────────────────────
  Precision:   58.3%   (7/12 findings were real)
  Recall:      71.4%   (5/7 real issues found)
  F1 Score:    64.2%
  Avg Tokens:  3,102 per scenario

  ⚠ REGRESSION DETECTED (compared to baseline from 2025-06-10)
  ────────────────────────────────────────────────────────────
  Metric       │ Baseline  │ Current   │ Delta    │ Status
  ─────────────┼───────────┼───────────┼──────────┼─────────
  Precision    │ 83.3%     │ 58.3%     │ -25.0%   │ REGRESSED
  Recall       │ 71.4%     │ 71.4%     │  0.0%    │ OK
  F1 Score     │ 76.9%     │ 64.2%     │ -12.7%   │ REGRESSED
  Avg Tokens   │ 2,847     │ 3,102     │ +8.9%    │ OK

  Root cause: Precision dropped sharply. The skill is reporting
  more findings than before but many are false positives.

  FAIL  F1 below threshold (64.2% < 70%)
  Exit code: 1
```

When quality stays stable or improves:

```
$ skillkit bench review.bench.yaml

  review skill benchmark
  ────────────────────────────────
  Precision:   87.5%
  Recall:      85.7%
  F1 Score:    86.6%
  Avg Tokens:  2,790 per scenario

  ✓ No regressions (compared to baseline from 2025-06-10)

  PASS  Quality above threshold (F1 86.6% >= 70%)
```

### CI Integration

Add to your CI pipeline to catch regressions before merge:

```yaml
# .github/workflows/skill-quality.yml
name: Skill Quality
on: [pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g skillkit
      - run: skillkit bench review.bench.yaml --format markdown > bench-report.md
      - uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: bench-report.md
```

This posts the benchmark results as a PR comment, the same way you might post test coverage or bundle size reports.

## Output Formats

### JSON -- for CI and scripts

```bash
skillkit bench review.bench.yaml --format json
```

```json
{
  "name": "review skill benchmark",
  "timestamp": "2025-06-15T14:32:00Z",
  "skill": "./examples/review/SKILL.md",
  "runs": 3,
  "results": {
    "precision": 0.833,
    "recall": 0.714,
    "f1": 0.769,
    "avgTokens": {
      "input": 1920,
      "output": 927,
      "total": 2847
    }
  },
  "scenarios": [
    {
      "name": "XSS vulnerability",
      "precision": 1.0,
      "recall": 1.0,
      "f1": 1.0,
      "findings": 2,
      "expectedFindings": 2,
      "falsePositives": 0,
      "falseNegatives": 0
    },
    {
      "name": "SQL injection",
      "precision": 0.667,
      "recall": 0.5,
      "f1": 0.571,
      "findings": 3,
      "expectedFindings": 4,
      "falsePositives": 1,
      "falseNegatives": 2
    },
    {
      "name": "Clean code (no issues)",
      "precision": 1.0,
      "recall": 1.0,
      "f1": 1.0,
      "findings": 0,
      "expectedFindings": 0,
      "falsePositives": 0,
      "falseNegatives": 0
    }
  ],
  "regression": {
    "baselineTimestamp": "2025-06-10T10:15:00Z",
    "f1Delta": -0.02,
    "precisionDelta": 0.01,
    "recallDelta": -0.03,
    "regressed": false
  }
}
```

Parse this in CI scripts the same way you would parse test result JSON. The `regressed` boolean and the exit code (0 = pass, 1 = fail) make it easy to gate merges.

### HTML Dashboard -- for humans

```bash
skillkit bench review.bench.yaml --format html --output ./reports/
```

Generates a self-contained HTML file with:
- Gauge charts for precision, recall, and F1 (like Lighthouse circles)
- A timeline graph showing scores across historical runs
- Per-scenario pass/fail table with expandable details
- Token cost breakdown

Open it in a browser. Share it in Slack. Bookmark it.

### Markdown -- for pull requests

```bash
skillkit bench review.bench.yaml --format markdown
```

```markdown
## Benchmark: review skill

| Metric | Score | Threshold | Status |
|--------|-------|-----------|--------|
| Precision | 83.3% | >= 60% | PASS |
| Recall | 71.4% | >= 60% | PASS |
| F1 Score | 76.9% | >= 70% | PASS |
| Avg Tokens | 2,847 | -- | -- |

### Scenarios

| Scenario | F1 | Findings | False Pos | False Neg |
|----------|----|----------|-----------|-----------|
| XSS vulnerability | 100% | 2 | 0 | 0 |
| SQL injection | 57.1% | 3 | 1 | 2 |
| Clean code | 100% | 0 | 0 | 0 |

*3 scenarios, 3 runs each (averaged). Baseline: 2025-06-10.*
```

Paste this into a PR description or let CI post it as a comment. Reviewers see the quality impact of skill changes at a glance.

## Complete Walkthrough: Benchmarking a /review Skill

This walks through the entire process end-to-end.

### 1. Create the fixture repository

Create a directory with planted bugs your review skill should catch:

```bash
mkdir -p benchmarks/review-corpus/xss-vulnerability
mkdir -p benchmarks/review-corpus/missing-error-handling
mkdir -p benchmarks/review-corpus/clean-refactor
```

### 2. Write the first scenario's diff

```bash
cat > benchmarks/review-corpus/xss-vulnerability/diff.patch << 'EOF'
diff --git a/src/components/Comment.tsx b/src/components/Comment.tsx
index abc1234..def5678 100644
--- a/src/components/Comment.tsx
+++ b/src/components/Comment.tsx
@@ -12,7 +12,7 @@ export function Comment({ text, author }: CommentProps) {
   return (
     <div className="comment">
       <span className="author">{author}</span>
-      <p className="text">{text}</p>
+      <div className="text" dangerouslySetInnerHTML={{ __html: text }} />
     </div>
   );
 }
EOF
```

### 3. Define the ground truth

```bash
cat > benchmarks/review-corpus/xss-vulnerability/ground-truth.yaml << 'EOF'
expected-findings:
  - severity: CRITICAL
    category: security
    pattern: "XSS|cross-site|dangerouslySetInnerHTML|unsanitized"
    file: "src/components/Comment.tsx"

minimum-findings: 1
maximum-findings: 3
EOF
```

### 4. Write the other scenarios

For missing error handling:

```yaml
# benchmarks/review-corpus/missing-error-handling/ground-truth.yaml
expected-findings:
  - severity: WARNING
    category: correctness
    pattern: "error.*handl|try.*catch|unhandled|missing.*error"

minimum-findings: 1
maximum-findings: 4
```

For the clean refactor (no issues expected):

```yaml
# benchmarks/review-corpus/clean-refactor/ground-truth.yaml
expected-findings: []
expected-no-findings:
  - severity: CRITICAL
maximum-findings: 0
```

### 5. Write the benchmark definition

```yaml
# review.bench.yaml
name: review skill benchmark
skill: ./examples/review/SKILL.md
runs: 3

thresholds:
  f1: 0.70
  precision: 0.60
  recall: 0.60

scenarios:
  - name: XSS vulnerability in React component
    description: dangerouslySetInnerHTML used with user input
    fixture: ./benchmarks/review-corpus/xss-vulnerability/
    invoke: "/review main"
    ground-truth: ./benchmarks/review-corpus/xss-vulnerability/ground-truth.yaml
    tags: [security, critical]

  - name: Missing error handling in API call
    description: fetch() without try/catch or .catch()
    fixture: ./benchmarks/review-corpus/missing-error-handling/
    invoke: "/review main"
    ground-truth: ./benchmarks/review-corpus/missing-error-handling/ground-truth.yaml
    tags: [correctness]

  - name: Clean refactor (no issues)
    description: Variable rename and extract-function refactor
    fixture: ./benchmarks/review-corpus/clean-refactor/
    invoke: "/review main"
    ground-truth: ./benchmarks/review-corpus/clean-refactor/ground-truth.yaml
    tags: [false-positive-trap]
```

### 6. Run the benchmark

```bash
$ skillkit bench review.bench.yaml

  review skill benchmark
  ════════════════════════════════════════════════════
  Running 3 scenarios (3 runs each, 9 total invocations)...

  [1/3] XSS vulnerability in React component
        Run 1: 2 findings (2 correct, 0 false)
        Run 2: 3 findings (2 correct, 1 false)
        Run 3: 2 findings (2 correct, 0 false)
        → Averaged: precision 85.7%, recall 100%

  [2/3] Missing error handling in API call
        Run 1: 3 findings (2 correct, 1 false)
        Run 2: 2 findings (2 correct, 0 false)
        Run 3: 3 findings (2 correct, 1 false)
        → Averaged: precision 75.0%, recall 66.7%

  [3/3] Clean refactor (no issues)
        Run 1: 0 findings ✓
        Run 2: 0 findings ✓
        Run 3: 1 finding (0 correct, 1 false)
        → Averaged: precision 100%, recall 100% (1 FP in 3 runs)

  Results
  ────────────────────────────────
  Precision:   83.3%
  Recall:      85.7%
  F1 Score:    84.5%
  Avg Tokens:  2,847 per scenario

  PASS  Quality above threshold (F1 84.5% >= 70%)
```

### 7. Save baseline and iterate

```bash
# Save this as the baseline for regression detection
$ skillkit bench review.bench.yaml --save-baseline
  ✓ Baseline saved to ./benchmark-results/review-latest.json

# Later, after editing the skill...
$ skillkit bench review.bench.yaml
  ✓ No regressions (compared to baseline from 2025-06-15)
  PASS
```

## Current Status

`skillkit bench` is **planned for v0.3**. Here is what is available now and what is coming:

| Capability | Status | Available In |
|------------|--------|--------------|
| Lint skills for quality | Available now | v0.1 (`skillkit lint`) |
| Declarative test scenarios | Planned | v0.2 (`skillkit test`) |
| Precision/recall scoring | Planned | v0.3 (`skillkit bench`) |
| A/B comparison | Planned | v0.3 (`skillkit bench --compare`) |
| Regression detection | Planned | v0.3 (`skillkit bench` + baselines) |
| HTML dashboard | Planned | v0.3 (`--format html`) |
| CI integration helpers | Planned | v0.3 / v1.0 |

**What you can do today:**

1. **Start building your test corpus now.** Create fixture directories with known bugs and clean code. Define ground truth YAML files. This is the hard part and it is not tool-dependent.

2. **Use `skillkit lint`** to validate your skills against the 15 built-in rules. Linting catches structural problems (missing descriptions, unrestricted Bash, hardcoded paths) that benchmarking would also penalize.

3. **Use `skillkit test` (v0.2)** to write declarative scenario tests. Test scenarios are a subset of benchmark scenarios -- when bench ships, you can promote your test scenarios to benchmarks by adding ground truth files.

4. **Design your ground truth carefully.** The quality of a benchmark is only as good as the answer key. Invest time in curating realistic scenarios with well-defined expected findings. A benchmark with sloppy ground truth will give you misleading scores.
