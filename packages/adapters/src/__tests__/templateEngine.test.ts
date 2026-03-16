import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../generator/templateEngine.js';
import type { TemplateContext, DetectedStack, DetectedConventions } from '../types.js';

/** Helper to build a minimal TemplateContext for testing */
function makeContext(overrides?: {
  stack?: Partial<DetectedStack>;
  conventions?: Partial<DetectedConventions>;
  projectName?: string;
}): TemplateContext {
  const stack: DetectedStack = {
    language: 'typescript',
    framework: 'react',
    styling: 'tailwind',
    testing: 'vitest',
    stateManagement: 'zustand',
    buildTool: 'vite',
    monorepo: false,
    packageManager: 'npm',
    signals: [],
    ...overrides?.stack,
  };

  const conventions: DetectedConventions = {
    naming: { components: 'PascalCase', files: 'PascalCase', tests: '__tests__' },
    paths: { components: 'src/components', tests: 'src/__tests__', styles: null, modules: 'src/lib' },
    exportStyle: 'named',
    hasBarrelExports: true,
    usesClientComponents: false,
    usesCssModules: false,
    usesStyledComponents: false,
    usesTailwind: true,
    packageScope: null,
    testSuffix: '.test.tsx',
    importPatterns: [],
    ...overrides?.conventions,
  };

  return {
    stack,
    conventions,
    projectName: overrides?.projectName ?? 'test-project',
  };
}

describe('renderTemplate', () => {
  it('replaces simple {{variable}} placeholders', () => {
    const ctx = makeContext({ projectName: 'my-app' });
    const result = renderTemplate('Project: {{projectName}}', ctx);
    expect(result).toBe('Project: my-app');
  });

  it('replaces dot-notation {{stack.language}}', () => {
    const ctx = makeContext({ stack: { language: 'typescript' } });
    const result = renderTemplate('Lang: {{stack.language}}', ctx);
    expect(result).toBe('Lang: typescript');
  });

  it('handles {{#if (eq var "value")}} truthy', () => {
    const ctx = makeContext({ stack: { language: 'typescript' } });
    const template = '{{#if (eq stack.language "typescript")}}TS{{/if}}';
    const result = renderTemplate(template, ctx);
    expect(result).toBe('TS');
  });

  it('handles {{#if (eq var "value")}} falsy (removes block)', () => {
    const ctx = makeContext({ stack: { language: 'javascript' } });
    const template = 'before{{#if (eq stack.language "typescript")}}TS{{/if}}after';
    const result = renderTemplate(template, ctx);
    expect(result).toBe('beforeafter');
  });

  it('handles {{#if var}} truthiness', () => {
    const ctx = makeContext({ stack: { framework: 'react' } });
    const template = '{{#if stack.framework}}Has framework{{/if}}';
    const result = renderTemplate(template, ctx);
    expect(result).toBe('Has framework');
  });

  it('handles {{#if var}} with null (removes block)', () => {
    const ctx = makeContext({ stack: { framework: null } });
    const template = 'before{{#if stack.framework}}Has framework{{/if}}after';
    const result = renderTemplate(template, ctx);
    expect(result).toBe('beforeafter');
  });

  it('handles nested conditionals', () => {
    const ctx = makeContext({
      stack: { language: 'typescript', testing: 'vitest' },
    });
    const template = [
      '{{#if (eq stack.language "typescript")}}',
      'TS: {{#if (eq stack.testing "vitest")}}vitest{{/if}}',
      '{{/if}}',
    ].join('\n');
    const result = renderTemplate(template, ctx);
    expect(result).toContain('TS:');
    expect(result).toContain('vitest');
  });

  it('strips unresolved placeholders', () => {
    const ctx = makeContext();
    const result = renderTemplate('Value: {{nonexistent.path}}', ctx);
    expect(result).toBe('Value: ');
  });

  it('handles missing context values gracefully', () => {
    const ctx = makeContext({ conventions: { paths: { components: null, tests: null, styles: null, modules: null } } });
    const result = renderTemplate('Path: {{conventions.paths.components}}', ctx);
    expect(result).toBe('Path: ');
  });

  it('preserves non-template content', () => {
    const ctx = makeContext();
    const template = '# Heading\n\nSome regular markdown with `code` and **bold**.';
    const result = renderTemplate(template, ctx);
    expect(result).toBe(template);
  });

  it('handles deeply nested dot-notation', () => {
    const ctx = makeContext({
      conventions: { naming: { components: 'kebab-case', files: 'kebab-case', tests: '__tests__' } },
    });
    const result = renderTemplate('Style: {{conventions.naming.components}}', ctx);
    expect(result).toBe('Style: kebab-case');
  });

  it('cleans up excessive blank lines from removed blocks', () => {
    const ctx = makeContext({ stack: { styling: null } });
    const template = 'before\n\n{{#if (eq stack.styling "tailwind")}}tailwind{{/if}}\n\n\n\nafter';
    const result = renderTemplate(template, ctx);
    expect(result).not.toContain('\n\n\n');
  });
});
