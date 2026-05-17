import { normalizeLLMProvider, type LLMProviderName } from '@as-your-dish/shared';

import { config } from '../../config.js';
import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './gemini.js';
import { OpenAIProvider } from './openai.js';
import { OpenAICompatibleProvider } from './openaiCompatible.js';
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
    // WHY: each domestic vision endpoint enforces its own ceiling on
    // `max_tokens`. OpenAICompatibleProvider's default (16000) is tuned for
    // OpenAI and 400s on every Chinese vision API. Each override below is
    // set to a value that (a) fits the vendor's hard limit, and (b) is
    // large enough to hold the AnalyzeMenuResult schema output for a real
    // 10–20-dish menu (~7000 chars / ~3000-4000 tokens of Chinese+English
    // mixed text). Values marked "tested" were probed empirically; values
    // marked "doc-based" rely on the vendor's published spec.
    case 'qwen':
      instances[provider] = new OpenAICompatibleProvider(config.QWEN_API_KEY, {
        name: 'qwen',
        defaultModel: 'qwen-vl-max',
        endpoint:
          'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        // tested: 8192 accepted; previous 2000 truncated real menus
        // mid-emit and produced un-parseable JSON.
        maxOutputTokens: 8192,
      });
      break;
    case 'kimi':
      instances[provider] = new OpenAICompatibleProvider(config.KIMI_API_KEY, {
        name: 'kimi',
        defaultModel: 'moonshot-v1-128k-vision-preview',
        endpoint: 'https://api.moonshot.cn/v1/chat/completions',
        // doc-based (could not probe — account had insufficient balance,
        // returning 429 regardless of max_tokens). Moonshot v1-128k spec
        // permits output up to (128k - prompt tokens); 8192 is a safe value.
        maxOutputTokens: 8192,
      });
      break;
    case 'glm':
      instances[provider] = new OpenAICompatibleProvider(config.GLM_API_KEY, {
        name: 'glm',
        defaultModel: 'glm-4v-plus',
        endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        // WHY: GLM-4V returns code 1210 on `response_format` and rejects a
        // separate system role on multimodal calls. Omit both and merge the
        // system prompt into the user message. max_tokens hard ceiling is
        // 2048 (3072+ → 1210); medium-size menus may still truncate at this
        // limit — GLM-4V is unsuitable for menus with >10 fully-localized
        // dishes given the v2 schema's verbosity.
        maxOutputTokens: 2048,
        responseFormat: 'none',
        inlineSystemPrompt: true,
        imageDetail: null,
      });
      break;
    case 'doubao':
      instances[provider] = new OpenAICompatibleProvider(config.DOUBAO_API_KEY, {
        name: 'doubao',
        // WHY: Volces ARK addresses doubao models through user-provisioned
        // "endpoint IDs" (ep-...). The bare model name `doubao-vision-pro-32k`
        // returns 404 unless the caller's account has the underlying model
        // enabled. Each deployment should set defaultModel to its own ep-*.
        defaultModel: 'ep-20260517111003-ksbwl',
        endpoint:
          'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
        // tested: hard ceiling is 12288 (16384 → 400 InvalidParameter
        // "expected <= 12288"); 8192 keeps margin and fits any reasonable
        // menu. detail:high historically rejected by Doubao vision —
        // omit the field.
        maxOutputTokens: 8192,
        imageDetail: null,
      });
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
    case 'qwen':
      return Boolean(config.QWEN_API_KEY);
    case 'kimi':
      return Boolean(config.KIMI_API_KEY);
    case 'glm':
      return Boolean(config.GLM_API_KEY);
    case 'doubao':
      return Boolean(config.DOUBAO_API_KEY);
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
