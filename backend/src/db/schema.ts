import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { Allergen, DietaryTag } from '@as-your-dish/shared';

export type LlmCallStatus = 'ok' | 'error' | 'rate_limited';

export interface FlavorPrefs {
  spicy_max?: number;
}

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
});

export const profiles = sqliteTable('profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  allergens: text('allergens', { mode: 'json' })
    .$type<Allergen[]>()
    .notNull()
    .default(sql`'[]'`),
  dietary: text('dietary', { mode: 'json' })
    .$type<DietaryTag[]>()
    .notNull()
    .default(sql`'[]'`),
  flavorPrefs: text('flavor_prefs', { mode: 'json' })
    .$type<FlavorPrefs>()
    .notNull()
    .default(sql`'{}'`),
});

// Menus are per-image analyses. `userId` is nullable so anonymous uploads
// can still be recorded (the foreign key to a users table lands in phase 3).
// `imageHash` (sha256 of the uploaded bytes) is the dedup key — same image
// → same row, second upload returns the cached result without hitting LLM.
// `warnings` mirrors AnalyzeMenuResult.warnings so cache hits can fully
// reconstruct the original response; nullable = "no warnings recorded".
export const menus = sqliteTable('menus', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  imageHash: text('image_hash').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  languageDetected: text('language_detected'),
  warnings: text('warnings', { mode: 'json' }).$type<string[]>(),
});

// One row per dish. `payload` holds the full Zod-validated Dish as JSON;
// `confidence` and `position` are mirrored into dedicated columns so we can
// sort and filter (e.g. low-confidence dishes) without parsing JSON.
export const dishes = sqliteTable('dishes', {
  id: text('id').primaryKey(),
  menuId: text('menu_id')
    .notNull()
    .references(() => menus.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  confidence: real('confidence').notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
});

// Unsplash search results cached by hashed lowercased query, so repeat
// dish-image lookups don't burn the Unsplash rate limit.
export const imageCache = sqliteTable('image_cache', {
  queryHash: text('query_hash').primaryKey(),
  url: text('url').notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
});

// One row per LLM call (success, error, or cache hit). Drives the operator
// dashboard and feeds the L2 monthly quota in phase 5.4. PROJECT_PLAN §12.4
// is the authoritative description of what gets written here and why.
export const llmCalls = sqliteTable('llm_calls', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  userId: text('user_id'),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  estimatedUsd: real('estimated_usd').notNull(),
  keySource: text('key_source').notNull(),
  cacheHit: integer('cache_hit', { mode: 'boolean' }).notNull().default(false),
  status: text('status').$type<LlmCallStatus>().notNull().default('ok'),
  callType: text('call_type').notNull(),
});
