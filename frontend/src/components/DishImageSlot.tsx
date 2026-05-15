import type { DishWithSafety } from '@as-your-dish/shared';

import { useDishImage } from '../hooks/useDishImage';

interface DishImageSlotProps {
  dish: DishWithSafety;
}

export function DishImageSlot({ dish }: DishImageSlotProps) {
  const query = dish.image_search_keywords.trim();
  const { ref, image, isLoading } = useDishImage(query);

  if (!query) return null;

  return (
    <div
      ref={ref}
      className="mb-4 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md bg-slate-100"
    >
      {image?.url ? (
        <img
          src={image.url}
          alt={dish.translated_name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : isLoading ? (
        <div className="h-full w-full animate-pulse bg-slate-200" />
      ) : (
        <span className="text-4xl" aria-hidden="true">
          🍽️
        </span>
      )}
    </div>
  );
}
