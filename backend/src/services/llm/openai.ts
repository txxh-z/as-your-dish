import {
  MENU_ANALYSIS_INPUT_SCHEMA,
  SYSTEM_PROMPT,
} from '../../prompts/analyze-menu.v2.js';
import {
  buildMenuAnalysisInstruction,
  debugLog,
  detectMediaType,
  safeParseMenuAnalysisText,
  upstreamError,
} from './common.js';
import { estimateCost } from './pricing.js';
import type { AnalyzeOptions, AnalyzeOutcome, LLMProvider } from './provider.js';

const DEFAULT_MODEL = 'gpt-4o';
const MAX_OUTPUT_TOKENS = 16000;
const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail: 'high' } };

interface OpenAIResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai' as const;
  readonly defaultModel = DEFAULT_MODEL;

  constructor(private readonly serverApiKey: string | undefined) {}

  async analyze(
    images: Buffer[],
    opts: AnalyzeOptions = {},
  ): Promise<AnalyzeOutcome> {
    const apiKey = opts.apiKey ?? this.serverApiKey;
    if (!apiKey) {
      throw new Error(
        'OpenAIProvider: no API key. Pass opts.apiKey or set OPENAI_API_KEY.',
      );
    }
    if (images.length === 0) {
      throw new Error('OpenAIProvider.analyze: images array is empty.');
    }

    const model = opts.model ?? DEFAULT_MODEL;
    const targetLanguage = opts.targetLanguage ?? 'zh';
    const keySource: 'server' | 'user' = opts.apiKey ? 'user' : 'server';

    const first = await this.call(apiKey, model, images, targetLanguage, opts.signal);
    let parsed = safeParseMenuAnalysisText(first.content);
    let inputTokens = first.usage.inputTokens;
    let outputTokens = first.usage.outputTokens;

    if (!parsed.success) {
      debugLog(
        '[openai adapter] first parse failed with issues:',
        JSON.stringify(parsed.issues, null, 2),
      );
      const correction = `Your previous JSON response failed schema validation. Issues:\n${JSON.stringify(
        parsed.issues,
        null,
        2,
      )}\nReturn one corrected JSON object. Do not omit any required field.`;
      const retry = await this.call(
        apiKey,
        model,
        images,
        targetLanguage,
        opts.signal,
        correction,
      );
      parsed = safeParseMenuAnalysisText(retry.content);
      inputTokens += retry.usage.inputTokens;
      outputTokens += retry.usage.outputTokens;
      if (!parsed.success) {
        throw new Error(
          `OpenAIProvider: schema validation failed after retry. issues=${JSON.stringify(
            parsed.issues,
          )}`,
        );
      }
    }

    return {
      result: parsed.data,
      usage: { inputTokens, outputTokens },
      model,
      keySource,
      estimatedUsd: estimateCost('openai', model, inputTokens, outputTokens),
    };
  }

  private async call(
    apiKey: string,
    model: string,
    images: Buffer[],
    targetLanguage: NonNullable<AnalyzeOptions['targetLanguage']>,
    signal: AbortSignal | undefined,
    correction?: string,
  ): Promise<{
    content: string;
    usage: { inputTokens: number; outputTokens: number };
  }> {
    const content: OpenAIContentPart[] = [
      {
        type: 'text',
        text: correction
          ? `${correction}\n\n${buildMenuAnalysisInstruction(
              'return exactly one JSON object matching the provided schema',
              targetLanguage,
            )}`
          : buildMenuAnalysisInstruction(
              'return exactly one JSON object matching the provided schema',
              targetLanguage,
            ),
      },
      ...images.map((image): OpenAIContentPart => ({
        type: 'image_url',
        image_url: {
          url: `data:${detectMediaType(image)};base64,${image.toString('base64')}`,
          detail: 'high',
        },
      })),
    ];

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'menu_analysis',
            schema: MENU_ANALYSIS_INPUT_SCHEMA,
            strict: false,
          },
        },
      }),
      signal,
    });

    const body = (await response.json().catch(() => null)) as OpenAIResponse | null;
    if (!response.ok) {
      throw upstreamError('openai', response.status, body);
    }

    const text = body?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('OpenAIProvider: empty response content.');
    }

    debugLog('[openai adapter] usage:', JSON.stringify(body?.usage ?? {}));
    return {
      content: text,
      usage: {
        inputTokens: body?.usage?.prompt_tokens ?? 0,
        outputTokens: body?.usage?.completion_tokens ?? 0,
      },
    };
  }
}
