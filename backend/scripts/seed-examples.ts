import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { AnalyzeMenuResult } from '@as-your-dish/shared';

import { menusService } from '../src/services/menus.service.js';
import { sha256Hex } from '../src/services/hash.js';
import { getLLMProvider } from '../src/services/llm/index.js';

export interface ExampleSeedConfig {
  slug: string;
  imagePath: string;
  displayName: string;
}

export interface SeedExamplesOptions {
  dryRun?: boolean;
  examples?: ExampleSeedConfig[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(__dirname, '..');

export const EXAMPLES: ExampleSeedConfig[] = [
  {
    slug: 'chinese-home-cooking',
    displayName: '中式家常菜',
    imagePath: resolve(backendDir, 'examples/chinese-home-cooking.jpg'),
  },
  {
    slug: 'italian-trattoria',
    displayName: '意式小餐馆',
    imagePath: resolve(backendDir, 'examples/italian-trattoria.jpg'),
  },
  {
    slug: 'japanese-izakaya',
    displayName: '日式居酒屋',
    imagePath: resolve(backendDir, 'examples/japanese-izakaya.jpg'),
  },
];

export function buildDryRunResult(example: ExampleSeedConfig): AnalyzeMenuResult {
  return {
    language_detected: example.slug.startsWith('italian')
      ? 'it'
      : example.slug.startsWith('japanese')
        ? 'ja'
        : 'zh',
    dishes: [
      {
        original_name: example.displayName,
        translated_name: `${example.displayName}招牌菜`,
        description: '用于 seed dry-run 的示例菜品，不调用 LLM。',
        ingredients: [{ name: 'shrimp' }, { name: 'egg' }],
        allergens: [],
        dietary: [],
        flavor: {
          salty: 3,
          sour: 1,
          sweet: 1,
          bitter: 0,
          spicy: 2,
          umami: 4,
        },
        image_search_keywords: `${example.slug} food`,
        confidence: 0.9,
      },
    ],
    warnings: ['dry-run fixture'],
  };
}

export async function runSeedExamples({
  dryRun = process.env.SEED_DRY_RUN === '1',
  examples = EXAMPLES,
}: SeedExamplesOptions = {}): Promise<void> {
  if (!dryRun && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required unless SEED_DRY_RUN=1.');
  }

  const provider = dryRun ? null : getLLMProvider();
  for (const example of examples) {
    const buffer = await readFile(example.imagePath);
    const imageHash = sha256Hex(buffer);
    const result = dryRun
      ? buildDryRunResult(example)
      : (await provider!.analyze([buffer], {
          apiKey: process.env.ANTHROPIC_API_KEY,
        })).result;

    const saved = await menusService.upsertExampleMenu({
      slug: example.slug,
      imageHash,
      result,
    });
    console.log(
      `${dryRun ? '[dry-run] ' : ''}seeded ${example.displayName} (${example.slug}) as ${saved.menuId}`,
    );
  }

  console.log(
    'dish image warm-up skipped: Unsplash search/download consumes API quota, so images lazy-load through /api/dish-image on first view.',
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  runSeedExamples().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
