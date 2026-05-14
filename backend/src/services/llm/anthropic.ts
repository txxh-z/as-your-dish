import Anthropic from '@anthropic-ai/sdk';
import { AnalyzeMenuResult } from '@as-your-dish/shared';
import {
  MENU_ANALYSIS_INPUT_SCHEMA,
  MENU_ANALYSIS_TOOL_DESCRIPTION,
  MENU_ANALYSIS_TOOL_NAME,
  SYSTEM_PROMPT,
} from '../../prompts/analyze-menu.v1.js';
import { estimateCost } from './pricing.js';
import type { AnalyzeOptions, AnalyzeOutcome, LLMProvider } from './provider.js';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;

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

    const first = await this.call(client, model, imageBlocks, tool, opts.signal);
    let parsed = AnalyzeMenuResult.safeParse(first.toolInput);
    let inputTokens = first.usage.inputTokens;
    let outputTokens = first.usage.outputTokens;

    // WHY: one self-correction retry per PROJECT_PLAN §5.4. LLMs occasionally
    // cut corners on long schemas; feeding the validation errors back tends
    // to fix it cheaply. Cost of one extra call is bounded by max_tokens.
    if (!parsed.success) {
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
        correction,
      );
      parsed = AnalyzeMenuResult.safeParse(retry.toolInput);
      inputTokens += retry.usage.inputTokens;
      outputTokens += retry.usage.outputTokens;
      if (!parsed.success) {
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
    correction?: string,
  ): Promise<{
    toolInput: unknown;
    usage: { inputTokens: number; outputTokens: number };
  }> {
    const userContent: Anthropic.Messages.ContentBlockParam[] = [...imageBlocks];
    userContent.push({
      type: 'text',
      text:
        correction ??
        '请分析以下菜单图片。识别每道菜，按 submit_menu_analysis 工具的 schema 一次性返回完整结果。',
    });

    const response = await client.messages.create(
      {
        model,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
      },
      { signal },
    );

    const toolUseBlock = response.content.find(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use',
    );
    if (!toolUseBlock) {
      throw new Error(
        `AnthropicProvider: no tool_use block in response. stop_reason=${response.stop_reason}`,
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
