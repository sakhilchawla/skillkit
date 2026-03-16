import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type {
  SkillDefinition,
  SkillFrontmatter,
  SkillMetadata,
  SkillParseResult,
} from '../types/skill.js';
import { SkillValidationError } from '../types/skill.js';
import { REQUIRED_FIELDS } from '../spec/agentSkillsSpec.js';

const FRONTMATTER_DELIMITER = '---';

/**
 * Parse a SKILL.md file from its raw string content.
 *
 * Extracts YAML frontmatter and markdown body. Validates required fields.
 * Always returns a result even if errors are found (partial parsing).
 *
 * @param content - Raw SKILL.md file content
 * @param filePath - Optional file path for error messages
 * @returns Parsed skill with metadata and any validation errors
 *
 * @example
 * ```ts
 * const result = parseSkill(`---
 * name: review
 * description: Pre-landing code review
 * ---
 * # Review instructions...
 * `);
 * console.log(result.skill.frontmatter.name); // "review"
 * ```
 */
export function parseSkill(
  content: string,
  filePath?: string,
): SkillParseResult {
  const errors: SkillValidationError[] = [];
  const lines = content.split('\n');

  let frontmatterRaw = '';
  let body = '';
  let frontmatterLineCount = 0;

  // Find frontmatter boundaries
  const trimmedFirst = lines[0]?.trim();
  if (trimmedFirst === FRONTMATTER_DELIMITER) {
    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === FRONTMATTER_DELIMITER) {
        endIndex = i;
        break;
      }
    }

    if (endIndex > 0) {
      frontmatterRaw = lines.slice(1, endIndex).join('\n');
      frontmatterLineCount = endIndex + 1;
      body = lines.slice(endIndex + 1).join('\n').trim();
    } else {
      errors.push(
        new SkillValidationError(
          'Unclosed frontmatter: missing closing ---',
          'frontmatter',
          'closing --- delimiter',
          'none found',
        ),
      );
      body = content;
    }
  } else {
    errors.push(
      new SkillValidationError(
        'No frontmatter found: SKILL.md must start with ---',
        'frontmatter',
        'opening --- delimiter',
        trimmedFirst ?? '(empty file)',
      ),
    );
    body = content;
  }

  // Parse YAML
  let frontmatter: SkillFrontmatter = { name: '', description: '' };
  if (frontmatterRaw) {
    try {
      const parsed = parseYaml(frontmatterRaw) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        frontmatter = parsed as unknown as SkillFrontmatter;
      } else {
        errors.push(
          new SkillValidationError(
            'Frontmatter must be a YAML mapping (key-value pairs)',
            'frontmatter',
            'YAML mapping',
            typeof parsed,
          ),
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push(
        new SkillValidationError(
          `Invalid YAML in frontmatter: ${message}`,
          'frontmatter',
          'valid YAML',
          message,
        ),
      );
    }
  }

  // Validate required fields
  for (const field of REQUIRED_FIELDS) {
    const value = frontmatter[field as keyof SkillFrontmatter];
    if (value === undefined || value === null || value === '') {
      errors.push(
        new SkillValidationError(
          `Missing required field: ${field}`,
          field,
          'non-empty string',
          String(value ?? 'undefined'),
        ),
      );
    }
  }

  // Calculate metadata
  const bodyLineCount = body ? body.split('\n').length : 0;
  const wordCount = body.split(/\s+/).filter((w) => w.length > 0).length;
  const estimatedTokens = Math.ceil(wordCount / 0.75);

  const skill: SkillDefinition = {
    frontmatter,
    body,
    raw: content,
    filePath,
  };

  const metadata: SkillMetadata = {
    filePath: filePath ?? '<inline>',
    lineCount: lines.length,
    frontmatterLineCount,
    bodyLineCount,
    estimatedTokens,
  };

  return { skill, metadata, errors };
}

/**
 * Parse a SKILL.md file from disk.
 *
 * @param filePath - Absolute or relative path to the SKILL.md file
 * @returns Parsed skill with metadata and any validation errors
 */
export async function parseSkillFile(
  filePath: string,
): Promise<SkillParseResult> {
  const content = await readFile(filePath, 'utf-8');
  return parseSkill(content, filePath);
}
