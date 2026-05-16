import { normalizeLLMProvider, type LLMProviderName } from '@as-your-dish/shared';

import { config } from '../../config.js';
import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './gemini.js';
import { OpenAIProvider } from './openai.js';
import type { LLMProvider, ProviderName } from './provider.js';

const instances: Partial<Record<ProviderName, LLMProvider>> = {};

/**
 * Returns an LLMProvider singleton for the requested provider. The provider's
 * `analyze()` accepts a per-call `apiKey` override to support BYO-key; the env
 * key here is the server's default.
 */
export function getLLMProvider(providerName?: LLMProviderName): LLMProvider {
  const provider = providerName ?? normalizeLLMProvider(config.LLM_PROVIDER);
  const existing = instances[provider];
  if (existing) return existing;

  switch (provider) {
    case 'anthropic':
      instances[provider] = new AnthropicProvider(config.ANTHROPIC_API_KEY);
      break;
    case 'openai':
      instances[provider] = new OpenAIProvider(config.OPENAI_API_KEY);
      break;
    case 'gemini':
      instances[provider] = new GeminiProvider(config.GEMINI_API_KEY);
      break;
    default: {
      // Exhaustiveness check: if ProviderName ever grows, this fails TS.
      const _exhaustive: never = provider;
      throw new Error(`Unknown LLM_PROVIDER: ${String(_exhaustive)}`);
    }
  }
  return instances[provider];
}

export function hasServerApiKey(provider: LLMProviderName): boolean {
  switch (provider) {
    case 'anthropic':
      return Boolean(config.ANTHROPIC_API_KEY);
    case 'openai':
      return Boolean(config.OPENAI_API_KEY);
    case 'gemini':
      return Boolean(config.GEMINI_API_KEY);
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

/** Test-only: reset the cached singleton. */
export function _resetLLMProviderForTests(): void {
  for (const provider of Object.keys(instances) as ProviderName[]) {
    delete instances[provider];
  }
}

export type {
  AnalyzeOptions,
  AnalyzeOutcome,
  LLMProvider,
  ProviderName,
} from './provider.js';
