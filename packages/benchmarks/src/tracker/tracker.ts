import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type {
  Baseline,
  BenchmarkResult,
  BenchmarkScores,
  RegressionResult,
} from '../types.js';

/** Thresholds for regression detection. Values are maximum allowed drops (0.0–1.0). */
export interface RegressionThresholds {
  /** Maximum precision drop allowed (default: 0.05) */
  precision?: number;
  /** Maximum recall drop allowed (default: 0.05) */
  recall?: number;
  /** Maximum F1 drop allowed (default: 0.03) */
  f1?: number;
}

/** Default regression thresholds */
const DEFAULT_THRESHOLDS: Required<RegressionThresholds> = {
  precision: 0.05,
  recall: 0.05,
  f1: 0.03,
};

/**
 * Save a benchmark result as a baseline JSON file.
 *
 * Creates parent directories if they don't exist.
 *
 * @param result - The benchmark result to save
 * @param filePath - Path to write the baseline JSON
 * @param version - Optional version string to include
 */
export async function saveBaseline(
  result: BenchmarkResult,
  filePath: string,
  version?: string,
): Promise<void> {
  const baseline: Baseline = {
    skillPath: result.skillPath,
    scores: result.scores,
    timestamp: new Date().toISOString(),
    version,
  };

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(baseline, null, 2), 'utf-8');
}

/**
 * Load a baseline from a JSON file.
 *
 * @param filePath - Path to the baseline JSON file
 * @returns The parsed baseline
 * @throws If the file cannot be read or parsed
 */
export async function loadBaseline(filePath: string): Promise<Baseline> {
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content) as Baseline;
}

/**
 * Check whether current scores have regressed beyond thresholds compared to a baseline.
 *
 * For each metric (precision, recall, f1), if the current score is lower than the
 * baseline by more than the threshold, it counts as a regression.
 *
 * @param current - Current benchmark scores
 * @param baseline - Previously saved baseline
 * @param thresholds - Optional custom thresholds (defaults: precision 5%, recall 5%, f1 3%)
 * @returns Regression result with pass/fail and per-metric details
 *
 * @example
 * ```ts
 * const baseline = await loadBaseline('./baseline.json');
 * const result = checkRegression(currentScores, baseline);
 * if (result.regressed) {
 *   console.error('Quality regression detected!');
 * }
 * ```
 */
export function checkRegression(
  current: BenchmarkScores,
  baseline: Baseline,
  thresholds?: RegressionThresholds,
): RegressionResult {
  const t: Required<RegressionThresholds> = {
    ...DEFAULT_THRESHOLDS,
    ...thresholds,
  };

  const metrics: { metric: string; threshold: number }[] = [
    { metric: 'precision', threshold: t.precision },
    { metric: 'recall', threshold: t.recall },
    { metric: 'f1', threshold: t.f1 },
  ];

  const regressions: RegressionResult['regressions'] = [];

  for (const { metric, threshold } of metrics) {
    const baselineValue = baseline.scores[metric as keyof BenchmarkScores] as number;
    const currentValue = current[metric as keyof BenchmarkScores] as number;
    const delta = baselineValue - currentValue;

    if (delta > threshold) {
      regressions.push({
        metric,
        baseline: baselineValue,
        current: currentValue,
        delta,
        threshold,
      });
    }
  }

  return {
    regressed: regressions.length > 0,
    baseline,
    current,
    regressions,
  };
}
