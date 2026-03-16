import type { TestReport } from '../types.js';

/**
 * Format a test report as a JSON string.
 *
 * @param report - The test report to format
 * @returns Pretty-printed JSON string (2-space indent)
 *
 * @example
 * ```ts
 * const report = await runTests('./tests/review.test.yaml');
 * const json = formatTestReportJson(report);
 * fs.writeFileSync('results.json', json);
 * ```
 */
export function formatTestReportJson(report: TestReport): string {
  return JSON.stringify(report, null, 2);
}
