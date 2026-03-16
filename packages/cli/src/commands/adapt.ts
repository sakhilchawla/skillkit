import { bold, dim, yellow } from '../utils/formatter.js';

/**
 * `skillkit adapt [template] [target-repo]` — Generate project-adapted skills.
 * Coming in v0.4.
 */
export async function adaptCommand(_args: string[]): Promise<void> {
  console.log(`\n${yellow(bold('Coming in v0.4'))}`);
  console.log(dim('The adapt command will scan your repo and generate project-specific skills.'));
  console.log(dim('\nFeatures planned:'));
  console.log(dim('  - Auto-detect stack (framework, styling, testing, build tools)'));
  console.log(dim('  - Parameterized skill templates'));
  console.log(dim('  - Generate /create-component, /create-module, etc. for YOUR conventions'));
  console.log(dim('\nTrack progress: https://github.com/skillkit/skillkit/issues'));
}
