import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { DetectedStack, DetectionSignal } from '../types.js';

/**
 * Check whether a file exists at the given path.
 *
 * @param filePath - Absolute path to check
 * @returns true if the file is accessible
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and parse a JSON file, returning null on failure.
 *
 * @param filePath - Absolute path to a JSON file
 * @returns Parsed object or null
 */
async function readJson(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Read a text file, returning null on failure.
 *
 * @param filePath - Absolute path to a text file
 * @returns File content or null
 */
async function readText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/** Mapping from dependency name pattern to detection result */
interface DepRule {
  pattern: string | RegExp;
  category: string;
  field: keyof Pick<DetectedStack, 'framework' | 'styling' | 'testing' | 'stateManagement' | 'buildTool' | 'language'>;
  value: string;
  confidence: number;
}

const NODE_DEP_RULES: DepRule[] = [
  { pattern: 'next', category: 'framework', field: 'framework', value: 'next', confidence: 0.95 },
  { pattern: 'vue', category: 'framework', field: 'framework', value: 'vue', confidence: 0.9 },
  { pattern: 'svelte', category: 'framework', field: 'framework', value: 'svelte', confidence: 0.9 },
  { pattern: 'express', category: 'framework', field: 'framework', value: 'express', confidence: 0.85 },
  { pattern: 'react', category: 'framework', field: 'framework', value: 'react', confidence: 0.8 },
  { pattern: 'tailwindcss', category: 'styling', field: 'styling', value: 'tailwind', confidence: 0.95 },
  { pattern: 'styled-components', category: 'styling', field: 'styling', value: 'styled-components', confidence: 0.9 },
  { pattern: 'sass', category: 'styling', field: 'styling', value: 'sass', confidence: 0.85 },
  { pattern: 'vitest', category: 'testing', field: 'testing', value: 'vitest', confidence: 0.95 },
  { pattern: 'jest', category: 'testing', field: 'testing', value: 'jest', confidence: 0.9 },
  { pattern: 'zustand', category: 'state', field: 'stateManagement', value: 'zustand', confidence: 0.9 },
  { pattern: /^(redux|@reduxjs\/toolkit)$/, category: 'state', field: 'stateManagement', value: 'redux', confidence: 0.9 },
  { pattern: 'pinia', category: 'state', field: 'stateManagement', value: 'pinia', confidence: 0.9 },
  { pattern: 'turbo', category: 'build', field: 'buildTool', value: 'turborepo', confidence: 0.9 },
  { pattern: /^nx$/, category: 'build', field: 'buildTool', value: 'nx', confidence: 0.9 },
  { pattern: 'typescript', category: 'language', field: 'language', value: 'typescript', confidence: 0.95 },
];

/**
 * Detect the technology stack of a project by scanning config files.
 *
 * Reads package.json, pyproject.toml, Cargo.toml, go.mod, and pom.xml
 * to determine language, framework, styling, testing, state management,
 * build tool, monorepo status, and package manager.
 *
 * @param repoPath - Root path of the repository to scan
 * @returns Detected technology stack with confidence signals
 *
 * @example
 * ```ts
 * const stack = await detectStack('/path/to/my-next-app');
 * console.log(stack.framework); // 'next'
 * console.log(stack.language);  // 'typescript'
 * ```
 */
export async function detectStack(repoPath: string): Promise<DetectedStack> {
  const signals: DetectionSignal[] = [];
  const stack: DetectedStack = {
    language: 'unknown',
    framework: null,
    styling: null,
    testing: null,
    stateManagement: null,
    buildTool: null,
    monorepo: false,
    packageManager: 'npm',
    signals,
  };

  // Detect Node.js projects
  const packageJson = await readJson(join(repoPath, 'package.json'));
  if (packageJson) {
    stack.language = 'javascript';
    signals.push({ category: 'language', value: 'javascript', source: 'package.json', confidence: 0.8 });

    // Detect package manager
    if (await fileExists(join(repoPath, 'pnpm-lock.yaml'))) {
      stack.packageManager = 'pnpm';
      signals.push({ category: 'packageManager', value: 'pnpm', source: 'pnpm-lock.yaml', confidence: 0.95 });
    } else if (await fileExists(join(repoPath, 'yarn.lock'))) {
      stack.packageManager = 'yarn';
      signals.push({ category: 'packageManager', value: 'yarn', source: 'yarn.lock', confidence: 0.95 });
    } else {
      stack.packageManager = 'npm';
      signals.push({ category: 'packageManager', value: 'npm', source: 'package.json', confidence: 0.7 });
    }

    // Detect monorepo from workspaces field
    if (packageJson.workspaces) {
      stack.monorepo = true;
      signals.push({ category: 'monorepo', value: 'true', source: 'package.json workspaces', confidence: 0.95 });
    }

    // Check for monorepo config files
    if (await fileExists(join(repoPath, 'turbo.json'))) {
      stack.monorepo = true;
      stack.buildTool = 'turborepo';
      signals.push({ category: 'monorepo', value: 'true', source: 'turbo.json', confidence: 0.95 });
      signals.push({ category: 'build', value: 'turborepo', source: 'turbo.json', confidence: 0.95 });
    }
    if (await fileExists(join(repoPath, 'nx.json'))) {
      stack.monorepo = true;
      if (!stack.buildTool) {
        stack.buildTool = 'nx';
      }
      signals.push({ category: 'monorepo', value: 'true', source: 'nx.json', confidence: 0.95 });
      signals.push({ category: 'build', value: 'nx', source: 'nx.json', confidence: 0.9 });
    }
    if (await fileExists(join(repoPath, 'lerna.json'))) {
      stack.monorepo = true;
      signals.push({ category: 'monorepo', value: 'true', source: 'lerna.json', confidence: 0.9 });
    }

    // Collect all dependencies — root + child packages in monorepos
    const deps: Record<string, string> = {
      ...(packageJson.dependencies as Record<string, string> | undefined),
      ...(packageJson.devDependencies as Record<string, string> | undefined),
    };

    // In monorepos, scan child package.json files for the real dependencies
    if (stack.monorepo && packageJson.workspaces) {
      const workspacePatterns = Array.isArray(packageJson.workspaces)
        ? packageJson.workspaces as string[]
        : (packageJson.workspaces as { packages?: string[] })?.packages ?? [];

      for (const pattern of workspacePatterns) {
        // Resolve glob patterns like "apps/*" and "packages/*"
        const baseDir = pattern.replace(/\/?\*$/, '');
        const fullBase = join(repoPath, baseDir);
        try {
          const { readdir } = await import('node:fs/promises');
          const entries = await readdir(fullBase, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const childPkg = await readJson(join(fullBase, entry.name, 'package.json'));
              if (childPkg) {
                const childDeps = {
                  ...(childPkg.dependencies as Record<string, string> | undefined),
                  ...(childPkg.devDependencies as Record<string, string> | undefined),
                };
                Object.assign(deps, childDeps);
              }
            }
          }
        } catch {
          // Directory doesn't exist or can't be read — skip
        }
      }
    }

    // Track highest confidence per field for conflict resolution
    const fieldConfidence: Partial<Record<string, number>> = {};

    for (const depName of Object.keys(deps)) {
      for (const rule of NODE_DEP_RULES) {
        const matches = typeof rule.pattern === 'string'
          ? depName === rule.pattern
          : rule.pattern.test(depName);

        if (matches) {
          signals.push({
            category: rule.category,
            value: rule.value,
            source: `package.json dependency: ${depName}`,
            confidence: rule.confidence,
          });

          const currentConfidence = fieldConfidence[rule.field] ?? 0;
          if (rule.confidence > currentConfidence) {
            fieldConfidence[rule.field] = rule.confidence;
            (stack as unknown as Record<string, unknown>)[rule.field] = rule.value;
          }
        }
      }
    }

    // Special case: vite without vitest should detect as build tool
    if (deps['vite'] && !deps['vitest'] && !stack.buildTool) {
      stack.buildTool = 'vite';
      signals.push({ category: 'build', value: 'vite', source: 'package.json dependency: vite', confidence: 0.85 });
    }

    // Special case: react detected but next also detected — next wins (already handled by confidence)
    // If react is detected and no higher-confidence framework, keep react
    return stack;
  }

  // Detect Python projects
  const pyprojectExists = await fileExists(join(repoPath, 'pyproject.toml'));
  const requirementsTxt = await readText(join(repoPath, 'requirements.txt'));
  if (pyprojectExists || requirementsTxt !== null) {
    stack.language = 'python';
    stack.packageManager = 'pip';
    signals.push({
      category: 'language',
      value: 'python',
      source: pyprojectExists ? 'pyproject.toml' : 'requirements.txt',
      confidence: 0.95,
    });

    // Basic Python framework detection from pyproject.toml
    if (pyprojectExists) {
      const pyContent = await readText(join(repoPath, 'pyproject.toml'));
      if (pyContent) {
        if (pyContent.includes('django')) {
          stack.framework = 'django';
          signals.push({ category: 'framework', value: 'django', source: 'pyproject.toml', confidence: 0.9 });
        } else if (pyContent.includes('fastapi')) {
          stack.framework = 'fastapi';
          signals.push({ category: 'framework', value: 'fastapi', source: 'pyproject.toml', confidence: 0.9 });
        }
        if (pyContent.includes('pytest')) {
          stack.testing = 'pytest';
          signals.push({ category: 'testing', value: 'pytest', source: 'pyproject.toml', confidence: 0.9 });
        }
      }
    }

    if (requirementsTxt) {
      if (requirementsTxt.includes('django')) {
        stack.framework = 'django';
        signals.push({ category: 'framework', value: 'django', source: 'requirements.txt', confidence: 0.85 });
      } else if (requirementsTxt.includes('fastapi')) {
        stack.framework = 'fastapi';
        signals.push({ category: 'framework', value: 'fastapi', source: 'requirements.txt', confidence: 0.85 });
      }
      if (requirementsTxt.includes('pytest')) {
        stack.testing = 'pytest';
        signals.push({ category: 'testing', value: 'pytest', source: 'requirements.txt', confidence: 0.85 });
      }
    }

    return stack;
  }

  // Detect Go projects
  if (await fileExists(join(repoPath, 'go.mod'))) {
    stack.language = 'go';
    stack.packageManager = 'go';
    stack.testing = 'go-test';
    signals.push({ category: 'language', value: 'go', source: 'go.mod', confidence: 0.95 });
    signals.push({ category: 'testing', value: 'go-test', source: 'go.mod', confidence: 0.8 });

    const goMod = await readText(join(repoPath, 'go.mod'));
    if (goMod && goMod.includes('github.com/gin-gonic/gin')) {
      stack.framework = 'gin';
      signals.push({ category: 'framework', value: 'gin', source: 'go.mod', confidence: 0.9 });
    }

    return stack;
  }

  // Detect Rust projects
  if (await fileExists(join(repoPath, 'Cargo.toml'))) {
    stack.language = 'rust';
    stack.packageManager = 'cargo';
    stack.testing = 'cargo-test';
    signals.push({ category: 'language', value: 'rust', source: 'Cargo.toml', confidence: 0.95 });
    signals.push({ category: 'testing', value: 'cargo-test', source: 'Cargo.toml', confidence: 0.8 });
    return stack;
  }

  // Detect Java projects
  if (await fileExists(join(repoPath, 'pom.xml'))) {
    stack.language = 'java';
    stack.packageManager = 'maven';
    signals.push({ category: 'language', value: 'java', source: 'pom.xml', confidence: 0.95 });
    return stack;
  }

  return stack;
}
