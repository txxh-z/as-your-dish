import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import { describe, expect, it } from 'vitest';

import { AnthropicProvider } from '../src/services/llm/anthropic.js';

// WHY: the shared secret lives in the monorepo root .env. When this spec runs
// via `npm run test -w @as-your-dish/backend`, npm sets cwd to backend/, and
// the default dotenv lookup misses the root file. Resolve the path explicitly
// from this spec's own location so the test works regardless of cwd.
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_ENV = join(__dirname, '..', '..', '.env');
loadDotenv({ path: ROOT_ENV });

// WHY: gated by env per PROJECT_PLAN R5 cost guard. CI must not burn $ on
// every push. Run locally with `RUN_LLM_TESTS=1 npm run test -w @as-your-dish/backend`.
const RUN = process.env.RUN_LLM_TESTS === '1';

const FIXTURE_PATH = join(__dirname, 'fixtures', 'menu-korean.jpg');
const EXPECTED_PATH = join(__dirname, 'fixtures', 'menu-korean.expected.json');

interface Expected {
  fixture: string;
  language_detected: string;
  min_dishes: number;
  min_spicy_at_least_one: number;
  description_max_chars: number;
  notes: string;
}

const FLAVOR_DIMS = ['salty', 'sour', 'sweet', 'bitter', 'spicy', 'umami'] as const;

// Broad regex so the consistency check catches both EN and CN seafood terms
// the LLM might emit in ingredient names.
const SEAFOOD_REGEX =
  /海鲜|海鮮|海鱼|海魚|貝|贝|蛤|虾|蝦|蟹|龙虾|龍蝦|鱿鱼|魷魚|章鱼|章魚|牡蛎|牡蠣|扇贝|扇貝|fish|shrimp|prawn|crab|lobster|squid|octopus|clam|scallop|oyster|mussel/i;

describe.skipIf(!RUN)('AnthropicProvider · fixture acceptance', () => {
  it(
    'analyzes the Korean menu fixture and satisfies weak assertions',
    { timeout: 300_000 },
    async () => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          `ANTHROPIC_API_KEY missing. Looked for .env at ${ROOT_ENV}.`,
        );
      }

      const expected: Expected = JSON.parse(readFileSync(EXPECTED_PATH, 'utf-8'));
      const imageBuffer = readFileSync(FIXTURE_PATH);

      const provider = new AnthropicProvider(apiKey);
      const outcome = await provider.analyze([imageBuffer]);

      // ----- human-eyeball diagnostics -----
      console.log('\n=== AnthropicProvider · fixture run ===');
      console.log(`model           : ${outcome.model}`);
      console.log(`keySource       : ${outcome.keySource}`);
      console.log(`inputTokens     : ${outcome.usage.inputTokens}`);
      console.log(`outputTokens    : ${outcome.usage.outputTokens}`);
      console.log(`estimatedUsd    : $${outcome.estimatedUsd.toFixed(6)}`);
      console.log(`language        : ${outcome.result.language_detected}`);
      console.log(`dishes detected : ${outcome.result.dishes.length}`);
      console.log(
        `warnings        : ${JSON.stringify(outcome.result.warnings)}`,
      );
      console.log('--- dishes ---');
      outcome.result.dishes.forEach((d, i) => {
        console.log(
          `\n[${i + 1}] ${d.original_name} → ${d.translated_name}  (confidence=${d.confidence})`,
        );
        console.log(
          `    description (${d.description.length}字): ${d.description}`,
        );
        console.log(
          `    ingredients: ${d.ingredients
            .map((ing) => (ing.optional ? `${ing.name}?` : ing.name))
            .join(', ')}`,
        );
        console.log(`    allergens  : ${JSON.stringify(d.allergens)}`);
        console.log(`    dietary    : ${JSON.stringify(d.dietary)}`);
        console.log(`    flavor     : ${JSON.stringify(d.flavor)}`);
        console.log(`    image kw   : ${d.image_search_keywords}`);
      });
      console.log('\n=== end of fixture run ===\n');

      // ----- assertion 1: enough dishes detected -----
      expect(outcome.result.dishes.length).toBeGreaterThanOrEqual(
        expected.min_dishes,
      );

      // ----- assertion 2: language detected matches -----
      expect(outcome.result.language_detected).toBe(expected.language_detected);

      // ----- assertion 3: description discipline (≤100 chars each) -----
      for (const d of outcome.result.dishes) {
        expect(
          d.description.length,
          `Dish "${d.translated_name}" description is ${d.description.length} chars`,
        ).toBeLessThanOrEqual(expected.description_max_chars);
      }

      // ----- assertion 4: flavor dims are integers in [0, 5] -----
      for (const d of outcome.result.dishes) {
        for (const dim of FLAVOR_DIMS) {
          const v = d.flavor[dim];
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(5);
          expect(Number.isInteger(v)).toBe(true);
        }
      }

      // ----- assertion 5: at least one dish has non-trivial spicy -----
      const maxSpicy = Math.max(
        ...outcome.result.dishes.map((d) => d.flavor.spicy),
      );
      expect(maxSpicy).toBeGreaterThanOrEqual(expected.min_spicy_at_least_one);

      // ----- assertion 6: seafood ↔ allergen consistency (conditional) -----
      const seafoodDishes = outcome.result.dishes.filter((d) =>
        d.ingredients.some((ing) => SEAFOOD_REGEX.test(ing.name)),
      );
      if (seafoodDishes.length > 0) {
        console.log(
          `\nseafood-bearing dishes: ${seafoodDishes
            .map((d) => d.translated_name)
            .join(', ')}`,
        );
        for (const d of seafoodDishes) {
          const flagged =
            d.allergens.includes('shellfish') || d.allergens.includes('fish');
          if (!flagged) {
            throw new Error(
              `Allergen-fallback regression: dish "${d.translated_name}" has seafood ingredients ${JSON.stringify(
                d.ingredients.map((i) => i.name),
              )} but allergens=${JSON.stringify(d.allergens)} — missing shellfish/fish.`,
            );
          }
        }
      } else {
        console.log(
          'no seafood-bearing dishes detected; allergen consistency check is vacuous.',
        );
      }
    },
  );
});
