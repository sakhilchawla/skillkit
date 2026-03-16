import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

const MAX_TOKENS = 5000;

/** Warn if skill body exceeds a reasonable token budget */
export const reasonableTokenEstimate: LintRule = {
  id: 'reasonable-token-estimate',
  description: `Skill body should not exceed ~${MAX_TOKENS} tokens`,
  severity: LintSeverity.WARN,
  category: LintCategory.PERFORMANCE,
  check(ctx: LintContext): LintResult[] {
    if (ctx.metadata.estimatedTokens > MAX_TOKENS) {
      return [{
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: `Skill body is ~${ctx.metadata.estimatedTokens} tokens (recommended max: ${MAX_TOKENS})`,
        suggestion: 'Consider splitting into multiple skills or moving reference material to separate files',
      }];
    }
    return [];
  },
};
