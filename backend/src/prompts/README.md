# Prompts

Each prompt is versioned. When you make a non-trivial change to a prompt,
bump the version (`v1` → `v2`), keep the old file, and update the table
below. The `.ts` wrapper imports the markdown by version so a rollback is
just changing one import line.

| File                  | Version | Status | Notes                                              |
|-----------------------|---------|--------|----------------------------------------------------|
| `analyze-menu.v1.md`  | v1      | active | 5 few-shot examples, 9-allergen + 7-dietary locked |
| `analyze-menu.v1.ts`  | v1      | active | wraps v1 markdown + emits JSON Schema 7            |

## Change log

- **2026-05-14 · v1 created.** Initial draft. Allergen enum locked to the
  FDA-9 (shellfish/peanuts/dairy/gluten/eggs/soy/tree_nuts/fish/sesame).
  Dietary enum locked to 7 tags (vegetarian/vegan/halal/kosher/contains_alcohol/
  contains_pork/gluten_free). `description` capped at 100 Chinese characters.
  Five few-shot examples cover EN/FR/TH/JA/ES dishes — chosen to exercise the
  "translate idiomatically, explain culturally" rule rather than literal
  rendering.
