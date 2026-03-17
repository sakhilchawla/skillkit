import { mkdtemp, cp, mkdir, writeFile, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import type { TestSetupAction } from '../types.js';

/**
 * Context for a test fixture, including the temporary directory path
 * and a cleanup function.
 */
export interface FixtureContext {
  /** Absolute path to the temporary fixture directory */
  path: string;
  /** Remove the temporary directory and all contents */
  cleanup: () => Promise<void>;
}

/**
 * Create a temporary fixture directory.
 *
 * If `source` is provided, the contents are recursively copied into the
 * temp directory. Otherwise an empty directory is created.
 *
 * @param source - Optional path to a source directory to copy from
 * @returns Fixture context with path and cleanup handle
 */
export async function createFixture(source?: string): Promise<FixtureContext> {
  const prefix = join(tmpdir(), 'skillkit-fixture-');
  const fixturePath = await mkdtemp(prefix);

  if (source) {
    await cp(source, fixturePath, { recursive: true });
  }

  const cleanup = async (): Promise<void> => {
    await rm(fixturePath, { recursive: true, force: true });
  };

  return { path: fixturePath, cleanup };
}

/**
 * Apply setup actions to a fixture directory.
 *
 * Supports injecting file content and removing files. Parent directories
 * are created automatically when injecting content.
 *
 * @param fixturePath - Absolute path to the fixture directory
 * @param actions - Array of setup actions to apply
 */
export async function applySetup(
  fixturePath: string,
  actions: TestSetupAction[],
): Promise<void> {
  for (const action of actions) {
    const targetPath = join(fixturePath, action.file);

    if (action.remove) {
      try {
        await unlink(targetPath);
      } catch (err) {
        const nodeErr = err as NodeJS.ErrnoException;
        // Ignore if file doesn't exist
        if (nodeErr.code !== 'ENOENT') {
          throw err;
        }
      }
      continue;
    }

    if (action.inject !== undefined) {
      const parentDir = dirname(targetPath);
      await mkdir(parentDir, { recursive: true });
      await writeFile(targetPath, action.inject, 'utf-8');
    }
  }
}

/**
 * Clean up a fixture directory, removing it and all contents.
 *
 * @param context - The fixture context to clean up
 */
export async function cleanupFixture(context: FixtureContext): Promise<void> {
  await context.cleanup();
}
