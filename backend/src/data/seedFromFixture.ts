// Replays the curated example-menus fixture into the local database. The
// fixture is generated locally from a real LLM run (see
// `scripts/seed-examples.ts` + `scripts/export-examples.ts`) and committed
// to the repo so deployments get the same data without re-spending LLM
// budget on every release.
//
// Idempotent: `menusService.upsertExampleMenu` updates the existing row when
// a (slug, kind='example') match exists, otherwise inserts. Safe to run on
// every container start.

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { AnalyzeMenuResult } from '@as-your-dish/shared';
import { AnalyzeMenuResult as AnalyzeMenuResultSchema } from '@as-your-dish/shared';

import { menusService } from '../services/menus.service.js';

interface FixtureEntry {
  slug: string;
  imageHash: string;
  result: AnalyzeMenuResult;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, './example-menus.json');

export async function seedExampleMenusFromFixture(
  fixturePath: string = FIXTURE_PATH,
): Promise<{ seeded: number }> {
  const raw = await readFile(fixturePath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(
      `example-menus fixture must be an array, got ${typeof parsed}`,
    );
  }

  let seeded = 0;
  for (const entry of parsed as FixtureEntry[]) {
    if (!entry.slug || !entry.imageHash || !entry.result) {
      throw new Error(
        `fixture entry missing slug / imageHash / result: ${JSON.stringify(entry).slice(0, 80)}`,
      );
    }
    // Validate result shape — defense in depth against a hand-edited fixture
    // that no longer matches the prompt schema.
    const validated = AnalyzeMenuResultSchema.parse(entry.result);
    await menusService.upsertExampleMenu({
      slug: entry.slug,
      imageHash: entry.imageHash,
      result: validated,
    });
    seeded += 1;
  }

  return { seeded };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  seedExampleMenusFromFixture()
    .then(({ seeded }) => {
      console.log(`example menus fixture: seeded ${seeded} entries`);
    })
    .catch((err) => {
      console.error(
        'example menus fixture seed failed:',
        err instanceof Error ? err.message : err,
      );
      process.exitCode = 1;
    });
}
