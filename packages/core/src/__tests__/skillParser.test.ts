import { describe, it, expect } from 'vitest';
import { parseSkill } from '../parser/skillParser.js';

describe('parseSkill', () => {
  it('parses valid SKILL.md with all frontmatter fields', () => {
    const content = [
      '---',
      'name: review',
      'description: Pre-landing code review',
      'user-invocable: true',
      'allowed-tools: Read, Grep, Glob',
      'model: sonnet',
      'context: fork',
      'agent: true',
      'argument-hint: "<PR number>"',
      'disable-model-invocation: false',
      '---',
      '# Review instructions',
      '',
      'Do a thorough review.',
    ].join('\n');

    const result = parseSkill(content);

    expect(result.errors).toHaveLength(0);
    expect(result.skill.frontmatter.name).toBe('review');
    expect(result.skill.frontmatter.description).toBe('Pre-landing code review');
    expect(result.skill.frontmatter['user-invocable']).toBe(true);
    expect(result.skill.frontmatter['allowed-tools']).toBe('Read, Grep, Glob');
    expect(result.skill.frontmatter.model).toBe('sonnet');
    expect(result.skill.frontmatter.context).toBe('fork');
    expect(result.skill.frontmatter.agent).toBe(true);
    expect(result.skill.frontmatter['argument-hint']).toBe('<PR number>');
    expect(result.skill.frontmatter['disable-model-invocation']).toBe(false);
    expect(result.skill.body).toBe('# Review instructions\n\nDo a thorough review.');
  });

  it('parses minimal SKILL.md (just name and description)', () => {
    const content = [
      '---',
      'name: deploy',
      'description: Deploy to production',
      '---',
      'Run the deploy script.',
    ].join('\n');

    const result = parseSkill(content);

    expect(result.errors).toHaveLength(0);
    expect(result.skill.frontmatter.name).toBe('deploy');
    expect(result.skill.frontmatter.description).toBe('Deploy to production');
    expect(result.skill.body).toBe('Run the deploy script.');
  });

  it('returns error when no frontmatter (no opening ---)', () => {
    const content = 'Just some markdown without frontmatter.';

    const result = parseSkill(content);

    expect(result.errors.length).toBeGreaterThan(0);
    const fmError = result.errors.find((e) =>
      e.message.includes('No frontmatter found'),
    );
    expect(fmError).toBeDefined();
    expect(fmError!.field).toBe('frontmatter');
    expect(result.skill.body).toBe(content);
  });

  it('returns error when unclosed frontmatter (opening --- but no closing ---)', () => {
    const content = ['---', 'name: broken', 'description: oops'].join('\n');

    const result = parseSkill(content);

    const fmError = result.errors.find((e) =>
      e.message.includes('Unclosed frontmatter'),
    );
    expect(fmError).toBeDefined();
    expect(fmError!.field).toBe('frontmatter');
  });

  it('returns error for malformed YAML', () => {
    const content = ['---', 'name: test', '  bad indent: [', '---', 'body'].join(
      '\n',
    );

    const result = parseSkill(content);

    const yamlError = result.errors.find((e) =>
      e.message.includes('Invalid YAML'),
    );
    expect(yamlError).toBeDefined();
    expect(yamlError!.field).toBe('frontmatter');
  });

  it('returns error when name is missing', () => {
    const content = [
      '---',
      'description: A skill without a name',
      '---',
      'body',
    ].join('\n');

    const result = parseSkill(content);

    const nameError = result.errors.find(
      (e) => e.field === 'name' && e.message.includes('Missing required field'),
    );
    expect(nameError).toBeDefined();
  });

  it('returns error when description is missing', () => {
    const content = ['---', 'name: lonely', '---', 'body'].join('\n');

    const result = parseSkill(content);

    const descError = result.errors.find(
      (e) =>
        e.field === 'description' &&
        e.message.includes('Missing required field'),
    );
    expect(descError).toBeDefined();
  });

  it('returns error when description is empty string', () => {
    const content = [
      '---',
      'name: empty-desc',
      "description: ''",
      '---',
      'body',
    ].join('\n');

    const result = parseSkill(content);

    const descError = result.errors.find(
      (e) =>
        e.field === 'description' &&
        e.message.includes('Missing required field'),
    );
    expect(descError).toBeDefined();
  });

  it('calculates correct metadata (lineCount, frontmatterLineCount, bodyLineCount)', () => {
    const content = [
      '---',           // line 1
      'name: meta',    // line 2
      'description: Test metadata', // line 3
      '---',           // line 4
      'Line one.',     // line 5
      'Line two.',     // line 6
      'Line three.',   // line 7
    ].join('\n');

    const result = parseSkill(content);

    expect(result.metadata.lineCount).toBe(7);
    // frontmatterLineCount = endIndex + 1 = 3 + 1 = 4 (includes both --- lines and content between)
    expect(result.metadata.frontmatterLineCount).toBe(4);
    expect(result.metadata.bodyLineCount).toBe(3);
  });

  it('estimates tokens approximately correctly (words / 0.75)', () => {
    // Body with exactly 15 words
    const bodyWords = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen';
    const content = [
      '---',
      'name: tokens',
      'description: Token estimation test',
      '---',
      bodyWords,
    ].join('\n');

    const result = parseSkill(content);

    // 15 words / 0.75 = 20
    expect(result.metadata.estimatedTokens).toBe(Math.ceil(15 / 0.75));
  });

  it('preserves filePath in result when provided', () => {
    const content = [
      '---',
      'name: pathed',
      'description: Has a path',
      '---',
      'body',
    ].join('\n');

    const result = parseSkill(content, '/skills/review/SKILL.md');

    expect(result.skill.filePath).toBe('/skills/review/SKILL.md');
    expect(result.metadata.filePath).toBe('/skills/review/SKILL.md');
  });

  it('uses <inline> as default filePath when none provided', () => {
    const content = [
      '---',
      'name: inline',
      'description: No path',
      '---',
      'body',
    ].join('\n');

    const result = parseSkill(content);

    expect(result.skill.filePath).toBeUndefined();
    expect(result.metadata.filePath).toBe('<inline>');
  });

  it('handles empty body gracefully', () => {
    const content = [
      '---',
      'name: nobody',
      'description: Skill with empty body',
      '---',
      '',
    ].join('\n');

    const result = parseSkill(content);

    expect(result.errors).toHaveLength(0);
    expect(result.skill.body).toBe('');
    expect(result.metadata.bodyLineCount).toBe(0);
    expect(result.metadata.estimatedTokens).toBe(0);
  });

  it('handles frontmatter-only file (no body after closing ---)', () => {
    const content = [
      '---',
      'name: fmonly',
      'description: Frontmatter only',
      '---',
    ].join('\n');

    const result = parseSkill(content);

    expect(result.errors).toHaveLength(0);
    expect(result.skill.body).toBe('');
    expect(result.metadata.bodyLineCount).toBe(0);
  });

  it('parses boolean fields (user-invocable: true)', () => {
    const content = [
      '---',
      'name: booltest',
      'description: Boolean field test',
      'user-invocable: true',
      '---',
      'body',
    ].join('\n');

    const result = parseSkill(content);

    expect(result.errors).toHaveLength(0);
    expect(result.skill.frontmatter['user-invocable']).toBe(true);
  });

  it('parses allowed-tools as string', () => {
    const content = [
      '---',
      'name: tooltest',
      'description: Tools field test',
      'allowed-tools: Read, Write, Bash',
      '---',
      'body',
    ].join('\n');

    const result = parseSkill(content);

    expect(result.errors).toHaveLength(0);
    expect(result.skill.frontmatter['allowed-tools']).toBe('Read, Write, Bash');
  });
});
