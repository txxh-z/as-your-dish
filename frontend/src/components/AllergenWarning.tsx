import {
  type AllergenHit,
  type AvoidanceHit,
  type DietaryHit,
  type FlavorHit,
} from '@as-your-dish/shared';

import {
  ALLERGEN_LABELS_I18N,
  AVOIDANCE_LABELS_I18N,
  FLAVOR_LABELS_I18N,
  useLanguage,
} from '../i18n';

interface AllergenWarningProps {
  hits?: AllergenHit[];
  hitDietary?: DietaryHit[];
  avoidanceHits?: AvoidanceHit[];
  flavorHits?: FlavorHit[];
}

// WHY: kept named AllergenWarning for backwards-compat with DishCard.tsx,
// but now renders four categories:
//   - allergen hits (red)        — health safety
//   - dietary hits (red)         — cultural/religious incompatibility
//   - avoidance hits (amber)     — personal taste avoidance
//   - flavor hits (amber)        — flavor axis exceeds user's chosen max
// The visual distinction (red vs amber) is load-bearing: a user must be
// able to tell at a glance "is this dangerous, or just not preferred?".
export function AllergenWarning({
  hits = [],
  hitDietary = [],
  avoidanceHits = [],
  flavorHits = [],
}: AllergenWarningProps) {
  const { language, copy } = useLanguage();
  if (
    hits.length === 0 &&
    hitDietary.length === 0 &&
    avoidanceHits.length === 0 &&
    flavorHits.length === 0
  ) {
    return null;
  }

  return (
    <div className="mb-3 space-y-2">
      {hits.map((hit) => (
        <div
          key={`a-${hit.allergen}`}
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
          key={`d-${hit.preference}-${hit.reason}`}
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

      {avoidanceHits.map((hit) => (
        <div
          key={`v-${hit.avoidance}`}
          className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
            ~
          </span>
          <span>
            {copy.warning.avoidance(
              hit.evidence.join(copy.warning.separator),
              AVOIDANCE_LABELS_I18N[language][hit.avoidance],
            )}
          </span>
        </div>
      ))}

      {flavorHits.map((hit) => (
        <div
          key={`f-${hit.axis}`}
          className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
            ~
          </span>
          <span>
            {copy.warning.flavor(
              FLAVOR_LABELS_I18N[language][hit.axis],
              hit.dishValue,
              hit.userMax,
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
