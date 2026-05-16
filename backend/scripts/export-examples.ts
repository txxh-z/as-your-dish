// Local-only utility. Reads example menus from the current database and
// writes them to backend/src/data/example-menus.json so the deployment can
// replay the same data on container start without re-spending LLM budget.
//
// Usage: tsx scripts/export-examples.ts
//
// Re-run after `seed-examples.ts` whenever the example images or prompt
// outputs change.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { asc, eq } from 'drizzle-orm';

import { db } from '../src/db/client.js';
import { dishes, menus } from '../src/db/schema.js';
import type { Dish } from '@as-your-dish/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, '../src/data/example-menus.json');

interface FixtureEntry {
  slug: string;
  imageHash: string;
  result: {
    language_detected: string;
    dishes: Dish[];
    warnings: string[];
  };
}

async function main(): Promise<void> {
  const rows = await db
    .select()
    .from(menus)
    .where(eq(menus.kind, 'example'))
    .orderBy(asc(menus.slug));

  if (rows.length === 0) {
    throw new Error(
      'No example menus found in DB. Run `tsx scripts/seed-examples.ts` first.',
    );
  }

  const entries: FixtureEntry[] = [];
  for (const menu of rows) {
    if (!menu.slug) {
      throw new Error(`Example menu ${menu.id} has no slug.`);
    }
    const dishRows = await db
      .select()
      .from(dishes)
      .where(eq(dishes.menuId, menu.id))
      .orderBy(asc(dishes.position));

    entries.push({
      slug: menu.slug,
      imageHash: menu.imageHash,
      result: {
        language_detected: menu.languageDetected ?? '',
        dishes: dishRows.map((d) => d.payload as Dish),
        warnings: menu.warnings ?? [],
      },
    });
  }

  await mkdir(dirname(FIXTURE_PATH), { recursive: true });
  await writeFile(FIXTURE_PATH, JSON.stringify(entries, null, 2) + '\n', 'utf-8');
  console.log(
    `wrote ${entries.length} example menus to ${FIXTURE_PATH}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
