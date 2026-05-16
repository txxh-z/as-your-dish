import {
  ALLERGEN_KEYS,
  ALLERGEN_LABELS,
  DIETARY_TAG_LABELS,
  type Allergen,
  type AllergenHit,
  type AnalyzeMenuResult,
  type AnalyzeMenuResultWithSafety,
  type DietaryHit,
  type DietaryTag,
  type Dish,
  type DishWithSafety,
  type TargetLanguage,
} from '@as-your-dish/shared';

import type { ProfilePayload } from './profile.js';

const EMPTY_PROFILE: ProfilePayload = {
  allergens: [],
  dietary: [],
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
  warnings: string[];
}

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

  return {
    dish: correctedDish,
    hits,
    hitDietary,
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
