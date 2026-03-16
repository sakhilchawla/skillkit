import { LintSeverity } from '../types.js';

/** Minimal preset: only spec compliance rules, everything else off */
export const minimal: Record<string, LintSeverity | 'off'> = {
  'no-unrestricted-bash': 'off',
  'no-sensitive-paths': 'off',
  'no-data-exfiltration': 'off',
  'no-destructive-commands': 'off',
  'description-quality': 'off',
  'body-not-empty': 'off',
  'reasonable-token-estimate': 'off',
  'has-argument-hint': 'off',
  'no-hardcoded-paths': 'off',
  'consistent-headings': 'off',
};
