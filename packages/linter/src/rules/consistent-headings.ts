import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

/** Markdown headings should not skip levels (e.g., h1 → h3) */
export const consistentHeadings: LintRule = {
  id: 'consistent-headings',
  description: 'Markdown headings should not skip levels',
  severity: LintSeverity.INFO,
  category: LintCategory.BEST_PRACTICE,
  check(ctx: LintContext): LintResult[] {
    const headingRegex = /^(#{1,6})\s/gm;
    const results: LintResult[] = [];
    let prevLevel = 0;
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(ctx.body)) !== null) {
      const level = match[1].length;
      if (prevLevel > 0 && level > prevLevel + 1) {
        const line = ctx.body.substring(0, match.index).split('\n').length;
        results.push({
          ruleId: this.id,
          severity: this.severity,
          category: this.category,
          message: `Heading jumps from h${prevLevel} to h${level}`,
          line,
          suggestion: `Use h${prevLevel + 1} instead of h${level} for proper nesting`,
        });
      }
      prevLevel = level;
    }
    return results;
  },
};
