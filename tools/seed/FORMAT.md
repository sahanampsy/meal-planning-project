# Seed format

`build_seed.py` reads a folder with these files. Your real files go in `/seed`.
That folder is **git-ignored**, so it never reaches the public repo. A worked
example is in `tools/seed/example/`.

You don't have to write this format yourself. Export your meal-plan doc
(Markdown or plain text) into `/seed`, and Claude will convert it into this
format, applying the soak rules below.

## recipes.md

One `##` heading per recipe. Fields come first, then `###` sections.

```markdown
## Rajma masala
- id: rajma-masala
- name_hindi: राजमा मसाला
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
(optional for now)

### Reheat
(soups only: what we do in the evening)

### Notes
Anything else.
```

### Fields
| field | values |
|---|---|
| id | optional; made from the name if missing |
| name_hindi | Hindi name |
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
