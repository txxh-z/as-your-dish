import Anthropic from '@anthropic-ai/sdk';
import {
  AnalyzeMenuResult,
  TARGET_LANGUAGE_NAMES,
  type TargetLanguage,
} from '@as-your-dish/shared';
import {
  MENU_ANALYSIS_INPUT_SCHEMA,
  MENU_ANALYSIS_TOOL_DESCRIPTION,
  MENU_ANALYSIS_TOOL_NAME,
  SYSTEM_PROMPT,
} from '../../prompts/analyze-menu.v2.js';
import { estimateCost } from './pricing.js';
import type { AnalyzeOptions, AnalyzeOutcome, LLMProvider } from './provider.js';

const DEFAULT_MODEL = 'claude-sonnet-4-6';

// WHY: a menu may have 15+ dishes; each Dish prints to ~400 output tokens
// (localized text + allergen/dietary arrays + flavor object). 4096 was the
// Claude 3 default and silently truncated medium-size menus mid-emit.
// Sonnet 4.6 supports up to 64000. English/Korean output and 15+ dish menus
// can exceed 16000 after v2 localization, so 32000 keeps fewer real menus
// from truncating while staying below the model ceiling.
const MAX_OUTPUT_TOKENS = 32000;

// WHY: when Zod parse fails downstream, raw response is the only way to
// disambiguate three failure modes — (a) model violates schema with wrong
// field names/types, (b) max_tokens truncation cuts JSON mid-emit, (c)
// model refuses or replies with a non-tool text block. stop_reason + usage
// + content together are decisive. Gated on LLM_DEBUG=1 so default runs
// stay silent; toggle with `LLM_DEBUG=1 RUN_LLM_TESTS=1 npm test` to
// reproduce diagnostics on demand.
function debugLog(...args: unknown[]): void {
  if (process.env.LLM_DEBUG === '1') console.error(...args);
}

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic' as const;
  readonly defaultModel = DEFAULT_MODEL;

  constructor(private readonly serverApiKey: string | undefined) {}

  async analyze(
    images: Buffer[],
    opts: AnalyzeOptions = {},
  ): Promise<AnalyzeOutcome> {
    const apiKey = opts.apiKey ?? this.serverApiKey;
    if (!apiKey) {
      throw new Error(
        'AnthropicProvider: no API key. Pass opts.apiKey or set ANTHROPIC_API_KEY.',
      );
    }
    if (images.length === 0) {
      throw new Error('AnthropicProvider.analyze: images array is empty.');
    }

    const keySource: 'server' | 'user' = opts.apiKey ? 'user' : 'server';
    const model = opts.model ?? DEFAULT_MODEL;
    const client = new Anthropic({ apiKey });

    const imageBlocks: Anthropic.Messages.ImageBlockParam[] = images.map(
      (buf) => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: detectMediaType(buf),
          data: buf.toString('base64'),
        },
      }),
    );

    const tool: Anthropic.Messages.Tool = {
      name: MENU_ANALYSIS_TOOL_NAME,
      description: MENU_ANALYSIS_TOOL_DESCRIPTION,
      input_schema:
        MENU_ANALYSIS_INPUT_SCHEMA as Anthropic.Messages.Tool.InputSchema,
    };

    const targetLanguage = opts.targetLanguage ?? 'zh';
    const first = await this.call(
      client,
      model,
      imageBlocks,
      tool,
      opts.signal,
      'first attempt',
      targetLanguage,
    );
    let parsed = AnalyzeMenuResult.safeParse(coerceJsonStringFields(first.toolInput));
    let inputTokens = first.usage.inputTokens;
    let outputTokens = first.usage.outputTokens;

    // WHY: one self-correction retry per PROJECT_PLAN §5.4. LLMs occasionally
    // cut corners on long schemas; feeding the validation errors back tends
    // to fix it cheaply. Cost of one extra call is bounded by max_tokens.
    if (!parsed.success) {
      debugLog(
        '[anthropic adapter] first parse failed with issues:',
        JSON.stringify(parsed.error.issues, null, 2),
      );
      const correction = `Your previous tool call failed schema validation. Issues:\n${JSON.stringify(
        parsed.error.issues,
        null,
        2,
      )}\nCall ${MENU_ANALYSIS_TOOL_NAME} again with corrected input. Do not omit any required field.`;
      const retry = await this.call(
        client,
        model,
        imageBlocks,
        tool,
        opts.signal,
        'retry attempt',
        targetLanguage,
        correction,
      );
      parsed = AnalyzeMenuResult.safeParse(coerceJsonStringFields(retry.toolInput));
      inputTokens += retry.usage.inputTokens;
      outputTokens += retry.usage.outputTokens;
      if (!parsed.success) {
        debugLog(
          '[anthropic adapter] retry parse failed with issues:',
          JSON.stringify(parsed.error.issues, null, 2),
        );
        throw new Error(
          `AnthropicProvider: schema validation failed after retry. issues=${JSON.stringify(
            parsed.error.issues,
          )}`,
        );
      }
    }

    return {
      result: parsed.data,
      usage: { inputTokens, outputTokens },
      model,
      keySource,
      estimatedUsd: estimateCost('anthropic', model, inputTokens, outputTokens),
    };
  }

  private async call(
    client: Anthropic,
    model: string,
    imageBlocks: Anthropic.Messages.ImageBlockParam[],
    tool: Anthropic.Messages.Tool,
    signal: AbortSignal | undefined,
    attemptLabel: string,
    targetLanguage: TargetLanguage,
    correction?: string,
  ): Promise<{
    toolInput: unknown;
    usage: { inputTokens: number; outputTokens: number };
  }> {
    const userContent: Anthropic.Messages.ContentBlockParam[] = [...imageBlocks];
    userContent.push({
      type: 'text',
      text: correction
        ? `${correction}\n\n${targetLanguageInstruction(targetLanguage)}`
        : buildUserInstruction(tool.name, targetLanguage),
    });

    const response = await client.messages
      .stream(
        {
          model,
          max_tokens: MAX_OUTPUT_TOKENS,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent }],
          tools: [tool],
          tool_choice: { type: 'tool', name: tool.name },
        },
        { signal },
      )
      .finalMessage();

    debugLog(
      `[anthropic adapter] ${attemptLabel} response.stop_reason:`,
      response.stop_reason,
    );
    debugLog(
      `[anthropic adapter] ${attemptLabel} response.usage:`,
      JSON.stringify(response.usage),
    );
    debugLog(
      `[anthropic adapter] ${attemptLabel} full content blocks:`,
      JSON.stringify(response.content, null, 2),
    );

    const toolUseBlock = response.content.find(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use',
    );
    if (!toolUseBlock) {
      throw new Error(
        `AnthropicProvider: no tool_use block in response. stop_reason=${response.stop_reason}`,
      );
    }

    // WHY: if stop_reason is max_tokens, the tool_use input is truncated
    // mid-emit and typically missing later required fields (e.g. `dishes`).
    // Without this guard, Zod sees the partial object and reports "dishes
    // is required", misleading the debugger into thinking the model
    // violated schema. The real problem is the output-token ceiling. Throw
    // a specific error message so future debugging lands here, not in Zod.
    if (response.stop_reason === 'max_tokens') {
      const partialKeys = Object.keys(
        toolUseBlock.input as Record<string, unknown>,
      );
      throw new Error(
        `AnthropicProvider: response truncated by max_tokens limit (${MAX_OUTPUT_TOKENS}). ` +
          `Consider increasing the limit or pre-cropping the menu image to fewer dishes. ` +
          `Truncated input keys: ${partialKeys.join(', ') || '<empty>'}`,
      );
    }

    return {
      toolInput: toolUseBlock.input,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}

function buildUserInstruction(
  toolName: string,
  targetLanguage: TargetLanguage,
): string {
  return `Analyze these menu images. Identify every dish and call ${toolName} exactly once with the complete result.\n\n${targetLanguageInstruction(
    targetLanguage,
  )}`;
}

function targetLanguageInstruction(targetLanguage: TargetLanguage): string {
  const languageName = TARGET_LANGUAGE_NAMES[targetLanguage];
  return [
    `Output language: ${languageName}.`,
    `Write translated_name, description, ingredients[].name, and warnings in ${languageName}.`,
    'Keep original_name verbatim from the menu photo, preserving the original language and script.',
    'Keep image_search_keywords in English for image search.',
    'Do not JSON-stringify schema fields. dishes, warnings, ingredients, allergens, dietary, and flavor must be native tool-call arrays/objects, not strings containing JSON.',
  ].join('\n');
}

// WHY: Sonnet 4.6 occasionally returns top-level array fields (e.g. `dishes`,
// `warnings`) as a JSON-stringified blob instead of a native array inside
// tool_use input, even though the tool's input_schema declares them as
// arrays. The schema then fails Zod validation with "Expected array,
// received string", and a plain self-correction retry tends to repeat the
// same mistake. This shallow coercion: if any string value parses as JSON
// object or array, substitute the parsed value. For OPTIONAL_ARRAY_FIELDS
// (metadata that we can lose without breaking the user experience), if
// JSON.parse fails on a stringified array — typically because the model
// emitted unescaped quotes inside the inner JSON — we drop to `[]` rather
// than fail the whole request. Critical fields like `dishes` keep their
// string and let Zod surface the failure clearly.
const OPTIONAL_ARRAY_FIELDS = new Set(['warnings']);

function coerceJsonStringFields(input: unknown): unknown {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          out[key] = JSON.parse(trimmed);
          continue;
        } catch {
          if (trimmed.startsWith('[') && OPTIONAL_ARRAY_FIELDS.has(key)) {
            debugLog(
              `[anthropic adapter] dropping malformed JSON string in optional field "${key}"`,
            );
            out[key] = [];
            continue;
          }
          // fall through and keep as string for Zod to surface the error
        }
      }
    }
    out[key] = value;
  }
  return out;
}

// Anthropic accepts image/{jpeg,png,gif,webp}. Magic-byte sniff avoids
// shipping a heavy mime library and never trusts client-claimed types.
function detectMediaType(
  buf: Buffer,
): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  if (buf.length >= 4) {
    if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
    if (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    )
      return 'image/png';
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
    if (
      buf.length >= 12 &&
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    ) {
      return 'image/webp';
    }
  }
  return 'image/jpeg';
}
