import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

const BUDGET_PATTERNS = [
  /time[_\s-]?budget/i,
  /timeout|time[_\s-]?limit/i,
  /\d+\s*(seconds?|minutes?|hours?)\s*(budget|limit|max|timeout)/i,
  /(budget|limit|max|timeout)\s*[:=]?\s*\d+\s*(seconds?|minutes?|hours?|s|m|h)\b/i,
  /max[_\s-]?(iterations?|experiments?|runs?|steps?|attempts?)/i,
  /maximum\s+(?:of\s+)?\d+\s*(iterations?|experiments?|runs?|steps?|attempts?)/i,
  /kill.{0,30}exceed/i,
  /abort.{0,30}(time|budget|limit)/i,
];

export const hasResourceBudget: LintRule = {
  id: 'has-resource-budget',
  description: 'Research skills must define time, compute, or iteration limits',
  severity: LintSeverity.ERROR,
  category: LintCategory.SECURITY,
  check(ctx: LintContext): LintResult[] {
    const found = BUDGET_PATTERNS.some((p) => p.test(ctx.body));

    if (!found) {
      return [{
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: 'No resource budget defined — skill must specify time, compute, or iteration limits',
        suggestion: 'Add a budget like "Time budget: 5 minutes per run" or "Maximum iterations: 100"',
      }];
    }

    return [];
  },
};
