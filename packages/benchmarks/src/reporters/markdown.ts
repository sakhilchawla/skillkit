import type { BenchmarkResult } from '../types.js';

/**
 * Format a benchmark result as a Markdown table suitable for PR comments.
 *
 * @param result - The benchmark result to format
 * @returns Markdown string with scores table
 */
export function formatBenchmarkResultMarkdown(
  result: BenchmarkResult,
): string {
  const { scores } = result;
  const lines: string[] = [];

  lines.push(`### Benchmark: ${result.skillPath}`);
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Precision | ${(scores.precision * 100).toFixed(1)}% |`);
  lines.push(`| Recall | ${(scores.recall * 100).toFixed(1)}% |`);
  lines.push(`| F1 | ${(scores.f1 * 100).toFixed(1)}% |`);
  lines.push(`| True Positives | ${scores.truePositives} |`);
  lines.push(`| False Positives | ${scores.falsePositives} |`);
  lines.push(`| False Negatives | ${scores.falseNegatives} |`);
  lines.push(`| Tokens | ${scores.tokenCount} |`);
  lines.push(`| Duration | ${scores.duration}ms |`);

  if (result.runDetails.length > 1) {
    lines.push('');
    lines.push(`*Averaged over ${result.runDetails.length} runs*`);
  }

  return lines.join('\n');
}
