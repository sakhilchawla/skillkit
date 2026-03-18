/** A known issue planted in the test corpus */
export interface ExpectedFinding {
  file: string;
  line?: number;
  type: string; // 'security' | 'logic' | 'performance' | 'style' | string
  description: string;
  /** Optional regex pattern for flexible matching (overrides keyword matching) */
  pattern?: string;
  /** Optional explicit keywords to match (overrides auto-extracted keywords from description) */
  keywords?: string[];
}

/** Ground truth for a benchmark scenario */
export interface GroundTruth {
  /** Issues that SHOULD be found */
  expectedFindings: ExpectedFinding[];
  /** Files that are clean (no issues) */
  cleanFiles: string[];
}

/** Configuration for a benchmark run */
export interface BenchmarkConfig {
  /** Name of this benchmark */
  name: string;
  /** Path to the skill to benchmark */
  skillPath: string;
  /** Ground truth for scoring */
  groundTruth: GroundTruth;
  /** Number of runs to average (default: 1) */
  runs?: number;
  /** Optional: path to second skill for A/B comparison */
  compareWith?: string;
  /** Path to test corpus directory (repo with planted bugs) for real mode */
  corpus?: string;
  /** Invoke command for the skill (e.g., "/review main") */
  invoke?: string;
}

/** Options controlling how a benchmark is executed */
export interface BenchmarkRunOptions {
  /** If true, run in mock mode (read SKILL.md body as output). Default: true */
  mock?: boolean;
  /** Invoker configuration for real mode */
  invoker?: {
    provider: string;
    command?: string;
    timeout?: number;
  };
}

/** Scores for a single benchmark run */
export interface BenchmarkScores {
  /** True positives / (True positives + False positives) */
  precision: number;
  /** True positives / (True positives + False negatives) */
  recall: number;
  /** Harmonic mean of precision and recall */
  f1: number;
  /** Number of expected findings correctly identified */
  truePositives: number;
  /** Number of reported issues that aren't in ground truth */
  falsePositives: number;
  /** Number of expected findings missed */
  falseNegatives: number;
  /** Approximate token count of output */
  tokenCount: number;
  /** Duration in milliseconds */
  duration: number;
}

/** Result for a single skill's benchmark */
export interface BenchmarkResult {
  skillPath: string;
  scores: BenchmarkScores;
  /** Individual run results when runs > 1 */
  runDetails: BenchmarkScores[];
  /** Raw output from the skill */
  output: string;
}

/** A/B comparison result */
export interface ComparisonResult {
  a: BenchmarkResult;
  b: BenchmarkResult;
  winner: 'a' | 'b' | 'tie';
  /** Per-metric comparison */
  deltas: {
    precision: number; // positive = A is better
    recall: number;
    f1: number;
    tokenCount: number; // positive = A used fewer tokens (better)
    duration: number; // positive = A was faster (better)
  };
}

/** Baseline stored for regression detection */
export interface Baseline {
  skillPath: string;
  scores: BenchmarkScores;
  timestamp: string; // ISO 8601
  version?: string;
}

/** Regression check result */
export interface RegressionResult {
  regressed: boolean;
  baseline: Baseline;
  current: BenchmarkScores;
  /** Metrics that dropped beyond threshold */
  regressions: {
    metric: string;
    baseline: number;
    current: number;
    delta: number;
    threshold: number;
  }[];
}
