import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';
import { parseAllowedTools, isKnownTool } from '@skillkit-llm/core';

/** allowed-tools must be comma-separated known tool names */
export const validAllowedTools: LintRule = {
  id: 'valid-allowed-tools',
  description: 'allowed-tools must contain recognized tool names',
  severity: LintSeverity.WARN,
  category: LintCategory.SPEC,
  check(ctx: LintContext): LintResult[] {
    const raw = ctx.frontmatter['allowed-tools'];
    if (!raw || typeof raw !== 'string') return [];

    const tools = parseAllowedTools(raw);
    const results: LintResult[] = [];
    for (const tool of tools) {
      if (!isKnownTool(tool)) {
        results.push({
          ruleId: this.id,
          severity: this.severity,
          category: this.category,
          message: `Unknown tool: "${tool}"`,
          suggestion: `Check spelling or remove "${tool}" from allowed-tools`,
        });
      }
    }
    return results;
  },
};
