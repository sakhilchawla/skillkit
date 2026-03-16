import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.next']);

/**
 * Recursively find all SKILL.md files under a root path.
 */
export async function findSkillFiles(rootPath: string): Promise<string[]> {
  const results: string[] = [];
  await walk(rootPath, 'SKILL.md', results);
  return results;
}

/**
 * Recursively find all *.test.yaml files under a root path.
 */
export async function findTestFiles(rootPath: string): Promise<string[]> {
  const results: string[] = [];
  await walk(rootPath, '.test.yaml', results);
  return results;
}

async function walk(dir: string, suffix: string, results: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        await walk(fullPath, suffix, results);
      }
    } else if (entry.name.endsWith(suffix)) {
      results.push(fullPath);
    }
  }
}
