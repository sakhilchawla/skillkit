import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { scoreOutput } from './scorer/scorer.js';
import { compareSkills } from './comparator/comparator.js';
import { invokeSkill } from '@skillkit-llm/test-harness';
import type { InvokerConfig } from '@skillkit-llm/test-harness';
import type {
  BenchmarkConfig,
  BenchmarkResult,
  BenchmarkRunOptions,
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
 * Get skill output in mock mode — reads the SKILL.md body as simulated output.
 */
async function getMockOutput(skillPath: string): Promise<{ output: string; duration: number }> {
  const resolvedPath = resolve(skillPath);
  const content = await readFile(resolvedPath, 'utf-8');
  const output = extractSkillBody(content);
  return { output, duration: 0 };
}

/**
 * Get skill output in real mode — invokes the skill via subprocess against the corpus.
 */
async function getRealOutput(
  skillPath: string,
  config: BenchmarkConfig,
  invokerConfig: InvokerConfig,
): Promise<{ output: string; duration: number }> {
  const resolvedSkill = resolve(skillPath);
  const invokeArgs = config.invoke ?? '';

  const result = await invokeSkill(resolvedSkill, invokeArgs, invokerConfig);

  if (!result.completed) {
    throw new Error(
      `Skill invocation timed out or failed (exit code: ${result.exitCode}).` +
        (result.stderr ? `\nStderr: ${result.stderr.slice(0, 500)}` : ''),
    );
  }

  if (result.exitCode !== 0 && result.output.length === 0) {
    throw new Error(
      `Skill exited with code ${result.exitCode} and no output.` +
        (result.stderr ? `\nStderr: ${result.stderr.slice(0, 500)}` : ''),
    );
  }

  return { output: result.output, duration: result.duration };
}

/**
 * Run a single skill through the benchmark scorer.
 *
 * In mock mode (default), reads the SKILL.md body as simulated output
 * and scores it against the ground truth.
 *
 * In real mode, invokes the skill via subprocess against the test corpus
 * and scores the actual AI output.
 */
async function runSingleSkill(
  skillPath: string,
  config: BenchmarkConfig,
  options: BenchmarkRunOptions = {},
): Promise<BenchmarkResult> {
  const isMock = options.mock ?? true;
  const numRuns = config.runs ?? 1;
  const runDetails: BenchmarkScores[] = [];
  let lastOutput = '';

  for (let i = 0; i < numRuns; i++) {
    let output: string;
    let invocationDuration: number;

    if (isMock) {
      const result = await getMockOutput(skillPath);
      output = result.output;
      invocationDuration = result.duration;
    } else {
      if (!options.invoker) {
        throw new Error(
          'Real mode requires invoker configuration. Pass --provider or set invoker options.',
        );
      }

      const invokerConfig: InvokerConfig = {
        provider: options.invoker.provider,
        command: options.invoker.command,
        timeout: options.invoker.timeout ?? 120_000,
        cwd: config.corpus ? resolve(config.corpus) : undefined,
      };

      const result = await getRealOutput(skillPath, config, invokerConfig);
      output = result.output;
      invocationDuration = result.duration;
    }

    lastOutput = output;

    const startTime = performance.now();
    const scores = scoreOutput(output, config.groundTruth);
    const scoringDuration = Math.round(performance.now() - startTime);

    runDetails.push({
      ...scores,
      duration: isMock ? scoringDuration : invocationDuration,
    });
  }

  const scores = averageScores(runDetails);

  return {
    skillPath: resolve(skillPath),
    scores,
    runDetails,
    output: lastOutput,
  };
}

/**
 * Run a benchmark against a skill and return scored results.
 *
 * In mock mode (default): reads the skill file and scores its body text.
 * In real mode: invokes the skill via AI provider and scores the actual output.
 *
 * @param config - Benchmark configuration
 * @param options - Run options (mock/real mode, invoker config)
 * @returns Benchmark result with precision, recall, F1 scores
 *
 * @example
 * ```ts
 * // Mock mode (default)
 * const result = await runBenchmark({
 *   name: 'Security review',
 *   skillPath: './skills/review/SKILL.md',
 *   groundTruth: {
 *     expectedFindings: [{ file: 'app.ts', type: 'security', description: 'SQL injection' }],
 *     cleanFiles: ['utils.ts'],
 *   },
 * });
 *
 * // Real mode
 * const result = await runBenchmark(config, {
 *   mock: false,
 *   invoker: { provider: 'claude-code', timeout: 120000 },
 * });
 * ```
 */
export async function runBenchmark(
  config: BenchmarkConfig,
  options: BenchmarkRunOptions = {},
): Promise<BenchmarkResult> {
  return runSingleSkill(config.skillPath, config, options);
}

/**
 * Run an A/B comparison between two skills.
 *
 * Requires `config.compareWith` to be set. Runs both skills against the same
 * ground truth and returns a comparison with deltas and a winner.
 *
 * @param config - Benchmark configuration with `compareWith` set
 * @param options - Run options (mock/real mode, invoker config)
 * @returns Comparison result with winner and per-metric deltas
 * @throws If `config.compareWith` is not set
 */
export async function runComparison(
  config: BenchmarkConfig,
  options: BenchmarkRunOptions = {},
): Promise<ComparisonResult> {
  if (!config.compareWith) {
    throw new Error(
      'runComparison requires config.compareWith to be set',
    );
  }

  const [a, b] = await Promise.all([
    runSingleSkill(config.skillPath, config, options),
    runSingleSkill(config.compareWith, config, options),
  ]);

  return compareSkills(a, b);
}
