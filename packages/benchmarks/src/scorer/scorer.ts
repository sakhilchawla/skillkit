import type { BenchmarkScores, ExpectedFinding, GroundTruth } from '../types.js';

/**
 * Patterns that indicate a finding line in skill output.
 * Used to detect false positives (reported issues not in ground truth).
 */
const FINDING_PATTERNS = [
  /\[CRITICAL\]/i,
  /\[WARNING\]/i,
  /\[ERROR\]/i,
  /\[INFO\]/i,
  /\bissue:/i,
  /\bbug:/i,
  /\bvulnerability:/i,
  /\bfinding:/i,
];

/**
 * Check whether a single expected finding was detected in the output.
 *
 * A finding is considered detected if the output contains the description
 * OR contains both the file name and the finding type.
 *
 * @param output - The skill output to search
 * @param finding - The expected finding to look for
 * @returns True if the finding was detected
 */
function isFindingDetected(output: string, finding: ExpectedFinding): boolean {
  const lower = output.toLowerCase();

  // Check if output contains the description
  if (lower.includes(finding.description.toLowerCase())) {
    return true;
  }

  // Check if output contains both the file name and the type
  if (
    lower.includes(finding.file.toLowerCase()) &&
    lower.includes(finding.type.toLowerCase())
  ) {
    return true;
  }

  return false;
}

/**
 * Count lines in output that look like findings but don't match any expected finding.
 *
 * @param output - The skill output
 * @param groundTruth - The ground truth to match against
 * @param detectedFindings - Set of indices into expectedFindings that were detected
 * @returns Number of false positive lines
 */
function countFalsePositives(
  output: string,
  groundTruth: GroundTruth,
  detectedFindings: Set<number>,
): number {
  const lines = output.split('\n');
  let falsePositives = 0;

  for (const line of lines) {
    // Check if this line matches any finding pattern
    const looksLikeFinding = FINDING_PATTERNS.some((pattern) =>
      pattern.test(line),
    );

    if (!looksLikeFinding) {
      continue;
    }

    // Check if this line corresponds to any expected finding
    const matchesExpected = groundTruth.expectedFindings.some(
      (finding, index) => {
        if (!detectedFindings.has(index)) {
          return false;
        }
        const lower = line.toLowerCase();
        return (
          lower.includes(finding.description.toLowerCase()) ||
          (lower.includes(finding.file.toLowerCase()) &&
            lower.includes(finding.type.toLowerCase()))
        );
      },
    );

    if (!matchesExpected) {
      falsePositives++;
    }
  }

  return falsePositives;
}

/**
 * Estimate token count from output text.
 *
 * Uses the approximation: tokens ~ words / 0.75
 *
 * @param output - The text to estimate tokens for
 * @returns Estimated token count
 */
function estimateTokenCount(output: string): number {
  const wordCount = output
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return Math.ceil(wordCount / 0.75);
}

/**
 * Score skill output against ground truth.
 *
 * Calculates precision, recall, and F1 by matching expected findings
 * against the output text and counting false positives from unmatched
 * finding-like lines.
 *
 * @param output - The captured skill output
 * @param groundTruth - The ground truth with expected findings and clean files
 * @param duration - Duration in milliseconds (default: 0)
 * @returns Benchmark scores with precision, recall, F1, and counts
 *
 * @example
 * ```ts
 * const scores = scoreOutput(skillOutput, {
 *   expectedFindings: [{ file: 'app.ts', type: 'security', description: 'SQL injection' }],
 *   cleanFiles: ['utils.ts'],
 * });
 * console.log(scores.f1); // 0.0 to 1.0
 * ```
 */
export function scoreOutput(
  output: string,
  groundTruth: GroundTruth,
  duration: number = 0,
): BenchmarkScores {
  const detectedFindings = new Set<number>();

  // Determine which expected findings were detected
  for (let i = 0; i < groundTruth.expectedFindings.length; i++) {
    if (isFindingDetected(output, groundTruth.expectedFindings[i])) {
      detectedFindings.add(i);
    }
  }

  const truePositives = detectedFindings.size;
  const falseNegatives = groundTruth.expectedFindings.length - truePositives;
  const falsePositives = countFalsePositives(
    output,
    groundTruth,
    detectedFindings,
  );

  // Calculate precision: TP / (TP + FP)
  // If no findings were reported at all, precision = 1.0 (no false claims)
  const precision =
    truePositives + falsePositives === 0
      ? 1.0
      : truePositives / (truePositives + falsePositives);

  // Calculate recall: TP / (TP + FN)
  // If nothing was expected, recall = 1.0 (nothing to miss)
  const recall =
    truePositives + falseNegatives === 0
      ? 1.0
      : truePositives / (truePositives + falseNegatives);

  // Calculate F1: harmonic mean of precision and recall
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * (precision * recall)) / (precision + recall);

  const tokenCount = estimateTokenCount(output);

  return {
    precision,
    recall,
    f1,
    truePositives,
    falsePositives,
    falseNegatives,
    tokenCount,
    duration,
  };
}
