import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AnalyzeMenuResult } from '@as-your-dish/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const SYSTEM_PROMPT = readFileSync(
  join(__dirname, 'analyze-menu.v2.md'),
  'utf-8',
);

export const MENU_ANALYSIS_TOOL_NAME = 'submit_menu_analysis' as const;

export const MENU_ANALYSIS_TOOL_DESCRIPTION =
  'Submit a structured analysis of every dish identified in the provided menu image(s). Call this tool exactly once with the complete result; do not return menu content as plain text.';

export const MENU_ANALYSIS_INPUT_SCHEMA = zodToJsonSchema(AnalyzeMenuResult, {
  $refStrategy: 'none',
  target: 'jsonSchema7',
});
