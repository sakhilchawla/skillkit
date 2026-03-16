import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

const HARDCODED_PATH_PATTERNS = [
  { pattern: /\/Users\/\w+/g, label: 'macOS home directory' },
  { pattern: /\/home\/\w+/g, label: 'Linux home directory' },
  { pattern: /C:\\Users\\\w+/g, label: 'Windows home directory' },
  { pattern: /\/var\/www\//g, label: '/var/www/ server path' },
  { pattern: /\/opt\/\w+/g, label: '/opt/ installation path' },
];

/** Flag absolute paths that won't work on other machines */
export const noHardcodedPaths: LintRule = {
  id: 'no-hardcoded-paths',
  description: 'Skill body should not contain hardcoded absolute paths',
  severity: LintSeverity.WARN,
  category: LintCategory.BEST_PRACTICE,
  check(ctx: LintContext): LintResult[] {
    const results: LintResult[] = [];
    for (const { pattern, label } of HARDCODED_PATH_PATTERNS) {
      const match = pattern.exec(ctx.body);
      if (match) {
        results.push({
          ruleId: this.id,
          severity: this.severity,
          category: this.category,
          message: `Hardcoded path found: ${match[0]} (${label})`,
          suggestion: 'Use relative paths or environment variables instead',
        });
      }
      pattern.lastIndex = 0;
    }
    return results;
  },
};
