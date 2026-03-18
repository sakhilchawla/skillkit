export enum LintSeverity {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
}

export enum LintCategory {
  SPEC = 'spec-compliance',
  SECURITY = 'security',
  BEST_PRACTICE = 'best-practice',
  PERFORMANCE = 'performance',
}

/** Context passed to each lint rule for evaluation */
export interface LintContext {
  frontmatter: Record<string, unknown>;
  body: string;
  filePath?: string;
  metadata: {
    lineCount: number;
    estimatedTokens: number;
  };
}

/** A single lint finding */
export interface LintResult {
  ruleId: string;
  severity: LintSeverity;
  category: LintCategory;
  message: string;
  line?: number;
  suggestion?: string;
}

/** A lint rule definition */
export interface LintRule {
  id: string;
  description: string;
  severity: LintSeverity;
  category: LintCategory;
  check(ctx: LintContext): LintResult[];
}

/** Complete lint report for a file */
export interface LintReport {
  filePath: string;
  results: LintResult[];
  errorCount: number;
  warnCount: number;
  infoCount: number;
}

/** Lint configuration */
export interface LintConfig {
  preset: 'strict' | 'recommended' | 'minimal' | 'research';
  rules?: Record<string, LintSeverity | 'off'>;
}
