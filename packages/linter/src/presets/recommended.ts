import { LintSeverity } from '../types.js';

/** Recommended preset: security=error, spec=error, best-practice=warn, performance=warn */
export const recommended: Record<string, LintSeverity | 'off'> = {
  'description-quality': LintSeverity.INFO,
  'has-argument-hint': LintSeverity.INFO,
  'consistent-headings': LintSeverity.INFO,
  // Research rules are opt-in only (use 'research' preset)
  'valid-experiment-loop': 'off',
  'mutation-surface-bounded': 'off',
  'has-revert-strategy': 'off',
  'has-resource-budget': 'off',
  'no-remote-push': 'off',
};
