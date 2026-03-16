import type { TestReport } from '../types.js';

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

/**
 * Format a test report as a human-readable console string with ANSI colors.
 *
 * @param report - The test report to format
 * @returns Formatted string ready for console output
 *
 * @example
 * ```ts
 * const report = await runTests('./tests/review.test.yaml');
 * console.log(formatTestReport(report));
 * ```
 */
export function formatTestReport(report: TestReport): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${BOLD}${report.name}${RESET}`);
  lines.push(`${DIM}skill: ${report.skill}${RESET}`);
  lines.push('');

  for (const result of report.results) {
    const icon = result.passed ? `${GREEN}\u2713${RESET}` : `${RED}\u2717${RESET}`;
    const duration = `${DIM}(${result.duration}ms)${RESET}`;
    lines.push(`  ${icon} ${result.scenario} ${duration}`);

    if (!result.passed) {
      if (result.error) {
        lines.push(`    ${RED}Error: ${result.error}${RESET}`);
      }

      for (const ar of result.assertionResults) {
        if (!ar.passed) {
          lines.push(`    ${RED}\u2717 ${ar.message}${RESET}`);
        }
      }
    }
  }

  lines.push('');

  const summary = [
    report.passCount > 0
      ? `${GREEN}${report.passCount} passed${RESET}`
      : null,
    report.failCount > 0
      ? `${RED}${report.failCount} failed${RESET}`
      : null,
    `${report.results.length} total`,
    `${DIM}(${report.totalDuration}ms)${RESET}`,
  ]
    .filter(Boolean)
    .join(', ');

  lines.push(`  ${summary}`);
  lines.push('');

  return lines.join('\n');
}
