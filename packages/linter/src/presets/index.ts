import type { LintSeverity } from '../types.js';
import { strict } from './strict.js';
import { recommended } from './recommended.js';
import { minimal } from './minimal.js';

const presets: Record<string, Record<string, LintSeverity | 'off'>> = {
  strict,
  recommended,
  minimal,
};

export function getPreset(name: string): Record<string, LintSeverity | 'off'> {
  return presets[name] ?? recommended;
}

export { strict, recommended, minimal };
