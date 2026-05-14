// FDA major food allergens (post-2023 list includes sesame as the 9th).
// Keys are lowercase English identifiers used across the stack and inside the
// LLM tool schema; values are Chinese display labels for UI.
export const ALLERGEN_KEYS = [
  'shellfish',
  'peanuts',
  'dairy',
  'gluten',
  'eggs',
  'soy',
  'tree_nuts',
  'fish',
  'sesame',
] as const;

export type Allergen = (typeof ALLERGEN_KEYS)[number];

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  shellfish: '贝类',
  peanuts: '花生',
  dairy: '乳制品',
  gluten: '麸质',
  eggs: '蛋',
  soy: '大豆',
  tree_nuts: '坚果',
  fish: '鱼',
  sesame: '芝麻',
};
