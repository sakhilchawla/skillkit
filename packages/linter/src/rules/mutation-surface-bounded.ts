import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

const ALLOW_PATTERNS = [
  /(?:only|may|can|should)\s+(?:modify|edit|change|touch)\s*[:\-]?\s*([^\n.]+)/gi,
  /mutable\s*(?:files?)?[:\-]\s*([^\n]+)/gi,
  /mutation\s*surface[:\-]\s*([^\n]+)/gi,
];

const DENY_PATTERNS = [
  /(?:do\s+not|don'?t|never|must\s+not|cannot|should\s+not)\s+(?:modify|edit|change|touch)\s*[:\-]?\s*([^\n.]+)/gi,
  /frozen\s*(?:files?)?[:\-]\s*([^\n]+)/gi,
  /(?:read[- ]only|immutable|off[- ]limits)[:\-]\s*([^\n]+)/gi,
];

export const mutationSurfaceBounded: LintRule = {
  id: 'mutation-surface-bounded',
  description: 'Research skills must declare which files the agent may and may not modify',
  severity: LintSeverity.ERROR,
  category: LintCategory.SECURITY,
  check(ctx: LintContext): LintResult[] {
    const hasAllow = ALLOW_PATTERNS.some((p) => {
      p.lastIndex = 0;
      return p.test(ctx.body);
    });
    const hasDeny = DENY_PATTERNS.some((p) => {
      p.lastIndex = 0;
      return p.test(ctx.body);
    });

    if (!hasAllow && !hasDeny) {
      return [{
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: 'No mutation boundaries defined — skill should declare which files the agent may edit',
        suggestion: 'Add "Mutable files: train.py" and "Frozen files: prepare.py, evaluate.py" sections',
      }];
    }

    if (hasAllow && !hasDeny) {
      return [{
        ruleId: this.id,
        severity: LintSeverity.WARN,
        category: this.category,
        message: 'Mutable files declared but no frozen/off-limits files specified',
        suggestion: 'Also declare which files the agent must NOT modify for safety',
      }];
    }

    return [];
  },
};
