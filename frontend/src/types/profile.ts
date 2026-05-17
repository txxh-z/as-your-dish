import type { Allergen, Avoidance, DietaryTag } from '@as-your-dish/shared';

export interface FlavorPrefs {
  salty_max?: number;
  sour_max?: number;
  sweet_max?: number;
  bitter_max?: number;
  spicy_max?: number;
  umami_max?: number;
}

export interface Profile {
  allergens: Allergen[];
  dietary: DietaryTag[];
  avoidances: Avoidance[];
  flavorPrefs: FlavorPrefs;
}

export interface ProfileResponse {
  profile: Profile;
}
