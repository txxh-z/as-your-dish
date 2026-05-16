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

const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 16000;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini' as const;
  readonly defaultModel = DEFAULT_MODEL;

  constructor(private readonly serverApiKey: string | undefined) {}

  async analyze(
    images: Buffer[],
    opts: AnalyzeOptions = {},
  ): Promise<AnalyzeOutcome> {
    const apiKey = opts.apiKey ?? this.serverApiKey;
    if (!apiKey) {
      throw new Error(
        'GeminiProvider: no API key. Pass opts.apiKey or set GEMINI_API_KEY.',
      );
    }
    if (images.length === 0) {
      throw new Error('GeminiProvider.analyze: images array is empty.');
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
        '[gemini adapter] first parse failed with issues:',
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
          `GeminiProvider: schema validation failed after retry. issues=${JSON.stringify(
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
      estimatedUsd: estimateCost('gemini', model, inputTokens, outputTokens),
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
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent`;
    const prompt = correction
      ? `${correction}\n\n${SYSTEM_PROMPT}\n\n${buildMenuAnalysisInstruction(
          'return exactly one JSON object matching the provided schema',
          targetLanguage,
        )}`
      : `${SYSTEM_PROMPT}\n\n${buildMenuAnalysisInstruction(
          'return exactly one JSON object matching the provided schema',
          targetLanguage,
        )}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              ...images.map((image) => ({
                inline_data: {
                  mime_type: detectMediaType(image),
                  data: image.toString('base64'),
                },
              })),
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
          responseJsonSchema: MENU_ANALYSIS_INPUT_SCHEMA,
        },
      }),
      signal,
    });

    const body = (await response.json().catch(() => null)) as GeminiResponse | null;
    if (!response.ok) {
      throw upstreamError('gemini', response.status, body);
    }

    const text = body?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();
    if (!text) {
      throw new Error('GeminiProvider: empty response content.');
    }

    debugLog('[gemini adapter] usage:', JSON.stringify(body?.usageMetadata ?? {}));
    return {
      content: text,
      usage: {
        inputTokens: body?.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: body?.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }
}
