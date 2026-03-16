import { describe, it, expect } from 'vitest';
import {
  isValidFrontmatterField,
  isKnownTool,
  parseAllowedTools,
  REQUIRED_FIELDS,
  OPTIONAL_FIELDS,
  KNOWN_TOOLS,
} from '../spec/agentSkillsSpec.js';

describe('isValidFrontmatterField', () => {
  it('returns true for all required fields', () => {
    for (const field of REQUIRED_FIELDS) {
      expect(isValidFrontmatterField(field)).toBe(true);
    }
  });

  it('returns true for all optional fields', () => {
    for (const field of OPTIONAL_FIELDS) {
      expect(isValidFrontmatterField(field)).toBe(true);
    }
  });

  it('returns false for unknown fields', () => {
    expect(isValidFrontmatterField('foo')).toBe(false);
    expect(isValidFrontmatterField('version')).toBe(false);
    expect(isValidFrontmatterField('')).toBe(false);
    expect(isValidFrontmatterField('Name')).toBe(false);
  });
});

describe('isKnownTool', () => {
  it('returns true for all known tools', () => {
    for (const tool of KNOWN_TOOLS) {
      expect(isKnownTool(tool)).toBe(true);
    }
  });

  it('returns false for unknown tools', () => {
    expect(isKnownTool('FooTool')).toBe(false);
    expect(isKnownTool('read')).toBe(false);
    expect(isKnownTool('')).toBe(false);
    expect(isKnownTool('bash')).toBe(false);
  });
});

describe('parseAllowedTools', () => {
  it('splits comma-separated correctly', () => {
    expect(parseAllowedTools('Read,Write,Bash')).toEqual([
      'Read',
      'Write',
      'Bash',
    ]);
  });

  it('trims whitespace', () => {
    expect(parseAllowedTools('Read , Write , Bash')).toEqual([
      'Read',
      'Write',
      'Bash',
    ]);
  });

  it('handles empty string', () => {
    expect(parseAllowedTools('')).toEqual([]);
  });
});
