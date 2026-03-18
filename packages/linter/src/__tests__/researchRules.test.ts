import { describe, it, expect } from 'vitest';
import type { LintContext } from '../types.js';
import { LintSeverity, LintCategory } from '../types.js';
import type { SkillParseResult } from '@skillkit/core';
import { LintEngine } from '../engine.js';
import {
  validExperimentLoop,
  mutationSurfaceBounded,
  hasRevertStrategy,
  hasResourceBudget,
  noRemotePush,
} from '../rules/index.js';

function makeContext(overrides: Partial<LintContext> = {}): LintContext {
  return {
    frontmatter: { name: 'autoresearch', description: 'Autonomous experiment loop for LLM pretraining' },
    body: '# Experiment Loop\n\nSome instructions here that are long enough to pass body checks.',
    metadata: { lineCount: 50, estimatedTokens: 500 },
    ...overrides,
  };
}

const FULL_RESEARCH_BODY = `# Autonomous Research

## Setup
1. Create a new branch: git checkout -b autoresearch/run-tag

## Constraints
Only modify train.py — never modify prepare.py or evaluate.py.
Frozen files: prepare.py, evaluate.py
Time budget: 5 minutes per run. Kill any run exceeding 10 minutes.

## Loop
1. Edit train.py with an experimental idea
2. git commit -m "experiment: description"
3. Run: uv run train.py > run.log 2>&1
4. Parse val_bpb from run.log
5. If val_bpb improved (lower is better), keep the commit
6. If val_bpb is worse, run git reset --hard HEAD~1

## Safety
- NEVER run git push during the experiment loop
- Log all results to results.tsv
`;

// ---------------------------------------------------------------------------
// 1. valid-experiment-loop
// ---------------------------------------------------------------------------
describe('valid-experiment-loop', () => {
  it('passes with a complete experiment protocol', () => {
    const ctx = makeContext({ body: FULL_RESEARCH_BODY });
    expect(validExperimentLoop.check(ctx)).toEqual([]);
  });

  it('flags missing branch isolation', () => {
    const body = `
      git commit -m "experiment"
      Run train.py
      If improved, keep. If worse, git reset --hard HEAD~1.
    `;
    const ctx = makeContext({ body });
    const results = validExperimentLoop.check(ctx);
    expect(results.some((r) => r.message.includes('branch isolation'))).toBe(true);
  });

  it('flags missing commit step', () => {
    const body = `
      git checkout -b experiment/run1
      Run train.py
      Compare results to baseline. If worse, git reset.
    `;
    const ctx = makeContext({ body });
    const results = validExperimentLoop.check(ctx);
    expect(results.some((r) => r.message.includes('commit'))).toBe(true);
  });

  it('flags missing revert strategy', () => {
    const body = `
      git checkout -b experiment/run1
      git commit -m "try something"
      Run train.py
      If improved, keep the commit.
    `;
    const ctx = makeContext({ body });
    const results = validExperimentLoop.check(ctx);
    expect(results.some((r) => r.message.includes('revert'))).toBe(true);
  });

  it('flags missing metric evaluation', () => {
    const body = `
      git checkout -b experiment/run1
      git commit -m "try something"
      Run train.py
      git reset --hard HEAD~1
    `;
    const ctx = makeContext({ body });
    const results = validExperimentLoop.check(ctx);
    expect(results.some((r) => r.message.includes('metric evaluation'))).toBe(true);
  });

  it('flags all missing elements on empty body', () => {
    const ctx = makeContext({ body: 'Do some research.' });
    const results = validExperimentLoop.check(ctx);
    expect(results).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 2. mutation-surface-bounded
// ---------------------------------------------------------------------------
describe('mutation-surface-bounded', () => {
  it('passes with both allow and deny declarations', () => {
    const body = 'Only modify train.py. Never modify prepare.py.';
    const ctx = makeContext({ body });
    expect(mutationSurfaceBounded.check(ctx)).toEqual([]);
  });

  it('passes with mutable/frozen keyword style', () => {
    const body = 'Mutable files: train.py\nFrozen files: prepare.py, evaluate.py';
    const ctx = makeContext({ body });
    expect(mutationSurfaceBounded.check(ctx)).toEqual([]);
  });

  it('warns when only allow is present (no deny)', () => {
    const body = 'You may edit train.py and config.py.';
    const ctx = makeContext({ body });
    const results = mutationSurfaceBounded.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe(LintSeverity.WARN);
    expect(results[0].message).toContain('no frozen');
  });

  it('passes when only deny is present', () => {
    const body = 'Do not modify prepare.py or the evaluation scripts.';
    const ctx = makeContext({ body });
    expect(mutationSurfaceBounded.check(ctx)).toEqual([]);
  });

  it('flags when no mutation boundaries at all', () => {
    const body = 'Run experiments and improve the model.';
    const ctx = makeContext({ body });
    const results = mutationSurfaceBounded.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe(LintSeverity.ERROR);
    expect(results[0].message).toContain('No mutation boundaries');
  });
});

// ---------------------------------------------------------------------------
// 3. has-revert-strategy
// ---------------------------------------------------------------------------
describe('has-revert-strategy', () => {
  it('passes with git reset', () => {
    const body = 'If worse, run git reset --hard HEAD~1 to revert.';
    const ctx = makeContext({ body });
    expect(hasRevertStrategy.check(ctx)).toEqual([]);
  });

  it('passes with git revert', () => {
    const body = 'If the experiment fails, git revert the last commit.';
    const ctx = makeContext({ body });
    expect(hasRevertStrategy.check(ctx)).toEqual([]);
  });

  it('passes with rollback keyword', () => {
    const body = 'On failure, rollback to the previous state.';
    const ctx = makeContext({ body });
    expect(hasRevertStrategy.check(ctx)).toEqual([]);
  });

  it('passes with undo commit', () => {
    const body = 'If results are bad, undo the commit.';
    const ctx = makeContext({ body });
    expect(hasRevertStrategy.check(ctx)).toEqual([]);
  });

  it('flags when no revert strategy', () => {
    const body = 'Run experiments and keep all results.';
    const ctx = makeContext({ body });
    const results = hasRevertStrategy.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('No revert strategy');
  });
});

// ---------------------------------------------------------------------------
// 4. has-resource-budget
// ---------------------------------------------------------------------------
describe('has-resource-budget', () => {
  it('passes with time_budget', () => {
    const body = 'TIME_BUDGET = 300 seconds per training run.';
    const ctx = makeContext({ body });
    expect(hasResourceBudget.check(ctx)).toEqual([]);
  });

  it('passes with timeout mention', () => {
    const body = 'Set a timeout of 5 minutes for each experiment.';
    const ctx = makeContext({ body });
    expect(hasResourceBudget.check(ctx)).toEqual([]);
  });

  it('passes with max iterations', () => {
    const body = 'Run a maximum of 100 experiments then stop.';
    const ctx = makeContext({ body });
    expect(hasResourceBudget.check(ctx)).toEqual([]);
  });

  it('passes with kill-on-exceed', () => {
    const body = 'Kill any run exceeding the 10 minute budget.';
    const ctx = makeContext({ body });
    expect(hasResourceBudget.check(ctx)).toEqual([]);
  });

  it('passes with budget = N minutes format', () => {
    const body = 'Budget: 5 minutes per run.';
    const ctx = makeContext({ body });
    expect(hasResourceBudget.check(ctx)).toEqual([]);
  });

  it('flags when no resource budget', () => {
    const body = 'Run experiments in a loop forever.';
    const ctx = makeContext({ body });
    const results = hasResourceBudget.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('No resource budget');
  });
});

// ---------------------------------------------------------------------------
// 5. no-remote-push
// ---------------------------------------------------------------------------
describe('no-remote-push', () => {
  it('passes when git push is explicitly forbidden', () => {
    const body = 'Run experiments locally. Never run git push.';
    const ctx = makeContext({ body });
    expect(noRemotePush.check(ctx)).toEqual([]);
  });

  it('passes with do not git push phrasing', () => {
    const body = "Safety: do not run git push during the loop.";
    const ctx = makeContext({ body });
    expect(noRemotePush.check(ctx)).toEqual([]);
  });

  it('warns when git push is mentioned without prohibition', () => {
    const body = 'After each experiment, git push to share results.';
    const ctx = makeContext({ body });
    const results = noRemotePush.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe(LintSeverity.WARN);
    expect(results[0].message).toContain('without explicit prohibition');
  });

  it('info when git push is not mentioned at all', () => {
    const body = 'Run experiments and log results locally.';
    const ctx = makeContext({ body });
    const results = noRemotePush.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe(LintSeverity.INFO);
    expect(results[0].message).toContain('does not mention git push');
  });
});

// ---------------------------------------------------------------------------
// 6. Research preset integration
// ---------------------------------------------------------------------------
describe('research preset', () => {
  function makeParsed(body: string): SkillParseResult {
    const frontmatter = {
      name: 'autoresearch',
      description: 'Autonomous experiment loop for LLM pretraining optimization',
    };
    return {
      skill: {
        frontmatter: frontmatter as unknown as SkillParseResult['skill']['frontmatter'],
        body,
        raw: `---\nname: autoresearch\ndescription: Autonomous experiment loop\n---\n${body}`,
      },
      metadata: {
        filePath: '<test>',
        lineCount: 50,
        frontmatterLineCount: 4,
        bodyLineCount: 46,
        estimatedTokens: 500,
      },
      errors: [],
    };
  }

  it('reports no research errors for a complete research skill', () => {
    const engine = new LintEngine({ preset: 'research' });
    const report = engine.lint(makeParsed(FULL_RESEARCH_BODY));
    const researchErrors = report.results.filter(
      (r) => r.severity === LintSeverity.ERROR &&
        ['valid-experiment-loop', 'mutation-surface-bounded', 'has-revert-strategy', 'has-resource-budget'].includes(r.ruleId),
    );
    expect(researchErrors).toHaveLength(0);
  });

  it('flags missing protocol elements in research preset', () => {
    const engine = new LintEngine({ preset: 'research' });
    const report = engine.lint(makeParsed('Just run some experiments.'));
    const researchErrors = report.results.filter(
      (r) => r.severity === LintSeverity.ERROR &&
        ['valid-experiment-loop', 'mutation-surface-bounded', 'has-revert-strategy', 'has-resource-budget'].includes(r.ruleId),
    );
    expect(researchErrors.length).toBeGreaterThanOrEqual(4);
  });

  it('does not fire research rules in recommended preset', () => {
    const engine = new LintEngine({ preset: 'recommended' });
    const report = engine.lint(makeParsed('Just a normal skill with instructions.'));
    const researchResults = report.results.filter((r) =>
      ['valid-experiment-loop', 'mutation-surface-bounded', 'has-revert-strategy', 'has-resource-budget', 'no-remote-push'].includes(r.ruleId),
    );
    expect(researchResults).toHaveLength(0);
  });

  it('does not fire research rules in strict preset', () => {
    const engine = new LintEngine({ preset: 'strict' });
    const report = engine.lint(makeParsed('Just a normal skill with instructions.'));
    const researchResults = report.results.filter((r) =>
      ['valid-experiment-loop', 'mutation-surface-bounded', 'has-revert-strategy', 'has-resource-budget', 'no-remote-push'].includes(r.ruleId),
    );
    expect(researchResults).toHaveLength(0);
  });

  it('downgrades no-destructive-commands to warn in research preset', () => {
    const engine = new LintEngine({ preset: 'research' });
    const report = engine.lint(makeParsed(FULL_RESEARCH_BODY));
    const destructiveResults = report.results.filter((r) => r.ruleId === 'no-destructive-commands');
    for (const result of destructiveResults) {
      expect(result.severity).toBe(LintSeverity.WARN);
    }
  });
});
