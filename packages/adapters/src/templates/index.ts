import type { SkillTemplate } from '../types.js';
import { createComponentTemplate } from './createComponent.js';
import { createModuleTemplate } from './createModule.js';
import { createTestTemplate } from './createTest.js';

export { createComponentTemplate } from './createComponent.js';
export { createModuleTemplate } from './createModule.js';
export { createTestTemplate } from './createTest.js';

/** All built-in skill templates */
export const builtInTemplates: SkillTemplate[] = [
  createComponentTemplate,
  createModuleTemplate,
  createTestTemplate,
];

/**
 * Shorthand aliases: users can type 'component' instead of 'create-component'.
 */
const TEMPLATE_ALIASES: Record<string, string> = {
  component: 'create-component',
  module: 'create-module',
  test: 'create-test',
};

/**
 * Resolve a template name, supporting both full names and shorthand aliases.
 *
 * @param name - Template name or alias (e.g., 'component' or 'create-component')
 * @returns The matching SkillTemplate, or null if not found
 */
export function resolveTemplate(name: string): SkillTemplate | null {
  const resolvedName = TEMPLATE_ALIASES[name] ?? name;
  return builtInTemplates.find((t) => t.name === resolvedName) ?? null;
}

/**
 * List all available template names (including aliases).
 */
export function listTemplateNames(): string[] {
  return [
    ...builtInTemplates.map((t) => t.name),
    ...Object.keys(TEMPLATE_ALIASES),
  ];
}
