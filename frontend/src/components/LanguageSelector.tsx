import type { TargetLanguage } from '@as-your-dish/shared';

import {
  TARGET_LANGUAGE_KEYS,
  TARGET_LANGUAGE_LABELS,
  useLanguage,
} from '../i18n';

export function LanguageSelector() {
  const { language, setLanguage, copy } = useLanguage();

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{copy.language}</span>
      <select
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none hover:bg-slate-50 focus:border-slate-950"
        value={language}
        onChange={(event) => setLanguage(event.target.value as TargetLanguage)}
        aria-label={copy.language}
      >
        {TARGET_LANGUAGE_KEYS.map((item) => (
          <option key={item} value={item}>
            {TARGET_LANGUAGE_LABELS[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
