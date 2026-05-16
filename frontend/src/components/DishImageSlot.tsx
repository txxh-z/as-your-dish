import type { DishWithSafety } from '@as-your-dish/shared';

import { useDishImage } from '../hooks/useDishImage';

interface DishImageSlotProps {
  dish: DishWithSafety;
}

export function DishImageSlot({ dish }: DishImageSlotProps) {
  const query = dish.image_search_keywords.trim();
  const { ref, image, isLoading } = useDishImage(
    dish.example_image_url ? '' : query,
  );
  const imageUrl = dish.example_image_url ?? image?.url;

  if (!query && !imageUrl) return null;

  return (
    <div
      ref={ref}
      className="mx-auto mt-4 flex aspect-[16/10] w-full max-w-60 items-center justify-center overflow-hidden rounded-md bg-slate-100"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={dish.translated_name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : isLoading ? (
        <div className="h-full w-full animate-pulse bg-slate-200" />
      ) : (
        <span className="text-2xl" aria-hidden="true">
          🍽️
        </span>
      )}
    </div>
  );
}
