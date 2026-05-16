export const TARGET_LANGUAGE_KEYS = ['zh', 'en', 'ko'] as const;

export type TargetLanguage = (typeof TARGET_LANGUAGE_KEYS)[number];

export const DEFAULT_TARGET_LANGUAGE: TargetLanguage = 'zh';

export const TARGET_LANGUAGE_LABELS: Record<TargetLanguage, string> = {
  zh: '中文',
  en: 'English',
  ko: '한국어',
};

export const TARGET_LANGUAGE_NAMES: Record<TargetLanguage, string> = {
  zh: 'Simplified Chinese',
  en: 'English',
  ko: 'Korean',
};

export function isTargetLanguage(value: string): value is TargetLanguage {
  return (TARGET_LANGUAGE_KEYS as readonly string[]).includes(value);
}

export function normalizeTargetLanguage(
  value: string | undefined | null,
): TargetLanguage {
  return value && isTargetLanguage(value) ? value : DEFAULT_TARGET_LANGUAGE;
}
