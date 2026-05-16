export const LLM_PROVIDER_KEYS = ['anthropic', 'openai', 'gemini'] as const;

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
};

export const LLM_MODEL_OPTIONS: Record<LLMProviderName, LLMModelOption[]> = {
  anthropic: [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude Haiku 3.5' },
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
};

export const DEFAULT_LLM_MODEL_BY_PROVIDER: Record<LLMProviderName, string> = {
  anthropic: LLM_MODEL_OPTIONS.anthropic[0].value,
  openai: LLM_MODEL_OPTIONS.openai[0].value,
  gemini: LLM_MODEL_OPTIONS.gemini[0].value,
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
