import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

const PUSH_PATTERN = /git\s+push/gi;
const NEVER_PUSH_PATTERN = /never\s+(run\s+)?git\s+push|do\s+not\s+(run\s+)?git\s+push|don'?t\s+(run\s+)?git\s+push/i;

export const noRemotePush: LintRule = {
  id: 'no-remote-push',
  description: 'Research loop skills should not push to remote during autonomous execution',
  severity: LintSeverity.WARN,
  category: LintCategory.SECURITY,
  check(ctx: LintContext): LintResult[] {
    const hasPushMention = PUSH_PATTERN.test(ctx.body);
    PUSH_PATTERN.lastIndex = 0;

    if (!hasPushMention) {
      // No mention of git push at all — not necessarily a problem,
      // but worth noting that the skill should explicitly forbid it
      return [{
        ruleId: this.id,
        severity: LintSeverity.INFO,
        category: this.category,
        message: 'Skill does not mention git push — consider explicitly forbidding it for safety',
        suggestion: 'Add "NEVER run git push during the experiment loop" to the safety rules',
      }];
    }

    // git push is mentioned — check if it's in a prohibition context
    const hasProhibition = NEVER_PUSH_PATTERN.test(ctx.body);

    if (!hasProhibition) {
      return [{
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: 'Skill mentions git push without explicit prohibition — autonomous agents should not push during experiment loops',
        suggestion: 'Add "NEVER run git push" to the safety rules, or move push to a manual finalization step',
      }];
    }

    return [];
  },
};
