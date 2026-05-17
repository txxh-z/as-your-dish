import {
  ALLERGEN_KEYS,
  AVOIDANCE_KEYS,
  DIETARY_TAG_KEYS,
  type Allergen,
  type Avoidance,
  type DietaryTag,
} from '@as-your-dish/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/client.js';
import { profiles, type FlavorPrefs } from '../db/schema.js';

const AllergenSchema = z.enum(ALLERGEN_KEYS);
const DietarySchema = z.enum(DIETARY_TAG_KEYS);
const AvoidanceSchema = z.enum(AVOIDANCE_KEYS);
const FlavorMax = z.number().int().min(0).max(5).optional();

export const ProfilePayload = z.object({
  allergens: z.array(AllergenSchema).default([]),
  dietary: z.array(DietarySchema).default([]),
  avoidances: z.array(AvoidanceSchema).default([]),
  flavorPrefs: z
    .object({
      salty_max: FlavorMax,
      sour_max: FlavorMax,
      sweet_max: FlavorMax,
      bitter_max: FlavorMax,
      spicy_max: FlavorMax,
      umami_max: FlavorMax,
    })
    .default({}),
});

export type ProfilePayload = z.infer<typeof ProfilePayload>;

export async function getProfile(userId: string): Promise<ProfilePayload> {
  const row = await findProfile(userId);
  if (row) return rowToProfile(row);

  await db.insert(profiles).values({ userId });
  return { allergens: [], dietary: [], avoidances: [], flavorPrefs: {} };
}

export async function updateProfile(
  userId: string,
  payload: ProfilePayload,
): Promise<ProfilePayload> {
  const normalized = ProfilePayload.parse(payload);
  const values = {
    userId,
    allergens: unique(normalized.allergens),
    dietary: unique(normalized.dietary),
    avoidances: unique(normalized.avoidances),
    flavorPrefs: normalized.flavorPrefs,
  };

  const existing = await findProfile(userId);
  if (existing) {
    await db
      .update(profiles)
      .set({
        allergens: values.allergens,
        dietary: values.dietary,
        avoidances: values.avoidances,
        flavorPrefs: values.flavorPrefs,
      })
      .where(eq(profiles.userId, userId));
  } else {
    await db.insert(profiles).values(values);
  }

  return {
    allergens: values.allergens,
    dietary: values.dietary,
    avoidances: values.avoidances,
    flavorPrefs: values.flavorPrefs,
  };
}

async function findProfile(userId: string): Promise<typeof profiles.$inferSelect | null> {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

function rowToProfile(row: typeof profiles.$inferSelect): ProfilePayload {
  return {
    allergens: row.allergens ?? [],
    dietary: row.dietary ?? [],
    avoidances: row.avoidances ?? [],
    flavorPrefs: row.flavorPrefs ?? {},
  };
}

function unique<T extends Allergen | DietaryTag | Avoidance>(items: T[]): T[] {
  return [...new Set(items)];
}

export type { FlavorPrefs };
