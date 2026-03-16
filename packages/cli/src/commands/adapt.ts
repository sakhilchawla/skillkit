import * as path from 'node:path';
import { bold, dim, green, cyan, yellow, red } from '../utils/formatter.js';

/**
 * `skillkit adapt <template> [repo-path]` -- Generate project-adapted skills.
 *
 * Scans a repository, detects its tech stack and conventions, then renders
 * a parameterized skill template into a project-specific SKILL.md.
 */
export async function adaptCommand(args: string[]): Promise<void> {
  const templateName = args[0];

  if (!templateName || templateName === '--help' || templateName === '-h') {
    printUsage();
    return;
  }

  const repoPath = path.resolve(args[1] ?? '.');

  try {
    // Dynamic import to avoid hard failure if adapters isn't installed
    const { adaptAndSave, detectStack, listTemplateNames } = await import('@skillkit/adapters');

    // Validate template name
    const available = listTemplateNames();
    const { resolveTemplate } = await import('@skillkit/adapters');
    const template = resolveTemplate(templateName);
    if (!template) {
      console.error(`\n${red(`Unknown template: "${templateName}"`)}`);
      console.log(`\nAvailable templates: ${available.join(', ')}`);
      process.exit(1);
    }

    console.log(`\n${bold('Scanning')} ${dim(repoPath)}`);

    // Detect stack first for the summary
    const stack = await detectStack(repoPath);

    // Print detected stack summary
    console.log(`\n${bold('Detected stack:')}`);
    console.log(`  Language:       ${cyan(stack.language)}`);
    if (stack.framework) console.log(`  Framework:      ${cyan(stack.framework)}`);
    if (stack.styling) console.log(`  Styling:        ${cyan(stack.styling)}`);
    if (stack.testing) console.log(`  Testing:        ${cyan(stack.testing)}`);
    if (stack.stateManagement) console.log(`  State:          ${cyan(stack.stateManagement)}`);
    if (stack.buildTool) console.log(`  Build tool:     ${cyan(stack.buildTool)}`);
    if (stack.monorepo) console.log(`  Monorepo:       ${cyan('yes')}`);
    console.log(`  Package manager: ${cyan(stack.packageManager)}`);

    // Adapt and save the skill
    console.log(`\n${dim('Generating skill from template:')} ${bold(template.name)}`);
    const result = await adaptAndSave(templateName, repoPath);

    // Print success
    console.log(`\n${green('Generated:')} ${result.outputPath}`);
    console.log(`  Template:  ${dim(result.templateName)}`);

    const stackParts = [stack.language, stack.framework, stack.styling, stack.testing]
      .filter(Boolean)
      .join(' / ');
    console.log(`  Stack:     ${dim(stackParts)}`);
    console.log(`  Output:    ${dim(result.outputPath)}`);

    // Determine the slash command name from the template
    const slashName = template.name.startsWith('create-')
      ? template.name
      : `create-${template.name}`;
    console.log(`\n  ${dim('Try it:')} ${cyan(`/${slashName} MyItem`)}`);
    console.log('');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n${red(bold('Error:'))} ${message}`);
    process.exit(1);
  }
}

function printUsage(): void {
  console.log(`\n${bold('Usage:')} skillkit adapt <template> [repo-path]`);
  console.log(`\n${bold('Templates:')}`);
  console.log(`  ${cyan('component')}   Generate a /create-component skill for your project`);
  console.log(`  ${cyan('module')}      Generate a /create-module skill for your project`);
  console.log(`  ${cyan('test')}        Generate a /create-test skill for your project`);
  console.log(`\n${bold('Arguments:')}`);
  console.log(`  template    Template name: component, module, test (or full name like create-component)`);
  console.log(`  repo-path   Path to the repository to scan (default: current directory)`);
  console.log(`\n${bold('Examples:')}`);
  console.log(`  skillkit adapt component`);
  console.log(`  skillkit adapt module ./my-project`);
  console.log(`  skillkit adapt test /path/to/repo`);
  console.log(`\n${dim('The command scans your repo, detects your stack, and generates')}`);
  console.log(`${dim('a project-specific skill saved to .claude/skills/.')}`);
  console.log(`\n${dim('See docs/GUIDE_ADAPT.md for full documentation.')}`);
}
