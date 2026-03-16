import { LintEngine } from '@skillkit/linter';
import { findSkillFiles } from '../utils/finder.js';
import { formatLintReport, bold, red, green, dim } from '../utils/formatter.js';

/**
 * `skillkit lint [path]` — Find and lint all SKILL.md files.
 */
export async function lintCommand(args: string[]): Promise<void> {
  const targetPath = args[0] ?? '.';
  const files = await findSkillFiles(targetPath);

  if (files.length === 0) {
    console.log(`${dim('No SKILL.md files found in')} ${bold(targetPath)}`);
    process.exit(0);
  }

  console.log(`${dim(`Found ${files.length} skill(s) in`)} ${bold(targetPath)}\n`);

  const engine = new LintEngine({ preset: 'recommended' });
  let totalErrors = 0;
  let totalWarns = 0;

  for (const file of files) {
    const report = await engine.lintFile(file);
    console.log(formatLintReport(report));
    totalErrors += report.errorCount;
    totalWarns += report.warnCount;
  }

  console.log('');
  if (totalErrors > 0) {
    console.log(red(`${bold('FAIL')} ${totalErrors} error(s), ${totalWarns} warning(s) across ${files.length} file(s)`));
    process.exit(1);
  } else if (totalWarns > 0) {
    console.log(green(`${bold('PASS')} with ${totalWarns} warning(s) across ${files.length} file(s)`));
  } else {
    console.log(green(`${bold('PASS')} All ${files.length} skill(s) look great!`));
  }
}
