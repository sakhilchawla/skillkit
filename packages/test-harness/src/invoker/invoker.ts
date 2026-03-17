import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';
import type { InvokerConfig, InvocationResult } from './types.js';
import { PROVIDER_COMMANDS } from './types.js';

/**
 * Resolve the executable command array from an invoker config.
 *
 * If `config.command` is set, it is used directly (split with optional extra args).
 * Otherwise, the provider name is looked up in {@link PROVIDER_COMMANDS}.
 *
 * @param config - Invoker configuration
 * @returns Array of command parts (executable + flags)
 * @throws Error if provider is unknown and no custom command is set
 */
export function resolveCommand(config: InvokerConfig): string[] {
  if (config.command) {
    const parts = [config.command];
    if (config.args) {
      parts.push(...config.args);
    }
    return parts;
  }

  const providerCmd = PROVIDER_COMMANDS[config.provider];
  if (!providerCmd) {
    throw new Error(
      `Unknown provider "${config.provider}" and no custom command specified. ` +
        `Known providers: ${Object.keys(PROVIDER_COMMANDS).join(', ')}`,
    );
  }

  const parts = [...providerCmd];
  if (config.args) {
    parts.push(...config.args);
  }
  return parts;
}

/**
 * Invoke a skill by spawning a subprocess.
 *
 * Captures stdout, stderr, exit code, and handles timeout. On timeout the
 * child process tree is killed and `completed` is set to `false`.
 *
 * @param skillPath - Absolute path to the SKILL.md file
 * @param invokeArgs - Invocation arguments (e.g., "main" for "/review main")
 * @param config - Invoker configuration
 * @returns Invocation result with captured output and metadata
 */
export async function invokeSkill(
  skillPath: string,
  invokeArgs: string,
  config: InvokerConfig,
): Promise<InvocationResult> {
  const commandParts = resolveCommand(config);
  const executable = commandParts[0];
  const args = [...commandParts.slice(1), skillPath, invokeArgs];
  const timeout = config.timeout ?? 120_000;
  const cwd = config.cwd ?? resolvePath('.');

  const startTime = performance.now();

  return new Promise<InvocationResult>((resolvePromise) => {
    let stdout = '';
    let stderr = '';
    let completed = false;
    let timedOut = false;

    const child = spawn(executable, args, {
      cwd,
      env: { ...process.env, ...config.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      // Force kill if SIGTERM doesn't work after 1s
      setTimeout(() => {
        if (!completed) {
          child.kill('SIGKILL');
        }
      }, 1000);
    }, timeout);

    child.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      const duration = Math.round(performance.now() - startTime);

      if (err.code === 'ENOENT') {
        resolvePromise({
          output: '',
          stderr: `Command not found: ${executable}. Ensure the provider CLI is installed and on PATH.`,
          exitCode: 127,
          completed: false,
          duration,
        });
        return;
      }

      resolvePromise({
        output: stdout,
        stderr: stderr || err.message,
        exitCode: 1,
        completed: false,
        duration,
      });
    });

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      completed = true;
      const duration = Math.round(performance.now() - startTime);

      resolvePromise({
        output: stdout,
        stderr,
        exitCode: code ?? 1,
        completed: !timedOut,
        duration,
      });
    });
  });
}

/**
 * Check whether a provider's CLI tool is available on the system PATH.
 *
 * @param provider - Provider name (e.g., 'claude-code') or executable name
 * @returns `true` if the command is found on PATH
 */
export async function isProviderAvailable(provider: string): Promise<boolean> {
  const providerCmd = PROVIDER_COMMANDS[provider];
  const executable = providerCmd ? providerCmd[0] : provider;

  return new Promise<boolean>((resolvePromise) => {
    const child = spawn('which', [executable], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.on('close', (code: number | null) => {
      resolvePromise(code === 0);
    });

    child.on('error', () => {
      resolvePromise(false);
    });
  });
}
