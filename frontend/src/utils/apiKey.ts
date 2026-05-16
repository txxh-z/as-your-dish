const ANTHROPIC_KEY_STORAGE = 'as-your-dish:anthropic-key';

export function getStoredAnthropicKey(): string | null {
  return localStorage.getItem(ANTHROPIC_KEY_STORAGE);
}

export function setStoredAnthropicKey(value: string): void {
  localStorage.setItem(ANTHROPIC_KEY_STORAGE, value);
}

export function removeStoredAnthropicKey(): void {
  localStorage.removeItem(ANTHROPIC_KEY_STORAGE);
}

export function isValidAnthropicKey(value: string): boolean {
  return value.startsWith('sk-ant-') && value.length >= 30;
}
