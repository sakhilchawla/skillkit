import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

/** Skill must have a non-empty `name` field in frontmatter */
export const requireName: LintRule = {
  id: 'require-name',
  description: 'Skills must have a name field in frontmatter',
  severity: LintSeverity.ERROR,
  category: LintCategory.SPEC,
  check(ctx: LintContext): LintResult[] {
    const name = ctx.frontmatter['name'];
    if (!name || (typeof name === 'string' && name.trim() === '')) {
      return [{
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: 'Missing required field: name',
        suggestion: 'Add a name field to the YAML frontmatter: name: my-skill',
      }];
    }
    if (typeof name !== 'string') {
      return [{
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: `Field "name" must be a string, got ${typeof name}`,
        suggestion: 'Ensure the name field is an unquoted or quoted string',
      }];
    }
    return [];
  },
};
