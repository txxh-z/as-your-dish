// Dietary tags shown on dish cards. The set deliberately mixes two kinds of
// signals: "vegetarian/vegan/halal/kosher/gluten_free" mean *this dish is
// safe for X-eaters*, while "contains_alcohol/contains_pork" mean *this dish
// has X*. Both are useful for warnings and filtering.
export const DIETARY_TAG_KEYS = [
  'vegetarian',
  'vegan',
  'halal',
  'kosher',
  'contains_alcohol',
  'contains_pork',
  'gluten_free',
] as const;

export type DietaryTag = (typeof DIETARY_TAG_KEYS)[number];

export const DIETARY_TAG_LABELS: Record<DietaryTag, string> = {
  vegetarian: '素食',
  vegan: '纯素',
  halal: '清真',
  kosher: '犹太洁食',
  contains_alcohol: '含酒精',
  contains_pork: '含猪肉',
  gluten_free: '无麸质',
};
