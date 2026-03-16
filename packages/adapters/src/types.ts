/** Detected technology stack for a project */
export interface DetectedStack {
  language: string;
  framework: string | null;
  styling: string | null;
  testing: string | null;
  stateManagement: string | null;
  buildTool: string | null;
  monorepo: boolean;
  packageManager: string;
  /** Raw detection signals for debugging */
  signals: DetectionSignal[];
}

/** A single detection signal (what we found and where) */
export interface DetectionSignal {
  category: string;
  value: string;
  source: string;
  confidence: number;
}

/** Detected project conventions (naming, structure, patterns) */
export interface DetectedConventions {
  /** Naming conventions by context */
  naming: {
    components: string;
    files: string;
    tests: string;
  };
  /** Detected directory paths */
  paths: {
    components: string | null;
    tests: string | null;
    styles: string | null;
    modules: string | null;
  };
  /** Export style: 'named' or 'default' */
  exportStyle: string;
  /** Whether the project uses barrel exports */
  hasBarrelExports: boolean;
  /** Whether the project uses 'use client' directives */
  usesClientComponents: boolean;
  /** Whether the project uses CSS Modules */
  usesCssModules: boolean;
  /** Whether the project uses styled-components */
  usesStyledComponents: boolean;
  /** Whether the project uses Tailwind CSS */
  usesTailwind: boolean;
  /** Package scope (e.g., '@myorg') */
  packageScope: string | null;
  /** Test file suffix (e.g., '.test.tsx') */
  testSuffix: string;
  /** Common import patterns */
  importPatterns: string[];
}

/** Template variable context passed to skill templates */
export interface TemplateContext {
  stack: DetectedStack;
  conventions: DetectedConventions;
  /** Project name from package.json or directory name */
  projectName: string;
}

/** A parameterized skill template */
export interface SkillTemplate {
  name: string;
  description: string;
  /** Template type: what kind of skill this generates */
  type: string;
  /** Handlebars-style template content for the SKILL.md */
  template: string;
  /** Which languages this template supports */
  supportedLanguages: string[];
}

/** Built-in template identifiers */
export type BuiltinTemplate = 'component' | 'module' | 'test';

/** Result of adapting a template to a project */
export interface AdaptResult {
  /** The generated SKILL.md content */
  skillContent: string;
  /** Path where it was saved */
  outputPath: string;
  /** The detected stack used */
  stack: DetectedStack;
  /** Template variables applied */
  context: TemplateContext;
  /** Template name that was used */
  templateName: string;
}
