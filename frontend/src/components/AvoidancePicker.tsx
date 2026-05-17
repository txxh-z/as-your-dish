import { AVOIDANCE_KEYS, type Avoidance } from '@as-your-dish/shared';

import { AVOIDANCE_LABELS_I18N, useLanguage } from '../i18n';

interface AvoidancePickerProps {
  value: Avoidance[];
  onChange: (value: Avoidance[]) => void;
}

// WHY: visually softer than AllergenPicker — yellow instead of red — to
// signal "preference, not health-safety". Same checkbox UX though, so the
// muscle memory carries over.
const ICONS: Record<Avoidance, string> = {
  scallion: '🌿',
  garlic: '🧄',
  cilantro: '🌱',
  onion: '🧅',
  ginger: '🫚',
  lamb: '🐑',
  organ_meat: '🫀',
  cumin: '🌾',
  mint: '🌿',
  wasabi: '🟢',
};

export function AvoidancePicker({ value, onChange }: AvoidancePickerProps) {
  const { language, copy } = useLanguage();
  const selected = new Set(value);

  function toggle(item: Avoidance) {
    if (selected.has(item)) {
      onChange(value.filter((current) => current !== item));
    } else {
      onChange([...value, item]);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">
        {copy.profile.avoidances}
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        {copy.profile.avoidancesHint}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {AVOIDANCE_KEYS.map((item) => {
          const checked = selected.has(item);
          return (
            <label
              key={item}
              className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                checked
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-amber-600"
                checked={checked}
                onChange={() => toggle(item)}
              />
              <span className="w-5 text-center">{ICONS[item]}</span>
              <span className="font-medium">
                {AVOIDANCE_LABELS_I18N[language][item]}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
