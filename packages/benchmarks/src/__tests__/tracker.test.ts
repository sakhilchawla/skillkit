import { describe, it, expect } from 'vitest';
import { checkRegression } from '../tracker/tracker.js';
import type { Baseline, BenchmarkScores } from '../types.js';

describe('checkRegression', () => {
  function makeScores(overrides: Partial<BenchmarkScores> = {}): BenchmarkScores {
    return {
      precision: 0.9,
      recall: 0.9,
      f1: 0.9,
      truePositives: 9,
      falsePositives: 1,
      falseNegatives: 1,
      tokenCount: 500,
      duration: 100,
      ...overrides,
    };
  }

  function makeBaseline(overrides: Partial<BenchmarkScores> = {}): Baseline {
    return {
      skillPath: 'skill.md',
      scores: makeScores(overrides),
      timestamp: '2025-01-01T00:00:00.000Z',
    };
  }

  it('should report no regression when scores are above baseline', () => {
    const baseline = makeBaseline({ precision: 0.85, recall: 0.85, f1: 0.85 });
    const current = makeScores({ precision: 0.90, recall: 0.90, f1: 0.90 });

    const result = checkRegression(current, baseline);
    expect(result.regressed).toBe(false);
    expect(result.regressions).toHaveLength(0);
  });

  it('should detect regression when precision drops beyond threshold', () => {
    const baseline = makeBaseline({ precision: 0.90 });
    const current = makeScores({ precision: 0.80 }); // 10% drop > 5% threshold

    const result = checkRegression(current, baseline);
    expect(result.regressed).toBe(true);
    expect(result.regressions).toHaveLength(1);
    expect(result.regressions[0].metric).toBe('precision');
    expect(result.regressions[0].delta).toBeCloseTo(0.10);
  });

  it('should detect regression when recall drops beyond threshold', () => {
    const baseline = makeBaseline({ recall: 0.95 });
    const current = makeScores({ recall: 0.85 }); // 10% drop > 5% threshold

    const result = checkRegression(current, baseline);
    expect(result.regressed).toBe(true);
    expect(result.regressions.some((r) => r.metric === 'recall')).toBe(true);
  });

  it('should respect custom thresholds', () => {
    const baseline = makeBaseline({ precision: 0.90 });
    const current = makeScores({ precision: 0.80 }); // 10% drop

    // With a 15% threshold, 10% drop should NOT be a regression
    const result = checkRegression(current, baseline, { precision: 0.15 });
    expect(result.regressed).toBe(false);
  });

  it('should detect multiple simultaneous regressions', () => {
    const baseline = makeBaseline({ precision: 0.90, recall: 0.90, f1: 0.90 });
    const current = makeScores({ precision: 0.75, recall: 0.75, f1: 0.75 });

    const result = checkRegression(current, baseline);
    expect(result.regressed).toBe(true);
    expect(result.regressions).toHaveLength(3);
    expect(result.regressions.map((r) => r.metric).sort()).toEqual([
      'f1',
      'precision',
      'recall',
    ]);
  });

  it('should not regress when drop is within threshold', () => {
    const baseline = makeBaseline({ precision: 0.90, recall: 0.90, f1: 0.90 });
    // Drops of 3%, 4%, 2% — all within default thresholds (5%, 5%, 3%)
    const current = makeScores({ precision: 0.87, recall: 0.86, f1: 0.88 });

    const result = checkRegression(current, baseline);
    expect(result.regressed).toBe(false);
  });
});
