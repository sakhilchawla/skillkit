import { describe, it, expect } from 'vitest';
import { validateDefinition } from '../loader.js';

describe('validateDefinition', () => {
  const validDef = {
    name: 'review tests',
    skill: './SKILL.md',
    scenarios: [
      {
        name: 'basic test',
        invoke: '/review',
        assertions: [{ completes: true }],
      },
    ],
  };

  it('accepts a valid definition', () => {
    const result = validateDefinition(validDef);
    expect(result.name).toBe('review tests');
    expect(result.skill).toBe('./SKILL.md');
    expect(result.scenarios).toHaveLength(1);
  });

  it('rejects when name is missing', () => {
    expect(() => validateDefinition({ ...validDef, name: '' })).toThrow('name');
  });

  it('rejects when skill is missing', () => {
    expect(() => validateDefinition({ ...validDef, skill: '' })).toThrow('skill');
  });

  it('rejects when scenarios is empty', () => {
    expect(() => validateDefinition({ ...validDef, scenarios: [] })).toThrow('scenarios');
  });

  it('rejects when scenarios is not an array', () => {
    expect(() => validateDefinition({ ...validDef, scenarios: 'not-array' })).toThrow('scenarios');
  });

  it('rejects scenario without name', () => {
    expect(() =>
      validateDefinition({
        ...validDef,
        scenarios: [{ invoke: '/review', assertions: [{ completes: true }] }],
      }),
    ).toThrow('name');
  });

  it('rejects scenario without invoke', () => {
    expect(() =>
      validateDefinition({
        ...validDef,
        scenarios: [{ name: 'test', assertions: [{ completes: true }] }],
      }),
    ).toThrow('invoke');
  });

  it('rejects scenario without assertions', () => {
    expect(() =>
      validateDefinition({
        ...validDef,
        scenarios: [{ name: 'test', invoke: '/review' }],
      }),
    ).toThrow('assertions');
  });

  it('rejects scenario with empty assertions', () => {
    expect(() =>
      validateDefinition({
        ...validDef,
        scenarios: [{ name: 'test', invoke: '/review', assertions: [] }],
      }),
    ).toThrow('assertions');
  });

  it('accepts definition with optional fixtures', () => {
    const withFixtures = {
      ...validDef,
      fixtures: [{ name: 'react-app', repo: 'https://github.com/example/app' }],
    };
    const result = validateDefinition(withFixtures);
    expect(result.fixtures).toHaveLength(1);
  });

  it('accepts scenario with optional description and fixture', () => {
    const result = validateDefinition({
      ...validDef,
      scenarios: [
        {
          name: 'test',
          description: 'A test scenario',
          fixture: 'react-app',
          invoke: '/review',
          assertions: [{ completes: true }],
        },
      ],
    });
    expect(result.scenarios[0].description).toBe('A test scenario');
  });
});
