import { useEffect, useState } from 'react';
import {
  LLM_PROVIDER_LABELS,
  type LLMProviderName,
} from '@as-your-dish/shared';

import {
  apiKeyPlaceholder,
  getStoredProviderApiKey,
  isValidProviderApiKey,
  setStoredProviderApiKey,
} from '../utils/apiKey';
import { useLanguage } from '../i18n';

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  provider: LLMProviderName;
  reason?: 'quota' | 'invalid';
}

export function ApiKeyDialog({
  open,
  onClose,
  onSaved,
  provider,
  reason = 'quota',
}: ApiKeyDialogProps) {
  const { copy } = useLanguage();
  const providerLabel = LLM_PROVIDER_LABELS[provider];
  const [value, setValue] = useState(
    getStoredProviderApiKey(provider) ?? '',
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(getStoredProviderApiKey(provider) ?? '');
    setError(null);
  }, [open, provider]);

  if (!open) return null;

  const title =
    reason === 'invalid' ? copy.apiKey.invalidTitle : copy.apiKey.title;
  const description =
    reason === 'invalid'
      ? copy.apiKey.invalidDescription(providerLabel)
      : copy.apiKey.description(providerLabel);

  function handleSave() {
    const next = value.trim();
    if (!isValidProviderApiKey(provider, next)) {
      setError(copy.apiKey.invalid(providerLabel));
      return;
    }
    setStoredProviderApiKey(provider, next);
    setError(null);
    onSaved?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 px-4 py-4 sm:items-center sm:justify-center">
      <section className="w-full rounded-lg border border-slate-200 bg-white p-5 shadow-xl sm:max-w-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
            onClick={onClose}
            aria-label={copy.common.close}
          >
            ×
          </button>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">
            {copy.apiKey.label(providerLabel)}
          </span>
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-950"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={apiKeyPlaceholder(provider)}
          />
        </label>

        {error && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            onClick={onClose}
          >
            {copy.apiKey.later}
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={handleSave}
          >
            {copy.apiKey.saveAndRetry}
          </button>
        </div>
      </section>
    </div>
  );
}
