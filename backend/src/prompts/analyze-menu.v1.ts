import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AnalyzeMenuResult } from '@as-your-dish/shared';

// WHY: load the markdown at module-load so prompt edits land on next process
// restart without rebuilding TS. The .md is the source of truth; this .ts
// file is just a binding to the runtime (build pipeline must copy .md files
// alongside the compiled .js — handled when we add a postbuild step in
// phase 5.5 deploy work).
const __dirname = dirname(fileURLToPath(import.meta.url));

export const SYSTEM_PROMPT = readFileSync(
  join(__dirname, 'analyze-menu.v1.md'),
  'utf-8',
);

export const MENU_ANALYSIS_TOOL_NAME = 'submit_menu_analysis' as const;

export const MENU_ANALYSIS_TOOL_DESCRIPTION =
  'Submit a structured analysis of every dish identified in the provided menu image(s). Call this tool exactly once with the complete result; do not return menu content as plain text.';

// WHY: provider-neutral JSON Schema (Draft-7). Each adapter casts to its
// vendor-specific tool type. Keep this module free of vendor SDK imports so
// the prompt layer stays portable.
export const MENU_ANALYSIS_INPUT_SCHEMA = zodToJsonSchema(AnalyzeMenuResult, {
  $refStrategy: 'none',
  target: 'jsonSchema7',
});
