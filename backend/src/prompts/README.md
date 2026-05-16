# Prompts

Each prompt is versioned. When you make a non-trivial change to a prompt,
bump the version (`v1` → `v2`), keep the old file, and update the table
below. The `.ts` wrapper imports the markdown by version so a rollback is
just changing one import line.

| File                  | Version | Status | Notes                                              |
|-----------------------|---------|--------|----------------------------------------------------|
| `analyze-menu.v2.md`  | v2      | active | target output language + original-name retention   |
| `analyze-menu.v2.ts`  | v2      | active | wraps v2 markdown + emits JSON Schema 7            |
| `analyze-menu.v1.md`  | v1      | kept   | 5 few-shot examples, Chinese-output MVP prompt     |
| `analyze-menu.v1.ts`  | v1      | kept   | wraps v1 markdown + emits JSON Schema 7            |

## Change log

- **2026-05-16 · v2 created.** Adds explicit `zh/en/ko` target-output-language
  handling, requires `original_name` to preserve the menu text verbatim, and
  raises `description` to a 180-character cap for English/Korean parity.
- **2026-05-14 · v1 created.** Initial draft. Allergen enum locked to the
  FDA-9 (shellfish/peanuts/dairy/gluten/eggs/soy/tree_nuts/fish/sesame).
  Dietary enum locked to 7 tags (vegetarian/vegan/halal/kosher/contains_alcohol/
  contains_pork/gluten_free). `description` capped at 100 Chinese characters.
  Five few-shot examples cover EN/FR/TH/JA/ES dishes — chosen to exercise the
  "translate idiomatically, explain culturally" rule rather than literal
  rendering.
