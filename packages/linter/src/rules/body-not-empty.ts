import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

/** Skill body should have meaningful content */
export const bodyNotEmpty: LintRule = {
  id: 'body-not-empty',
  description: 'Skill body should contain substantial instructions (>50 chars)',
  severity: LintSeverity.WARN,
  category: LintCategory.BEST_PRACTICE,
  check(ctx: LintContext): LintResult[] {
    if (!ctx.body || ctx.body.trim().length < 50) {
      return [{
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: `Skill body is too short (${ctx.body?.trim().length ?? 0} chars)`,
        suggestion: 'Add detailed instructions, steps, and examples to the skill body',
      }];
    }
    return [];
  },
};
