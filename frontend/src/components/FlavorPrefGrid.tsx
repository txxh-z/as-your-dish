import type { FlavorProfile } from '@as-your-dish/shared';

import { FLAVOR_LABELS_I18N, useLanguage } from '../i18n';
import type { FlavorPrefs } from '../types/profile';

type FlavorAxis = keyof FlavorProfile;

interface FlavorPrefGridProps {
  value: FlavorPrefs;
  onChange: (value: FlavorPrefs) => void;
}

// FlavorPrefs key for each axis. Names match what the backend's
// ProfilePayload schema expects (e.g. spicy → spicy_max).
const KEY_BY_AXIS: Record<FlavorAxis, keyof FlavorPrefs> = {
  salty: 'salty_max',
  sour: 'sour_max',
  sweet: 'sweet_max',
  bitter: 'bitter_max',
  spicy: 'spicy_max',
  umami: 'umami_max',
};

const AXES: FlavorAxis[] = [
  'salty',
  'sour',
  'sweet',
  'bitter',
  'spicy',
  'umami',
];

export function FlavorPrefGrid({ value, onChange }: FlavorPrefGridProps) {
  const { language, copy } = useLanguage();

  function setAxis(axis: FlavorAxis, max: number) {
    const key = KEY_BY_AXIS[axis];
    const next: FlavorPrefs = { ...value };
    // 5 = no limit on that axis → drop the key entirely so cross-check
    // skips it (backend treats undefined as "no preference").
    if (max >= 5) delete next[key];
    else next[key] = max;
    onChange(next);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">
        {copy.profile.flavorLimit}
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        {copy.profile.flavorLimitHint}
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {AXES.map((axis) => {
          const stored = value[KEY_BY_AXIS[axis]];
          const display = stored ?? 5;
          const axisLabel = FLAVOR_LABELS_I18N[language][axis];
          return (
            <div
              key={axis}
              className="rounded-md border border-slate-200 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-slate-800">
                  {axisLabel}
                </span>
                <span
                  className={
                    stored === undefined
                      ? 'rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500'
                      : 'rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800'
                  }
                >
                  {stored === undefined
                    ? copy.profile.flavorNoLimit
                    : copy.profile.flavorMaxLabel(axisLabel, display)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                value={display}
                className="mt-2 w-full accent-amber-600"
                onChange={(event) => setAxis(axis, Number(event.target.value))}
              />
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>0</span>
                <span>5</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
