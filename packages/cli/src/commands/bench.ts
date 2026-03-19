import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { bold, dim, green, red, yellow, cyan } from '../utils/formatter.js';
import { parse as parseYaml } from 'yaml';
import {
  runBenchmark,
  runComparison,
  loadBaseline,
  saveBaseline,
  checkRegression,
  formatBenchmarkResult,
  formatComparisonResult,
  formatRegressionResult,
  formatBenchmarkResultJson,
  formatBenchmarkResultMarkdown,
} from '@skillkit-llm/benchmarks';
import type { BenchmarkConfig, BenchmarkRunOptions } from '@skillkit-llm/benchmarks';

function parseFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

/**
 * `skillkit bench <config.yaml>` — Benchmark skill quality with precision/recall scoring.
 */
export async function benchCommand(args: string[]): Promise<void> {
  const configPath = args.find((a) => !a.startsWith('--'));

  if (!configPath) {
    console.log(`\n${bold('Usage:')} skillkit bench <config.yaml> [options]`);
    console.log(`\n${bold('Options:')}`);
    console.log(`  --compare <skill>     A/B compare against another skill`);
    console.log(`  --baseline <file>     Check for regression against saved baseline`);
    console.log(`  --save <file>         Save results as baseline for future comparison`);
    console.log(`  --format <type>       Output format: console (default), json, markdown`);
    console.log(`  --runs <n>            Number of runs to average (default: from config or 1)`);
    console.log(`  --real                Invoke skill via AI provider (default: mock mode)`);
    console.log(`  --provider <name>     AI provider: claude-code (default), codex, gemini-cli`);
    console.log(`  --timeout <ms>        Timeout per run in milliseconds (default: 120000)`);
    console.log(`\n${bold('Config YAML format:')}`);
    console.log(dim(`  name: review benchmark`));
    console.log(dim(`  skillPath: ./review/SKILL.md`));
    console.log(dim(`  corpus: ./test-corpus        # directory with planted bugs (real mode)`));
    console.log(dim(`  invoke: "/review main"       # skill invocation command (real mode)`));
    console.log(dim(`  groundTruth:`));
    console.log(dim(`    expectedFindings:`));
    console.log(dim(`      - file: src/api.ts`));
    console.log(dim(`        type: security`));
    console.log(dim(`        description: SQL injection`));
    console.log(dim(`    cleanFiles: [src/utils.ts]`));
    console.log(dim(`  runs: 3`));
    console.log(`\n${bold('Examples:')}`);
    console.log(`  skillkit bench review-bench.yaml`);
    console.log(`  skillkit bench review-bench.yaml --real --provider claude-code`);
    console.log(`  skillkit bench review-bench.yaml --compare ./v2/SKILL.md`);
    console.log(`  skillkit bench review-bench.yaml --save baseline.json`);
    console.log(`  skillkit bench review-bench.yaml --baseline baseline.json`);
    console.log(`  skillkit bench review-bench.yaml --format markdown`);
    console.log(`\n${dim('See docs/GUIDE_BENCH.md for full documentation.')}`);
    return;
  }

  const compareSkillPath = parseFlag(args, '--compare');
  const saveFile = parseFlag(args, '--save');
  const baselineFile = parseFlag(args, '--baseline');
  const format = (parseFlag(args, '--format') ?? 'console') as 'console' | 'json' | 'markdown';
  const runsOverride = parseFlag(args, '--runs');
  const isReal = hasFlag(args, '--real');
  const provider = parseFlag(args, '--provider') ?? 'claude-code';
  const timeout = parseFlag(args, '--timeout');

  let rawYaml: string;
  try {
    rawYaml = await readFile(resolve(configPath), 'utf-8');
  } catch {
    console.error(red(`${bold('Error:')} Could not read config file: ${configPath}`));
    process.exit(1);
    return;
  }

  let config: BenchmarkConfig;
  try {
    config = parseYaml(rawYaml) as BenchmarkConfig;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(red(`${bold('Error:')} Invalid YAML: ${message}`));
    process.exit(1);
    return;
  }

  // Resolve paths relative to config file location
  const configDir = dirname(resolve(configPath));
  config.skillPath = resolve(configDir, config.skillPath);
  if (config.corpus) {
    config.corpus = resolve(configDir, config.corpus);
  }

  if (runsOverride) {
    config.runs = parseInt(runsOverride, 10);
  }

  // Build run options
  const runOptions: BenchmarkRunOptions = { mock: !isReal };
  if (isReal) {
    runOptions.invoker = {
      provider,
      timeout: timeout ? parseInt(timeout, 10) : 120_000,
    };
  }

  const modeLabel = isReal ? `real (provider: ${provider})` : 'mock';

  console.log(`\n${bold(config.name)}`);
  console.log(dim(`Skill: ${config.skillPath}`));
  console.log(dim(`Mode: ${modeLabel}`));
  if (isReal && config.corpus) {
    console.log(dim(`Corpus: ${config.corpus}`));
  }
  console.log(dim(`Runs: ${config.runs ?? 1}\n`));

  try {
    // A/B comparison mode
    if (compareSkillPath) {
      config.compareWith = resolve(configDir, compareSkillPath);
      console.log(dim(`Comparing against: ${config.compareWith}\n`));
      const result = await runComparison(config, runOptions);

      if (format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatComparisonResult(result));
      }
      return;
    }

    // Standard benchmark
    const result = await runBenchmark(config, runOptions);

    // Check regression
    if (baselineFile) {
      try {
        const baseline = await loadBaseline(resolve(baselineFile));
        const regression = checkRegression(result.scores, baseline);
        if (regression.regressed) {
          console.log(yellow(formatRegressionResult(regression)));
        } else {
          console.log(green('No regression detected.\n'));
        }
      } catch {
        console.log(dim(`Note: Could not load baseline from ${baselineFile}. Skipping.\n`));
      }
    }

    // Output
    switch (format) {
      case 'json':
        console.log(formatBenchmarkResultJson(result));
        break;
      case 'markdown':
        console.log(formatBenchmarkResultMarkdown(result));
        break;
      default:
        console.log(formatBenchmarkResult(result));
        break;
    }

    // Save baseline
    if (saveFile) {
      await saveBaseline(result, resolve(saveFile));
      console.log(`\n${green('Baseline saved to')} ${dim(saveFile)}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(red(`${bold('Error:')} ${message}`));
    process.exit(1);
  }
}
