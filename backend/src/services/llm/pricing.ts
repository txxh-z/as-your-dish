import type { ProviderName } from './provider.js';

// USD per 1M tokens. Single source of truth — update this file when vendor
// pricing changes. Authoritative pricing is on each vendor's site; values
// here are tracked solely for accounting estimates surfaced to operators.
const PRICING: Record<
  ProviderName,
  Record<string, { input: number; output: number }>
> = {
  anthropic: {
    'claude-sonnet-4-6': { input: 3, output: 15 },
    'claude-sonnet-4-20250514': { input: 3, output: 15 },
    'claude-opus-4-7': { input: 15, output: 75 },
    'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
  },
  openai: {
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4.1': { input: 2, output: 8 },
  },
  gemini: {
    'gemini-2.5-flash': { input: 0.3, output: 2.5 },
    'gemini-2.5-pro': { input: 1.25, output: 10 },
  },
};

/**
 * Estimate USD cost for a single LLM call. Returns 0 when the
 * provider/model combination is unknown (with a console.warn) — accounting
 * must never break the user-facing request path.
 */
export function estimateCost(
  provider: ProviderName,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const tier = PRICING[provider]?.[model];
  if (!tier) {
    console.warn(
      `[pricing] no entry for provider=${provider} model=${model}; estimating 0`,
    );
    return 0;
  }
  const inUsd = (inputTokens / 1_000_000) * tier.input;
  const outUsd = (outputTokens / 1_000_000) * tier.output;
  return Number((inUsd + outUsd).toFixed(6));
}

export function getKnownModels(provider: ProviderName): string[] {
  return Object.keys(PRICING[provider] ?? {});
}
