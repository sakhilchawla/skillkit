#!/usr/bin/env node

import { LOGO, bold, dim, cyan } from './utils/formatter.js';
import { lintCommand } from './commands/lint.js';
import { testCommand } from './commands/test.js';
import { initCommand } from './commands/init.js';
import { adaptCommand } from './commands/adapt.js';

const VERSION = '0.1.0';

const HELP = `${LOGO}
${bold('Usage:')} skillkit <command> [options]

${bold('Commands:')}
  ${cyan('lint')} [path]              Lint SKILL.md files against spec and best practices
  ${cyan('test')} [path]              Run skill test definitions (v0.2)
  ${cyan('init')} <name>              Scaffold a new skill
  ${cyan('adapt')} <template> <repo>  Generate project-adapted skills (v0.4)

${bold('Options:')}
  --help, -h              Show this help message
  --version, -v           Show version

${bold('Examples:')}
  skillkit lint .                     Lint all skills in current directory
  skillkit lint ~/.claude/skills      Lint global skills
  skillkit init review                Create a new review skill
  skillkit test examples/             Run tests in examples directory

${dim('Documentation: https://github.com/skillkit/skillkit')}
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }

  if (command === '--version' || command === '-v') {
    console.log(VERSION);
    return;
  }

  const commandArgs = args.slice(1);

  switch (command) {
    case 'lint':
      await lintCommand(commandArgs);
      break;
    case 'test':
      await testCommand(commandArgs);
      break;
    case 'init':
      await initCommand(commandArgs);
      break;
    case 'adapt':
      await adaptCommand(commandArgs);
      break;
    default:
      console.error(`Unknown command: ${command}\nRun "skillkit --help" for usage.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
