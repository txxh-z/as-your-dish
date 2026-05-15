import {
  ALLERGEN_LABELS,
  type AllergenHit,
  type DietaryHit,
} from '@as-your-dish/shared';

interface AllergenWarningProps {
  hits?: AllergenHit[];
  hitDietary?: DietaryHit[];
}

export function AllergenWarning({
  hits = [],
  hitDietary = [],
}: AllergenWarningProps) {
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
            ⚠️ 含 {hit.evidence.join('、')}（您已声明对{' '}
            {ALLERGEN_LABELS[hit.allergen]} 过敏）
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
            ⚠️{' '}
            {hit.reason}（证据：{hit.evidence.join('、')}）
          </span>
        </div>
      ))}
    </div>
  );
}
