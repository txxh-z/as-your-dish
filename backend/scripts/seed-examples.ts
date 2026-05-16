import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  DEFAULT_TARGET_LANGUAGE,
  TARGET_LANGUAGE_KEYS,
  isTargetLanguage,
  type AnalyzeMenuResult,
  type TargetLanguage,
} from '@as-your-dish/shared';

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
  /** Languages to seed. Defaults to all supported languages. */
  languages?: TargetLanguage[];
}

// WHY: example menus share a single base slug per cuisine, but the demo
// route looks up a single row by slug. To serve language-localized example
// menus without DB schema changes, we encode the target language as a slug
// suffix (chinese-home-cooking-en/-ko) and as an imageHash prefix
// (en:HASH/ko:HASH) so the unique constraints still hold. zh keeps the
// bare slug/hash so existing zh callers (and cover images on disk) keep
// working unchanged.
function languageSlug(baseSlug: string, language: TargetLanguage): string {
  return language === DEFAULT_TARGET_LANGUAGE
    ? baseSlug
    : `${baseSlug}-${language}`;
}

function languageImageHash(
  rawHash: string,
  language: TargetLanguage,
): string {
  return language === DEFAULT_TARGET_LANGUAGE
    ? rawHash
    : `${language}:${rawHash}`;
}

function readLanguagesFromEnv(): TargetLanguage[] {
  const raw = process.env.SEED_LANGUAGES;
  if (!raw) return [...TARGET_LANGUAGE_KEYS];

  const languages = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (languages.length === 0) {
    throw new Error('SEED_LANGUAGES must include at least one language.');
  }

  const normalized: TargetLanguage[] = [];
  for (const language of languages) {
    if (!isTargetLanguage(language)) {
      throw new Error(
        `Unsupported SEED_LANGUAGES value "${language}". Expected one of: ${TARGET_LANGUAGE_KEYS.join(
          ', ',
        )}.`,
      );
    }
    normalized.push(language);
  }

  return [...new Set(normalized)];
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
  languages = readLanguagesFromEnv(),
}: SeedExamplesOptions = {}): Promise<void> {
  if (!dryRun && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required unless SEED_DRY_RUN=1.');
  }

  const provider = dryRun ? null : getLLMProvider();
  for (const example of examples) {
    const buffer = await readFile(example.imagePath);
    const rawHash = sha256Hex(buffer);
    for (const language of languages) {
      const slug = languageSlug(example.slug, language);
      const imageHash = languageImageHash(rawHash, language);
      const result = dryRun
        ? buildDryRunResult(example)
        : (
            await provider!.analyze([buffer], {
              apiKey: process.env.ANTHROPIC_API_KEY,
              targetLanguage: language,
            })
          ).result;

      const saved = await menusService.upsertExampleMenu({
        slug,
        imageHash,
        result,
      });
      console.log(
        `${dryRun ? '[dry-run] ' : ''}seeded ${example.displayName} [${language}] (${slug}) as ${saved.menuId}`,
      );
    }
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
