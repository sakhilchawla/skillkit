import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { adaptTemplate } from '../generator/adapter.js';

describe('adaptTemplate', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skillkit-adapt-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Set up a React/Tailwind/Vitest project structure in the temp dir.
   */
  async function setupReactProject(): Promise<void> {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'react-app',
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
        devDependencies: {
          typescript: '^5.0.0',
          tailwindcss: '^3.0.0',
          vitest: '^1.0.0',
        },
      }),
    );
    await mkdir(join(tempDir, 'src/components'), { recursive: true });
    await writeFile(join(tempDir, 'src/components/Button.tsx'), 'export function Button() {}');
    await writeFile(join(tempDir, 'src/components/Card.tsx'), 'export function Card() {}');
    await mkdir(join(tempDir, 'src/__tests__'), { recursive: true });
  }

  /**
   * Set up a Vue/SCSS/Jest project structure in the temp dir.
   */
  async function setupVueProject(): Promise<void> {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'vue-app',
        dependencies: { vue: '^3.0.0' },
        devDependencies: {
          typescript: '^5.0.0',
          sass: '^1.0.0',
          jest: '^29.0.0',
        },
      }),
    );
    await mkdir(join(tempDir, 'src/components'), { recursive: true });
    await writeFile(join(tempDir, 'src/components/BaseInput.vue'), '<template></template>');
    await mkdir(join(tempDir, 'src/__tests__'), { recursive: true });
  }

  it('generates component skill for React/Tailwind/Vitest project', async () => {
    await setupReactProject();

    const result = await adaptTemplate('create-component', tempDir);

    expect(result.skillContent).toContain('create-component');
    expect(result.skillContent).toContain('react-app');
    expect(result.stack.framework).toBe('react');
    expect(result.stack.language).toBe('typescript');
    expect(result.templateName).toBe('create-component');
  });

  it('generates component skill for Vue/SCSS/Jest project', async () => {
    await setupVueProject();

    const result = await adaptTemplate('create-component', tempDir);

    expect(result.skillContent).toContain('vue-app');
    expect(result.stack.framework).toBe('vue');
    expect(result.stack.styling).toBe('sass');
  });

  it('template includes correct test framework', async () => {
    await setupReactProject();
    const result = await adaptTemplate('create-component', tempDir);
    expect(result.skillContent).toContain('vitest');
  });

  it('template includes correct styling approach', async () => {
    await setupReactProject();
    const result = await adaptTemplate('create-component', tempDir);
    expect(result.skillContent).toContain('Tailwind CSS');
  });

  it('uses detected component directory', async () => {
    await setupReactProject();
    const result = await adaptTemplate('create-component', tempDir);
    expect(result.skillContent).toContain('src/components');
  });

  it('falls back gracefully when no components directory found', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'minimal-app',
        dependencies: { react: '^18.0.0' },
        devDependencies: { typescript: '^5.0.0' },
      }),
    );

    const result = await adaptTemplate('create-component', tempDir);

    // Should still generate valid content even without a components dir
    expect(result.skillContent).toContain('create-component');
    expect(result.context.conventions.paths.components).toBeNull();
  });

  it('throws for unknown template name', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'app', dependencies: {} }),
    );

    await expect(
      adaptTemplate('nonexistent-template', tempDir),
    ).rejects.toThrow('not found');
  });

  it('throws when language is not supported by template', async () => {
    await writeFile(join(tempDir, 'go.mod'), 'module example.com/myapp\n\ngo 1.21\n');

    await expect(
      adaptTemplate('create-component', tempDir),
    ).rejects.toThrow('does not support');
  });
});
