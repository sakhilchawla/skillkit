/**
 * Configuration for the skill invoker.
 */
export interface InvokerConfig {
  /** AI coding agent provider identifier */
  provider: string;
  /** Custom command to run (overrides provider lookup) */
  command?: string;
  /** Additional arguments to pass to the command */
  args?: string[];
  /** Timeout in milliseconds (default: 120000) */
  timeout?: number;
  /** Environment variables to set for the subprocess */
  env?: Record<string, string>;
  /** Working directory for the subprocess */
  cwd?: string;
}

/**
 * Result of invoking a skill via subprocess.
 */
export interface InvocationResult {
  /** Captured stdout */
  output: string;
  /** Captured stderr */
  stderr: string;
  /** Process exit code */
  exitCode: number;
  /** Whether the process completed before timeout */
  completed: boolean;
  /** Wall-clock duration in milliseconds */
  duration: number;
}

/**
 * Default command templates for known AI coding agent providers.
 * Each entry maps a provider name to its base command and flags.
 */
export const PROVIDER_COMMANDS: Record<string, string[]> = {
  'claude-code': ['claude', '-p'],
  'codex': ['codex', '--skill'],
  'gemini-cli': ['gemini', '--skill'],
};
