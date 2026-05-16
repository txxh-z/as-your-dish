import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MENU_ANALYSIS_INPUT_SCHEMA,
  MENU_ANALYSIS_TOOL_DESCRIPTION,
  MENU_ANALYSIS_TOOL_NAME,
} from '../src/prompts/analyze-menu.v2.js';

// Build the exact `tools` array the AnthropicProvider sends with each
// messages.create call. Dumping this lets us confirm the JSON Schema we
// generate from Zod is what we think we are generating — particularly
// whether `required` lists every must-have field.
const tool = {
  name: MENU_ANALYSIS_TOOL_NAME,
  description: MENU_ANALYSIS_TOOL_DESCRIPTION,
  input_schema: MENU_ANALYSIS_INPUT_SCHEMA,
};

const payload = { tools: [tool] };
const serialized = JSON.stringify(payload, null, 2);

console.log(serialized);

const __dirname = dirname(fileURLToPath(import.meta.url));
const snapshotPath = join(__dirname, '__schema-snapshot__.json');
writeFileSync(snapshotPath, serialized + '\n', 'utf-8');
console.error(`\n[snapshot] wrote ${snapshotPath}`);
