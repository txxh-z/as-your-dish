import type { Allergen, DietaryTag } from '@as-your-dish/shared';

export interface FlavorPrefs {
  spicy_max?: number;
}

export interface Profile {
  allergens: Allergen[];
  dietary: DietaryTag[];
  flavorPrefs: FlavorPrefs;
}

export interface ProfileResponse {
  profile: Profile;
}
