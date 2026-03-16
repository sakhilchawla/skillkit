import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

const DESTRUCTIVE_PATTERNS = [
  { pattern: /\brm\s+-rf\b/g, label: 'rm -rf (recursive force delete)' },
  { pattern: /\bDROP\s+(TABLE|DATABASE)\b/gi, label: 'DROP TABLE/DATABASE' },
  { pattern: /\bgit\s+push\s+--force\b/g, label: 'git push --force' },
  { pattern: /\bgit\s+reset\s+--hard\b/g, label: 'git reset --hard' },
  { pattern: /\bgit\s+clean\s+-fd/g, label: 'git clean -fd' },
  { pattern: /\bTRUNCATE\s+TABLE\b/gi, label: 'TRUNCATE TABLE' },
  { pattern: /\bmkfs\b/g, label: 'mkfs (format filesystem)' },
  { pattern: /\bdd\s+if=/g, label: 'dd (disk write)' },
];

/** Flag destructive commands that could cause irreversible damage */
export const noDestructiveCommands: LintRule = {
  id: 'no-destructive-commands',
  description: 'Skill should not instruct use of destructive commands without safeguards',
  severity: LintSeverity.WARN,
  category: LintCategory.SECURITY,
  check(ctx: LintContext): LintResult[] {
    const results: LintResult[] = [];
    for (const { pattern, label } of DESTRUCTIVE_PATTERNS) {
      if (pattern.test(ctx.body)) {
        results.push({
          ruleId: this.id,
          severity: this.severity,
          category: this.category,
          message: `Destructive command found: ${label}`,
          suggestion: 'Add confirmation step before destructive operations or use safer alternatives',
        });
      }
      pattern.lastIndex = 0;
    }
    return results;
  },
};
