import { LintSeverity } from '../types.js';

/**
 * Research preset — for autonomous experiment-loop skills (autoresearch, optimization agents).
 *
 * Activates all 5 research-specific rules as errors.
 * Downgrades some existing rules that conflict with research patterns:
 * - no-unrestricted-bash → warn (research skills need broad shell access)
 * - no-destructive-commands → warn (git reset is expected in experiment loops)
 * - has-argument-hint → info (not critical for research skills)
 * - consistent-headings → info (instruction clarity matters more than heading style)
 */
export const research: Record<string, LintSeverity | 'off'> = {
  // Downgrade rules that conflict with research patterns
  'no-unrestricted-bash': LintSeverity.WARN,
  'no-destructive-commands': LintSeverity.WARN,
  'has-argument-hint': LintSeverity.INFO,
  'consistent-headings': LintSeverity.INFO,
  'description-quality': LintSeverity.INFO,

  // Research-specific rules — all active as errors
  'valid-experiment-loop': LintSeverity.ERROR,
  'mutation-surface-bounded': LintSeverity.ERROR,
  'has-revert-strategy': LintSeverity.ERROR,
  'has-resource-budget': LintSeverity.ERROR,
  'no-remote-push': LintSeverity.WARN,
};
