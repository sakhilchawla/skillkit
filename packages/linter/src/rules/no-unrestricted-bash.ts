import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

/** Warn when Bash is in allowed-tools without safety constraints in the body */
export const noUnrestrictedBash: LintRule = {
  id: 'no-unrestricted-bash',
  description: 'Skills with Bash access should mention safety constraints',
  severity: LintSeverity.WARN,
  category: LintCategory.SECURITY,
  check(ctx: LintContext): LintResult[] {
    const tools = ctx.frontmatter['allowed-tools'];
    if (!tools || typeof tools !== 'string') return [];
    if (!tools.includes('Bash')) return [];

    const safetyTerms = /\b(do not|never|avoid|don't|must not|forbidden|restrict|safe|careful|confirm|dangerous)\b/i;
    if (!safetyTerms.test(ctx.body)) {
      return [{
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: 'Skill has Bash access but body contains no safety constraints',
        suggestion: 'Add instructions about what commands are forbidden or require confirmation',
      }];
    }
    return [];
  },
};
