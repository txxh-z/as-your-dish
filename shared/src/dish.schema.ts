import { z } from 'zod';
import { ALLERGEN_KEYS } from './allergen.js';
import { DIETARY_TAG_KEYS } from './dietary.js';

export const AllergenEnum = z.enum(ALLERGEN_KEYS);
export const DietaryTagEnum = z.enum(DIETARY_TAG_KEYS);

export const FlavorProfile = z
  .object({
    salty: z.number().int().min(0).max(5),
    sour: z.number().int().min(0).max(5),
    sweet: z.number().int().min(0).max(5),
    bitter: z.number().int().min(0).max(5),
    spicy: z.number().int().min(0).max(5),
    umami: z.number().int().min(0).max(5),
  })
  .strict();
export type FlavorProfile = z.infer<typeof FlavorProfile>;

export const Ingredient = z
  .object({
    name: z.string().min(1).max(40),
    optional: z.boolean().optional(),
  })
  .strict();
export type Ingredient = z.infer<typeof Ingredient>;

export const Dish = z
  .object({
    original_name: z
      .string()
      .min(1)
      .max(80)
      .describe('Dish name verbatim, in the original language and script.'),
    translated_name: z
      .string()
      .min(1)
      .max(40)
      .describe('Idiomatic Chinese translation (意译, not literal).'),
    description: z
      .string()
      .min(10)
      .max(100)
      .describe(
        'Chinese description: cooking method + key ingredients + cultural context. HARD LIMIT 100 Chinese characters.',
      ),
    ingredients: z.array(Ingredient).min(1).max(20),
    allergens: z
      .array(AllergenEnum)
      .describe(
        'FDA-9 allergens present. Be conservative: include if uncertain (fish sauce → fish, soy sauce → soy+gluten).',
      ),
    dietary: z.array(DietaryTagEnum).describe('Applicable dietary tags.'),
    flavor: FlavorProfile,
    image_search_keywords: z
      .string()
      .min(1)
      .max(60)
      .describe('2-5 English keywords suitable for Unsplash search.'),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .describe('Model self-confidence in this identification, 0-1.'),
  })
  .strict();
export type Dish = z.infer<typeof Dish>;

export const AnalyzeMenuResult = z
  .object({
    language_detected: z
      .string()
      .min(2)
      .max(8)
      .describe('BCP-47 tag of the menu (e.g. "fr", "ja", "zh-CN").'),
    dishes: z.array(Dish).max(50),
    warnings: z
      .array(z.string().max(200))
      .default([])
      .describe('Caveats: blurry image, partial menu, suspicious data.'),
  })
  .strict();
export type AnalyzeMenuResult = z.infer<typeof AnalyzeMenuResult>;
