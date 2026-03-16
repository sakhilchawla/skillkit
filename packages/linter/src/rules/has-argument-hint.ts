import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

/** User-invocable skills should have an argument-hint */
export const hasArgumentHint: LintRule = {
  id: 'has-argument-hint',
  description: 'User-invocable skills should provide an argument-hint',
  severity: LintSeverity.INFO,
  category: LintCategory.BEST_PRACTICE,
  check(ctx: LintContext): LintResult[] {
    const invocable = ctx.frontmatter['user-invocable'];
    if (invocable !== true) return [];

    const hint = ctx.frontmatter['argument-hint'];
    if (!hint || (typeof hint === 'string' && hint.trim() === '')) {
      return [{
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: 'User-invocable skill has no argument-hint',
        suggestion: 'Add argument-hint: "<description of expected arguments>"',
      }];
    }
    return [];
  },
};
