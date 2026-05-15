import {
  ALLERGEN_KEYS,
  ALLERGEN_LABELS,
  type Allergen,
} from '@as-your-dish/shared';

interface AllergenPickerProps {
  value: Allergen[];
  onChange: (value: Allergen[]) => void;
}

const ICONS: Record<Allergen, string> = {
  shellfish: '🦐',
  peanuts: '🥜',
  dairy: '🥛',
  gluten: '🌾',
  eggs: '🥚',
  soy: '豆',
  tree_nuts: '🌰',
  fish: '鱼',
  sesame: '芝',
};

export function AllergenPicker({ value, onChange }: AllergenPickerProps) {
  const selected = new Set(value);

  function toggle(item: Allergen) {
    if (selected.has(item)) {
      onChange(value.filter((current) => current !== item));
    } else {
      onChange([...value, item]);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">过敏原</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ALLERGEN_KEYS.map((item) => {
          const checked = selected.has(item);
          return (
            <label
              key={item}
              className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                checked
                  ? 'border-red-300 bg-red-50 text-red-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-red-700"
                checked={checked}
                onChange={() => toggle(item)}
              />
              <span className="w-5 text-center">{ICONS[item]}</span>
              <span className="font-medium">{ALLERGEN_LABELS[item]}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
