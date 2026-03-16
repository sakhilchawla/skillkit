import type { TemplateContext } from '../types.js';

/**
 * Resolve a dot-notation path against an object.
 *
 * @param obj - The object to traverse
 * @param path - Dot-notation path (e.g., 'stack.language')
 * @returns The resolved value, or undefined if not found
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Process {{#if (eq var "value")}}...{{/if}} conditionals.
 *
 * Supports nested conditionals by matching from innermost outward.
 *
 * @param template - Template string
 * @param context - Flattened context object
 * @returns Processed template
 */
function processEqConditionals(
  template: string,
  context: Record<string, unknown>,
): string {
  // Process eq conditionals — repeat until no more matches (handles nesting)
  let result = template;
  let maxIterations = 50;

  while (maxIterations-- > 0) {
    const eqPattern = /\{\{#if\s+\(eq\s+([\w.]+)\s+"([^"]+)"\)\s*\}\}([\s\S]*?)\{\{\/if\}\}/;
    const match = eqPattern.exec(result);
    if (!match) break;

    const [fullMatch, varPath, expectedValue, body] = match;
    const actualValue = resolvePath(context, varPath!);
    // Support {{else}} inside the block
    const parts = body!.split('{{else}}');
    const trueBranch = parts[0]!;
    const falseBranch = parts[1] ?? '';
    const replacement = String(actualValue) === expectedValue ? trueBranch : falseBranch;
    result = result.replace(fullMatch!, replacement);
  }

  return result;
}

/**
 * Process {{#if var}}...{{/if}} truthiness conditionals.
 *
 * @param template - Template string
 * @param context - Flattened context object
 * @returns Processed template
 */
function processTruthyConditionals(
  template: string,
  context: Record<string, unknown>,
): string {
  let result = template;
  let maxIterations = 50;

  while (maxIterations-- > 0) {
    const truthyPattern = /\{\{#if\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/;
    const match = truthyPattern.exec(result);
    if (!match) break;

    const [fullMatch, varPath, body] = match;
    const value = resolvePath(context, varPath!);
    const isTruthy = value !== null && value !== undefined && value !== false && value !== '' && value !== 0;
    // Support {{else}} inside the block
    const parts = body!.split('{{else}}');
    const trueBranch = parts[0]!;
    const falseBranch = parts[1] ?? '';
    const replacement = isTruthy ? trueBranch : falseBranch;
    result = result.replace(fullMatch!, replacement);
  }

  return result;
}

/**
 * Replace {{variable}} placeholders with context values.
 *
 * Supports dot-notation for nested values (e.g., {{stack.language}}).
 * Unresolved placeholders are stripped cleanly.
 *
 * @param template - Template string
 * @param context - Context object
 * @returns Template with placeholders replaced
 */
function replacePlaceholders(
  template: string,
  context: Record<string, unknown>,
): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_match, path: string) => {
    const value = resolvePath(context, path);
    if (value === null || value === undefined) return '';
    return String(value);
  });
}

/**
 * Render a Handlebars-style skill template with the given context.
 *
 * Supports:
 * - `{{variable}}` — simple replacement with dot-notation
 * - `{{#if (eq variable "value")}}...{{/if}}` — equality conditionals
 * - `{{#if variable}}...{{/if}}` — truthiness conditionals
 * - Strips unresolved `{{placeholders}}` cleanly
 *
 * This is NOT a full Handlebars implementation — just enough for
 * parameterized skill templates.
 *
 * @param template - Handlebars-style template string
 * @param context - Template variable context
 * @returns Rendered template content
 *
 * @example
 * ```ts
 * const result = renderTemplate(
 *   'Language: {{stack.language}}',
 *   { stack: { language: 'typescript' }, conventions: {...}, projectName: 'my-app' }
 * );
 * // result === 'Language: typescript'
 * ```
 */
export function renderTemplate(
  template: string,
  context: TemplateContext,
): string {
  const ctx = context as unknown as Record<string, unknown>;

  // Process conditionals first (eq, then truthy)
  let result = processEqConditionals(template, ctx);
  result = processTruthyConditionals(result, ctx);

  // Replace simple placeholders
  result = replacePlaceholders(result, ctx);

  // Clean up excessive blank lines left by removed conditionals
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}
