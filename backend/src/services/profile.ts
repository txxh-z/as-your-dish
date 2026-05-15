import {
  ALLERGEN_KEYS,
  DIETARY_TAG_KEYS,
  type Allergen,
  type DietaryTag,
} from '@as-your-dish/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/client.js';
import { profiles, type FlavorPrefs } from '../db/schema.js';

const AllergenSchema = z.enum(ALLERGEN_KEYS);
const DietarySchema = z.enum(DIETARY_TAG_KEYS);

export const ProfilePayload = z.object({
  allergens: z.array(AllergenSchema).default([]),
  dietary: z.array(DietarySchema).default([]),
  flavorPrefs: z
    .object({
      spicy_max: z.number().int().min(0).max(5).optional(),
    })
    .default({}),
});

export type ProfilePayload = z.infer<typeof ProfilePayload>;

export async function getProfile(userId: string): Promise<ProfilePayload> {
  const row = await findProfile(userId);
  if (row) return rowToProfile(row);

  await db.insert(profiles).values({ userId });
  return { allergens: [], dietary: [], flavorPrefs: {} };
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
    flavorPrefs: normalized.flavorPrefs,
  };

  const existing = await findProfile(userId);
  if (existing) {
    await db
      .update(profiles)
      .set({
        allergens: values.allergens,
        dietary: values.dietary,
        flavorPrefs: values.flavorPrefs,
      })
      .where(eq(profiles.userId, userId));
  } else {
    await db.insert(profiles).values(values);
  }

  return {
    allergens: values.allergens,
    dietary: values.dietary,
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
    flavorPrefs: row.flavorPrefs ?? {},
  };
}

function unique<T extends Allergen | DietaryTag>(items: T[]): T[] {
  return [...new Set(items)];
}

export type { FlavorPrefs };
