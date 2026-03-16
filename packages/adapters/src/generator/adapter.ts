import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { AdaptResult } from '../types.js';
import { detectStack } from '../detectors/stackDetector.js';
import { detectConventions } from '../detectors/conventionDetector.js';
import { resolveTemplate, listTemplateNames } from '../templates/index.js';
import { renderTemplate } from './templateEngine.js';

/**
 * Adapt a built-in template to a specific project's tech stack and conventions.
 *
 * Detects the project's stack, scans for conventions, finds the matching
 * template, and renders it with the detected context.
 *
 * @param templateName - Name or shorthand of the template (e.g., 'component' or 'create-component')
 * @param repoPath - Root path of the target repository
 * @returns The adaptation result with generated skill content
 * @throws Error if the template is not found or doesn't support the detected language
 *
 * @example
 * ```ts
 * const result = await adaptTemplate('component', '/path/to/react-app');
 * console.log(result.skillContent); // Rendered SKILL.md content
 * ```
 */
export async function adaptTemplate(
  templateName: string,
  repoPath: string,
): Promise<AdaptResult> {
  const stack = await detectStack(repoPath);
  const context = await detectConventions(repoPath, stack);

  const template = resolveTemplate(templateName);
  if (!template) {
    const available = listTemplateNames().join(', ');
    throw new Error(
      `Template "${templateName}" not found. Available templates: ${available}`,
    );
  }

  if (!template.supportedLanguages.includes(stack.language)) {
    throw new Error(
      `Template "${templateName}" does not support language "${stack.language}". ` +
        `Supported: ${template.supportedLanguages.join(', ')}`,
    );
  }

  const skillContent = renderTemplate(template.template, context);
  const outputPath = join(
    repoPath,
    '.claude',
    'skills',
    template.type,
    'SKILL.md',
  );

  return {
    skillContent,
    outputPath,
    stack,
    context,
    templateName: template.name,
  };
}

/**
 * Adapt a template and write the generated SKILL.md to disk.
 *
 * Calls {@link adaptTemplate} and then writes the result to the output
 * directory. Creates directories as needed.
 *
 * @param templateName - Name or shorthand of the template
 * @param repoPath - Root path of the target repository
 * @param outputDir - Override output directory (defaults to repoPath)
 * @returns The adaptation result with the actual output path
 *
 * @example
 * ```ts
 * const result = await adaptAndSave('component', '/path/to/repo');
 * console.log(`Saved to: ${result.outputPath}`);
 * ```
 */
export async function adaptAndSave(
  templateName: string,
  repoPath: string,
  outputDir?: string,
): Promise<AdaptResult> {
  const result = await adaptTemplate(templateName, repoPath);

  const template = resolveTemplate(templateName)!;
  const baseDir = outputDir ?? repoPath;
  const outputPath = join(
    baseDir,
    '.claude',
    'skills',
    template.type,
    'SKILL.md',
  );

  // Ensure the output directory exists
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, result.skillContent, 'utf-8');

  return {
    ...result,
    outputPath,
  };
}
