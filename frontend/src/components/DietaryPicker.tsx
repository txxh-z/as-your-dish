import {
  DIETARY_TAG_KEYS,
  type DietaryTag,
} from '@as-your-dish/shared';

import { DIETARY_LABELS_I18N, useLanguage } from '../i18n';

interface DietaryPickerProps {
  value: DietaryTag[];
  onChange: (value: DietaryTag[]) => void;
}

export function DietaryPicker({ value, onChange }: DietaryPickerProps) {
  const { language, copy } = useLanguage();
  const selected = new Set(value);

  function toggle(item: DietaryTag) {
    if (selected.has(item)) {
      onChange(value.filter((current) => current !== item));
    } else {
      onChange([...value, item]);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">
        {copy.profile.dietary}
      </h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {DIETARY_TAG_KEYS.map((item) => {
          const checked = selected.has(item);
          return (
            <label
              key={item}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${
                checked
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-700"
                checked={checked}
                onChange={() => toggle(item)}
              />
              <span className="font-medium">
                {DIETARY_LABELS_I18N[language][item]}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
