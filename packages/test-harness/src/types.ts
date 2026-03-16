/**
 * A test fixture pointing to a cloneable or local repository.
 */
export interface TestFixture {
  /** Fixture name for referencing in scenarios */
  name: string;
  /** Path or URL to the repository */
  repo: string;
}

/**
 * A setup action to prepare files before a scenario runs.
 */
export interface TestSetupAction {
  /** File path to create or modify */
  file: string;
  /** Content to inject into the file */
  inject?: string;
  /** Whether to remove the file */
  remove?: boolean;
}

/**
 * A single assertion to evaluate against skill output.
 * Exactly one assertion type key should be set per instance.
 */
export interface TestAssertion {
  /** Output must contain this substring */
  contains?: string;
  /** Output must not contain this substring */
  notContains?: string;
  /** Output must match this regular expression */
  matchesPattern?: string;
  /** Output must mention this severity level */
  severity?: string;
  /** Skill invocation must complete successfully */
  completes?: boolean;
  /** Output must not contain error indicators */
  noErrors?: boolean;
  /** Output must not contain critical/blocker indicators */
  noCriticalIssues?: boolean;
  /** Output token count must not exceed this limit */
  maxTokens?: number;
}

/**
 * A single test scenario within a test definition.
 */
export interface TestScenario {
  /** Human-readable scenario name */
  name: string;
  /** Optional description of what the scenario tests */
  description?: string;
  /** Fixture name to use for this scenario */
  fixture?: string;
  /** Setup actions to run before invocation, or 'none' to skip */
  setup?: TestSetupAction[] | 'none';
  /** The skill invocation command (e.g., "/review main") */
  invoke: string;
  /** Assertions to evaluate against the output */
  assertions: TestAssertion[];
}

/**
 * A complete test definition loaded from a YAML file.
 */
export interface TestDefinition {
  /** Test suite name */
  name: string;
  /** Path to the SKILL.md file under test */
  skill: string;
  /** Optional fixtures for test data */
  fixtures?: TestFixture[];
  /** Test scenarios to run */
  scenarios: TestScenario[];
}

/**
 * Result of evaluating a single assertion.
 */
export interface AssertionResult {
  /** The assertion that was evaluated */
  assertion: TestAssertion;
  /** Whether the assertion passed */
  passed: boolean;
  /** Human-readable result message */
  message: string;
}

/**
 * Result of running a single test scenario.
 */
export interface ScenarioResult {
  /** Scenario name */
  scenario: string;
  /** Whether all assertions passed */
  passed: boolean;
  /** Duration in milliseconds */
  duration: number;
  /** Individual assertion results */
  assertionResults: AssertionResult[];
  /** Captured skill output */
  output?: string;
  /** Error message if the scenario failed to run */
  error?: string;
}

/**
 * Complete test report for a test suite.
 */
export interface TestReport {
  /** Test suite name */
  name: string;
  /** Skill path */
  skill: string;
  /** Whether all scenarios passed */
  passed: boolean;
  /** Per-scenario results */
  results: ScenarioResult[];
  /** Total duration in milliseconds */
  totalDuration: number;
  /** Number of passing scenarios */
  passCount: number;
  /** Number of failing scenarios */
  failCount: number;
}
