---
name: write-recipe
description: Write one or more recipes for the meal planner app in its Markdown format, ready to paste into the app's "Add recipes" screen. Use when the user asks for a new recipe, a recipe idea, to convert a recipe from a link/text/reel, or to change an existing recipe for the meal planner.
---

# Write a recipe for the meal planner

The user pastes your output into the app: **Recipes → Add recipes**. The app parses it,
checks it, and saves it into the Google Sheet. So the output must follow the format
exactly. The full format reference is [tools/seed/FORMAT.md](../../../tools/seed/FORMAT.md);
read it before writing.

## House rules

- **Vegetarian, home-style.** Lunches are dal + sabzi + carb + salad (and sometimes a side); evenings have a soup.
- **Quantities are for two adults.** Use the units in FORMAT.md (g, kg, ml, l, tsp, tbsp, cup, piece, bunch, pinch, clove, inch). Leaving out the unit means pieces (`2 onion`).
- **Ingredient names:** reuse the names already in the app where possible (e.g. `rajma`, `chana dal`, `tomato`, `onion`, `turai`), so they match the Ingredients tab. Check `apps-script/SampleData.gs` and `tools/seed/example/` for the usual names.
- **Soaking:** the cook never does a short hot-water soak. Anything that needs soaking is soaked **overnight by the user**:
  - mark the ingredient `(soak overnight)`
  - the first step says it's already soaking and to drain and rinse it ("The rajma is already soaking. Drain and rinse it first.")
  - if an overnight soak won't work, add `- soak_review: <why>` instead.
- **Hindi is written in Latin letters, never Devanagari.** `- name_hindi:` only when it differs from the English name. Add a `### Steps (Hindi)` section when asked or when it's easy, in simple spoken Hindi the cook can follow when it's read aloud ("Rajma ko dho kar kukar mein daalo, 5 seeti lagao.").
- **Steps are a read-aloud script for the cook:** short numbered sentences, one action each, with whistle counts, flame level and times.
- **Flags** (`y`, otherwise leave out): `contains_paneer`, `contains_tofu`, `contains_cheese`, `contains_curd`, `cruciferous`, `kidney_caution` (e.g. rajma, chole, palak, high-potassium or high-oxalate dishes).
- **Cruciferous vegetables** (gobhi, cabbage, broccoli…) are always cooked. They are never raw in a salad.
- **Required fields:** `category` is always required. Dals (including kadhi) need `dal_type`. Soups need `soup_style` and a `### Reheat` section (what the user does in the evening).
- **Replacing a recipe:** to change an existing one, keep its exact name (or set `- id:` to its id) and tell the user to tick **Replace recipes that already exist**.

## Output

1. Write the recipe(s) to `seed/new/<id>.md`. The `seed/` folder is git-ignored, so drafts never reach the public repo.
2. Copy the Markdown to the clipboard: `pbcopy < seed/new/<id>.md`.
3. Show the Markdown in your reply too, then tell the user: open the app → **Recipes → Add recipes** → paste → check the preview → **Save**.

Several recipes can go in one file and one paste. Each starts with a `## Name` line.

**Plans:** when the user wants days planned too (e.g. "add this week's plan"), put a `# Plan`
table at the top of the same file (format in FORMAT.md, "Plan block"). Use recipe ids,
reuse recipes that already exist where they match, and write the cook's order of work and
any reel reminders in the `note` column. Name the file after the week, e.g. `seed/new/week-2026-11-10.md`.

## Template

```markdown
## Bottle gourd chana dal
- name_hindi: Lauki chana dal
- category: dal
- dal_type: chana
- region: North Indian
- equipment: pressure cooker, kadai

### Ingredients
- 100 g chana dal (soak overnight)
- 350 g lauki; peeled and cubed
- 1 tomato; chopped
- 1/2 tsp turmeric
- 1 tsp cumin

### Steps
1. The chana dal is already soaking. Drain and rinse it first.
2. Pressure-cook the dal with lauki, turmeric and salt for 3 whistles on medium flame.
3. Heat 1 tsp ghee, add cumin, then tomato. Cook 3 minutes.
4. Pour the tadka over the dal and simmer for 2 minutes.

### Steps (Hindi)
1. Chana dal raat bhar bhigi hui hai. Pehle use dho lo.
2. Dal, lauki, haldi aur namak kukar mein daal kar 3 seeti lagao.
3. Ghee garam karo, jeera daalo, phir tamatar. 3 minute pakao.
4. Tadka dal mein daalo aur 2 minute ubalne do.

### Notes
Good with phulka.
```
