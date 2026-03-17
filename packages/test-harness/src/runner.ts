import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { loadTestDefinition } from './loader.js';
import { evaluateAllAssertions } from './assertions.js';
import { invokeSkill } from './invoker/invoker.js';
import { createFixture, applySetup, cleanupFixture } from './fixtures/fixtureManager.js';
import type { InvokerConfig } from './invoker/types.js';
import type { FixtureContext } from './fixtures/fixtureManager.js';
import type {
  ScenarioResult,
  TestReport,
  TestScenario,
  TestFixture,
} from './types.js';

/**
 * Options for the test runner.
 */
export interface RunOptions {
  /** Run in mock mode (default: true). Mock mode reads the SKILL.md body as simulated output. */
  mock?: boolean;
  /** Timeout in milliseconds for each scenario (default: 30000) */
  timeout?: number;
  /** Invoker configuration for real mode execution */
  invoker?: InvokerConfig;
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
    const result = await runScenario(scenario, skillPath, options, definition.fixtures);
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
 * In real mode, uses the invoker to execute the skill via subprocess, with
 * optional fixture setup and cleanup.
 *
 * @param scenario - The scenario to run
 * @param skillPath - Resolved path to the SKILL.md file
 * @param options - Runner options
 * @param fixtures - Optional fixture definitions for resolving fixture names
 * @returns Scenario result with assertion evaluations
 */
export async function runScenario(
  scenario: TestScenario,
  skillPath: string,
  options: RunOptions = {},
  fixtures?: TestFixture[],
): Promise<ScenarioResult> {
  const startTime = performance.now();
  const mock = options.mock !== false; // default true

  if (!mock) {
    return runRealScenario(scenario, skillPath, options, fixtures);
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
 * Run a scenario in real mode using the invoker and fixture system.
 *
 * Sets up a temporary fixture directory, applies setup actions, invokes the
 * skill via subprocess, evaluates assertions, and cleans up.
 *
 * @param scenario - The scenario to run
 * @param skillPath - Resolved path to the SKILL.md file
 * @param options - Runner options (must include invoker config)
 * @param fixtures - Optional fixture definitions for resolving fixture names
 * @returns Scenario result with assertion evaluations
 */
async function runRealScenario(
  scenario: TestScenario,
  skillPath: string,
  options: RunOptions,
  fixtures?: TestFixture[],
): Promise<ScenarioResult> {
  const startTime = performance.now();

  if (!options.invoker) {
    const duration = Math.round(performance.now() - startTime);
    return {
      scenario: scenario.name,
      passed: false,
      duration,
      assertionResults: [],
      error: 'Real mode requires an invoker configuration. Set options.invoker.',
    };
  }

  let fixtureContext: FixtureContext | undefined;

  try {
    // Resolve fixture source path if scenario references a fixture
    let fixtureSource: string | undefined;
    if (scenario.fixture && fixtures) {
      const fixtureDef = fixtures.find((f) => f.name === scenario.fixture);
      if (fixtureDef) {
        fixtureSource = fixtureDef.repo;
      }
    }

    // Create fixture directory
    fixtureContext = await createFixture(fixtureSource);

    // Apply setup actions
    if (scenario.setup && scenario.setup !== 'none') {
      await applySetup(fixtureContext.path, scenario.setup);
    }

    // Configure invoker with fixture as working directory
    const invokerConfig: InvokerConfig = {
      ...options.invoker,
      cwd: fixtureContext.path,
      timeout: options.timeout ?? options.invoker.timeout ?? 120_000,
    };

    // Invoke the skill
    const result = await invokeSkill(skillPath, scenario.invoke, invokerConfig);

    // Evaluate assertions against captured output
    const assertionResults = evaluateAllAssertions(
      result.output,
      scenario.assertions,
      result.completed,
    );

    const passed = assertionResults.every((r) => r.passed);
    const duration = Math.round(performance.now() - startTime);

    return {
      scenario: scenario.name,
      passed,
      duration,
      assertionResults,
      output: result.output,
    };
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    const message = err instanceof Error ? err.message : String(err);
    return {
      scenario: scenario.name,
      passed: false,
      duration,
      assertionResults: [],
      error: `Failed to run real scenario: ${message}`,
    };
  } finally {
    // Always clean up fixture directory
    if (fixtureContext) {
      await cleanupFixture(fixtureContext);
    }
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
