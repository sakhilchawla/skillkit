import type {
  BenchmarkResult,
  ComparisonResult,
  RegressionResult,
} from '../types.js';

// ANSI color codes (no dependencies)
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

const bold = (s: string) => `${BOLD}${s}${RESET}`;
const dim = (s: string) => `${DIM}${s}${RESET}`;
const red = (s: string) => `${RED}${s}${RESET}`;
const green = (s: string) => `${GREEN}${s}${RESET}`;
const yellow = (s: string) => `${YELLOW}${s}${RESET}`;
const cyan = (s: string) => `${CYAN}${s}${RESET}`;

/**
 * Format a score as a colorized percentage string.
 * Green for >= 0.8, yellow for >= 0.5, red otherwise.
 */
function colorScore(value: number): string {
  const pct = (value * 100).toFixed(1) + '%';
  if (value >= 0.8) return green(pct);
  if (value >= 0.5) return yellow(pct);
  return red(pct);
}

/**
 * Format a benchmark result for console output with colorized scores.
 *
 * @param result - The benchmark result to format
 * @returns Colorized string for terminal display
 */
export function formatBenchmarkResult(result: BenchmarkResult): string {
  const { scores } = result;
  const lines: string[] = [];

  lines.push(`\n${bold('Benchmark Results')} ${dim(result.skillPath)}`);
  lines.push('');
  lines.push(`  ${cyan('Precision')}  ${colorScore(scores.precision)}`);
  lines.push(`  ${cyan('Recall')}     ${colorScore(scores.recall)}`);
  lines.push(`  ${cyan('F1')}         ${colorScore(scores.f1)}`);
  lines.push('');
  lines.push(
    `  ${dim('TP:')} ${scores.truePositives}  ${dim('FP:')} ${scores.falsePositives}  ${dim('FN:')} ${scores.falseNegatives}`,
  );
  lines.push(
    `  ${dim('Tokens:')} ${scores.tokenCount}  ${dim('Duration:')} ${scores.duration}ms`,
  );

  if (result.runDetails.length > 1) {
    lines.push('');
    lines.push(`  ${dim(`Averaged over ${result.runDetails.length} runs`)}`);
  }

  return lines.join('\n');
}

/**
 * Format a delta value with sign and color.
 * Positive deltas are green (better), negative are red (worse).
 */
function colorDelta(value: number, invert: boolean = false): string {
  const sign = value > 0 ? '+' : '';
  const formatted = `${sign}${(value * 100).toFixed(1)}%`;
  const isGood = invert ? value < 0 : value > 0;
  if (Math.abs(value) < 0.001) return dim(formatted);
  return isGood ? green(formatted) : red(formatted);
}

/**
 * Format a comparison result as a side-by-side table for console output.
 *
 * @param result - The comparison result to format
 * @returns Colorized string for terminal display
 */
export function formatComparisonResult(result: ComparisonResult): string {
  const lines: string[] = [];

  const winnerLabel =
    result.winner === 'tie'
      ? yellow('TIE')
      : result.winner === 'a'
        ? green('A wins')
        : green('B wins');

  lines.push(`\n${bold('A/B Comparison')} ${dim('—')} ${winnerLabel}`);
  lines.push('');
  lines.push(
    `  ${dim('Skill A:')} ${result.a.skillPath}`,
  );
  lines.push(
    `  ${dim('Skill B:')} ${result.b.skillPath}`,
  );
  lines.push('');
  lines.push(
    `  ${bold('Metric'.padEnd(12))} ${bold('A'.padStart(8))} ${bold('B'.padStart(8))} ${bold('Delta'.padStart(10))}`,
  );
  lines.push(`  ${'─'.repeat(40)}`);
  lines.push(
    `  ${'Precision'.padEnd(12)} ${(result.a.scores.precision * 100).toFixed(1).padStart(7)}% ${(result.b.scores.precision * 100).toFixed(1).padStart(7)}% ${colorDelta(result.deltas.precision).padStart(10)}`,
  );
  lines.push(
    `  ${'Recall'.padEnd(12)} ${(result.a.scores.recall * 100).toFixed(1).padStart(7)}% ${(result.b.scores.recall * 100).toFixed(1).padStart(7)}% ${colorDelta(result.deltas.recall).padStart(10)}`,
  );
  lines.push(
    `  ${'F1'.padEnd(12)} ${(result.a.scores.f1 * 100).toFixed(1).padStart(7)}% ${(result.b.scores.f1 * 100).toFixed(1).padStart(7)}% ${colorDelta(result.deltas.f1).padStart(10)}`,
  );
  lines.push(
    `  ${'Tokens'.padEnd(12)} ${String(result.a.scores.tokenCount).padStart(8)} ${String(result.b.scores.tokenCount).padStart(8)} ${dim(String(result.deltas.tokenCount))}`,
  );
  lines.push(
    `  ${'Duration'.padEnd(12)} ${(String(result.a.scores.duration) + 'ms').padStart(8)} ${(String(result.b.scores.duration) + 'ms').padStart(8)} ${dim(String(result.deltas.duration) + 'ms')}`,
  );

  return lines.join('\n');
}

/**
 * Format a regression result for console output with pass/fail status.
 *
 * @param result - The regression result to format
 * @returns Colorized string for terminal display
 */
export function formatRegressionResult(result: RegressionResult): string {
  const lines: string[] = [];

  const status = result.regressed
    ? red('REGRESSION DETECTED')
    : green('PASS — no regressions');

  lines.push(`\n${bold('Regression Check')} ${dim('—')} ${status}`);
  lines.push('');
  lines.push(`  ${dim('Baseline:')} ${result.baseline.timestamp}`);

  if (result.regressions.length === 0) {
    lines.push(`  ${green('All metrics within acceptable thresholds')}`);
  } else {
    lines.push('');
    for (const r of result.regressions) {
      lines.push(
        `  ${red('✖')} ${bold(r.metric)} dropped ${red((r.delta * 100).toFixed(1) + '%')} ` +
          `(${(r.baseline * 100).toFixed(1)}% → ${(r.current * 100).toFixed(1)}%, ` +
          `threshold: ${(r.threshold * 100).toFixed(1)}%)`,
      );
    }
  }

  return lines.join('\n');
}
