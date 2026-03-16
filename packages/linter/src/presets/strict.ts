import type { LintSeverity } from '../types.js';

/** Strict preset: all rules at their default severity */
export const strict: Record<string, LintSeverity | 'off'> = {};
// Empty = use each rule's default severity (no overrides)
