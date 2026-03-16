import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectStack } from '../detectors/stackDetector.js';

describe('detectStack', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skillkit-stack-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('detects Node.js/TypeScript from package.json with typescript dep', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'my-app',
        dependencies: {},
        devDependencies: { typescript: '^5.0.0' },
      }),
    );

    const stack = await detectStack(tempDir);
    expect(stack.language).toBe('typescript');
    expect(stack.packageManager).toBe('npm');
  });

  it('detects Next.js framework from next dep', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'next-app',
        dependencies: { next: '^14.0.0', react: '^18.0.0' },
      }),
    );

    const stack = await detectStack(tempDir);
    expect(stack.framework).toBe('next');
  });

  it('detects React without Next', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'react-app',
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
      }),
    );

    const stack = await detectStack(tempDir);
    expect(stack.framework).toBe('react');
  });

  it('detects Tailwind styling', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'styled-app',
        devDependencies: { tailwindcss: '^3.0.0' },
      }),
    );

    const stack = await detectStack(tempDir);
    expect(stack.styling).toBe('tailwind');
  });

  it('detects vitest testing', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'tested-app',
        devDependencies: { vitest: '^1.0.0' },
      }),
    );

    const stack = await detectStack(tempDir);
    expect(stack.testing).toBe('vitest');
  });

  it('detects zustand state management', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'state-app',
        dependencies: { zustand: '^4.0.0' },
      }),
    );

    const stack = await detectStack(tempDir);
    expect(stack.stateManagement).toBe('zustand');
  });

  it('detects monorepo from workspaces field', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'my-monorepo',
        workspaces: ['packages/*'],
      }),
    );

    const stack = await detectStack(tempDir);
    expect(stack.monorepo).toBe(true);
  });

  it('detects monorepo from turbo.json', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'turbo-repo' }),
    );
    await writeFile(join(tempDir, 'turbo.json'), JSON.stringify({ pipeline: {} }));

    const stack = await detectStack(tempDir);
    expect(stack.monorepo).toBe(true);
    expect(stack.buildTool).toBe('turborepo');
  });

  it('detects Python from pyproject.toml existence', async () => {
    await writeFile(
      join(tempDir, 'pyproject.toml'),
      '[project]\nname = "my-python-app"\n',
    );

    const stack = await detectStack(tempDir);
    expect(stack.language).toBe('python');
    expect(stack.packageManager).toBe('pip');
  });

  it('detects Go from go.mod existence', async () => {
    await writeFile(
      join(tempDir, 'go.mod'),
      'module github.com/user/myapp\n\ngo 1.21\n',
    );

    const stack = await detectStack(tempDir);
    expect(stack.language).toBe('go');
    expect(stack.packageManager).toBe('go');
    expect(stack.testing).toBe('go-test');
  });

  it('returns unknown for empty directory', async () => {
    const stack = await detectStack(tempDir);
    expect(stack.language).toBe('unknown');
    expect(stack.framework).toBeNull();
  });

  it('records detection signals with confidence scores', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'signal-app',
        dependencies: { react: '^18.0.0' },
        devDependencies: { typescript: '^5.0.0', vitest: '^1.0.0' },
      }),
    );

    const stack = await detectStack(tempDir);
    expect(stack.signals.length).toBeGreaterThan(0);

    for (const signal of stack.signals) {
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(1);
      expect(signal.category).toBeTruthy();
      expect(signal.source).toBeTruthy();
    }
  });

  it('picks highest confidence when multiple frameworks detected', async () => {
    // next (0.95) should win over react (0.8)
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'multi-framework',
        dependencies: { next: '^14.0.0', react: '^18.0.0' },
      }),
    );

    const stack = await detectStack(tempDir);
    expect(stack.framework).toBe('next');
  });

  it('detects pnpm package manager from lockfile', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'pnpm-app' }),
    );
    await writeFile(join(tempDir, 'pnpm-lock.yaml'), '');

    const stack = await detectStack(tempDir);
    expect(stack.packageManager).toBe('pnpm');
  });

  it('detects Rust from Cargo.toml existence', async () => {
    await writeFile(
      join(tempDir, 'Cargo.toml'),
      '[package]\nname = "my-rust-app"\nversion = "0.1.0"\n',
    );

    const stack = await detectStack(tempDir);
    expect(stack.language).toBe('rust');
    expect(stack.packageManager).toBe('cargo');
    expect(stack.testing).toBe('cargo-test');
  });

  it('detects redux from @reduxjs/toolkit', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'redux-app',
        dependencies: { '@reduxjs/toolkit': '^2.0.0', react: '^18.0.0' },
      }),
    );

    const stack = await detectStack(tempDir);
    expect(stack.stateManagement).toBe('redux');
  });
});
