import type { LLMProviderName } from '@as-your-dish/shared';

const LEGACY_ANTHROPIC_KEY_STORAGE = 'as-your-dish:anthropic-key';
const PROVIDER_KEY_STORAGE_PREFIX = 'as-your-dish:llm-key:';

function storageKey(provider: LLMProviderName): string {
  return `${PROVIDER_KEY_STORAGE_PREFIX}${provider}`;
}

export function getStoredProviderApiKey(
  provider: LLMProviderName,
): string | null {
  const value = localStorage.getItem(storageKey(provider));
  if (value) return value;
  if (provider !== 'anthropic') return null;

  const legacy = localStorage.getItem(LEGACY_ANTHROPIC_KEY_STORAGE);
  if (legacy) {
    localStorage.setItem(storageKey(provider), legacy);
  }
  return legacy;
}

export function setStoredProviderApiKey(
  provider: LLMProviderName,
  value: string,
): void {
  localStorage.setItem(storageKey(provider), value);
  if (provider === 'anthropic') {
    localStorage.setItem(LEGACY_ANTHROPIC_KEY_STORAGE, value);
  }
}

export function removeStoredProviderApiKey(provider: LLMProviderName): void {
  localStorage.removeItem(storageKey(provider));
  if (provider === 'anthropic') {
    localStorage.removeItem(LEGACY_ANTHROPIC_KEY_STORAGE);
  }
}

export function isValidProviderApiKey(
  provider: LLMProviderName,
  value: string,
): boolean {
  if (provider === 'anthropic') {
    return value.startsWith('sk-ant-') && value.length >= 30;
  }
  if (provider === 'openai') {
    return value.startsWith('sk-') && value.length >= 20;
  }
  return value.length >= 20 && !/\s/.test(value);
}

export function apiKeyPlaceholder(provider: LLMProviderName): string {
  if (provider === 'anthropic') return 'sk-ant-...';
  if (provider === 'openai') return 'sk-...';
  if (provider === 'gemini') return 'AIza...';
  if (provider === 'qwen') return 'sk-... (DashScope)';
  if (provider === 'kimi') return 'sk-... (Moonshot)';
  if (provider === 'glm') return '<id>.<secret>';
  if (provider === 'doubao') return '火山方舟 API Key';
  return '';
}

export const getStoredAnthropicKey = () => getStoredProviderApiKey('anthropic');
export const setStoredAnthropicKey = (value: string) =>
  setStoredProviderApiKey('anthropic', value);
export const removeStoredAnthropicKey = () =>
  removeStoredProviderApiKey('anthropic');
export const isValidAnthropicKey = (value: string) =>
  isValidProviderApiKey('anthropic', value);
