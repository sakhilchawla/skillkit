import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { scoreOutput } from './scorer/scorer.js';
import { compareSkills } from './comparator/comparator.js';
import type {
  BenchmarkConfig,
  BenchmarkResult,
  BenchmarkScores,
  ComparisonResult,
} from './types.js';

/**
 * Extract the markdown body from a SKILL.md file (everything after frontmatter).
 */
function extractSkillBody(content: string): string {
  const lines = content.split('\n');

  if (lines[0]?.trim() !== '---') {
    return content;
  }

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      return lines.slice(i + 1).join('\n').trim();
    }
  }

  return content;
}

/**
 * Average an array of benchmark scores into a single score set.
 */
function averageScores(runs: BenchmarkScores[]): BenchmarkScores {
  if (runs.length === 0) {
    return {
      precision: 0,
      recall: 0,
      f1: 0,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      tokenCount: 0,
      duration: 0,
    };
  }

  if (runs.length === 1) {
    return { ...runs[0] };
  }

  const sum = (key: keyof BenchmarkScores) =>
    runs.reduce((acc, r) => acc + r[key], 0);
  const n = runs.length;

  return {
    precision: sum('precision') / n,
    recall: sum('recall') / n,
    f1: sum('f1') / n,
    truePositives: Math.round(sum('truePositives') / n),
    falsePositives: Math.round(sum('falsePositives') / n),
    falseNegatives: Math.round(sum('falseNegatives') / n),
    tokenCount: Math.round(sum('tokenCount') / n),
    duration: Math.round(sum('duration') / n),
  };
}

/**
 * Run a single skill through the benchmark scorer.
 *
 * In mock mode (current implementation), reads the SKILL.md body as simulated output
 * and scores it against the ground truth.
 *
 * @param skillPath - Path to the SKILL.md file
 * @param config - Benchmark configuration with ground truth
 * @returns Benchmark result with scores
 */
async function runSingleSkill(
  skillPath: string,
  config: BenchmarkConfig,
): Promise<BenchmarkResult> {
  const resolvedPath = resolve(skillPath);
  const content = await readFile(resolvedPath, 'utf-8');
  const output = extractSkillBody(content);

  const numRuns = config.runs ?? 1;
  const runDetails: BenchmarkScores[] = [];

  for (let i = 0; i < numRuns; i++) {
    const startTime = performance.now();
    const scores = scoreOutput(output, config.groundTruth);
    const duration = Math.round(performance.now() - startTime);
    runDetails.push({ ...scores, duration });
  }

  const scores = averageScores(runDetails);

  return {
    skillPath: resolvedPath,
    scores,
    runDetails,
    output,
  };
}

/**
 * Run a benchmark against a skill and return scored results.
 *
 * Reads the skill file, scores its output against the ground truth,
 * and optionally averages results across multiple runs.
 *
 * @param config - Benchmark configuration
 * @returns Benchmark result with precision, recall, F1 scores
 *
 * @example
 * ```ts
 * const result = await runBenchmark({
 *   name: 'Security review',
 *   skillPath: './skills/review/SKILL.md',
 *   groundTruth: {
 *     expectedFindings: [{ file: 'app.ts', type: 'security', description: 'SQL injection' }],
 *     cleanFiles: ['utils.ts'],
 *   },
 * });
 * console.log(result.scores.f1);
 * ```
 */
export async function runBenchmark(
  config: BenchmarkConfig,
): Promise<BenchmarkResult> {
  return runSingleSkill(config.skillPath, config);
}

/**
 * Run an A/B comparison between two skills.
 *
 * Requires `config.compareWith` to be set. Runs both skills against the same
 * ground truth and returns a comparison with deltas and a winner.
 *
 * @param config - Benchmark configuration with `compareWith` set
 * @returns Comparison result with winner and per-metric deltas
 * @throws If `config.compareWith` is not set
 */
export async function runComparison(
  config: BenchmarkConfig,
): Promise<ComparisonResult> {
  if (!config.compareWith) {
    throw new Error(
      'runComparison requires config.compareWith to be set',
    );
  }

  const [a, b] = await Promise.all([
    runSingleSkill(config.skillPath, config),
    runSingleSkill(config.compareWith, config),
  ]);

  return compareSkills(a, b);
}
