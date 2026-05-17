// Personal taste avoidances. NOT a health-safety concept (those are
// Allergens) and NOT a cultural/religious concept (those are DietaryTags).
// These are ingredients the user simply prefers to avoid — surfaced in the
// UI as a softer yellow warning ("you don't eat X") rather than the red
// allergen banner. The list is extensible; add a key here, then add its
// keyword aliases to AVOIDANCE_TERMS in backend/src/services/allergen.ts.
export const AVOIDANCE_KEYS = [
  'scallion',
  'garlic',
  'cilantro',
  'onion',
  'ginger',
  'lamb',
  'organ_meat',
  'cumin',
  'mint',
  'wasabi',
] as const;

export type Avoidance = (typeof AVOIDANCE_KEYS)[number];

export const AVOIDANCE_LABELS: Record<Avoidance, string> = {
  scallion: '葱',
  garlic: '蒜',
  cilantro: '香菜',
  onion: '洋葱',
  ginger: '姜',
  lamb: '羊肉',
  organ_meat: '动物内脏',
  cumin: '孜然',
  mint: '薄荷',
  wasabi: '芥末（山葵）',
};
