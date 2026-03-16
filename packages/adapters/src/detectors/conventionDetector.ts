import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { DetectedStack, DetectedConventions, TemplateContext } from '../types.js';

/** Candidate component directory paths, checked in order */
const COMPONENT_DIR_CANDIDATES = [
  'src/components',
  'components',
  'app/components',
  'src/app/components',
  'lib/components',
  'src/lib/components',
];

/** Candidate test directory paths, checked in order */
const TEST_DIR_CANDIDATES = [
  'src/__tests__',
  '__tests__',
  'tests',
  'test',
  'spec',
];

/** Candidate style directory paths */
const STYLE_DIR_CANDIDATES = [
  'src/styles',
  'styles',
  'src/css',
  'css',
];

/** Candidate module directory paths */
const MODULE_DIR_CANDIDATES = [
  'src/modules',
  'src/lib',
  'src/services',
  'lib',
  'modules',
  'services',
];

/**
 * Check if a directory exists and is readable.
 *
 * @param dirPath - Path to check
 * @returns true if the directory can be read
 */
async function dirExists(dirPath: string): Promise<boolean> {
  try {
    await readdir(dirPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find the first existing directory from a list of candidates.
 *
 * @param repoPath - Root repo path
 * @param candidates - Relative directory paths to check
 * @returns The first matching relative path, or null
 */
async function findFirstDir(
  repoPath: string,
  candidates: string[],
): Promise<string | null> {
  // Check root-level candidates first
  for (const candidate of candidates) {
    if (await dirExists(join(repoPath, candidate))) {
      return candidate;
    }
  }

  // In monorepos, scan child packages for candidates
  try {
    const pkgJson = JSON.parse(
      await readFile(join(repoPath, 'package.json'), 'utf-8'),
    ) as { workspaces?: string[] | { packages?: string[] } };
    const workspaces = Array.isArray(pkgJson.workspaces)
      ? pkgJson.workspaces
      : pkgJson.workspaces?.packages ?? [];

    for (const pattern of workspaces) {
      const baseDir = pattern.replace(/\/?\*$/, '');
      const fullBase = join(repoPath, baseDir);
      try {
        const entries = await readdir(fullBase, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            for (const candidate of candidates) {
              const childPath = join(baseDir, entry.name, candidate);
              if (await dirExists(join(repoPath, childPath))) {
                return childPath;
              }
            }
          }
        }
      } catch {
        // Skip unreadable workspace dirs
      }
    }
  } catch {
    // No package.json or not a monorepo — that's fine
  }

  return null;
}

/**
 * Detect whether a filename follows PascalCase, kebab-case, camelCase, or snake_case.
 *
 * @param name - Filename without extension
 * @returns The detected naming convention
 */
function detectCase(name: string): string {
  if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) return 'PascalCase';
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(name)) return 'kebab-case';
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(name)) return 'snake_case';
  if (/^[a-z][a-zA-Z0-9]*$/.test(name)) return 'camelCase';
  return 'PascalCase'; // default fallback
}

/**
 * Read up to N filenames from a directory and determine the dominant naming convention.
 *
 * @param dirPath - Absolute path to the directory
 * @param limit - Maximum files to sample
 * @returns The most common naming convention
 */
async function detectNamingFromDir(
  dirPath: string,
  limit: number = 5,
): Promise<string> {
  try {
    const entries = await readdir(dirPath);
    const files = entries
      .filter((e) => !e.startsWith('.') && e.includes('.'))
      .slice(0, limit);

    if (files.length === 0) return 'PascalCase';

    const counts: Record<string, number> = {};
    for (const file of files) {
      const nameWithoutExt = file.replace(/\.[^.]+$/, '');
      const convention = detectCase(nameWithoutExt);
      counts[convention] = (counts[convention] ?? 0) + 1;
    }

    let best = 'PascalCase';
    let bestCount = 0;
    for (const [convention, count] of Object.entries(counts)) {
      if (count > bestCount) {
        best = convention;
        bestCount = count;
      }
    }
    return best;
  } catch {
    return 'PascalCase';
  }
}

/**
 * Detect test location convention.
 *
 * @param repoPath - Root repo path
 * @param componentsDir - Detected components directory (if any)
 * @returns Test naming convention: 'co-located' | 'separate-dir' | '__tests__'
 */
async function detectTestConvention(
  repoPath: string,
  componentsDir: string | null,
): Promise<string> {
  if (
    await dirExists(join(repoPath, 'src/__tests__')) ||
    await dirExists(join(repoPath, '__tests__'))
  ) {
    return '__tests__';
  }

  if (componentsDir) {
    try {
      const entries = await readdir(join(repoPath, componentsDir));
      const hasTestFiles = entries.some(
        (e) => e.includes('.test.') || e.includes('.spec.'),
      );
      if (hasTestFiles) return 'co-located';
    } catch {
      // directory not readable, fall through
    }
  }

  if (
    await dirExists(join(repoPath, 'tests')) ||
    await dirExists(join(repoPath, 'test'))
  ) {
    return 'separate-dir';
  }

  return '__tests__';
}

/**
 * Detect the test file suffix convention.
 *
 * @param stack - Detected stack
 * @returns Suffix like '.test.tsx' or '.test.ts'
 */
function detectTestSuffix(stack: DetectedStack): string {
  if (stack.language === 'typescript') {
    if (stack.framework === 'next' || stack.framework === 'react') {
      return '.test.tsx';
    }
    return '.test.ts';
  }
  if (stack.language === 'python') return '_test.py';
  if (stack.language === 'go') return '_test.go';
  if (stack.language === 'rust') return '.rs';
  return '.test.js';
}

/**
 * Detect the package scope from package.json name (e.g., '@myorg').
 *
 * @param repoPath - Root repo path
 * @returns Package scope or null
 */
async function detectPackageScope(repoPath: string): Promise<string | null> {
  try {
    const raw = await readFile(join(repoPath, 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    if (typeof pkg.name === 'string' && pkg.name.startsWith('@')) {
      const scope = pkg.name.split('/')[0];
      return scope ?? null;
    }
  } catch {
    // no package.json
  }
  return null;
}

/**
 * Read the project name from package.json or directory basename.
 *
 * @param repoPath - Root repo path
 * @returns The project name
 */
async function detectProjectName(repoPath: string): Promise<string> {
  try {
    const raw = await readFile(join(repoPath, 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    if (typeof pkg.name === 'string' && pkg.name.trim() !== '') {
      return pkg.name;
    }
  } catch {
    // no package.json or invalid JSON
  }
  return basename(repoPath);
}

/**
 * Detect naming conventions and directory structure for a project.
 *
 * Scans the repo for component directories, test locations, and
 * naming patterns to build a complete template context.
 *
 * @param repoPath - Root path of the repository
 * @param stack - Previously detected technology stack
 * @returns Template context with conventions and project info
 *
 * @example
 * ```ts
 * const stack = await detectStack('/path/to/repo');
 * const ctx = await detectConventions('/path/to/repo', stack);
 * console.log(ctx.conventions.naming.components); // 'PascalCase'
 * console.log(ctx.conventions.paths.components);  // 'src/components'
 * ```
 */
export async function detectConventions(
  repoPath: string,
  stack: DetectedStack,
): Promise<TemplateContext> {
  const componentsDir = await findFirstDir(repoPath, COMPONENT_DIR_CANDIDATES);
  const testsDir = await findFirstDir(repoPath, TEST_DIR_CANDIDATES);
  const stylesDir = await findFirstDir(repoPath, STYLE_DIR_CANDIDATES);
  const modulesDir = await findFirstDir(repoPath, MODULE_DIR_CANDIDATES);

  // Detect component naming convention
  let componentNaming = 'PascalCase';
  if (componentsDir) {
    componentNaming = await detectNamingFromDir(join(repoPath, componentsDir));
  }

  // Detect file naming convention from src/ or root
  let fileNaming = componentNaming;
  if (await dirExists(join(repoPath, 'src'))) {
    fileNaming = await detectNamingFromDir(join(repoPath, 'src'));
  }

  const testConvention = await detectTestConvention(repoPath, componentsDir);
  const projectName = await detectProjectName(repoPath);
  const packageScope = await detectPackageScope(repoPath);
  const testSuffix = detectTestSuffix(stack);

  const conventions: DetectedConventions = {
    naming: {
      components: componentNaming,
      files: fileNaming,
      tests: testConvention,
    },
    paths: {
      components: componentsDir,
      tests: testsDir,
      styles: stylesDir,
      modules: modulesDir,
    },
    exportStyle: 'named',
    hasBarrelExports: false,
    usesClientComponents: stack.framework === 'next',
    usesCssModules: stack.styling === 'css-modules',
    usesStyledComponents: stack.styling === 'styled-components',
    usesTailwind: stack.styling === 'tailwind',
    packageScope,
    testSuffix,
    importPatterns: [],
  };

  // Detect barrel exports (index.ts files in src/)
  if (await dirExists(join(repoPath, 'src'))) {
    try {
      const srcEntries = await readdir(join(repoPath, 'src'));
      if (srcEntries.some((e) => e === 'index.ts' || e === 'index.js')) {
        conventions.hasBarrelExports = true;
      }
    } catch {
      // not readable
    }
  }

  return {
    stack,
    conventions,
    projectName,
  };
}
