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
    'claude-haiku-4-5-20251001': { input: 1, output: 5 },
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
  // WHY: domestic providers publish prices in CNY per 1k tokens. Values
  // below are converted to USD per 1M tokens at ~7 CNY/USD using each
  // vendor's posted list price as of 2026-02. They are estimates only;
  // accounting is a soft display and never gates user-facing flows.
  qwen: {
    'qwen-vl-max': { input: 2.85, output: 8.55 },
    'qwen-vl-plus': { input: 0.21, output: 0.43 },
  },
  kimi: {
    'moonshot-v1-128k-vision-preview': { input: 8.5, output: 8.5 },
    'moonshot-v1-32k-vision-preview': { input: 3.4, output: 3.4 },
  },
  glm: {
    'glm-4v-plus': { input: 1.4, output: 1.4 },
    'glm-4v': { input: 7.1, output: 7.1 },
  },
  doubao: {
    'doubao-vision-pro-32k': { input: 0.43, output: 1.28 },
    'doubao-1-5-vision-pro-32k-250115': { input: 0.43, output: 1.28 },
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
