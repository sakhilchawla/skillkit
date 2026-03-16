import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { TestAssertion, TestDefinition, TestScenario } from './types.js';

/** Valid assertion type keys */
const ASSERTION_KEYS: ReadonlySet<string> = new Set([
  'contains',
  'notContains',
  'matchesPattern',
  'severity',
  'completes',
  'noErrors',
  'noCriticalIssues',
  'maxTokens',
]);

/**
 * Load and validate a YAML test definition from disk.
 *
 * @param filePath - Path to the YAML test definition file
 * @returns Parsed and validated test definition
 * @throws Error if the file cannot be read or the definition is invalid
 *
 * @example
 * ```ts
 * const def = await loadTestDefinition('./tests/review.test.yaml');
 * console.log(def.name); // "review skill tests"
 * ```
 */
export async function loadTestDefinition(
  filePath: string,
): Promise<TestDefinition> {
  const content = await readFile(filePath, 'utf-8');
  const parsed = parseYaml(content);
  return validateDefinition(parsed);
}

/**
 * Validate a parsed YAML object as a test definition.
 *
 * Checks all required fields, scenario structure, and assertion validity.
 * Throws on the first validation error with a clear message.
 *
 * @param def - Parsed YAML object to validate
 * @returns Typed TestDefinition if valid
 * @throws Error with descriptive message if validation fails
 */
export function validateDefinition(def: unknown): TestDefinition {
  if (!def || typeof def !== 'object') {
    throw new Error('Test definition must be a YAML mapping (object)');
  }

  const obj = def as Record<string, unknown>;

  // Validate name
  if (typeof obj.name !== 'string' || obj.name.trim() === '') {
    throw new Error(
      'Test definition requires a non-empty "name" field',
    );
  }

  // Validate skill
  if (typeof obj.skill !== 'string' || obj.skill.trim() === '') {
    throw new Error(
      'Test definition requires a non-empty "skill" field',
    );
  }

  // Validate scenarios
  if (!Array.isArray(obj.scenarios) || obj.scenarios.length === 0) {
    throw new Error(
      'Test definition requires a non-empty "scenarios" array',
    );
  }

  const scenarios = obj.scenarios.map((s: unknown, i: number) =>
    validateScenario(s, i),
  );

  return {
    name: obj.name,
    skill: obj.skill,
    fixtures: obj.fixtures as TestDefinition['fixtures'],
    scenarios,
  };
}

/**
 * Validate a single scenario object.
 */
function validateScenario(raw: unknown, index: number): TestScenario {
  if (!raw || typeof raw !== 'object') {
    throw new Error(
      `Scenario at index ${index} must be an object`,
    );
  }

  const s = raw as Record<string, unknown>;

  if (typeof s.name !== 'string' || s.name.trim() === '') {
    throw new Error(
      `Scenario at index ${index} requires a non-empty "name" field`,
    );
  }

  if (typeof s.invoke !== 'string' || s.invoke.trim() === '') {
    throw new Error(
      `Scenario "${s.name}" requires a non-empty "invoke" field`,
    );
  }

  if (!Array.isArray(s.assertions) || s.assertions.length === 0) {
    throw new Error(
      `Scenario "${s.name}" requires a non-empty "assertions" array`,
    );
  }

  const assertions = s.assertions.map((a: unknown, ai: number) =>
    validateAssertion(a, s.name as string, ai),
  );

  return {
    name: s.name,
    description: s.description as string | undefined,
    fixture: s.fixture as string | undefined,
    setup: s.setup as TestScenario['setup'],
    invoke: s.invoke,
    assertions,
  };
}

/**
 * Validate a single assertion object has exactly one assertion type key.
 */
function validateAssertion(
  raw: unknown,
  scenarioName: string,
  index: number,
): TestAssertion {
  if (!raw || typeof raw !== 'object') {
    throw new Error(
      `Assertion at index ${index} in scenario "${scenarioName}" must be an object`,
    );
  }

  const a = raw as Record<string, unknown>;
  const keys = Object.keys(a).filter((k) => ASSERTION_KEYS.has(k));

  if (keys.length === 0) {
    throw new Error(
      `Assertion at index ${index} in scenario "${scenarioName}" has no valid assertion type. ` +
        `Valid types: ${[...ASSERTION_KEYS].join(', ')}`,
    );
  }

  if (keys.length > 1) {
    throw new Error(
      `Assertion at index ${index} in scenario "${scenarioName}" has multiple assertion types ` +
        `(${keys.join(', ')}). Each assertion must have exactly one type.`,
    );
  }

  return a as unknown as TestAssertion;
}
