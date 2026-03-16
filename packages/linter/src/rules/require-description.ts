import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

const MIN_DESCRIPTION_LENGTH = 20;

/** Skill must have a meaningful description (>= 20 chars) */
export const requireDescription: LintRule = {
  id: 'require-description',
  description: 'Skills must have a description of at least 20 characters',
  severity: LintSeverity.ERROR,
  category: LintCategory.SPEC,
  check(ctx: LintContext): LintResult[] {
    const desc = ctx.frontmatter['description'];
    if (!desc || (typeof desc === 'string' && desc.trim() === '')) {
      return [{
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: 'Missing required field: description',
        suggestion: 'Add a description explaining what this skill does',
      }];
    }
    if (typeof desc === 'string' && desc.length < MIN_DESCRIPTION_LENGTH) {
      return [{
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: `Description too short (${desc.length} chars, minimum ${MIN_DESCRIPTION_LENGTH})`,
        suggestion: 'Write a more descriptive explanation of what the skill does',
      }];
    }
    return [];
  },
};
