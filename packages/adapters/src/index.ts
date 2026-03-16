// Types
export type {
  DetectedStack,
  DetectionSignal,
  DetectedConventions,
  TemplateContext,
  SkillTemplate,
  AdaptResult,
  BuiltinTemplate,
} from './types.js';

// Detectors
export { detectStack } from './detectors/index.js';
export { detectConventions } from './detectors/index.js';

// Templates
export {
  builtInTemplates,
  createComponentTemplate,
  createModuleTemplate,
  createTestTemplate,
  resolveTemplate,
  listTemplateNames,
} from './templates/index.js';

// Generator
export { adaptTemplate, adaptAndSave } from './generator/index.js';
export { renderTemplate } from './generator/index.js';
