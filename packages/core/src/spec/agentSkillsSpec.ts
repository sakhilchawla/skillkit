/** Current Agent Skills specification version */
export const SPEC_VERSION = '1.0';

/** Fields required in every SKILL.md frontmatter */
export const REQUIRED_FIELDS = ['name', 'description'] as const;

/** Optional frontmatter fields defined by the spec */
export const OPTIONAL_FIELDS = [
  'user-invocable',
  'allowed-tools',
  'model',
  'context',
  'agent',
  'hooks',
  'argument-hint',
  'disable-model-invocation',
] as const;

/** All valid frontmatter field names */
export const ALL_FRONTMATTER_FIELDS = [
  ...REQUIRED_FIELDS,
  ...OPTIONAL_FIELDS,
] as const;

/** Tools recognized by the Agent Skills ecosystem */
export const KNOWN_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Bash',
  'Glob',
  'Grep',
  'Agent',
  'WebFetch',
  'WebSearch',
  'NotebookEdit',
] as const;

/** Check if a field name is a valid frontmatter field */
export function isValidFrontmatterField(field: string): boolean {
  return (ALL_FRONTMATTER_FIELDS as readonly string[]).includes(field);
}

/** Check if a tool name is recognized by the ecosystem */
export function isKnownTool(tool: string): boolean {
  return (KNOWN_TOOLS as readonly string[]).includes(tool);
}

/**
 * Parse a comma-separated allowed-tools string into individual tool names.
 * @example parseAllowedTools("Read, Write, Bash") // ["Read", "Write", "Bash"]
 */
export function parseAllowedTools(value: string): string[] {
  return value
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}
