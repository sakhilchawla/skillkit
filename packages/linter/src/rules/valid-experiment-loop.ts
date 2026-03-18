import type { LintRule, LintContext, LintResult } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';

interface ProtocolElement {
  name: string;
  label: string;
  patterns: RegExp[];
}

const PROTOCOL_ELEMENTS: ProtocolElement[] = [
  {
    name: 'branch-isolation',
    label: 'branch isolation (run experiments on a separate branch)',
    patterns: [
      /git\s+(checkout|switch)\s+-[bc]/i,
      /git\s+branch\s+\S/i,
      /create\s+(a\s+)?branch/i,
      /new\s+branch/i,
    ],
  },
  {
    name: 'commit-before-run',
    label: 'commit before running (snapshot each experiment)',
    patterns: [
      /git\s+commit/i,
      /commit\s+(before|prior|first|each|every)/i,
    ],
  },
  {
    name: 'revert-on-failure',
    label: 'revert strategy (undo failed experiments)',
    patterns: [
      /git\s+reset/i,
      /git\s+revert/i,
      /revert.{0,30}(worse|regress|fail)/i,
      /undo.{0,30}(worse|regress|fail)/i,
      /roll\s*back/i,
    ],
  },
  {
    name: 'metric-check',
    label: 'metric evaluation (compare results to decide keep/revert)',
    patterns: [
      /if.{0,40}(improv|better|lower|higher|worse)/i,
      /compar.{0,30}(baseline|previous|before|best)/i,
      /keep.{0,20}(improv|better)/i,
    ],
  },
];

export const validExperimentLoop: LintRule = {
  id: 'valid-experiment-loop',
  description: 'Research skills must define a complete experiment protocol: branch, commit, revert, evaluate',
  severity: LintSeverity.ERROR,
  category: LintCategory.BEST_PRACTICE,
  check(ctx: LintContext): LintResult[] {
    const results: LintResult[] = [];

    for (const element of PROTOCOL_ELEMENTS) {
      const found = element.patterns.some((p) => p.test(ctx.body));
      if (!found) {
        results.push({
          ruleId: this.id,
          severity: this.severity,
          category: this.category,
          message: `Experiment loop missing: ${element.label}`,
          suggestion: `Add instructions for ${element.name} to ensure a safe experiment protocol`,
        });
      }
    }

    return results;
  },
};
