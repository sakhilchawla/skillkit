import type { LintReport } from '@skillkit/linter';

// ANSI color codes (no dependencies)
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

export const bold = (s: string) => `${BOLD}${s}${RESET}`;
export const dim = (s: string) => `${DIM}${s}${RESET}`;
export const red = (s: string) => `${RED}${s}${RESET}`;
export const green = (s: string) => `${GREEN}${s}${RESET}`;
export const yellow = (s: string) => `${YELLOW}${s}${RESET}`;
export const cyan = (s: string) => `${CYAN}${s}${RESET}`;

export const LOGO = `
${BOLD}${CYAN}  skillkit${RESET} ${DIM}v0.1.0${RESET}
${DIM}  Build, test, lint Agent Skills${RESET}
`;

const SEVERITY_ICONS: Record<string, string> = {
  error: red('✖'),
  warn: yellow('⚠'),
  info: dim('ℹ'),
};

/** Format a lint report for console output */
export function formatLintReport(report: LintReport): string {
  const lines: string[] = [];
  lines.push(`\n${bold(report.filePath)}`);

  if (report.results.length === 0) {
    lines.push(`  ${green('✓')} No issues found`);
    return lines.join('\n');
  }

  for (const result of report.results) {
    const icon = SEVERITY_ICONS[result.severity] ?? '?';
    const loc = result.line ? dim(`:${result.line}`) : '';
    lines.push(`  ${icon} ${result.message}${loc} ${dim(`(${result.ruleId})`)}`);
    if (result.suggestion) {
      lines.push(`    ${dim(`→ ${result.suggestion}`)}`);
    }
  }

  const summary: string[] = [];
  if (report.errorCount > 0) summary.push(red(`${report.errorCount} error(s)`));
  if (report.warnCount > 0) summary.push(yellow(`${report.warnCount} warning(s)`));
  if (report.infoCount > 0) summary.push(dim(`${report.infoCount} info`));
  lines.push(`\n  ${summary.join(', ')}`);

  return lines.join('\n');
}
