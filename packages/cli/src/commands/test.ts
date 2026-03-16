import { findTestFiles } from '../utils/finder.js';
import { bold, dim, green, red, yellow, cyan } from '../utils/formatter.js';
import { runTests } from '@skillkit/test-harness';
import { formatTestReport } from '@skillkit/test-harness';
import type { TestReport } from '@skillkit/test-harness';

/**
 * `skillkit test [path]` — Find and run skill test definitions.
 *
 * Discovers *.test.yaml files, runs each through the test harness,
 * and reports pass/fail results.
 */
export async function testCommand(args: string[]): Promise<void> {
  const targetPath = args[0] ?? '.';
  const mock = !args.includes('--real');
  const files = await findTestFiles(targetPath);

  if (files.length === 0) {
    console.log(`${dim('No *.test.yaml files found in')} ${bold(targetPath)}`);
    process.exit(0);
  }

  console.log(`${dim(`Found ${files.length} test file(s) in`)} ${bold(targetPath)}`);
  if (mock) {
    console.log(`${dim('Mode:')} ${cyan('mock')} ${dim('(use --real for live execution)')}\n`);
  } else {
    console.log(`${dim('Mode:')} ${yellow('real')}\n`);
  }

  let totalPass = 0;
  let totalFail = 0;
  let totalDuration = 0;
  const reports: TestReport[] = [];

  for (const file of files) {
    try {
      const report = await runTests(file, { mock });
      reports.push(report);
      totalPass += report.passCount;
      totalFail += report.failCount;
      totalDuration += report.totalDuration;
      console.log(formatTestReport(report));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`\n${red('✖')} ${bold(file)}`);
      console.log(`  ${red(message)}\n`);
      totalFail++;
    }
  }

  // Summary
  const total = totalPass + totalFail;
  console.log('');
  if (totalFail > 0) {
    console.log(
      red(`${bold('FAIL')} ${totalFail} failed, ${totalPass} passed, ${total} total (${totalDuration}ms)`),
    );
    process.exit(1);
  } else {
    console.log(
      green(`${bold('PASS')} ${totalPass} passed, ${total} total (${totalDuration}ms)`),
    );
  }
}
