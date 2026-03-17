import { describe, it, expect } from 'vitest';
import { access, readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { constants } from 'node:fs';
import {
  createFixture,
  applySetup,
  cleanupFixture,
} from '../fixtures/fixtureManager.js';

describe('createFixture', () => {
  it('creates a temporary directory', async () => {
    const ctx = await createFixture();
    try {
      const stats = await stat(ctx.path);
      expect(stats.isDirectory()).toBe(true);
    } finally {
      await ctx.cleanup();
    }
  });

  it('creates a writable directory', async () => {
    const ctx = await createFixture();
    try {
      await access(ctx.path, constants.W_OK);
      // If access doesn't throw, the directory is writable
      expect(true).toBe(true);
    } finally {
      await ctx.cleanup();
    }
  });

  it('path starts with the system temp dir prefix', async () => {
    const ctx = await createFixture();
    try {
      expect(ctx.path).toContain('skillkit-fixture-');
    } finally {
      await ctx.cleanup();
    }
  });

  it('copies contents from source directory', async () => {
    // First create a source fixture with a file
    const source = await createFixture();
    try {
      await mkdir(join(source.path, 'subdir'), { recursive: true });
      await writeFile(join(source.path, 'subdir', 'test.txt'), 'hello from source');

      // Create fixture from source
      const ctx = await createFixture(source.path);
      try {
        const content = await readFile(join(ctx.path, 'subdir', 'test.txt'), 'utf-8');
        expect(content).toBe('hello from source');
      } finally {
        await ctx.cleanup();
      }
    } finally {
      await source.cleanup();
    }
  });

  it('copies from built-in react-next-ts fixture', async () => {
    const fixtureDir = join(
      __dirname,
      '..',
      '..',
      'fixtures',
      'react-next-ts',
    );
    const ctx = await createFixture(fixtureDir);
    try {
      const pkgJson = await readFile(join(ctx.path, 'package.json'), 'utf-8');
      expect(pkgJson).toContain('test-react-app');
    } finally {
      await ctx.cleanup();
    }
  });
});

describe('cleanupFixture', () => {
  it('removes the temporary directory', async () => {
    const ctx = await createFixture();
    const savedPath = ctx.path;

    await cleanupFixture(ctx);

    // Directory should no longer exist
    await expect(access(savedPath)).rejects.toThrow();
  });

  it('removes directory with contents', async () => {
    const ctx = await createFixture();
    const savedPath = ctx.path;

    // Add some files
    await writeFile(join(ctx.path, 'file.txt'), 'content');
    await mkdir(join(ctx.path, 'nested'), { recursive: true });
    await writeFile(join(ctx.path, 'nested', 'deep.txt'), 'deep content');

    await cleanupFixture(ctx);
    await expect(access(savedPath)).rejects.toThrow();
  });
});

describe('applySetup', () => {
  it('injects file content', async () => {
    const ctx = await createFixture();
    try {
      await applySetup(ctx.path, [
        { file: 'hello.txt', inject: 'hello world' },
      ]);

      const content = await readFile(join(ctx.path, 'hello.txt'), 'utf-8');
      expect(content).toBe('hello world');
    } finally {
      await ctx.cleanup();
    }
  });

  it('creates parent directories automatically', async () => {
    const ctx = await createFixture();
    try {
      await applySetup(ctx.path, [
        { file: 'deep/nested/dir/file.ts', inject: 'export const x = 1;' },
      ]);

      const content = await readFile(
        join(ctx.path, 'deep', 'nested', 'dir', 'file.ts'),
        'utf-8',
      );
      expect(content).toBe('export const x = 1;');
    } finally {
      await ctx.cleanup();
    }
  });

  it('removes files', async () => {
    const ctx = await createFixture();
    try {
      // Create a file first
      await writeFile(join(ctx.path, 'removeme.txt'), 'to be removed');

      await applySetup(ctx.path, [
        { file: 'removeme.txt', remove: true },
      ]);

      await expect(access(join(ctx.path, 'removeme.txt'))).rejects.toThrow();
    } finally {
      await ctx.cleanup();
    }
  });

  it('handles removing non-existent files gracefully', async () => {
    const ctx = await createFixture();
    try {
      // Should not throw
      await applySetup(ctx.path, [
        { file: 'does-not-exist.txt', remove: true },
      ]);
    } finally {
      await ctx.cleanup();
    }
  });

  it('applies multiple actions in order', async () => {
    const ctx = await createFixture();
    try {
      await applySetup(ctx.path, [
        { file: 'a.txt', inject: 'first' },
        { file: 'b.txt', inject: 'second' },
        { file: 'src/c.ts', inject: 'export default 3;' },
      ]);

      const a = await readFile(join(ctx.path, 'a.txt'), 'utf-8');
      const b = await readFile(join(ctx.path, 'b.txt'), 'utf-8');
      const c = await readFile(join(ctx.path, 'src', 'c.ts'), 'utf-8');

      expect(a).toBe('first');
      expect(b).toBe('second');
      expect(c).toBe('export default 3;');
    } finally {
      await ctx.cleanup();
    }
  });
});
