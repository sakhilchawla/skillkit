import { findTestFiles } from '../utils/finder.js';
import { bold, dim, green, red, yellow, cyan } from '../utils/formatter.js';
import { runTests } from '@skillkit/test-harness';
import { formatTestReport } from '@skillkit/test-harness';
import type { TestReport } from '@skillkit/test-harness';

/**
 * Parse a flag value from the args array.
 * Looks for `--flag value` pairs and returns the value, or undefined if not found.
 */
function parseFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
}

/**
 * Filter out recognized flags and their values from args, returning positional args only.
 */
function positionalArgs(args: string[]): string[] {
  const flags = new Set(['--provider', '--command', '--timeout']);
  const result: string[] = [];
  let i = 0;
  while (i < args.length) {
    if (flags.has(args[i]) && i + 1 < args.length) {
      i += 2; // skip flag and its value
    } else if (args[i] === '--real') {
      i += 1; // skip boolean flag
    } else {
      result.push(args[i]);
      i += 1;
    }
  }
  return result;
}

/**
 * Invoker configuration for real mode execution.
 */
interface InvokerConfig {
  /** Provider name (e.g., 'claude-code', 'codex', 'gemini-cli') */
  provider: string;
  /** Custom command override (e.g., 'claude', 'codex') */
  command?: string;
  /** Timeout in milliseconds for each scenario */
  timeout: number;
}

/**
 * `skillkit test [path]` — Find and run skill test definitions.
 *
 * Discovers *.test.yaml files, runs each through the test harness,
 * and reports pass/fail results.
 *
 * Flags:
 *   --real                 Run in real mode (invoke actual AI model)
 *   --provider <name>      Provider to use in real mode (default: claude-code)
 *   --command <cmd>        Custom command override for skill invocation
 *   --timeout <ms>         Per-scenario timeout in milliseconds (default: 120000)
 */
export async function testCommand(args: string[]): Promise<void> {
  const isReal = args.includes('--real');
  const provider = parseFlag(args, '--provider') ?? 'claude-code';
  const command = parseFlag(args, '--command');
  const timeout = parseInt(parseFlag(args, '--timeout') ?? '120000', 10);

  const positional = positionalArgs(args);
  const targetPath = positional[0] ?? '.';
  const mock = !isReal;

  const files = await findTestFiles(targetPath);

  if (files.length === 0) {
    console.log(`${dim('No *.test.yaml files found in')} ${bold(targetPath)}`);
    process.exit(0);
  }

  console.log(`${dim(`Found ${files.length} test file(s) in`)} ${bold(targetPath)}`);
  if (mock) {
    console.log(`${dim('Mode:')} ${cyan('mock')} ${dim('(use --real for live execution)')}\n`);
  } else {
    const invokerConfig: InvokerConfig = { provider, command, timeout };
    console.log(`${dim('Mode:')} ${yellow('real')}`);
    console.log(`${dim('Provider:')} ${cyan(invokerConfig.provider)}${invokerConfig.command ? ` ${dim('(command:')} ${cyan(invokerConfig.command)}${dim(')')}` : ''}`);
    console.log(`${dim('Timeout:')} ${cyan(String(invokerConfig.timeout) + 'ms')}\n`);
  }

  let totalPass = 0;
  let totalFail = 0;
  let totalDuration = 0;
  const reports: TestReport[] = [];

  // Build run options — in real mode, pass invoker config
  const runOptions: { mock: boolean; timeout?: number; provider?: string; command?: string } = { mock };
  if (!mock) {
    runOptions.timeout = timeout;
    runOptions.provider = provider;
    if (command) runOptions.command = command;
  }

  for (const file of files) {
    try {
      const report = await runTests(file, runOptions);
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
