// TODO(phase-2.x): implement using Gemini responseSchema +
// responseMimeType: 'application/json'. Map usageMetadata.promptTokenCount →
// inputTokens, usageMetadata.candidatesTokenCount → outputTokens. Gemini
// folds the system prompt into the first user turn — the adapter handles
// that translation locally. Pricing entry already in pricing.ts.

import type { AnalyzeOptions, AnalyzeOutcome, LLMProvider } from './provider.js';

const DEFAULT_MODEL = 'gemini-1.5-pro';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini' as const;
  readonly defaultModel = DEFAULT_MODEL;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private readonly _serverApiKey: string | undefined) {}

  async analyze(
    _images: Buffer[],
    _opts: AnalyzeOptions = {},
  ): Promise<AnalyzeOutcome> {
    throw new Error(
      'GeminiProvider: not implemented yet — use responseSchema + responseMimeType: application/json. See TODO at top of gemini.ts.',
    );
  }
}
