import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Menus are per-image analyses. `userId` is nullable so anonymous uploads
// can still be recorded (the foreign key to a users table lands in phase 3).
// `imageHash` (sha256 of the uploaded bytes) is the dedup key — same image
// → same row, second upload returns the cached result without hitting LLM.
export const menus = sqliteTable('menus', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  imageHash: text('image_hash').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  languageDetected: text('language_detected'),
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
