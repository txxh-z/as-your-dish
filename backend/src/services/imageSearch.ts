import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { eq } from 'drizzle-orm';
import type {
  AnalyzeMenuResultWithSafety,
  DishWithSafety,
} from '@as-your-dish/shared';

import { config } from '../config.js';
import { db } from '../db/client.js';
import { imageCache } from '../db/schema.js';
import { logger } from '../utils/logger.js';

export const DISH_IMAGE_STATIC_PREFIX = '/dish-images';

export interface DishImageResult {
  url: string | null;
  cached: boolean;
  source: 'cache' | 'unsplash' | 'unavailable';
}

interface UnsplashPhoto {
  urls?: {
    small?: string;
    regular?: string;
  };
  links?: {
    download_location?: string;
  };
}

interface UnsplashSearchResponse {
  results?: UnsplashPhoto[];
}

export function getDishImageCacheDir(): string {
  return resolve(
    process.env.DISH_IMAGE_CACHE_DIR ?? resolve(process.cwd(), 'public/dish-images'),
  );
}

export async function findDishImage(query: string): Promise<DishImageResult> {
  const normalized = normalizeQuery(query);
  if (!normalized) return unavailable(false);

  const queryHash = hashQuery(normalized);
  const cached = await findCachedImage(queryHash);
  if (cached) {
    return { url: cached.url, cached: true, source: 'cache' };
  }

  if (!config.UNSPLASH_ACCESS_KEY) {
    return unavailable(false);
  }

  try {
    const photo = await searchUnsplash(normalized);
    const sourceUrl = photo?.urls?.small ?? photo?.urls?.regular;
    if (!photo || !sourceUrl) return unavailable(false);

    const url = await downloadToLocalCache(queryHash, sourceUrl);
    await saveImageCache(queryHash, url);
    await registerUnsplashDownload(photo.links?.download_location);
    return { url, cached: false, source: 'unsplash' };
  } catch (err) {
    logger.warn('dish image search failed', {
      query: normalized,
      message: err instanceof Error ? err.message : String(err),
    });
    return unavailable(false);
  }
}

export async function attachDishImagesToResult(
  result: AnalyzeMenuResultWithSafety,
): Promise<AnalyzeMenuResultWithSafety> {
  const imageResults = new Map<string, DishImageResult>();
  const queries = [
    ...new Set(result.dishes.map((dish) => dish.image_search_keywords.trim())),
  ].filter(Boolean);

  await Promise.all(
    queries.map(async (query) => {
      imageResults.set(query, await findDishImage(query));
    }),
  );

  return {
    ...result,
    dishes: result.dishes.map((dish): DishWithSafety => {
      const image = imageResults.get(dish.image_search_keywords.trim());
      return {
        ...dish,
        example_image_url: image?.url ?? null,
        example_image_source: image?.source ?? 'unavailable',
      };
    }),
  };
}

async function findCachedImage(
  queryHash: string,
): Promise<typeof imageCache.$inferSelect | null> {
  const rows = await db
    .select()
    .from(imageCache)
    .where(eq(imageCache.queryHash, queryHash))
    .limit(1);
  return rows[0] ?? null;
}

async function searchUnsplash(query: string): Promise<UnsplashPhoto | null> {
  const params = new URLSearchParams({
    query,
    per_page: '1',
    orientation: 'landscape',
    content_filter: 'high',
  });
  const response = await fetch(
    `https://api.unsplash.com/search/photos?${params.toString()}`,
    {
      headers: {
        Authorization: `Client-ID ${config.UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Unsplash search failed: ${response.status}`);
  }

  const body = (await response.json()) as UnsplashSearchResponse;
  return body.results?.[0] ?? null;
}

async function downloadToLocalCache(
  queryHash: string,
  sourceUrl: string,
): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Unsplash image download failed: ${response.status}`);
  }

  const cacheDir = getDishImageCacheDir();
  await mkdir(cacheDir, { recursive: true });
  await writeFile(
    resolve(cacheDir, `${queryHash}.jpg`),
    Buffer.from(await response.arrayBuffer()),
  );

  return `${DISH_IMAGE_STATIC_PREFIX}/${queryHash}.jpg`;
}

async function saveImageCache(queryHash: string, url: string): Promise<void> {
  await db
    .insert(imageCache)
    .values({ queryHash, url })
    .onConflictDoUpdate({
      target: imageCache.queryHash,
      set: { url, fetchedAt: new Date() },
    });
}

async function registerUnsplashDownload(
  downloadLocation: string | undefined,
): Promise<void> {
  if (!downloadLocation || !config.UNSPLASH_ACCESS_KEY) return;
  const response = await fetch(downloadLocation, {
    headers: {
      Authorization: `Client-ID ${config.UNSPLASH_ACCESS_KEY}`,
      'Accept-Version': 'v1',
    },
  });
  if (!response.ok) {
    logger.warn('unsplash download registration failed', {
      status: response.status,
    });
  }
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 120);
}

function hashQuery(query: string): string {
  return createHash('sha256').update(query).digest('hex');
}

function unavailable(cached: boolean): DishImageResult {
  return { url: null, cached, source: 'unavailable' };
}
