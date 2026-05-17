import { type DishWithSafety } from '@as-your-dish/shared';
import { AllergenWarning } from './AllergenWarning';
import { ConfidenceBadge } from './ConfidenceBadge';
import { DishImageSlot } from './DishImageSlot';
import { FlavorRadar } from './FlavorRadar';
import {
  ALLERGEN_LABELS_I18N,
  DIETARY_LABELS_I18N,
  useLanguage,
} from '../i18n';

interface DishCardProps {
  dish: DishWithSafety;
  index: number;
}

export function DishCard({ dish, index }: DishCardProps) {
  const { language, copy } = useLanguage();
  const hasHardWarning =
    (dish.hits?.length ?? 0) > 0 || (dish.hitDietary?.length ?? 0) > 0;
  const hasSoftWarning =
    (dish.avoidanceHits?.length ?? 0) > 0 ||
    (dish.flavorHits?.length ?? 0) > 0;
  // WHY: red border (hard warning — allergen/dietary) wins visually over
  // amber border (soft warning — avoidance/flavor) if both apply. A dish
  // with both should look dangerous first.
  const borderClass = hasHardWarning
    ? 'border-red-300'
    : hasSoftWarning
      ? 'border-amber-300'
      : 'border-slate-200';

  return (
    <article className={`rounded-lg border bg-white p-4 shadow-sm ${borderClass}`}>
      <AllergenWarning
        hits={dish.hits}
        hitDietary={dish.hitDietary}
        avoidanceHits={dish.avoidanceHits}
        flavorHits={dish.flavorHits}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500">#{index + 1}</div>
          <h2 className="mt-1 text-lg font-semibold leading-snug text-slate-950">
            {dish.translated_name}
          </h2>
          <div className="mt-2 rounded-md bg-slate-50 px-2 py-1.5">
            <div className="text-[11px] font-medium uppercase tracking-normal text-slate-500">
              {copy.dish.originalName}
            </div>
            <p className="mt-0.5 break-words text-sm text-slate-700">
              {dish.original_name}
            </p>
          </div>
        </div>
        <ConfidenceBadge confidence={dish.confidence} />
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-700">{dish.description}</p>
      <DishImageSlot dish={dish} />

      <div className="mt-4">
        <div className="text-xs font-medium uppercase tracking-normal text-slate-500">
          {copy.dish.ingredients}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {dish.ingredients.map((ingredient) => (
            <span
              key={`${dish.original_name}-${ingredient.name}`}
              className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
            >
              {ingredient.name}
              {ingredient.optional ? '?' : ''}
            </span>
          ))}
        </div>
      </div>

      <FlavorRadar flavor={dish.flavor} />

      {(dish.allergens.length > 0 || dish.dietary.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {dish.allergens.map((allergen) => (
            <span
              key={allergen}
              className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
            >
              {ALLERGEN_LABELS_I18N[language][allergen]}
            </span>
          ))}
          {dish.dietary.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
            >
              {DIETARY_LABELS_I18N[language][tag]}
            </span>
          ))}
        </div>
      )}

      <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
        {copy.dish.disclaimer}
      </p>
    </article>
  );
}
