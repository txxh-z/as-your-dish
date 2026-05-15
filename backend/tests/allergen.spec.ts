import type { Dish } from '@as-your-dish/shared';
import { describe, expect, it } from 'vitest';

import { crossCheck } from '../src/services/allergen.js';

const baseDish: Dish = {
  original_name: 'test dish',
  translated_name: '测试菜',
  description: '用于测试过敏原后处理的菜品描述。',
  ingredients: [{ name: 'rice' }],
  allergens: [],
  dietary: [],
  flavor: {
    salty: 1,
    sour: 0,
    sweet: 0,
    bitter: 0,
    spicy: 0,
    umami: 1,
  },
  image_search_keywords: 'test dish',
  confidence: 0.9,
};

describe('allergen cross-check', () => {
  it('adds fish when an ingredient contains fish sauce', () => {
    const result = crossCheck(
      {
        ...baseDish,
        ingredients: [{ name: 'fish sauce' }],
      },
      { allergens: ['fish'], dietary: [], flavorPrefs: {} },
    );

    expect(result.dish.allergens).toContain('fish');
    expect(result.hits).toEqual([
      { allergen: 'fish', evidence: ['fish sauce'] },
    ]);
    expect(result.warnings[0]).toContain('鱼');
  });

  it('adds shellfish when an ingredient contains prawn', () => {
    const result = crossCheck(
      {
        ...baseDish,
        ingredients: [{ name: 'prawn paste' }],
      },
      { allergens: ['shellfish'], dietary: [], flavorPrefs: {} },
    );

    expect(result.dish.allergens).toContain('shellfish');
    expect(result.hits).toEqual([
      { allergen: 'shellfish', evidence: ['prawn paste'] },
    ]);
  });

  it('flags contains_pork for vegetarian users', () => {
    const result = crossCheck(
      {
        ...baseDish,
        dietary: ['contains_pork'],
      },
      { allergens: [], dietary: ['vegetarian'], flavorPrefs: {} },
    );

    expect(result.hitDietary).toEqual([
      {
        preference: 'vegetarian',
        evidence: ['含猪肉'],
        reason: '含猪肉，不符合素食',
      },
    ]);
  });
});
