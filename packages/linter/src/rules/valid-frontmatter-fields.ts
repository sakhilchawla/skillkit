import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';
import { isValidFrontmatterField } from '@skillkit/core';

/** All frontmatter fields must be recognized by the Agent Skills spec */
export const validFrontmatterFields: LintRule = {
  id: 'valid-frontmatter-fields',
  description: 'Frontmatter should only contain fields defined in the Agent Skills spec',
  severity: LintSeverity.WARN,
  category: LintCategory.SPEC,
  check(ctx: LintContext): LintResult[] {
    const results: LintResult[] = [];
    for (const field of Object.keys(ctx.frontmatter)) {
      if (!isValidFrontmatterField(field)) {
        results.push({
          ruleId: this.id,
          severity: this.severity,
          category: this.category,
          message: `Unknown frontmatter field: "${field}"`,
          suggestion: `Remove "${field}" or check the Agent Skills spec for valid fields`,
        });
      }
    }
    return results;
  },
};
