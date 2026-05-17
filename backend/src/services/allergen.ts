import {
  ALLERGEN_KEYS,
  ALLERGEN_LABELS,
  AVOIDANCE_KEYS,
  AVOIDANCE_LABELS,
  DIETARY_TAG_LABELS,
  type Allergen,
  type AllergenHit,
  type AnalyzeMenuResult,
  type AnalyzeMenuResultWithSafety,
  type Avoidance,
  type AvoidanceHit,
  type DietaryHit,
  type DietaryTag,
  type Dish,
  type DishWithSafety,
  type FlavorAxis,
  type FlavorHit,
  type TargetLanguage,
} from '@as-your-dish/shared';

import type { ProfilePayload } from './profile.js';

const EMPTY_PROFILE: ProfilePayload = {
  allergens: [],
  dietary: [],
  avoidances: [],
  flavorPrefs: {},
};

const ALLERGEN_LABELS_BY_LANGUAGE: Record<
  TargetLanguage,
  Record<Allergen, string>
> = {
  zh: ALLERGEN_LABELS,
  en: {
    shellfish: 'shellfish',
    peanuts: 'peanuts',
    dairy: 'dairy',
    gluten: 'gluten',
    eggs: 'eggs',
    soy: 'soy',
    tree_nuts: 'tree nuts',
    fish: 'fish',
    sesame: 'sesame',
  },
  ko: {
    shellfish: '갑각류/조개류',
    peanuts: '땅콩',
    dairy: '유제품',
    gluten: '글루텐',
    eggs: '달걀',
    soy: '대두',
    tree_nuts: '견과류',
    fish: '생선',
    sesame: '참깨',
  },
};

const DIETARY_TAG_LABELS_BY_LANGUAGE: Record<
  TargetLanguage,
  Record<DietaryTag, string>
> = {
  zh: DIETARY_TAG_LABELS,
  en: {
    vegetarian: 'vegetarian',
    vegan: 'vegan',
    halal: 'halal',
    kosher: 'kosher',
    contains_alcohol: 'contains alcohol',
    contains_pork: 'contains pork',
    gluten_free: 'gluten-free',
  },
  ko: {
    vegetarian: '채식',
    vegan: '비건',
    halal: '할랄',
    kosher: '코셔',
    contains_alcohol: '알코올 포함',
    contains_pork: '돼지고기 포함',
    gluten_free: '글루텐 프리',
  },
};

const AVOIDANCE_LABELS_BY_LANGUAGE: Record<
  TargetLanguage,
  Record<Avoidance, string>
> = {
  zh: AVOIDANCE_LABELS,
  en: {
    scallion: 'scallion',
    garlic: 'garlic',
    cilantro: 'cilantro',
    onion: 'onion',
    ginger: 'ginger',
    lamb: 'lamb',
    organ_meat: 'organ meat',
    cumin: 'cumin',
    mint: 'mint',
    wasabi: 'wasabi',
  },
  ko: {
    scallion: '파',
    garlic: '마늘',
    cilantro: '고수',
    onion: '양파',
    ginger: '생강',
    lamb: '양고기',
    organ_meat: '내장',
    cumin: '커민',
    mint: '민트',
    wasabi: '와사비',
  },
};

const FLAVOR_AXIS_LABELS_BY_LANGUAGE: Record<
  TargetLanguage,
  Record<FlavorAxis, string>
> = {
  zh: {
    salty: '咸',
    sour: '酸',
    sweet: '甜',
    bitter: '苦',
    spicy: '辣',
    umami: '鲜',
  },
  en: {
    salty: 'salty',
    sour: 'sour',
    sweet: 'sweet',
    bitter: 'bitter',
    spicy: 'spicy',
    umami: 'umami',
  },
  ko: {
    salty: '짠맛',
    sour: '신맛',
    sweet: '단맛',
    bitter: '쓴맛',
    spicy: '매운맛',
    umami: '감칠맛',
  },
};

// WHY: same matching strategy as ALLERGEN_TERMS but for personal-preference
// dislikes. Add bilingual / trilingual aliases per key so matching survives
// LLM output language variation. Coverage gaps will surface as missing
// yellow warnings, not as silent miscategorization.
const AVOIDANCE_TERMS: Record<Avoidance, string[]> = {
  scallion: [
    'scallion',
    'scallions',
    'green onion',
    'green onions',
    'spring onion',
    'spring onions',
    '葱',
    '小葱',
    '大葱',
    '青葱',
    '葱花',
    '葱白',
    '파',
    '대파',
    '쪽파',
  ],
  garlic: [
    'garlic',
    'garlic clove',
    'minced garlic',
    'garlic powder',
    '蒜',
    '大蒜',
    '蒜末',
    '蒜泥',
    '蒜蓉',
    '蒜片',
    '마늘',
    '다진 마늘',
  ],
  cilantro: [
    'cilantro',
    'coriander',
    'coriander leaf',
    'coriander leaves',
    '香菜',
    '芫荽',
    '코리앤더',
    '고수',
  ],
  onion: [
    'onion',
    'onions',
    'red onion',
    'yellow onion',
    'shallot',
    'shallots',
    '洋葱',
    '红洋葱',
    '紫洋葱',
    '黄洋葱',
    '青葱头',
    '양파',
    '적양파',
  ],
  ginger: [
    'ginger',
    'fresh ginger',
    'ginger root',
    '姜',
    '生姜',
    '老姜',
    '姜片',
    '姜末',
    '姜丝',
    '생강',
  ],
  lamb: [
    'lamb',
    'mutton',
    'goat',
    '羊',
    '羊肉',
    '羊排',
    '羊腿',
    '羊肩',
    '羔羊',
    '山羊',
    '양고기',
    '양',
  ],
  organ_meat: [
    'liver',
    'kidney',
    'heart',
    'tripe',
    'intestine',
    'intestines',
    'tongue',
    'offal',
    'gizzard',
    'sweetbread',
    '肝',
    '猪肝',
    '鸡肝',
    '鸭肝',
    '腰子',
    '猪腰',
    '心',
    '猪心',
    '鸡心',
    '肚',
    '猪肚',
    '牛肚',
    '毛肚',
    '肠',
    '大肠',
    '肥肠',
    '小肠',
    '舌',
    '猪舌',
    '牛舌',
    '内脏',
    '下水',
    '간',
    '곱창',
    '대창',
    '막창',
    '내장',
  ],
  cumin: ['cumin', '孜然', '커민'],
  mint: ['mint', 'peppermint', 'spearmint', '薄荷', '민트'],
  wasabi: ['wasabi', 'horseradish', '芥末', '山葵', '와사비', '고추냉이'],
};

const ALLERGEN_TERMS: Record<Allergen, string[]> = {
  shellfish: [
    'shrimp',
    'prawn',
    'lobster',
    'crab',
    'crayfish',
    'crawfish',
    'scallop',
    'clam',
    'mussel',
    'oyster',
    'shellfish',
    '虾',
    '虾仁',
    '虾米',
    '小龙虾',
    '龙虾',
    '螃蟹',
    '蟹',
    '蟹肉',
    '扇贝',
    '蛤',
    '蚬',
    '牡蛎',
    '生蚝',
    '贝类',
    '새우',
    '게',
    '가리비',
    '조개',
    '굴',
  ],
  peanuts: [
    'peanut',
    'peanuts',
    'groundnut',
    'arachis',
    '花生',
    '花生酱',
    '花生油',
    '落花生',
    '땅콩',
  ],
  dairy: [
    'milk',
    'cream',
    'butter',
    'cheese',
    'yogurt',
    'ghee',
    'whey',
    'casein',
    '乳',
    '牛奶',
    '奶油',
    '黄油',
    '奶酪',
    '芝士',
    '酸奶',
    '酥油',
    '우유',
    '버터',
    '치즈',
  ],
  gluten: [
    'wheat',
    'barley',
    'rye',
    'malt',
    'flour',
    'bread',
    'noodle',
    'noodles',
    'soy sauce',
    '小麦',
    '大麦',
    '黑麦',
    '麦芽',
    '面粉',
    '面条',
    '拉面',
    '乌冬',
    '酱油',
    '麸质',
    '밀',
    '보리',
    '면',
    '간장',
  ],
  eggs: [
    'egg',
    'eggs',
    'mayonnaise',
    'mayo',
    'aioli',
    'omelet',
    'omelette',
    '蛋',
    '鸡蛋',
    '鸭蛋',
    '蛋黄',
    '蛋白',
    '美乃滋',
    '蛋黄酱',
    '계란',
    '달걀',
  ],
  soy: [
    'soy',
    'soya',
    'soybean',
    'tofu',
    'miso',
    'edamame',
    'soy sauce',
    '大豆',
    '黄豆',
    '豆腐',
    '味噌',
    '毛豆',
    '酱油',
    '두부',
    '간장',
    '된장',
  ],
  tree_nuts: [
    'almond',
    'walnut',
    'cashew',
    'pistachio',
    'hazelnut',
    'pecan',
    'macadamia',
    'pine nut',
    'pine nuts',
    '坚果',
    '杏仁',
    '核桃',
    '腰果',
    '开心果',
    '榛子',
    '碧根果',
    '澳洲坚果',
    '松子',
    '아몬드',
    '호두',
    '캐슈',
  ],
  fish: [
    'fish',
    'anchovy',
    'anchovies',
    'sardine',
    'tuna',
    'salmon',
    'cod',
    'mackerel',
    'bonito',
    'fish sauce',
    '鱼',
    '鱼露',
    '鳀鱼',
    '沙丁鱼',
    '金枪鱼',
    '吞拿鱼',
    '三文鱼',
    '鲑鱼',
    '鳕鱼',
    '鲭鱼',
    '柴鱼',
    '鲣鱼',
    '생선',
    '멸치',
    '연어',
    '고등어',
    '액젓',
  ],
  sesame: [
    'sesame',
    'tahini',
    'sesame oil',
    '芝麻',
    '芝麻油',
    '麻油',
    '芝麻酱',
    '참깨',
    '참기름',
  ],
};

const DIETARY_RULES: Array<{
  preference: DietaryTag;
  dietary?: DietaryTag;
  allergen?: Allergen;
  reason: Record<TargetLanguage, string>;
}> = [
  {
    preference: 'vegetarian',
    dietary: 'contains_pork',
    reason: {
      zh: '含猪肉，不符合素食',
      en: 'Contains pork, not suitable for vegetarian diets',
      ko: '돼지고기가 포함되어 채식에 맞지 않습니다',
    },
  },
  {
    preference: 'vegan',
    dietary: 'contains_pork',
    reason: {
      zh: '含猪肉，不符合纯素',
      en: 'Contains pork, not suitable for vegan diets',
      ko: '돼지고기가 포함되어 비건에 맞지 않습니다',
    },
  },
  {
    preference: 'vegan',
    allergen: 'dairy',
    reason: {
      zh: '含乳制品，不符合纯素',
      en: 'Contains dairy, not suitable for vegan diets',
      ko: '유제품이 포함되어 비건에 맞지 않습니다',
    },
  },
  {
    preference: 'vegan',
    allergen: 'eggs',
    reason: {
      zh: '含蛋，不符合纯素',
      en: 'Contains eggs, not suitable for vegan diets',
      ko: '달걀이 포함되어 비건에 맞지 않습니다',
    },
  },
  {
    preference: 'vegan',
    allergen: 'fish',
    reason: {
      zh: '含鱼，不符合纯素',
      en: 'Contains fish, not suitable for vegan diets',
      ko: '생선이 포함되어 비건에 맞지 않습니다',
    },
  },
  {
    preference: 'vegan',
    allergen: 'shellfish',
    reason: {
      zh: '含贝类，不符合纯素',
      en: 'Contains shellfish, not suitable for vegan diets',
      ko: '갑각류/조개류가 포함되어 비건에 맞지 않습니다',
    },
  },
  {
    preference: 'halal',
    dietary: 'contains_pork',
    reason: {
      zh: '含猪肉，不符合清真',
      en: 'Contains pork, not suitable for halal diets',
      ko: '돼지고기가 포함되어 할랄에 맞지 않습니다',
    },
  },
  {
    preference: 'halal',
    dietary: 'contains_alcohol',
    reason: {
      zh: '含酒精，不符合清真',
      en: 'Contains alcohol, not suitable for halal diets',
      ko: '알코올이 포함되어 할랄에 맞지 않습니다',
    },
  },
  {
    preference: 'kosher',
    dietary: 'contains_pork',
    reason: {
      zh: '含猪肉，不符合犹太洁食',
      en: 'Contains pork, not suitable for kosher diets',
      ko: '돼지고기가 포함되어 코셔에 맞지 않습니다',
    },
  },
  {
    preference: 'kosher',
    allergen: 'shellfish',
    reason: {
      zh: '含贝类，不符合犹太洁食',
      en: 'Contains shellfish, not suitable for kosher diets',
      ko: '갑각류/조개류가 포함되어 코셔에 맞지 않습니다',
    },
  },
  {
    preference: 'gluten_free',
    allergen: 'gluten',
    reason: {
      zh: '含麸质，不符合无麸质',
      en: 'Contains gluten, not suitable for gluten-free diets',
      ko: '글루텐이 포함되어 글루텐 프리에 맞지 않습니다',
    },
  },
];

export interface CrossCheckResult {
  dish: Dish;
  hits: AllergenHit[];
  hitDietary: DietaryHit[];
  avoidanceHits: AvoidanceHit[];
  flavorHits: FlavorHit[];
  warnings: string[];
}

const FLAVOR_PREF_KEY_BY_AXIS: Record<FlavorAxis, keyof ProfilePayload['flavorPrefs']> =
  {
    salty: 'salty_max',
    sour: 'sour_max',
    sweet: 'sweet_max',
    bitter: 'bitter_max',
    spicy: 'spicy_max',
    umami: 'umami_max',
  };

const FLAVOR_AXES: FlavorAxis[] = [
  'salty',
  'sour',
  'sweet',
  'bitter',
  'spicy',
  'umami',
];

export interface DecoratedAnalysisResult {
  result: AnalyzeMenuResult;
  response: AnalyzeMenuResultWithSafety;
}

export function crossCheck(
  dish: Dish,
  profile: ProfilePayload | null = EMPTY_PROFILE,
  targetLanguage: TargetLanguage = 'zh',
): CrossCheckResult {
  const normalizedProfile = profile ?? EMPTY_PROFILE;
  const inferred = inferAllergens(dish);
  const originalAllergens = new Set(dish.allergens);
  const correctedAllergens = new Set<Allergen>(dish.allergens);
  const warnings: string[] = [];

  for (const allergen of inferred.keys()) {
    if (!originalAllergens.has(allergen)) {
      warnings.push(
        systemAllergenWarning(
          dish.translated_name,
          allergen,
          [...inferred.get(allergen)!],
          targetLanguage,
        ),
      );
    }
    correctedAllergens.add(allergen);
  }

  const correctedDish: Dish = {
    ...dish,
    allergens: ALLERGEN_KEYS.filter((key) => correctedAllergens.has(key)),
  };

  const hits = normalizedProfile.allergens.flatMap((allergen): AllergenHit[] => {
    if (!correctedAllergens.has(allergen)) return [];
    const evidence = [...(inferred.get(allergen) ?? [])];
    return [
      {
        allergen,
        evidence:
          evidence.length > 0
            ? evidence
            : [llmMarkedAllergen(allergen, targetLanguage)],
      },
    ];
  });

  const hitDietary = findDietaryHits(
    correctedDish,
    normalizedProfile,
    inferred,
    targetLanguage,
  );

  const avoidanceHits = findAvoidanceHits(correctedDish, normalizedProfile);
  const flavorHits = findFlavorHits(correctedDish, normalizedProfile);

  return {
    dish: correctedDish,
    hits,
    hitDietary,
    avoidanceHits,
    flavorHits,
    warnings,
  };
}

export function decorateAnalysisResult(
  result: AnalyzeMenuResult,
  profile: ProfilePayload | null,
  targetLanguage: TargetLanguage = 'zh',
): DecoratedAnalysisResult {
  const globalWarnings = [...result.warnings];
  const baseDishes: Dish[] = [];
  const responseDishes: DishWithSafety[] = [];

  for (const dish of result.dishes) {
    const checked = crossCheck(dish, profile, targetLanguage);
    baseDishes.push(checked.dish);
    globalWarnings.push(...checked.warnings);
    responseDishes.push({
      ...checked.dish,
      hits: checked.hits,
      hitDietary: checked.hitDietary,
      avoidanceHits: checked.avoidanceHits,
      flavorHits: checked.flavorHits,
      warnings: checked.warnings,
    });
  }

  const warnings = unique(globalWarnings);
  return {
    result: {
      ...result,
      dishes: baseDishes,
      warnings,
    },
    response: {
      ...result,
      dishes: responseDishes,
      warnings,
    },
  };
}

// WHY: avoidance matching mirrors allergen inference but produces hits
// only when the user has flagged the avoidance — there's no "wrong but safe"
// auto-tagging, because avoidances are preference, not health-safety. If a
// dish contains scallion but the user doesn't object to scallion, do
// nothing.
function findAvoidanceHits(
  dish: Dish,
  profile: ProfilePayload,
): AvoidanceHit[] {
  if (profile.avoidances.length === 0) return [];
  const preferences = new Set<Avoidance>(profile.avoidances);
  const hits: AvoidanceHit[] = [];

  for (const avoidance of AVOIDANCE_KEYS) {
    if (!preferences.has(avoidance)) continue;
    const evidence = new Set<string>();
    for (const ingredient of dish.ingredients) {
      if (AVOIDANCE_TERMS[avoidance].some((term) => matchesTerm(ingredient.name, term))) {
        evidence.add(ingredient.name);
      }
    }
    if (evidence.size > 0) {
      hits.push({ avoidance, evidence: [...evidence] });
    }
  }
  return hits;
}

function findFlavorHits(dish: Dish, profile: ProfilePayload): FlavorHit[] {
  return FLAVOR_AXES.flatMap((axis): FlavorHit[] => {
    const max = profile.flavorPrefs[FLAVOR_PREF_KEY_BY_AXIS[axis]];
    if (max === undefined || max >= 5) return [];
    const dishValue = dish.flavor[axis];
    if (dishValue <= max) return [];
    return [{ axis, dishValue, userMax: max }];
  });
}

function inferAllergens(dish: Dish): Map<Allergen, Set<string>> {
  const matches = new Map<Allergen, Set<string>>();
  for (const ingredient of dish.ingredients) {
    for (const allergen of ALLERGEN_KEYS) {
      if (ALLERGEN_TERMS[allergen].some((term) => matchesTerm(ingredient.name, term))) {
        const evidence = matches.get(allergen) ?? new Set<string>();
        evidence.add(ingredient.name);
        matches.set(allergen, evidence);
      }
    }
  }
  return matches;
}

function findDietaryHits(
  dish: Dish,
  profile: ProfilePayload,
  inferred: Map<Allergen, Set<string>>,
  targetLanguage: TargetLanguage,
): DietaryHit[] {
  const preferences = new Set(profile.dietary);
  const dishDietary = new Set(dish.dietary);
  const dishAllergens = new Set(dish.allergens);

  return DIETARY_RULES.flatMap((rule): DietaryHit[] => {
    if (!preferences.has(rule.preference)) return [];
    if (rule.dietary && !dishDietary.has(rule.dietary)) return [];
    if (rule.allergen && !dishAllergens.has(rule.allergen)) return [];

    return [
      {
        preference: rule.preference,
        reason: rule.reason[targetLanguage],
        evidence: rule.dietary
          ? [dietaryLabel(rule.dietary, targetLanguage)]
          : evidenceForAllergen(rule.allergen!, inferred, targetLanguage),
      },
    ];
  });
}

function evidenceForAllergen(
  allergen: Allergen,
  inferred: Map<Allergen, Set<string>>,
  targetLanguage: TargetLanguage,
): string[] {
  const evidence = inferred.get(allergen);
  if (evidence && evidence.size > 0) return [...evidence];
  return [llmMarkedAllergen(allergen, targetLanguage)];
}

function allergenLabel(
  allergen: Allergen,
  targetLanguage: TargetLanguage,
): string {
  return ALLERGEN_LABELS_BY_LANGUAGE[targetLanguage][allergen];
}

function dietaryLabel(
  tag: DietaryTag,
  targetLanguage: TargetLanguage,
): string {
  return DIETARY_TAG_LABELS_BY_LANGUAGE[targetLanguage][tag];
}

function llmMarkedAllergen(
  allergen: Allergen,
  targetLanguage: TargetLanguage,
): string {
  const label = allergenLabel(allergen, targetLanguage);
  if (targetLanguage === 'en') return `LLM flagged: ${label}`;
  if (targetLanguage === 'ko') return `LLM 표시: ${label}`;
  return `LLM 标注：${label}`;
}

function systemAllergenWarning(
  dishName: string,
  allergen: Allergen,
  evidence: string[],
  targetLanguage: TargetLanguage,
): string {
  const label = allergenLabel(allergen, targetLanguage);
  const joinedEvidence = evidence.join(targetLanguage === 'zh' ? '、' : ', ');
  if (targetLanguage === 'en') {
    return `System cross-check: ${dishName} may contain ${label} (${joinedEvidence})`;
  }
  if (targetLanguage === 'ko') {
    return `시스템 추가 확인: ${dishName}에 ${label}이(가) 포함될 수 있습니다 (${joinedEvidence})`;
  }
  return `系统补充检测：${dishName} 含 ${label}（${joinedEvidence}）`;
}

function matchesTerm(value: string, term: string): boolean {
  const text = normalize(value);
  const normalizedTerm = normalize(term);
  if (!isLatinTerm(normalizedTerm)) return text.includes(normalizedTerm);

  const pattern = new RegExp(
    `(^|[^a-z])${escapeRegExp(normalizedTerm).replace(/\s+/g, '\\s+')}([^a-z]|$)`,
  );
  return pattern.test(text);
}

function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase();
}

function isLatinTerm(value: string): boolean {
  return /^[a-z][a-z\s-]*$/.test(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}
