import { describe, it, expect } from 'vitest';
import { evaluateAssertion, evaluateAllAssertions } from '../assertions.js';

describe('evaluateAssertion', () => {
  describe('contains', () => {
    it('passes when output includes the string', () => {
      const result = evaluateAssertion('Found CRITICAL security issue', { contains: 'CRITICAL' }, true);
      expect(result.passed).toBe(true);
    });

    it('fails when output does not include the string', () => {
      const result = evaluateAssertion('All looks good', { contains: 'CRITICAL' }, true);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Expected output to contain');
    });
  });

  describe('notContains', () => {
    it('passes when output does not include the string', () => {
      const result = evaluateAssertion('All clear', { notContains: 'error' }, true);
      expect(result.passed).toBe(true);
    });

    it('fails when output includes the string', () => {
      const result = evaluateAssertion('git push --force executed', { notContains: 'git push' }, true);
      expect(result.passed).toBe(false);
    });
  });

  describe('matchesPattern', () => {
    it('passes when output matches regex', () => {
      const result = evaluateAssertion('[CRITICAL] src/api.ts:15', { matchesPattern: '\\[CRITICAL\\].*:\\d+' }, true);
      expect(result.passed).toBe(true);
    });

    it('fails when output does not match regex', () => {
      const result = evaluateAssertion('No issues', { matchesPattern: '\\[CRITICAL\\]' }, true);
      expect(result.passed).toBe(false);
    });
  });

  describe('severity', () => {
    it('passes when output contains severity string', () => {
      const result = evaluateAssertion('WARNING: unused variable', { severity: 'WARNING' }, true);
      expect(result.passed).toBe(true);
    });

    it('fails when severity not present', () => {
      const result = evaluateAssertion('All good', { severity: 'CRITICAL' }, true);
      expect(result.passed).toBe(false);
    });
  });

  describe('completes', () => {
    it('passes when skill completed and expected true', () => {
      const result = evaluateAssertion('output', { completes: true }, true);
      expect(result.passed).toBe(true);
    });

    it('fails when skill did not complete but expected true', () => {
      const result = evaluateAssertion('output', { completes: true }, false);
      expect(result.passed).toBe(false);
    });
  });

  describe('noErrors', () => {
    it('passes when output has no error indicators', () => {
      const result = evaluateAssertion('Review complete, 2 warnings found', { noErrors: true }, true);
      expect(result.passed).toBe(true);
    });

    it('fails when output contains error', () => {
      const result = evaluateAssertion('TypeError: Cannot read property', { noErrors: true }, true);
      expect(result.passed).toBe(false);
    });
  });

  describe('noCriticalIssues', () => {
    it('passes when output has no critical/blocker', () => {
      const result = evaluateAssertion('2 suggestions found', { noCriticalIssues: true }, true);
      expect(result.passed).toBe(true);
    });

    it('fails when output contains critical', () => {
      const result = evaluateAssertion('Found 1 critical issue', { noCriticalIssues: true }, true);
      expect(result.passed).toBe(false);
    });

    it('fails when output contains blocker', () => {
      const result = evaluateAssertion('Blocker: missing auth check', { noCriticalIssues: true }, true);
      expect(result.passed).toBe(false);
    });
  });

  describe('maxTokens', () => {
    it('passes when output is within token limit', () => {
      const result = evaluateAssertion('short output', { maxTokens: 100 }, true);
      expect(result.passed).toBe(true);
    });

    it('fails when output exceeds token limit', () => {
      const longOutput = 'word '.repeat(1000); // ~1333 tokens
      const result = evaluateAssertion(longOutput, { maxTokens: 100 }, true);
      expect(result.passed).toBe(false);
    });
  });

  describe('unknown assertion type', () => {
    it('fails with unknown assertion message', () => {
      const result = evaluateAssertion('output', {} as any, true);
      expect(result.passed).toBe(false);
      expect(result.message).toBe('Unknown assertion type');
    });
  });
});

describe('evaluateAllAssertions', () => {
  it('evaluates multiple assertions and returns all results', () => {
    const results = evaluateAllAssertions(
      'Found CRITICAL security issue in auth.ts',
      [
        { contains: 'CRITICAL' },
        { contains: 'security' },
        { notContains: 'git push' },
      ],
      true,
    );
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it('returns mixed pass/fail results', () => {
    const results = evaluateAllAssertions(
      'No issues found',
      [
        { contains: 'No issues' },
        { contains: 'CRITICAL' },
      ],
      true,
    );
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(false);
  });
});
