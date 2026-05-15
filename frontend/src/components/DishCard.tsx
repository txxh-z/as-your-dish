import {
  ALLERGEN_LABELS,
  DIETARY_TAG_LABELS,
  type DishWithSafety,
} from '@as-your-dish/shared';
import { AllergenWarning } from './AllergenWarning';
import { ConfidenceBadge } from './ConfidenceBadge';
import { DishImageSlot } from './DishImageSlot';

interface DishCardProps {
  dish: DishWithSafety;
  index: number;
}

export function DishCard({ dish, index }: DishCardProps) {
  const hasSafetyWarning =
    (dish.hits?.length ?? 0) > 0 || (dish.hitDietary?.length ?? 0) > 0;

  return (
    <article
      className={`rounded-lg border bg-white p-4 shadow-sm ${
        hasSafetyWarning ? 'border-red-300' : 'border-slate-200'
      }`}
    >
      <AllergenWarning hits={dish.hits} hitDietary={dish.hitDietary} />
      <DishImageSlot dish={dish} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500">#{index + 1}</div>
          <h2 className="mt-1 text-lg font-semibold leading-snug text-slate-950">
            {dish.translated_name}
          </h2>
          <p className="mt-1 break-words text-sm text-slate-500">
            {dish.original_name}
          </p>
        </div>
        <ConfidenceBadge confidence={dish.confidence} />
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-700">{dish.description}</p>

      <div className="mt-4">
        <div className="text-xs font-medium uppercase tracking-normal text-slate-500">
          用料
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

      {(dish.allergens.length > 0 || dish.dietary.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {dish.allergens.map((allergen) => (
            <span
              key={allergen}
              className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
            >
              {ALLERGEN_LABELS[allergen]}
            </span>
          ))}
          {dish.dietary.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
            >
              {DIETARY_TAG_LABELS[tag]}
            </span>
          ))}
        </div>
      )}

      <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
        本应用结果仅供参考，重要过敏请向服务员二次确认
      </p>
    </article>
  );
}
