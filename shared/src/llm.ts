export const LLM_PROVIDER_KEYS = [
  'anthropic',
  'openai',
  'gemini',
  'qwen',
  'kimi',
  'glm',
  'doubao',
] as const;

export type LLMProviderName = (typeof LLM_PROVIDER_KEYS)[number];

export interface LLMModelOption {
  value: string;
  label: string;
}

export const DEFAULT_LLM_PROVIDER: LLMProviderName = 'anthropic';

export const LLM_PROVIDER_LABELS: Record<LLMProviderName, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Gemini',
  qwen: '通义千问 (Qwen)',
  kimi: 'Kimi (Moonshot)',
  glm: '智谱 GLM',
  doubao: '字节豆包 (Doubao)',
};

export const LLM_MODEL_OPTIONS: Record<LLMProviderName, LLMModelOption[]> = {
  anthropic: [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
  ],
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  ],
  qwen: [
    { value: 'qwen-vl-max', label: 'Qwen-VL Max' },
    { value: 'qwen-vl-plus', label: 'Qwen-VL Plus' },
  ],
  kimi: [
    { value: 'moonshot-v1-128k-vision-preview', label: 'Kimi Vision 128k' },
    { value: 'moonshot-v1-32k-vision-preview', label: 'Kimi Vision 32k' },
  ],
  glm: [
    { value: 'glm-4v-plus', label: 'GLM-4V Plus' },
    { value: 'glm-4v', label: 'GLM-4V' },
  ],
  doubao: [
    { value: 'doubao-1-5-vision-pro-32k-250115', label: 'Doubao 1.5 Vision Pro' },
    { value: 'doubao-vision-pro-32k', label: 'Doubao Vision Pro 32k' },
  ],
};

export const DEFAULT_LLM_MODEL_BY_PROVIDER: Record<LLMProviderName, string> = {
  anthropic: LLM_MODEL_OPTIONS.anthropic[0].value,
  openai: LLM_MODEL_OPTIONS.openai[0].value,
  gemini: LLM_MODEL_OPTIONS.gemini[0].value,
  qwen: LLM_MODEL_OPTIONS.qwen[0].value,
  kimi: LLM_MODEL_OPTIONS.kimi[0].value,
  glm: LLM_MODEL_OPTIONS.glm[0].value,
  doubao: LLM_MODEL_OPTIONS.doubao[0].value,
};

export function isLLMProviderName(value: string): value is LLMProviderName {
  return (LLM_PROVIDER_KEYS as readonly string[]).includes(value);
}

export function isLLMModelForProvider(
  provider: LLMProviderName,
  value: string,
): boolean {
  return LLM_MODEL_OPTIONS[provider].some((model) => model.value === value);
}

export function normalizeLLMProvider(
  value: string | undefined | null,
): LLMProviderName {
  return value && isLLMProviderName(value) ? value : DEFAULT_LLM_PROVIDER;
}

export function normalizeLLMModel(
  provider: LLMProviderName,
  value: string | undefined | null,
): string {
  const allowed = LLM_MODEL_OPTIONS[provider].map((model) => model.value);
  return value && allowed.includes(value)
    ? value
    : DEFAULT_LLM_MODEL_BY_PROVIDER[provider];
}
