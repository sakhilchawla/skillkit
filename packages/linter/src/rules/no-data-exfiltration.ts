import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

const EXFIL_PATTERNS = [
  { pattern: /\bcurl\s+.*https?:\/\//g, label: 'curl to external URL' },
  { pattern: /\bwget\s+/g, label: 'wget command' },
  { pattern: /\bfetch\s*\(\s*['"]https?:\/\//g, label: 'fetch() to external URL' },
  { pattern: /\bnc\s+-/g, label: 'netcat (nc) command' },
  { pattern: /\bscp\s+/g, label: 'scp file transfer' },
];

/** Flag patterns that could exfiltrate data to external servers */
export const noDataExfiltration: LintRule = {
  id: 'no-data-exfiltration',
  description: 'Skill should not contain commands that send data to external servers',
  severity: LintSeverity.ERROR,
  category: LintCategory.SECURITY,
  check(ctx: LintContext): LintResult[] {
    const results: LintResult[] = [];
    for (const { pattern, label } of EXFIL_PATTERNS) {
      if (pattern.test(ctx.body)) {
        results.push({
          ruleId: this.id,
          severity: this.severity,
          category: this.category,
          message: `Potential data exfiltration: ${label}`,
          suggestion: 'Remove external network commands or document why they are necessary',
        });
      }
      pattern.lastIndex = 0;
    }
    return results;
  },
};
