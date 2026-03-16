import { LintSeverity } from '../types.js';

/** Recommended preset: security=error, spec=error, best-practice=warn, performance=warn */
export const recommended: Record<string, LintSeverity | 'off'> = {
  'description-quality': LintSeverity.INFO,
  'has-argument-hint': LintSeverity.INFO,
  'consistent-headings': LintSeverity.INFO,
};
