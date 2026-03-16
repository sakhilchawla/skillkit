import { describe, it, expect } from 'vitest';
import type { SkillParseResult } from '@skillkit/core';
import { LintEngine } from '../engine.js';
import { LintSeverity } from '../types.js';

/** Build a minimal SkillParseResult for engine tests */
function makeParsed(overrides: {
  frontmatter?: Record<string, unknown>;
  body?: string;
  lineCount?: number;
  estimatedTokens?: number;
}): SkillParseResult {
  const frontmatter = overrides.frontmatter ?? {
    name: 'test-skill',
    description: 'Generate unit tests for a TypeScript module',
  };
  const body =
    overrides.body ??
    '# Test Skill\n\n## Usage\n\nRun this skill to generate comprehensive tests for any module.\n\nNever delete production data.';
  return {
    skill: {
      frontmatter: frontmatter as unknown as SkillParseResult['skill']['frontmatter'],
      body,
      raw: `---\n${Object.entries(frontmatter)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')}\n---\n${body}`,
    },
    metadata: {
      filePath: '<test>',
      lineCount: overrides.lineCount ?? 10,
      frontmatterLineCount: 4,
      bodyLineCount: 6,
      estimatedTokens: overrides.estimatedTokens ?? 100,
    },
    errors: [],
  };
}

describe('LintEngine', () => {
  it('reports no issues for a valid skill with recommended preset', () => {
    const engine = new LintEngine({ preset: 'recommended' });
    const report = engine.lint(makeParsed({}));
    expect(report.errorCount).toBe(0);
    expect(report.warnCount).toBe(0);
  });

  it('reports errors for a skill with missing name', () => {
    const engine = new LintEngine({ preset: 'recommended' });
    const report = engine.lint(
      makeParsed({
        frontmatter: { description: 'Generate tests for modules' },
      }),
    );
    expect(report.errorCount).toBeGreaterThanOrEqual(1);
    expect(report.results.some((r) => r.ruleId === 'require-name')).toBe(true);
  });

  it('minimal preset does not flag best-practice issues', () => {
    const engine = new LintEngine({ preset: 'minimal' });
    // Short body would normally trigger body-not-empty (best-practice)
    const report = engine.lint(
      makeParsed({
        body: 'Short.',
      }),
    );
    const bestPracticeResults = report.results.filter(
      (r) => r.ruleId === 'body-not-empty',
    );
    expect(bestPracticeResults).toHaveLength(0);
  });

  it('respects rule overrides in config', () => {
    const engine = new LintEngine({
      preset: 'recommended',
      rules: { 'require-name': LintSeverity.WARN },
    });
    const report = engine.lint(
      makeParsed({
        frontmatter: { description: 'Generate tests for modules' },
      }),
    );
    const nameResult = report.results.find((r) => r.ruleId === 'require-name');
    expect(nameResult).toBeDefined();
    expect(nameResult!.severity).toBe(LintSeverity.WARN);
  });

  it('can turn off rules with "off"', () => {
    const engine = new LintEngine({
      preset: 'recommended',
      rules: { 'require-name': 'off' },
    });
    const report = engine.lint(
      makeParsed({
        frontmatter: { description: 'Generate tests for modules' },
      }),
    );
    expect(report.results.some((r) => r.ruleId === 'require-name')).toBe(false);
  });

  it('sorts results by severity (errors first)', () => {
    const engine = new LintEngine({ preset: 'strict' });
    // Missing name (error) + no body (warn) + vague description (info)
    const report = engine.lint(
      makeParsed({
        frontmatter: { description: 'A skill that does things' },
        body: '',
      }),
    );
    // Verify there are mixed severities
    const severities = report.results.map((r) => r.severity);
    const hasError = severities.includes(LintSeverity.ERROR);
    const hasNonError =
      severities.includes(LintSeverity.WARN) || severities.includes(LintSeverity.INFO);

    if (hasError && hasNonError) {
      // All errors should come before non-errors
      const firstNonErrorIdx = severities.findIndex((s) => s !== LintSeverity.ERROR);
      const lastErrorIdx = severities.lastIndexOf(LintSeverity.ERROR);
      expect(lastErrorIdx).toBeLessThan(firstNonErrorIdx);
    }

    // Also verify counts are consistent
    expect(report.errorCount).toBe(severities.filter((s) => s === LintSeverity.ERROR).length);
    expect(report.warnCount).toBe(severities.filter((s) => s === LintSeverity.WARN).length);
    expect(report.infoCount).toBe(severities.filter((s) => s === LintSeverity.INFO).length);
  });

  it('uses filePath from parsed result', () => {
    const engine = new LintEngine({ preset: 'recommended' });
    const parsed = makeParsed({});
    parsed.skill.filePath = '/some/path/SKILL.md';
    const report = engine.lint(parsed);
    expect(report.filePath).toBe('/some/path/SKILL.md');
  });

  it('defaults filePath to "<inline>" when not set', () => {
    const engine = new LintEngine({ preset: 'recommended' });
    const parsed = makeParsed({});
    delete parsed.skill.filePath;
    const report = engine.lint(parsed);
    expect(report.filePath).toBe('<inline>');
  });
});
