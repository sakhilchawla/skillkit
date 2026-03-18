import { describe, it, expect } from 'vitest';
import { resolveCommand, invokeSkill, isProviderAvailable } from '../invoker/invoker.js';
import { PROVIDER_COMMANDS } from '../invoker/types.js';
import type { InvokerConfig } from '../invoker/types.js';

describe('resolveCommand', () => {
  it('resolves claude-code provider to correct command', () => {
    const config: InvokerConfig = { provider: 'claude-code' };
    const result = resolveCommand(config);
    expect(result).toEqual(['claude', '-p']);
  });

  it('resolves codex provider to correct command', () => {
    const config: InvokerConfig = { provider: 'codex' };
    const result = resolveCommand(config);
    expect(result).toEqual(['codex', '--skill']);
  });

  it('resolves gemini-cli provider to correct command', () => {
    const config: InvokerConfig = { provider: 'gemini-cli' };
    const result = resolveCommand(config);
    expect(result).toEqual(['gemini', '--skill']);
  });

  it('appends extra args to provider command', () => {
    const config: InvokerConfig = { provider: 'claude-code', args: ['--verbose'] };
    const result = resolveCommand(config);
    expect(result).toEqual(['claude', '-p', '--verbose']);
  });

  it('uses custom command when specified', () => {
    const config: InvokerConfig = { provider: 'custom', command: '/usr/bin/my-agent' };
    const result = resolveCommand(config);
    expect(result).toEqual(['/usr/bin/my-agent']);
  });

  it('uses custom command with args', () => {
    const config: InvokerConfig = {
      provider: 'custom',
      command: 'my-agent',
      args: ['--flag', 'value'],
    };
    const result = resolveCommand(config);
    expect(result).toEqual(['my-agent', '--flag', 'value']);
  });

  it('throws for unknown provider without custom command', () => {
    const config: InvokerConfig = { provider: 'unknown-provider' };
    expect(() => resolveCommand(config)).toThrow('Unknown provider "unknown-provider"');
  });

  it('throws with list of known providers in error message', () => {
    const config: InvokerConfig = { provider: 'nonexistent' };
    expect(() => resolveCommand(config)).toThrow('Known providers:');
  });
});

describe('invokeSkill', () => {
  it('runs echo command and captures stdout', async () => {
    const config: InvokerConfig = {
      provider: 'custom',
      command: 'echo',
      args: [],
      timeout: 5000,
    };
    const result = await invokeSkill('hello', 'world', config);
    expect(result.output.trim()).toBe('hello world');
    expect(result.exitCode).toBe(0);
    expect(result.completed).toBe(true);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('captures stderr from a command', async () => {
    const config: InvokerConfig = {
      provider: 'custom',
      command: 'bash',
      args: ['-c', 'echo error-output >&2; exit 0'],
      timeout: 5000,
    };
    // invokeSkill appends skillPath and invokeArgs, but bash -c uses only the first arg
    // So we use a different approach: use the full command through bash
    const bashConfig: InvokerConfig = {
      provider: 'custom',
      command: 'bash',
      args: ['-c', 'echo stderr-msg >&2'],
      timeout: 5000,
    };
    const result = await invokeSkill('', '', bashConfig);
    expect(result.stderr).toContain('stderr-msg');
  });

  it('returns non-zero exit code for failing command', async () => {
    const config: InvokerConfig = {
      provider: 'custom',
      command: 'false',
      timeout: 5000,
    };
    const result = await invokeSkill('', '', config);
    expect(result.exitCode).not.toBe(0);
    expect(result.completed).toBe(true);
  });

  it('handles timeout by killing the process', async () => {
    const config: InvokerConfig = {
      provider: 'custom',
      command: 'bash',
      args: ['-c', 'sleep 30'],
      timeout: 100,
    };
    const result = await invokeSkill('', '', config);
    expect(result.completed).toBe(false);
    expect(result.duration).toBeLessThan(5000);
  });

  it('returns completed=false on timeout', async () => {
    const config: InvokerConfig = {
      provider: 'custom',
      command: 'bash',
      args: ['-c', 'sleep 30'],
      timeout: 100,
    };
    const result = await invokeSkill('', '', config);
    expect(result.completed).toBe(false);
  });

  it('handles ENOENT for missing command', async () => {
    const config: InvokerConfig = {
      provider: 'custom',
      command: 'nonexistent-command-xyz-123',
      timeout: 5000,
    };
    const result = await invokeSkill('test', 'args', config);
    expect(result.exitCode).toBe(127);
    expect(result.completed).toBe(false);
    expect(result.stderr).toContain('Command not found');
  });

  it('measures duration', async () => {
    const config: InvokerConfig = {
      provider: 'custom',
      command: 'echo',
      timeout: 5000,
    };
    const result = await invokeSkill('timing-test', '', config);
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.duration).toBeLessThan(5000);
  });
});

describe('isProviderAvailable', () => {
  it('returns true for echo (available on all systems)', async () => {
    const available = await isProviderAvailable('echo');
    expect(available).toBe(true);
  });

  it('returns false for nonexistent tool', async () => {
    const available = await isProviderAvailable('nonexistent-tool-abc-xyz-999');
    expect(available).toBe(false);
  });

  it('checks provider name against PROVIDER_COMMANDS', async () => {
    // claude-code maps to 'claude' executable which likely isn't installed in test env
    // but the function should still work without throwing
    const available = await isProviderAvailable('claude-code');
    expect(typeof available).toBe('boolean');
  });
});
