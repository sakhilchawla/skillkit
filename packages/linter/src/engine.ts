import { parseSkillFile } from '@skillkit/core';
import type { SkillParseResult } from '@skillkit/core';
import type { LintConfig, LintContext, LintReport, LintResult, LintRule } from './types.js';
import { LintSeverity } from './types.js';
import { allRules } from './rules/index.js';
import { getPreset } from './presets/index.js';

/**
 * Lint engine that validates SKILL.md files against configured rules.
 *
 * @example
 * ```ts
 * const engine = new LintEngine({ preset: 'recommended' });
 * const report = await engine.lintFile('path/to/SKILL.md');
 * console.log(report.errorCount); // 0
 * ```
 */
export class LintEngine {
  private rules: LintRule[];
  private overrides: Record<string, LintSeverity | 'off'>;

  constructor(config: LintConfig = { preset: 'recommended' }) {
    const presetOverrides = getPreset(config.preset);
    this.overrides = { ...presetOverrides, ...config.rules };
    this.rules = allRules;
  }

  /** Lint a pre-parsed skill */
  lint(parsed: SkillParseResult): LintReport {
    const ctx: LintContext = {
      frontmatter: parsed.skill.frontmatter as unknown as Record<string, unknown>,
      body: parsed.skill.body,
      filePath: parsed.skill.filePath,
      metadata: {
        lineCount: parsed.metadata.lineCount,
        estimatedTokens: parsed.metadata.estimatedTokens,
      },
    };

    const results: LintResult[] = [];

    for (const rule of this.rules) {
      const override = this.overrides[rule.id];
      if (override === 'off') continue;

      const ruleResults = rule.check(ctx);
      for (const result of ruleResults) {
        results.push({
          ...result,
          severity: override ?? result.severity,
        });
      }
    }

    // Sort: errors first, then warnings, then info
    const severityOrder = { error: 0, warn: 1, info: 2 };
    results.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );

    return {
      filePath: parsed.skill.filePath ?? '<inline>',
      results,
      errorCount: results.filter((r) => r.severity === LintSeverity.ERROR).length,
      warnCount: results.filter((r) => r.severity === LintSeverity.WARN).length,
      infoCount: results.filter((r) => r.severity === LintSeverity.INFO).length,
    };
  }

  /** Read and lint a SKILL.md file from disk */
  async lintFile(filePath: string): Promise<LintReport> {
    const parsed = await parseSkillFile(filePath);
    const report = this.lint(parsed);
    return { ...report, filePath };
  }
}
