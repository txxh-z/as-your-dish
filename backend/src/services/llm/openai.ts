// TODO(phase-2.x): implement using OpenAI response_format json_schema with
// strict: true. Map usage.prompt_tokens → inputTokens,
// usage.completion_tokens → outputTokens. Images go in messages[].content as
// image_url base64 data URIs. Pricing entry already in pricing.ts.

import type { AnalyzeOptions, AnalyzeOutcome, LLMProvider } from './provider.js';

const DEFAULT_MODEL = 'gpt-4o';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai' as const;
  readonly defaultModel = DEFAULT_MODEL;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private readonly _serverApiKey: string | undefined) {}

  async analyze(
    _images: Buffer[],
    _opts: AnalyzeOptions = {},
  ): Promise<AnalyzeOutcome> {
    throw new Error(
      'OpenAIProvider: not implemented yet — use response_format json_schema (strict: true). See TODO at top of openai.ts.',
    );
  }
}
