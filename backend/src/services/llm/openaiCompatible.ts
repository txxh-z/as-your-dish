import type { ProviderName } from './provider.js';
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

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'high' | 'low' | 'auto' } };

interface OpenAIResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export type ResponseFormatMode = 'json_schema' | 'json_object' | 'none';

export interface OpenAICompatibleOptions {
  /** Provider name surfaced in accounting + pricing lookup. */
  name: ProviderName;
  /** Fallback model when no per-call override is supplied. */
  defaultModel: string;
  /** Full chat-completions endpoint URL. */
  endpoint: string;
  /** Bytes ceiling for output tokens; 16k is a safe default. */
  maxOutputTokens?: number;
  /**
   * How to request structured output.
   *   'json_schema' — OpenAI-style strict JSON schema (only OpenAI itself)
   *   'json_object' — loose JSON-object hint (Kimi, Qwen, Doubao)
   *   'none'        — omit response_format entirely (GLM-4V — it 400s on the field)
   * Defaults to 'json_object' since most OpenAI-compatible APIs accept it.
   */
  responseFormat?: ResponseFormatMode;
  /** Some endpoints (Doubao) reject 'detail: high'. Omit if unsupported. */
  imageDetail?: 'high' | 'low' | 'auto' | null;
  /**
   * Some endpoints (GLM-4V) don't accept a separate system role on multimodal
   * calls. When true, prepend the system prompt as text into the user message
   * and skip emitting a system entry. Default false.
   */
  inlineSystemPrompt?: boolean;
}

/**
 * Generic adapter for any provider that mimics the OpenAI Chat Completions
 * shape (Moonshot/Kimi, DashScope/Qwen, Zhipu/GLM, ByteDance/Doubao, ...).
 * The differences are limited to: endpoint URL, default model, and a couple
 * of small quirks captured in the constructor options.
 */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly name: ProviderName;
  readonly defaultModel: string;
  private readonly endpoint: string;
  private readonly maxOutputTokens: number;
  private readonly responseFormat: ResponseFormatMode;
  private readonly imageDetail: 'high' | 'low' | 'auto' | null;
  private readonly inlineSystemPrompt: boolean;

  constructor(
    private readonly serverApiKey: string | undefined,
    opts: OpenAICompatibleOptions,
  ) {
    this.name = opts.name;
    this.defaultModel = opts.defaultModel;
    this.endpoint = opts.endpoint;
    this.maxOutputTokens = opts.maxOutputTokens ?? 16000;
    this.responseFormat = opts.responseFormat ?? 'json_object';
    this.imageDetail = opts.imageDetail === undefined ? 'high' : opts.imageDetail;
    this.inlineSystemPrompt = opts.inlineSystemPrompt ?? false;
  }

  async analyze(
    images: Buffer[],
    opts: AnalyzeOptions = {},
  ): Promise<AnalyzeOutcome> {
    const apiKey = opts.apiKey ?? this.serverApiKey;
    if (!apiKey) {
      throw new Error(
        `${this.name}: no API key. Pass opts.apiKey or set the corresponding env key.`,
      );
    }
    if (images.length === 0) {
      throw new Error(`${this.name}.analyze: images array is empty.`);
    }

    const model = opts.model ?? this.defaultModel;
    const targetLanguage = opts.targetLanguage ?? 'zh';
    const keySource: 'server' | 'user' = opts.apiKey ? 'user' : 'server';

    const first = await this.call(apiKey, model, images, targetLanguage, opts.signal);
    let parsed = safeParseMenuAnalysisText(first.content);
    let inputTokens = first.usage.inputTokens;
    let outputTokens = first.usage.outputTokens;

    if (!parsed.success) {
      debugLog(
        `[${this.name} adapter] first parse failed with issues:`,
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
          `${this.name}: schema validation failed after retry. issues=${JSON.stringify(
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
      estimatedUsd: estimateCost(this.name, model, inputTokens, outputTokens),
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
    const baseInstruction = buildMenuAnalysisInstruction(
      'return exactly one JSON object matching the provided schema',
      targetLanguage,
    );
    const userText = [
      this.inlineSystemPrompt ? SYSTEM_PROMPT : null,
      correction,
      baseInstruction,
    ]
      .filter((s): s is string => Boolean(s))
      .join('\n\n');

    const userContent: OpenAIContentPart[] = [
      { type: 'text', text: userText },
      ...images.map((image): OpenAIContentPart => {
        const url = `data:${detectMediaType(image)};base64,${image.toString('base64')}`;
        return {
          type: 'image_url',
          image_url:
            this.imageDetail === null
              ? { url }
              : { url, detail: this.imageDetail },
        };
      }),
    ];

    const messages = this.inlineSystemPrompt
      ? [{ role: 'user', content: userContent }]
      : [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ];

    const body: Record<string, unknown> = {
      model,
      max_tokens: this.maxOutputTokens,
      messages,
    };

    if (this.responseFormat === 'json_schema') {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'menu_analysis',
          schema: MENU_ANALYSIS_INPUT_SCHEMA,
          strict: false,
        },
      };
    } else if (this.responseFormat === 'json_object') {
      body.response_format = { type: 'json_object' };
    }
    // 'none' → omit response_format entirely (e.g. GLM-4V)

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });

    const responseBody = (await response.json().catch(() => null)) as
      | OpenAIResponse
      | null;
    if (!response.ok) {
      throw upstreamError(this.name, response.status, responseBody);
    }

    const text = responseBody?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error(`${this.name}: empty response content.`);
    }

    debugLog(
      `[${this.name} adapter] usage:`,
      JSON.stringify(responseBody?.usage ?? {}),
    );
    return {
      content: text,
      usage: {
        inputTokens: responseBody?.usage?.prompt_tokens ?? 0,
        outputTokens: responseBody?.usage?.completion_tokens ?? 0,
      },
    };
  }
}
