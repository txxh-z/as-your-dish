import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ApiError, apiGet } from '../services/api';

interface DishImageResponse {
  url: string | null;
  cached: boolean;
  source: 'cache' | 'unsplash' | 'unavailable';
}

const IMAGE_QUERY_STALE_MS = 24 * 60 * 60 * 1000;

export function useDishImage(query: string) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const normalized = useMemo(() => query.trim().replace(/\s+/g, ' '), [query]);

  useEffect(() => {
    if (visible) return;
    const node = targetRef.current;
    if (!node) return;

    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  const imageQuery = useQuery({
    queryKey: ['dish-image', normalized],
    enabled: visible && normalized.length > 0,
    retry: false,
    staleTime: IMAGE_QUERY_STALE_MS,
    queryFn: async () => {
      try {
        return await apiGet<DishImageResponse>(
          `/dish-image?q=${encodeURIComponent(normalized)}`,
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return { url: null, cached: false, source: 'unavailable' } as const;
        }
        throw err;
      }
    },
  });

  return {
    ref: targetRef,
    image: imageQuery.data,
    isLoading: visible && imageQuery.isPending,
    isError: imageQuery.isError,
  };
}
