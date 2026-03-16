import type { LintRule } from '../types.js';
import { requireName } from './require-name.js';
import { requireDescription } from './require-description.js';
import { validFrontmatterFields } from './valid-frontmatter-fields.js';
import { validAllowedTools } from './valid-allowed-tools.js';
import { validModel } from './valid-model.js';
import { noUnrestrictedBash } from './no-unrestricted-bash.js';
import { noSensitivePaths } from './no-sensitive-paths.js';
import { noDataExfiltration } from './no-data-exfiltration.js';
import { noDestructiveCommands } from './no-destructive-commands.js';
import { descriptionQuality } from './description-quality.js';
import { bodyNotEmpty } from './body-not-empty.js';
import { reasonableTokenEstimate } from './reasonable-token-estimate.js';
import { hasArgumentHint } from './has-argument-hint.js';
import { noHardcodedPaths } from './no-hardcoded-paths.js';
import { consistentHeadings } from './consistent-headings.js';

/** All available lint rules */
export const allRules: LintRule[] = [
  // Spec compliance
  requireName,
  requireDescription,
  validFrontmatterFields,
  validAllowedTools,
  validModel,
  // Security
  noUnrestrictedBash,
  noSensitivePaths,
  noDataExfiltration,
  noDestructiveCommands,
  // Best practices
  descriptionQuality,
  bodyNotEmpty,
  reasonableTokenEstimate,
  hasArgumentHint,
  noHardcodedPaths,
  consistentHeadings,
];

export {
  requireName,
  requireDescription,
  validFrontmatterFields,
  validAllowedTools,
  validModel,
  noUnrestrictedBash,
  noSensitivePaths,
  noDataExfiltration,
  noDestructiveCommands,
  descriptionQuality,
  bodyNotEmpty,
  reasonableTokenEstimate,
  hasArgumentHint,
  noHardcodedPaths,
  consistentHeadings,
};
