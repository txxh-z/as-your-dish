import type { AnalyzeMenuResult, TargetLanguage } from '@as-your-dish/shared';

export type ProviderName = 'anthropic' | 'openai' | 'gemini';

export interface AnalyzeOptions {
  /** Per-call override of the server's API key (supports BYO-key flow). */
  apiKey?: string;
  /** Per-call model override; falls back to the adapter's defaultModel. */
  model?: string;
  /** For accounting only; the adapter never forwards user info to the LLM. */
  userId?: string | null;
  /** Language for translated names, descriptions, ingredients, and warnings. */
  targetLanguage?: TargetLanguage;
  /** Abort signal piped into the upstream HTTP request. */
  signal?: AbortSignal;
}

export interface AnalyzeOutcome {
  result: AnalyzeMenuResult;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
  keySource: 'server' | 'user';
  estimatedUsd: number;
}

/**
 * Vendor-neutral LLM interface. Business code (routes, services) talks only
 * to this interface — never to a vendor SDK directly. The factory in
 * `./index.ts` selects the concrete adapter based on `LLM_PROVIDER` env.
 */
export interface LLMProvider {
  readonly name: ProviderName;
  readonly defaultModel: string;
  analyze(images: Buffer[], opts?: AnalyzeOptions): Promise<AnalyzeOutcome>;
}
