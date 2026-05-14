import { config } from '../../config.js';
import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './gemini.js';
import { OpenAIProvider } from './openai.js';
import type { LLMProvider, ProviderName } from './provider.js';

let instance: LLMProvider | null = null;

/**
 * Returns the configured LLMProvider singleton, instantiating it from env on
 * first call. The provider's `analyze()` accepts a per-call `apiKey`
 * override to support BYO-key; the env key here is the server's default.
 */
export function getLLMProvider(): LLMProvider {
  if (instance) return instance;

  const provider = config.LLM_PROVIDER as ProviderName;
  switch (provider) {
    case 'anthropic':
      instance = new AnthropicProvider(config.ANTHROPIC_API_KEY);
      break;
    case 'openai':
      instance = new OpenAIProvider(config.OPENAI_API_KEY);
      break;
    case 'gemini':
      instance = new GeminiProvider(config.GEMINI_API_KEY);
      break;
    default: {
      // Exhaustiveness check: if ProviderName ever grows, this fails TS.
      const _exhaustive: never = provider;
      throw new Error(`Unknown LLM_PROVIDER: ${String(_exhaustive)}`);
    }
  }
  return instance;
}

/** Test-only: reset the cached singleton. */
export function _resetLLMProviderForTests(): void {
  instance = null;
}

export type {
  AnalyzeOptions,
  AnalyzeOutcome,
  LLMProvider,
  ProviderName,
} from './provider.js';
