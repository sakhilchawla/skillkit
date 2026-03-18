import type { LintSeverity } from '../types.js';

/** Strict preset: all standard rules at their default severity, research rules off */
export const strict: Record<string, LintSeverity | 'off'> = {
  // Research rules are opt-in only (use 'research' preset)
  'valid-experiment-loop': 'off',
  'mutation-surface-bounded': 'off',
  'has-revert-strategy': 'off',
  'has-resource-budget': 'off',
  'no-remote-push': 'off',
};
