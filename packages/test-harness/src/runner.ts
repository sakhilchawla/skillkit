import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { loadTestDefinition } from './loader.js';
import { evaluateAllAssertions } from './assertions.js';
import type {
  ScenarioResult,
  TestReport,
  TestScenario,
} from './types.js';

/**
 * Options for the test runner.
 */
export interface RunOptions {
  /** Run in mock mode (default: true). Mock mode reads the SKILL.md body as simulated output. */
  mock?: boolean;
  /** Timeout in milliseconds for each scenario (default: 30000) */
  timeout?: number;
}

/**
 * Run all test scenarios from a YAML test definition file.
 *
 * Loads the definition, executes each scenario, and returns a complete report.
 *
 * @param definitionPath - Path to the YAML test definition file
 * @param options - Runner options (mock mode, timeout)
 * @returns Complete test report with per-scenario results
 *
 * @example
 * ```ts
 * const report = await runTests('./tests/review.test.yaml');
 * console.log(report.passed); // true if all scenarios passed
 * ```
 */
export async function runTests(
  definitionPath: string,
  options: RunOptions = {},
): Promise<TestReport> {
  const startTime = performance.now();
  const definition = await loadTestDefinition(definitionPath);

  // Resolve skill path relative to the test definition file
  const defDir = dirname(resolve(definitionPath));
  const skillPath = resolve(defDir, definition.skill);

  const results: ScenarioResult[] = [];

  for (const scenario of definition.scenarios) {
    const result = await runScenario(scenario, skillPath, options);
    results.push(result);
  }

  const totalDuration = Math.round(performance.now() - startTime);
  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.filter((r) => !r.passed).length;

  return {
    name: definition.name,
    skill: definition.skill,
    passed: failCount === 0,
    results,
    totalDuration,
    passCount,
    failCount,
  };
}

/**
 * Run a single test scenario against a skill.
 *
 * In mock mode (default), reads the SKILL.md body and uses it as simulated output.
 * In real mode, returns a stub error (not yet implemented).
 *
 * @param scenario - The scenario to run
 * @param skillPath - Resolved path to the SKILL.md file
 * @param options - Runner options
 * @returns Scenario result with assertion evaluations
 */
export async function runScenario(
  scenario: TestScenario,
  skillPath: string,
  options: RunOptions = {},
): Promise<ScenarioResult> {
  const startTime = performance.now();
  const mock = options.mock !== false; // default true

  if (!mock) {
    // Real mode stub
    const duration = Math.round(performance.now() - startTime);
    return {
      scenario: scenario.name,
      passed: false,
      duration,
      assertionResults: [],
      error: 'Real mode not yet implemented. Use mock mode (default) for now.',
    };
  }

  try {
    // Mock mode: read the SKILL.md body as simulated output
    const skillContent = await readFile(skillPath, 'utf-8');
    const output = extractSkillBody(skillContent);
    const completed = true;

    const assertionResults = evaluateAllAssertions(
      output,
      scenario.assertions,
      completed,
    );

    const passed = assertionResults.every((r) => r.passed);
    const duration = Math.round(performance.now() - startTime);

    return {
      scenario: scenario.name,
      passed,
      duration,
      assertionResults,
      output,
    };
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    const message = err instanceof Error ? err.message : String(err);
    return {
      scenario: scenario.name,
      passed: false,
      duration,
      assertionResults: [],
      error: `Failed to run scenario: ${message}`,
    };
  }
}

/**
 * Extract the markdown body from a SKILL.md file (everything after frontmatter).
 */
function extractSkillBody(content: string): string {
  const lines = content.split('\n');

  if (lines[0]?.trim() !== '---') {
    return content;
  }

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      return lines.slice(i + 1).join('\n').trim();
    }
  }

  return content;
}
