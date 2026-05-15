import type { Allergen } from './allergen.js';
import type { DietaryTag } from './dietary.js';
import type { AnalyzeMenuResult, Dish } from './dish.schema.js';

export interface AllergenHit {
  allergen: Allergen;
  evidence: string[];
}

export interface DietaryHit {
  preference: DietaryTag;
  evidence: string[];
  reason: string;
}

export type DishWithSafety = Dish & {
  hits?: AllergenHit[];
  hitDietary?: DietaryHit[];
  warnings?: string[];
};

export type AnalyzeMenuResultWithSafety = Omit<AnalyzeMenuResult, 'dishes'> & {
  dishes: DishWithSafety[];
};
