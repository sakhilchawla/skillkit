import type { LintConfig } from '@skillkit-llm/linter';
import { LintEngine } from '@skillkit-llm/linter';
import { findSkillFiles } from '../utils/finder.js';
import { formatLintReport, bold, red, green, dim } from '../utils/formatter.js';

const VALID_PRESETS = ['strict', 'recommended', 'minimal', 'research'] as const;

function parsePreset(args: string[]): LintConfig['preset'] {
  const idx = args.indexOf('--preset');
  if (idx === -1 || idx + 1 >= args.length) return 'recommended';
  const value = args[idx + 1];
  if (!(VALID_PRESETS as readonly string[]).includes(value)) {
    console.error(`Unknown preset: "${value}". Valid presets: ${VALID_PRESETS.join(', ')}`);
    process.exit(1);
  }
  return value as LintConfig['preset'];
}

function parseTargetPath(args: string[]): string {
  for (const arg of args) {
    if (arg !== '--preset' && !VALID_PRESETS.includes(arg as typeof VALID_PRESETS[number])) {
      return arg;
    }
  }
  return '.';
}

/**
 * `skillkit lint [path] [--preset <name>]` — Find and lint all SKILL.md files.
 */
export async function lintCommand(args: string[]): Promise<void> {
  const preset = parsePreset(args);
  const targetPath = parseTargetPath(args);
  const files = await findSkillFiles(targetPath);

  if (files.length === 0) {
    console.log(`${dim('No SKILL.md files found in')} ${bold(targetPath)}`);
    process.exit(0);
  }

  console.log(`${dim(`Found ${files.length} skill(s) in`)} ${bold(targetPath)} ${dim(`[preset: ${preset}]`)}\n`);

  const engine = new LintEngine({ preset });
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
