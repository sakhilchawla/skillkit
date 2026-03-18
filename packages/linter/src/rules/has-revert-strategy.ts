import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

const REVERT_PATTERNS = [
  /git\s+reset\s+(--hard\s+)?HEAD/i,
  /git\s+reset\b/i,
  /git\s+revert\b/i,
  /restore.*backup/i,
  /rollback/i,
  /undo.*commit/i,
  /discard.*change/i,
];

export const hasRevertStrategy: LintRule = {
  id: 'has-revert-strategy',
  description: 'Research skills must define how to undo a failed experiment',
  severity: LintSeverity.ERROR,
  category: LintCategory.SECURITY,
  check(ctx: LintContext): LintResult[] {
    const found = REVERT_PATTERNS.some((p) => p.test(ctx.body));

    if (!found) {
      return [{
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: 'No revert strategy found — skill must define how to undo failed experiments',
        suggestion: 'Add instructions like "If the result is worse, run git reset --hard HEAD~1 to revert"',
      }];
    }

    return [];
  },
};
