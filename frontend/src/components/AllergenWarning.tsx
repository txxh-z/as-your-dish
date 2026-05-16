import { type AllergenHit, type DietaryHit } from '@as-your-dish/shared';

import { ALLERGEN_LABELS_I18N, useLanguage } from '../i18n';

interface AllergenWarningProps {
  hits?: AllergenHit[];
  hitDietary?: DietaryHit[];
}

export function AllergenWarning({
  hits = [],
  hitDietary = [],
}: AllergenWarningProps) {
  const { language, copy } = useLanguage();
  if (hits.length === 0 && hitDietary.length === 0) return null;

  return (
    <div className="mb-3 space-y-2">
      {hits.map((hit) => (
        <div
          key={hit.allergen}
          className="flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-800"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-700 text-xs font-bold text-white">
            !
          </span>
          <span>
            {copy.warning.allergen(
              hit.evidence.join(copy.warning.separator),
              ALLERGEN_LABELS_I18N[language][hit.allergen],
            )}
          </span>
        </div>
      ))}

      {hitDietary.map((hit) => (
        <div
          key={`${hit.preference}-${hit.reason}`}
          className="flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-800"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-700 text-xs font-bold text-white">
            !
          </span>
          <span>
            {copy.warning.dietary(
              hit.reason,
              hit.evidence.join(copy.warning.separator),
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
