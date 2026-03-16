import { describe, it, expect } from 'vitest';
import { compareSkills } from '../comparator/comparator.js';
import type { BenchmarkResult, BenchmarkScores } from '../types.js';

describe('compareSkills', () => {
  function makeResult(
    overrides: Partial<BenchmarkScores> = {},
    skillPath: string = 'skill.md',
  ): BenchmarkResult {
    return {
      skillPath,
      scores: {
        precision: 0.8,
        recall: 0.8,
        f1: 0.8,
        truePositives: 4,
        falsePositives: 1,
        falseNegatives: 1,
        tokenCount: 500,
        duration: 100,
        ...overrides,
      },
      runDetails: [],
      output: 'test output',
    };
  }

  it('should declare A as winner when A has higher F1', () => {
    const a = makeResult({ f1: 0.9 }, 'a.md');
    const b = makeResult({ f1: 0.7 }, 'b.md');

    const result = compareSkills(a, b);
    expect(result.winner).toBe('a');
  });

  it('should declare B as winner when B has higher F1', () => {
    const a = makeResult({ f1: 0.6 }, 'a.md');
    const b = makeResult({ f1: 0.85 }, 'b.md');

    const result = compareSkills(a, b);
    expect(result.winner).toBe('b');
  });

  it('should declare tie when F1 is identical and tokens are equal', () => {
    const a = makeResult({ f1: 0.8, tokenCount: 500 }, 'a.md');
    const b = makeResult({ f1: 0.8, tokenCount: 500 }, 'b.md');

    const result = compareSkills(a, b);
    expect(result.winner).toBe('tie');
  });

  it('should calculate deltas correctly', () => {
    const a = makeResult(
      { precision: 0.9, recall: 0.7, f1: 0.79, tokenCount: 400, duration: 80 },
      'a.md',
    );
    const b = makeResult(
      { precision: 0.7, recall: 0.9, f1: 0.79, tokenCount: 600, duration: 120 },
      'b.md',
    );

    const result = compareSkills(a, b);
    expect(result.deltas.precision).toBeCloseTo(0.2);
    expect(result.deltas.recall).toBeCloseTo(-0.2);
    expect(result.deltas.f1).toBeCloseTo(0);
    expect(result.deltas.tokenCount).toBe(200); // B used more, positive = A better
    expect(result.deltas.duration).toBe(40); // B was slower, positive = A faster
  });

  it('should use token efficiency to break F1 ties', () => {
    const a = makeResult({ f1: 0.80, tokenCount: 300 }, 'a.md');
    const b = makeResult({ f1: 0.805, tokenCount: 600 }, 'b.md');

    // F1 difference is 0.005, within 0.01 threshold
    const result = compareSkills(a, b);
    expect(result.winner).toBe('a'); // A used fewer tokens
  });

  it('should prefer B when B uses fewer tokens in a tie', () => {
    const a = makeResult({ f1: 0.80, tokenCount: 800 }, 'a.md');
    const b = makeResult({ f1: 0.80, tokenCount: 400 }, 'b.md');

    const result = compareSkills(a, b);
    expect(result.winner).toBe('b');
  });
});
