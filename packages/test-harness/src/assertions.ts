import type { AssertionResult, TestAssertion } from './types.js';

/**
 * Evaluate a single assertion against skill output.
 *
 * Each assertion type uses a pure matching strategy with no side effects.
 *
 * @param output - The captured skill output text
 * @param assertion - The assertion to evaluate
 * @param completed - Whether the skill invocation completed successfully
 * @returns Result with pass/fail status and descriptive message
 */
export function evaluateAssertion(
  output: string,
  assertion: TestAssertion,
  completed: boolean,
): AssertionResult {
  if (assertion.contains !== undefined) {
    const passed = output.includes(assertion.contains);
    return {
      assertion,
      passed,
      message: passed
        ? `Output contains "${assertion.contains}"`
        : `Expected output to contain "${assertion.contains}"`,
    };
  }

  if (assertion.notContains !== undefined) {
    const passed = !output.includes(assertion.notContains);
    return {
      assertion,
      passed,
      message: passed
        ? `Output does not contain "${assertion.notContains}"`
        : `Expected output to not contain "${assertion.notContains}"`,
    };
  }

  if (assertion.matchesPattern !== undefined) {
    const regex = new RegExp(assertion.matchesPattern);
    const passed = regex.test(output);
    return {
      assertion,
      passed,
      message: passed
        ? `Output matches pattern /${assertion.matchesPattern}/`
        : `Expected output to match pattern /${assertion.matchesPattern}/`,
    };
  }

  if (assertion.severity !== undefined) {
    const passed = output.includes(assertion.severity);
    return {
      assertion,
      passed,
      message: passed
        ? `Output contains severity "${assertion.severity}"`
        : `Expected output to contain severity "${assertion.severity}"`,
    };
  }

  if (assertion.completes !== undefined) {
    const passed = completed === assertion.completes;
    return {
      assertion,
      passed,
      message: passed
        ? `Skill invocation completed as expected`
        : `Expected skill to ${assertion.completes ? 'complete' : 'not complete'}, but it ${completed ? 'completed' : 'did not complete'}`,
    };
  }

  if (assertion.noErrors !== undefined) {
    const hasErrors = output.toLowerCase().includes('error');
    const passed = assertion.noErrors ? !hasErrors : hasErrors;
    return {
      assertion,
      passed,
      message: passed
        ? `Output has no error indicators`
        : `Expected no errors in output, but found error indicator`,
    };
  }

  if (assertion.noCriticalIssues !== undefined) {
    const hasCritical = /\b(critical|blocker)\b/i.test(output);
    const passed = assertion.noCriticalIssues ? !hasCritical : hasCritical;
    return {
      assertion,
      passed,
      message: passed
        ? `Output has no critical/blocker issues`
        : `Expected no critical issues, but found critical/blocker indicator`,
    };
  }

  if (assertion.maxTokens !== undefined) {
    const wordCount = output.split(/\s+/).filter((w) => w.length > 0).length;
    const estimatedTokens = Math.ceil(wordCount / 0.75);
    const passed = estimatedTokens <= assertion.maxTokens;
    return {
      assertion,
      passed,
      message: passed
        ? `Output token estimate (${estimatedTokens}) within limit (${assertion.maxTokens})`
        : `Output token estimate (${estimatedTokens}) exceeds limit (${assertion.maxTokens})`,
    };
  }

  return {
    assertion,
    passed: false,
    message: 'Unknown assertion type',
  };
}

/**
 * Evaluate all assertions for a scenario against skill output.
 *
 * @param output - The captured skill output text
 * @param assertions - Array of assertions to evaluate
 * @param completed - Whether the skill invocation completed successfully
 * @returns Array of assertion results in the same order as input
 */
export function evaluateAllAssertions(
  output: string,
  assertions: TestAssertion[],
  completed: boolean,
): AssertionResult[] {
  return assertions.map((assertion) =>
    evaluateAssertion(output, assertion, completed),
  );
}
