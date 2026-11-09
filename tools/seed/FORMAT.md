# Seed format

`build_seed.py` reads a folder with these files. Your real files go in `/seed`.
That folder is **git-ignored**, so it never reaches the public repo. A worked
example is in `tools/seed/example/`.

**Adding a few recipes later:** ask Claude (the `write-recipe` skill in this repo
knows the format and rules), then paste the result into the app: **Recipes → Add
recipes**. The app checks it the same way this tool does and saves it straight into
the Sheet. Use this tool for the first big import.

You don't have to write this format yourself. Export your meal-plan doc
(Markdown or plain text) into `/seed`, and Claude will convert it into this
format, applying the soak rules below.

## Hindi

All Hindi (names, scripts, reheat notes) is written in **Latin letters**, never Devanagari.
The seed tool lists any Devanagari it finds in REVIEW.md.

## recipes.md

One `##` heading per recipe. Fields come first, then `###` sections.

```markdown
## Rajma masala
- id: rajma-masala
- name_hindi: Rajma masala
- category: dal
- dal_type: rajma
- region: Punjabi
- kidney_caution: y
- equipment: pressure cooker, kadai
- reel: https://www.instagram.com/reel/...

### Ingredients
- 150 g rajma (soak overnight)
- 2 onion; finely chopped
- 300 g tomato; pureed
- 1 tsp garam masala
- salt to taste

### Steps
1. The rajma is already soaking — drain and rinse it first.
2. ...

### Steps (Hindi)
(optional for now; write Hindi in Latin letters, e.g. "Rajma ko dho kar kukar mein daalo")

### Reheat
(soups only: what we do in the evening)

### Notes
Anything else.
```

### Fields
| field | values |
|---|---|
| id | optional; made from the name if missing |
| name_hindi | Hindi name, in Latin letters (e.g. `Lauki chana dal`). Leave it out if it's the same as the English name. |
| category | `dal`, `sabzi`, `carb`, `salad`, `soup`, `side` (kadhi counts as `dal`) |
| dal_type | dals and dal-based soups: `toor`, `moong`, `masoor`, `chana`, `rajma`, `kadhi`... |
| soup_style | soups: `italian`, `indo-chinese`, `pasta`, `low-carb-veg`... |
| region | free text |
| contains_paneer, contains_tofu, contains_cheese, contains_curd, cruciferous, kidney_caution | `y` / `n` (left out = `n`) |
| equipment | comma list |
| reel | Instagram reel link (optional) |
| soak_review | why this recipe's soak needs your attention (optional) |
| active | `y` / `n` (left out = `y`) |

### Ingredient lines
`- <quantity> <unit> <ingredient>[ (soak overnight)][; prep note]`

- Quantities are for two adults. Units: g, kg, ml, l, tsp, tbsp, cup, piece, bunch, pinch, clove, inch.
- If you leave out the unit, it means pieces (`2 onion`).
- `(soak overnight)` means **you** soak it the evening before. It then appears on the previous evening's card.

## Plan block (in the app's Add recipes paste)
A paste can also fill in plan days. Add a `# Plan` heading (one `#`) with a table:

```markdown
# Plan
| date       | dal        | sabzi         | carb       | salad                 | soup        | cheese | note |
|------------|------------|---------------|------------|-----------------------|-------------|--------|------|
| 2026-11-11 | dal-dhokli | bharwa-bhindi |            | cucumber-carrot-salad | tomato-soup | y      | Order: soup, dal, sabzi, salad. |
```

- Columns: `date`, `dal`, `sabzi`, `carb`, `salad`, `side`, `soup`, `cheese` (y/n), `note`. Leave out a column to keep that field as it is.
- Dish cells take a recipe id or its exact name, including recipes in the same paste. A blank cell clears that dish.
- Days that are already planned are overwritten. Sundays aren't allowed.

## ingredients.csv (optional)
`id,name,name_hindi,section,grams_per_piece,perishable`

- **section:** one of `vegetables`, `greens & herbs`, `dals & grains`, `dairy & extras`, `spices`.
- **grams_per_piece:** lets shopping lists say "400 g turai (about 3)".
- **Unlisted ingredients:** anything a recipe uses that isn't in this file is created automatically and listed in REVIEW.md.

## plan.csv (optional)
`date,lunch_dal,lunch_sabzi,lunch_carb,lunch_salad,lunch_side,soup,cheese_night,note`

- **date:** `YYYY-MM-DD`.
- **Dish columns:** a recipe id or its exact name.

## Soak rule
The cook never does a short hot-water soak. Every soak is an overnight soak done by you.

- **Converting a recipe:** when it says "soak chana dal in hot water for 30 min" and an overnight soak works:
  - mark the ingredient `(soak overnight)`
  - rewrite the step to "the chana dal is already soaking — drain and rinse it first"
- **When overnight won't work:** keep the recipe, and add `- soak_review: <why>` to its fields so it's flagged for you.
- **What the script checks:** it flags any leftover "hot water / 30 minutes" soak wording, and any overnight soak whose script doesn't tell the cook to rinse.
