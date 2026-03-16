import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

const VAGUE_STARTS = [
  /^a skill/i,
  /^this skill/i,
  /^a tool/i,
  /^this is/i,
  /^helper/i,
  /^utility/i,
  /^misc/i,
];

/** Description should be actionable, not vague */
export const descriptionQuality: LintRule = {
  id: 'description-quality',
  description: 'Skill description should be actionable and specific',
  severity: LintSeverity.INFO,
  category: LintCategory.BEST_PRACTICE,
  check(ctx: LintContext): LintResult[] {
    const desc = ctx.frontmatter['description'];
    if (!desc || typeof desc !== 'string') return [];

    const results: LintResult[] = [];
    for (const pattern of VAGUE_STARTS) {
      if (pattern.test(desc.trim())) {
        results.push({
          ruleId: this.id,
          severity: this.severity,
          category: this.category,
          message: 'Description starts with a vague phrase',
          suggestion: 'Start with a verb: "Review code for...", "Generate tests...", "Scaffold a new..."',
        });
        break;
      }
    }
    return results;
  },
};
