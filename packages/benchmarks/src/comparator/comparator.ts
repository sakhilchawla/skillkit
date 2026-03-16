import type { BenchmarkResult, ComparisonResult } from '../types.js';

/**
 * Compare two skill benchmark results and determine a winner.
 *
 * Winner is determined by F1 score. If F1 scores are within 0.01 of each other,
 * token efficiency (fewer tokens) breaks the tie. If still tied, result is "tie".
 *
 * @param a - First skill's benchmark result
 * @param b - Second skill's benchmark result
 * @returns Comparison result with deltas and winner
 *
 * @example
 * ```ts
 * const result = compareSkills(resultA, resultB);
 * console.log(result.winner); // 'a', 'b', or 'tie'
 * console.log(result.deltas.f1); // positive = A is better
 * ```
 */
export function compareSkills(
  a: BenchmarkResult,
  b: BenchmarkResult,
): ComparisonResult {
  const deltas = {
    precision: a.scores.precision - b.scores.precision,
    recall: a.scores.recall - b.scores.recall,
    f1: a.scores.f1 - b.scores.f1,
    tokenCount: b.scores.tokenCount - a.scores.tokenCount, // positive = A used fewer (better)
    duration: b.scores.duration - a.scores.duration, // positive = A was faster (better)
  };

  let winner: 'a' | 'b' | 'tie';

  if (Math.abs(deltas.f1) > 0.01) {
    // Clear F1 winner
    winner = deltas.f1 > 0 ? 'a' : 'b';
  } else if (deltas.tokenCount !== 0) {
    // F1 tied — break by token efficiency
    winner = deltas.tokenCount > 0 ? 'a' : 'b';
  } else {
    winner = 'tie';
  }

  return { a, b, winner, deltas };
}
