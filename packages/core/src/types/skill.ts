/**
 * YAML frontmatter fields from a SKILL.md file.
 * Follows the Agent Skills open standard (agentskills.io).
 */
export interface SkillFrontmatter {
  /** Skill name, used as the slash command identifier */
  name: string;
  /** What the skill does — loaded into context budget for auto-invocation */
  description: string;
  /** Whether users can invoke via /name */
  'user-invocable'?: boolean;
  /** Comma-separated list of tools the skill can use */
  'allowed-tools'?: string;
  /** Model override for this skill */
  model?: string;
  /** Context injection mode (e.g., "fork" for subagent) */
  context?: string;
  /** Run as a subagent with isolated context */
  agent?: boolean;
  /** Lifecycle hooks configuration */
  hooks?: Record<string, unknown>;
  /** Hint text shown for skill arguments */
  'argument-hint'?: string;
  /** Prevent the model from auto-invoking this skill */
  'disable-model-invocation'?: boolean;
}

/**
 * A fully parsed Agent Skill definition.
 */
export interface SkillDefinition {
  /** Parsed YAML frontmatter */
  frontmatter: SkillFrontmatter;
  /** Markdown body (everything after the frontmatter) */
  body: string;
  /** Original raw file content */
  raw: string;
  /** File path if loaded from disk */
  filePath?: string;
}

/**
 * Metadata about a parsed skill file.
 */
export interface SkillMetadata {
  /** Absolute file path */
  filePath: string;
  /** Total line count */
  lineCount: number;
  /** Lines consumed by frontmatter (including delimiters) */
  frontmatterLineCount: number;
  /** Lines in the markdown body */
  bodyLineCount: number;
  /** Approximate token count (words / 0.75) */
  estimatedTokens: number;
}

/**
 * Validation error for a skill field.
 */
export class SkillValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly expected: string,
    public readonly received: string,
  ) {
    super(message);
    this.name = 'SkillValidationError';
  }
}

/**
 * Result of parsing a SKILL.md file.
 * Always returned even with errors (partial parsing).
 */
export interface SkillParseResult {
  /** Parsed skill definition (may be partial if errors exist) */
  skill: SkillDefinition;
  /** File metadata */
  metadata: SkillMetadata;
  /** Validation errors encountered during parsing */
  errors: SkillValidationError[];
}
