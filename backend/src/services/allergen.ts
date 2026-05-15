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
} from '@as-your-dish/shared';

import type { ProfilePayload } from './profile.js';

const EMPTY_PROFILE: ProfilePayload = {
  allergens: [],
  dietary: [],
  flavorPrefs: {},
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
  reason: string;
}> = [
  {
    preference: 'vegetarian',
    dietary: 'contains_pork',
    reason: '含猪肉，不符合素食',
  },
  {
    preference: 'vegan',
    dietary: 'contains_pork',
    reason: '含猪肉，不符合纯素',
  },
  {
    preference: 'vegan',
    allergen: 'dairy',
    reason: '含乳制品，不符合纯素',
  },
  {
    preference: 'vegan',
    allergen: 'eggs',
    reason: '含蛋，不符合纯素',
  },
  {
    preference: 'vegan',
    allergen: 'fish',
    reason: '含鱼，不符合纯素',
  },
  {
    preference: 'vegan',
    allergen: 'shellfish',
    reason: '含贝类，不符合纯素',
  },
  {
    preference: 'halal',
    dietary: 'contains_pork',
    reason: '含猪肉，不符合清真',
  },
  {
    preference: 'halal',
    dietary: 'contains_alcohol',
    reason: '含酒精，不符合清真',
  },
  {
    preference: 'kosher',
    dietary: 'contains_pork',
    reason: '含猪肉，不符合犹太洁食',
  },
  {
    preference: 'kosher',
    allergen: 'shellfish',
    reason: '含贝类，不符合犹太洁食',
  },
  {
    preference: 'gluten_free',
    allergen: 'gluten',
    reason: '含麸质，不符合无麸质',
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
): CrossCheckResult {
  const normalizedProfile = profile ?? EMPTY_PROFILE;
  const inferred = inferAllergens(dish);
  const originalAllergens = new Set(dish.allergens);
  const correctedAllergens = new Set<Allergen>(dish.allergens);
  const warnings: string[] = [];

  for (const allergen of inferred.keys()) {
    if (!originalAllergens.has(allergen)) {
      warnings.push(
        `系统补充检测：${dish.translated_name} 含 ${ALLERGEN_LABELS[allergen]}（${[
          ...inferred.get(allergen)!,
        ].join('、')}）`,
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
            : [`LLM 标注：${ALLERGEN_LABELS[allergen]}`],
      },
    ];
  });

  const hitDietary = findDietaryHits(
    correctedDish,
    normalizedProfile,
    inferred,
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
): DecoratedAnalysisResult {
  const globalWarnings = [...result.warnings];
  const baseDishes: Dish[] = [];
  const responseDishes: DishWithSafety[] = [];

  for (const dish of result.dishes) {
    const checked = crossCheck(dish, profile);
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
        reason: rule.reason,
        evidence: rule.dietary
          ? [DIETARY_TAG_LABELS[rule.dietary]]
          : evidenceForAllergen(rule.allergen!, inferred),
      },
    ];
  });
}

function evidenceForAllergen(
  allergen: Allergen,
  inferred: Map<Allergen, Set<string>>,
): string[] {
  const evidence = inferred.get(allergen);
  if (evidence && evidence.size > 0) return [...evidence];
  return [`LLM 标注：${ALLERGEN_LABELS[allergen]}`];
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
