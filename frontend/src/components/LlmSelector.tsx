import {
  LLM_MODEL_OPTIONS,
  LLM_PROVIDER_KEYS,
  LLM_PROVIDER_LABELS,
  type LLMProviderName,
} from '@as-your-dish/shared';

import { useLanguage } from '../i18n';

interface LlmSelectorProps {
  provider: LLMProviderName;
  model: string;
  onProviderChange: (provider: LLMProviderName) => void;
  onModelChange: (model: string) => void;
}

export function LlmSelector({
  provider,
  model,
  onProviderChange,
  onModelChange,
}: LlmSelectorProps) {
  const { copy } = useLanguage();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <span className="font-medium">{copy.llm.provider}</span>
        <select
          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-950"
          value={provider}
          onChange={(event) =>
            onProviderChange(event.target.value as LLMProviderName)
          }
        >
          {LLM_PROVIDER_KEYS.map((key) => (
            <option key={key} value={key}>
              {LLM_PROVIDER_LABELS[key]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <span className="font-medium">{copy.llm.model}</span>
        <select
          className="h-9 w-44 rounded-md border border-slate-300 bg-white px-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-950"
          value={model}
          onChange={(event) => onModelChange(event.target.value)}
        >
          {LLM_MODEL_OPTIONS[provider].map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
