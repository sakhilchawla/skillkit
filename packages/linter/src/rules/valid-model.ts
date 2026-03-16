import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

const MODEL_PATTERNS = [
  /^claude-/,
  /^gpt-/,
  /^gemini-/,
  /^o[1-9]/,
  /^codex-/,
  /^sonnet$/,
  /^opus$/,
  /^haiku$/,
];

/** Model field must match a recognized model ID pattern */
export const validModel: LintRule = {
  id: 'valid-model',
  description: 'Model field should match a known model ID pattern',
  severity: LintSeverity.INFO,
  category: LintCategory.SPEC,
  check(ctx: LintContext): LintResult[] {
    const model = ctx.frontmatter['model'];
    if (!model || typeof model !== 'string') return [];

    const matches = MODEL_PATTERNS.some((p) => p.test(model));
    if (!matches) {
      return [{
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: `Unrecognized model: "${model}"`,
        suggestion: 'Use a model ID like claude-sonnet-4-6, gpt-4o, or gemini-2.0-flash',
      }];
    }
    return [];
  },
};
