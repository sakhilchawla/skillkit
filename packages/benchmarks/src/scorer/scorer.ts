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

/** Words too common to be useful as keywords */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'it',
  'and', 'or', 'not', 'with', 'from', 'by', 'as', 'be', 'was', 'are',
  'this', 'that', 'has', 'have', 'had', 'but', 'if', 'no', 'can',
  'should', 'could', 'would', 'may', 'might', 'will', 'do', 'does',
  'did', 'been', 'being', 'into', 'than', 'its', 'also', 'more',
  'found', 'detected', 'issue', 'problem', 'error', 'warning',
]);

/**
 * Extract significant keywords from a description string.
 * Filters out stop words and very short words.
 */
function extractKeywords(description: string): string[] {
  return description
    .toLowerCase()
    .split(/[\s\-_/.,;:!?()\[\]{}'"]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

/**
 * Check if enough keywords from a list appear in the output.
 * Requires at least 60% of keywords to match, minimum 1.
 */
function keywordsMatch(output: string, keywords: string[]): boolean {
  if (keywords.length === 0) return false;

  const lower = output.toLowerCase();
  const matched = keywords.filter((kw) => lower.includes(kw));
  const threshold = Math.max(1, Math.ceil(keywords.length * 0.6));

  return matched.length >= threshold;
}

/**
 * Check whether a single expected finding was detected in the output.
 *
 * Detection priority:
 * 1. Regex pattern match (if `finding.pattern` is set)
 * 2. Exact description substring match
 * 3. File name + type match
 * 4. Keyword match (explicit `finding.keywords` or auto-extracted from description)
 *
 * @param output - The skill output to search
 * @param finding - The expected finding to look for
 * @returns True if the finding was detected
 */
function isFindingDetected(output: string, finding: ExpectedFinding): boolean {
  const lower = output.toLowerCase();

  // 1. Regex pattern match (highest priority, opt-in)
  if (finding.pattern) {
    const regex = new RegExp(finding.pattern, 'i');
    if (regex.test(output)) {
      return true;
    }
  }

  // 2. Exact description substring match
  if (lower.includes(finding.description.toLowerCase())) {
    return true;
  }

  // 3. File name + type match
  if (
    lower.includes(finding.file.toLowerCase()) &&
    lower.includes(finding.type.toLowerCase())
  ) {
    return true;
  }

  // 4. Keyword match — explicit keywords or auto-extracted from description
  const keywords = finding.keywords ?? extractKeywords(finding.description);
  if (keywords.length > 0 && keywordsMatch(output, keywords)) {
    // Also require the file name to appear to avoid false matches
    if (lower.includes(finding.file.toLowerCase())) {
      return true;
    }
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

        // Pattern match
        if (finding.pattern) {
          const regex = new RegExp(finding.pattern, 'i');
          if (regex.test(line)) return true;
        }

        // Description or file+type match
        if (
          lower.includes(finding.description.toLowerCase()) ||
          (lower.includes(finding.file.toLowerCase()) &&
            lower.includes(finding.type.toLowerCase()))
        ) {
          return true;
        }

        // Keyword match with file presence
        const keywords = finding.keywords ?? extractKeywords(finding.description);
        if (
          keywords.length > 0 &&
          keywordsMatch(line, keywords) &&
          lower.includes(finding.file.toLowerCase())
        ) {
          return true;
        }

        return false;
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
 * against the output text. Supports three matching strategies:
 *
 * 1. **Regex pattern** — set `finding.pattern` for full control
 * 2. **Keyword matching** — auto-extracts significant words from the description
 *    and checks if 60%+ appear in the output near the file name
 * 3. **Exact matching** — substring match on description or file+type
 *
 * @param output - The captured skill output
 * @param groundTruth - The ground truth with expected findings and clean files
 * @param duration - Duration in milliseconds (default: 0)
 * @returns Benchmark scores with precision, recall, F1, and counts
 *
 * @example
 * ```ts
 * const scores = scoreOutput(skillOutput, {
 *   expectedFindings: [
 *     // Keyword matching (default) — works even if Claude rephrases
 *     { file: 'app.ts', type: 'security', description: 'SQL injection vulnerability in query builder' },
 *     // Regex pattern — full control over matching
 *     { file: 'auth.ts', type: 'security', description: 'Weak password hashing', pattern: 'password.*(hash|bcrypt|md5|sha1)' },
 *     // Explicit keywords — override auto-extraction
 *     { file: 'api.ts', type: 'security', description: 'API key exposure', keywords: ['api', 'key', 'exposed', 'hardcoded'] },
 *   ],
 *   cleanFiles: ['utils.ts'],
 * });
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
