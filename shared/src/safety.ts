import type { Allergen } from './allergen.js';
import type { Avoidance } from './avoidance.js';
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

// WHY: avoidance hits are semantically distinct from allergen hits — they
// represent personal preference, not a health-safety issue. Carried in a
// separate field so the UI can render them with softer styling (yellow
// instead of red) without conditional checks on the allergen list.
export interface AvoidanceHit {
  avoidance: Avoidance;
  evidence: string[];
}

// Soft warning when a dish's flavor on some axis exceeds the user's
// configured upper bound. e.g. user set spicy_max=1, dish has spicy=4 →
// FlavorHit{axis:'spicy', dishValue:4, userMax:1}. UI shows yellow.
export type FlavorAxis =
  | 'salty'
  | 'sour'
  | 'sweet'
  | 'bitter'
  | 'spicy'
  | 'umami';

export interface FlavorHit {
  axis: FlavorAxis;
  dishValue: number;
  userMax: number;
}

export type DishWithSafety = Dish & {
  hits?: AllergenHit[];
  hitDietary?: DietaryHit[];
  avoidanceHits?: AvoidanceHit[];
  flavorHits?: FlavorHit[];
  warnings?: string[];
  example_image_url?: string | null;
  example_image_source?: 'cache' | 'unsplash' | 'unavailable';
};

export type AnalyzeMenuResultWithSafety = Omit<AnalyzeMenuResult, 'dishes'> & {
  dishes: DishWithSafety[];
};
