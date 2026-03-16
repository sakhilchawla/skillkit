import type { BenchmarkResult } from '../types.js';

/**
 * Format a benchmark result as a JSON string.
 *
 * @param result - The benchmark result to format
 * @returns Pretty-printed JSON string
 */
export function formatBenchmarkResultJson(result: BenchmarkResult): string {
  return JSON.stringify(
    {
      skillPath: result.skillPath,
      scores: result.scores,
      runDetails: result.runDetails,
    },
    null,
    2,
  );
}
