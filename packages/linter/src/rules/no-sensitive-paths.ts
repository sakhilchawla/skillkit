import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

const SENSITIVE_PATTERNS = [
  { pattern: /~\/\.ssh/g, label: '~/.ssh (SSH keys)' },
  { pattern: /~\/\.aws/g, label: '~/.aws (AWS credentials)' },
  { pattern: /~\/\.gnupg/g, label: '~/.gnupg (GPG keys)' },
  { pattern: /\.env\b/g, label: '.env (environment secrets)' },
  { pattern: /\/etc\/passwd/g, label: '/etc/passwd' },
  { pattern: /\/etc\/shadow/g, label: '/etc/shadow' },
  { pattern: /credentials\.json/g, label: 'credentials.json' },
  { pattern: /\.pem\b/g, label: '.pem (certificates/keys)' },
];

/** Flag references to sensitive file paths that could expose secrets */
export const noSensitivePaths: LintRule = {
  id: 'no-sensitive-paths',
  description: 'Skill body should not reference sensitive file paths',
  severity: LintSeverity.ERROR,
  category: LintCategory.SECURITY,
  check(ctx: LintContext): LintResult[] {
    const results: LintResult[] = [];
    for (const { pattern, label } of SENSITIVE_PATTERNS) {
      if (pattern.test(ctx.body)) {
        results.push({
          ruleId: this.id,
          severity: this.severity,
          category: this.category,
          message: `Skill references sensitive path: ${label}`,
          suggestion: 'Remove references to sensitive paths or use environment variables instead',
        });
      }
      pattern.lastIndex = 0; // Reset regex state
    }
    return results;
  },
};
