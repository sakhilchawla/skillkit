import { describe, it, expect } from 'vitest';
import { scoreOutput } from '../scorer/scorer.js';
import type { GroundTruth } from '../types.js';

describe('scoreOutput', () => {
  const makeGroundTruth = (
    findings: GroundTruth['expectedFindings'] = [],
    cleanFiles: string[] = [],
  ): GroundTruth => ({
    expectedFindings: findings,
    cleanFiles,
  });

  it('should return perfect score when all findings are found with no false positives', () => {
    const groundTruth = makeGroundTruth([
      { file: 'app.ts', type: 'security', description: 'SQL injection in query builder' },
      { file: 'auth.ts', type: 'security', description: 'Missing password hashing' },
    ]);

    const output = `
[CRITICAL] SQL injection in query builder found in app.ts
[WARNING] Missing password hashing in auth.ts
    `.trim();

    const scores = scoreOutput(output, groundTruth);
    expect(scores.truePositives).toBe(2);
    expect(scores.falsePositives).toBe(0);
    expect(scores.falseNegatives).toBe(0);
    expect(scores.precision).toBe(1.0);
    expect(scores.recall).toBe(1.0);
    expect(scores.f1).toBe(1.0);
  });

  it('should return zero recall when no findings are found', () => {
    const groundTruth = makeGroundTruth([
      { file: 'app.ts', type: 'security', description: 'SQL injection' },
      { file: 'auth.ts', type: 'logic', description: 'Race condition' },
    ]);

    const output = 'Everything looks good. No issues found.';

    const scores = scoreOutput(output, groundTruth);
    expect(scores.truePositives).toBe(0);
    expect(scores.falseNegatives).toBe(2);
    expect(scores.recall).toBe(0);
    // No finding patterns in output, so no false positives
    expect(scores.precision).toBe(1.0);
  });

  it('should handle mixed results: some found, some missed', () => {
    const groundTruth = makeGroundTruth([
      { file: 'app.ts', type: 'security', description: 'SQL injection' },
      { file: 'auth.ts', type: 'logic', description: 'Race condition' },
      { file: 'db.ts', type: 'performance', description: 'N+1 query' },
    ]);

    const output = `
[CRITICAL] SQL injection found in app.ts
[WARNING] N+1 query detected in db.ts
    `.trim();

    const scores = scoreOutput(output, groundTruth);
    expect(scores.truePositives).toBe(2);
    expect(scores.falseNegatives).toBe(1);
    expect(scores.falsePositives).toBe(0);
    expect(scores.recall).toBeCloseTo(2 / 3);
    expect(scores.precision).toBe(1.0);
  });

  it('should detect false positives from extra finding-like lines', () => {
    const groundTruth = makeGroundTruth([
      { file: 'app.ts', type: 'security', description: 'SQL injection' },
    ]);

    const output = `
[CRITICAL] SQL injection found in app.ts
[WARNING] Potential XSS vulnerability in render.ts
[WARNING] Unvalidated input in form.ts
    `.trim();

    const scores = scoreOutput(output, groundTruth);
    expect(scores.truePositives).toBe(1);
    expect(scores.falsePositives).toBe(2);
    expect(scores.falseNegatives).toBe(0);
    expect(scores.precision).toBeCloseTo(1 / 3);
    expect(scores.recall).toBe(1.0);
  });

  it('should return precision=1 and recall=1 for empty ground truth', () => {
    const groundTruth = makeGroundTruth([], ['clean.ts']);

    const output = 'No issues found in the codebase.';

    const scores = scoreOutput(output, groundTruth);
    expect(scores.precision).toBe(1.0);
    expect(scores.recall).toBe(1.0);
    expect(scores.f1).toBe(1.0);
    expect(scores.truePositives).toBe(0);
    expect(scores.falsePositives).toBe(0);
    expect(scores.falseNegatives).toBe(0);
  });

  it('should return precision=1 and recall=0 for empty output', () => {
    const groundTruth = makeGroundTruth([
      { file: 'app.ts', type: 'security', description: 'SQL injection' },
    ]);

    const output = '';

    const scores = scoreOutput(output, groundTruth);
    expect(scores.precision).toBe(1.0); // No false claims
    expect(scores.recall).toBe(0);
    expect(scores.truePositives).toBe(0);
    expect(scores.falseNegatives).toBe(1);
  });

  it('should estimate token count from output word count', () => {
    // 10 words -> ~14 tokens (ceil(10/0.75) = 14)
    const output = 'one two three four five six seven eight nine ten';
    const groundTruth = makeGroundTruth();

    const scores = scoreOutput(output, groundTruth);
    expect(scores.tokenCount).toBe(14);
  });

  it('should return zero tokens for empty output', () => {
    const scores = scoreOutput('', makeGroundTruth());
    expect(scores.tokenCount).toBe(0);
  });

  it('should handle division by zero when both precision and recall are zero', () => {
    // Empty output with expected findings: precision=1 (no false claims), recall=0
    // F1 = 2*(1*0)/(1+0) = 0
    const groundTruth = makeGroundTruth([
      { file: 'app.ts', type: 'security', description: 'SQL injection' },
    ]);

    const scores = scoreOutput('', groundTruth);
    expect(scores.f1).toBe(0);
    expect(Number.isFinite(scores.f1)).toBe(true);
  });

  it('should detect findings by description match', () => {
    const groundTruth = makeGroundTruth([
      { file: 'app.ts', type: 'security', description: 'hardcoded API key' },
    ]);

    const output = 'Found a hardcoded API key that should be moved to environment variables.';

    const scores = scoreOutput(output, groundTruth);
    expect(scores.truePositives).toBe(1);
    expect(scores.recall).toBe(1.0);
  });

  it('should detect findings by file name + type match', () => {
    const groundTruth = makeGroundTruth([
      { file: 'config.ts', type: 'security', description: 'exposed credentials' },
    ]);

    const output = 'In config.ts there is a security concern that should be addressed.';

    const scores = scoreOutput(output, groundTruth);
    expect(scores.truePositives).toBe(1);
    expect(scores.recall).toBe(1.0);
  });

  it('should be case-insensitive for finding detection', () => {
    const groundTruth = makeGroundTruth([
      { file: 'App.ts', type: 'Security', description: 'SQL Injection' },
    ]);

    const output = 'sql injection vulnerability detected in app.ts';

    const scores = scoreOutput(output, groundTruth);
    expect(scores.truePositives).toBe(1);
  });

  it('should pass through duration parameter', () => {
    const scores = scoreOutput('test', makeGroundTruth(), 1234);
    expect(scores.duration).toBe(1234);
  });

  it('should default duration to zero', () => {
    const scores = scoreOutput('test', makeGroundTruth());
    expect(scores.duration).toBe(0);
  });

  it('should calculate F1 correctly for known values', () => {
    // Precision = 0.5, Recall = 1.0 => F1 = 2*(0.5*1.0)/(0.5+1.0) = 2/3
    const groundTruth = makeGroundTruth([
      { file: 'a.ts', type: 'bug', description: 'null pointer' },
    ]);

    const output = `
[WARNING] null pointer in a.ts
[WARNING] extra issue that is not real
    `.trim();

    const scores = scoreOutput(output, groundTruth);
    expect(scores.precision).toBeCloseTo(0.5);
    expect(scores.recall).toBe(1.0);
    expect(scores.f1).toBeCloseTo(2 / 3);
  });

  it('should handle multiple finding patterns in false positive detection', () => {
    const groundTruth = makeGroundTruth([]);

    const output = `
[CRITICAL] Severe issue found
[ERROR] Another problem
bug: something wrong
vulnerability: exposed data
issue: broken logic
    `.trim();

    const scores = scoreOutput(output, groundTruth);
    expect(scores.falsePositives).toBe(5);
    expect(scores.precision).toBe(0); // TP=0, FP=5 -> precision = 0/5 = 0
  });

  // ---------------------------------------------------------------------------
  // Keyword matching (auto-extracted from description)
  // ---------------------------------------------------------------------------
  describe('keyword matching', () => {
    it('detects finding when Claude rephrases the description', () => {
      const groundTruth = makeGroundTruth([
        { file: 'auth.ts', type: 'security', description: 'SQL injection vulnerability in query builder' },
      ]);

      // Claude's output uses different wording but same concepts
      const output = `
In auth.ts, the query builder constructs SQL queries using string concatenation,
which creates a serious injection risk. User input is not parameterized.
      `.trim();

      const scores = scoreOutput(output, groundTruth);
      expect(scores.truePositives).toBe(1);
      expect(scores.recall).toBe(1.0);
    });

    it('detects finding with partial keyword overlap (60% threshold)', () => {
      const groundTruth = makeGroundTruth([
        { file: 'api.ts', type: 'security', description: 'hardcoded database credentials in connection string' },
      ]);

      // Contains "hardcoded", "database", "credentials" (3/5 = 60%) + file name
      const output = 'The file api.ts has hardcoded database credentials that should use env vars.';

      const scores = scoreOutput(output, groundTruth);
      expect(scores.truePositives).toBe(1);
    });

    it('requires file name presence for keyword match', () => {
      const groundTruth = makeGroundTruth([
        { file: 'secret.ts', type: 'security', description: 'hardcoded API key exposed' },
      ]);

      // Keywords match but file name is absent
      const output = 'Found a hardcoded API key that is exposed in the codebase.';

      const scores = scoreOutput(output, groundTruth);
      // Should NOT match — file name not present
      expect(scores.truePositives).toBe(0);
    });

    it('does not match when too few keywords overlap', () => {
      const groundTruth = makeGroundTruth([
        { file: 'db.ts', type: 'performance', description: 'N+1 query causing excessive database round trips' },
      ]);

      // Only "database" matches (1/6 keywords < 60%), file present
      const output = 'db.ts has a database connection pool configured correctly.';

      const scores = scoreOutput(output, groundTruth);
      expect(scores.truePositives).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Regex pattern matching
  // ---------------------------------------------------------------------------
  describe('pattern matching', () => {
    it('detects finding via regex pattern', () => {
      const groundTruth = makeGroundTruth([
        {
          file: 'auth.ts',
          type: 'security',
          description: 'Weak password hashing algorithm',
          pattern: 'password.*(md5|sha1|plain|weak|hash)',
        },
      ]);

      const output = 'auth.ts uses md5 for password storage which is cryptographically weak.';

      const scores = scoreOutput(output, groundTruth);
      expect(scores.truePositives).toBe(1);
      expect(scores.recall).toBe(1.0);
    });

    it('pattern match is case-insensitive', () => {
      const groundTruth = makeGroundTruth([
        {
          file: 'config.ts',
          type: 'security',
          description: 'Exposed API key',
          pattern: 'API[_\\s-]?KEY.*exposed|exposed.*API[_\\s-]?KEY',
        },
      ]);

      const output = 'config.ts has an api_key that is exposed in the repository.';

      const scores = scoreOutput(output, groundTruth);
      expect(scores.truePositives).toBe(1);
    });

    it('falls back to keyword matching when pattern does not match', () => {
      const groundTruth = makeGroundTruth([
        {
          file: 'app.ts',
          type: 'security',
          description: 'SQL injection vulnerability',
          pattern: 'VERY_SPECIFIC_PATTERN_THAT_WONT_MATCH',
        },
      ]);

      // Pattern won't match, but exact description substring does
      const output = 'app.ts has a SQL injection vulnerability in the login form.';

      const scores = scoreOutput(output, groundTruth);
      expect(scores.truePositives).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Explicit keywords
  // ---------------------------------------------------------------------------
  describe('explicit keywords', () => {
    it('uses explicit keywords when provided', () => {
      const groundTruth = makeGroundTruth([
        {
          file: 'handler.ts',
          type: 'security',
          description: 'SSRF via user-controlled URL',
          keywords: ['ssrf', 'url', 'fetch', 'request'],
        },
      ]);

      // Contains "url", "fetch", "request" (3/4 = 75% > 60%) + file name
      const output = 'handler.ts makes a fetch request to a user-controlled url without validation.';

      const scores = scoreOutput(output, groundTruth);
      expect(scores.truePositives).toBe(1);
    });

    it('explicit keywords override auto-extraction', () => {
      const groundTruth = makeGroundTruth([
        {
          file: 'db.ts',
          type: 'performance',
          description: 'Something very generic that would not match',
          keywords: ['n+1', 'query', 'loop'],
        },
      ]);

      const output = 'db.ts has an n+1 query problem inside the loop.';

      const scores = scoreOutput(output, groundTruth);
      expect(scores.truePositives).toBe(1);
    });
  });
});
