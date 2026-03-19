import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runBenchmark, runComparison } from '../runner.js';
import type { BenchmarkConfig, BenchmarkRunOptions } from '../types.js';

// Mock the invokeSkill function from test-harness
vi.mock('@skillkit-llm/test-harness', () => ({
  invokeSkill: vi.fn(),
}));

import { invokeSkill } from '@skillkit-llm/test-harness';
const mockInvokeSkill = vi.mocked(invokeSkill);

beforeEach(() => {
  mockInvokeSkill.mockReset();
});

// Valid skill file path for mock mode tests
const REVIEW_SKILL = new URL(
  '../../../../examples/review/SKILL.md',
  import.meta.url,
).pathname;

const GROUND_TRUTH = {
  expectedFindings: [
    { file: 'app.ts', type: 'security', description: 'SQL injection' },
  ],
  cleanFiles: ['utils.ts'],
};

describe('runBenchmark', () => {
  describe('mock mode (default)', () => {
    it('runs in mock mode by default', async () => {
      const config: BenchmarkConfig = {
        name: 'test bench',
        skillPath: REVIEW_SKILL,
        groundTruth: GROUND_TRUTH,
      };

      const result = await runBenchmark(config);
      expect(result.skillPath).toContain('review/SKILL.md');
      expect(result.scores).toBeDefined();
      expect(result.scores.precision).toBeGreaterThanOrEqual(0);
      expect(result.scores.recall).toBeGreaterThanOrEqual(0);
      expect(result.output.length).toBeGreaterThan(0);
      expect(result.runDetails).toHaveLength(1);
    });

    it('averages scores across multiple runs', async () => {
      const config: BenchmarkConfig = {
        name: 'multi-run bench',
        skillPath: REVIEW_SKILL,
        groundTruth: GROUND_TRUTH,
        runs: 3,
      };

      const result = await runBenchmark(config);
      expect(result.runDetails).toHaveLength(3);
      // All mock runs produce identical scores (deterministic)
      expect(result.runDetails[0].precision).toBe(result.runDetails[1].precision);
      expect(result.runDetails[1].precision).toBe(result.runDetails[2].precision);
    });

    it('does not call invokeSkill in mock mode', async () => {
      const config: BenchmarkConfig = {
        name: 'mock only',
        skillPath: REVIEW_SKILL,
        groundTruth: GROUND_TRUTH,
      };

      await runBenchmark(config);
      expect(mockInvokeSkill).not.toHaveBeenCalled();
    });
  });

  describe('real mode', () => {
    it('throws if no invoker config provided', async () => {
      const config: BenchmarkConfig = {
        name: 'real without invoker',
        skillPath: REVIEW_SKILL,
        groundTruth: GROUND_TRUTH,
      };

      const options: BenchmarkRunOptions = { mock: false };

      await expect(runBenchmark(config, options)).rejects.toThrow(
        'Real mode requires invoker configuration',
      );
    });

    it('calls invokeSkill with correct arguments in real mode', async () => {
      mockInvokeSkill.mockResolvedValue({
        output: '[CRITICAL] SQL injection found in app.ts\n',
        stderr: '',
        exitCode: 0,
        completed: true,
        duration: 5000,
      });

      const config: BenchmarkConfig = {
        name: 'real bench',
        skillPath: REVIEW_SKILL,
        groundTruth: GROUND_TRUTH,
        invoke: '/review main',
      };

      const options: BenchmarkRunOptions = {
        mock: false,
        invoker: { provider: 'claude-code', timeout: 60000 },
      };

      const result = await runBenchmark(config, options);

      expect(mockInvokeSkill).toHaveBeenCalledWith(
        expect.stringContaining('review/SKILL.md'),
        '/review main',
        expect.objectContaining({
          provider: 'claude-code',
          timeout: 60000,
        }),
      );

      // Real output should be scored
      expect(result.scores.truePositives).toBe(1);
      expect(result.scores.recall).toBe(1.0);
      expect(result.scores.duration).toBe(5000);
      expect(result.output).toContain('SQL injection');
    });

    it('passes corpus as cwd to invoker', async () => {
      mockInvokeSkill.mockResolvedValue({
        output: 'No issues found.',
        stderr: '',
        exitCode: 0,
        completed: true,
        duration: 3000,
      });

      const config: BenchmarkConfig = {
        name: 'corpus bench',
        skillPath: REVIEW_SKILL,
        groundTruth: GROUND_TRUTH,
        corpus: '/tmp/test-corpus',
      };

      const options: BenchmarkRunOptions = {
        mock: false,
        invoker: { provider: 'claude-code' },
      };

      await runBenchmark(config, options);

      expect(mockInvokeSkill).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          cwd: '/tmp/test-corpus',
        }),
      );
    });

    it('throws on timeout', async () => {
      mockInvokeSkill.mockResolvedValue({
        output: '',
        stderr: 'Timed out',
        exitCode: 1,
        completed: false,
        duration: 120000,
      });

      const config: BenchmarkConfig = {
        name: 'timeout bench',
        skillPath: REVIEW_SKILL,
        groundTruth: GROUND_TRUTH,
      };

      const options: BenchmarkRunOptions = {
        mock: false,
        invoker: { provider: 'claude-code' },
      };

      await expect(runBenchmark(config, options)).rejects.toThrow('timed out or failed');
    });

    it('averages real mode runs correctly', async () => {
      let callCount = 0;
      mockInvokeSkill.mockImplementation(async () => {
        callCount++;
        const hasInjection = callCount <= 2; // First 2 runs find it, 3rd doesn't
        return {
          output: hasInjection
            ? '[CRITICAL] SQL injection found in app.ts'
            : 'Code looks clean.',
          stderr: '',
          exitCode: 0,
          completed: true,
          duration: 4000 + callCount * 1000,
        };
      });

      const config: BenchmarkConfig = {
        name: 'multi-run real',
        skillPath: REVIEW_SKILL,
        groundTruth: GROUND_TRUTH,
        runs: 3,
      };

      const options: BenchmarkRunOptions = {
        mock: false,
        invoker: { provider: 'claude-code' },
      };

      const result = await runBenchmark(config, options);

      expect(result.runDetails).toHaveLength(3);
      // First 2 runs: recall 1.0, third: recall 0.0 → average ~0.667
      expect(result.scores.recall).toBeCloseTo(2 / 3, 2);
      // Duration averaged: (5000 + 6000 + 7000) / 3 = 6000
      expect(result.scores.duration).toBe(6000);
    });
  });
});

describe('runComparison', () => {
  it('throws without compareWith', async () => {
    const config: BenchmarkConfig = {
      name: 'no compare',
      skillPath: REVIEW_SKILL,
      groundTruth: GROUND_TRUTH,
    };

    await expect(runComparison(config)).rejects.toThrow('compareWith');
  });

  it('compares two skills in mock mode', async () => {
    const config: BenchmarkConfig = {
      name: 'comparison',
      skillPath: REVIEW_SKILL,
      groundTruth: GROUND_TRUTH,
      compareWith: REVIEW_SKILL, // same skill for testing
    };

    const result = await runComparison(config);
    expect(result.a.skillPath).toContain('review/SKILL.md');
    expect(result.b.skillPath).toContain('review/SKILL.md');
    expect(result.winner).toBe('tie');
  });

  it('passes run options to both skills in real mode comparison', async () => {
    mockInvokeSkill.mockResolvedValue({
      output: '[CRITICAL] SQL injection found in app.ts',
      stderr: '',
      exitCode: 0,
      completed: true,
      duration: 3000,
    });

    const config: BenchmarkConfig = {
      name: 'real comparison',
      skillPath: REVIEW_SKILL,
      groundTruth: GROUND_TRUTH,
      compareWith: REVIEW_SKILL,
    };

    const options: BenchmarkRunOptions = {
      mock: false,
      invoker: { provider: 'claude-code' },
    };

    const result = await runComparison(config, options);
    // Both should have been invoked
    expect(mockInvokeSkill).toHaveBeenCalledTimes(2);
    expect(result.winner).toBe('tie'); // same output
  });
});
