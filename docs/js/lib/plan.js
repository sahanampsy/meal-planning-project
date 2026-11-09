// plan.js — turns the raw Sheet rows into handy lookups, and answers questions
// like "what's for lunch on this day?" and "what do I soak tonight?".

import { addDays, weekday, DAY_SHORT } from './dates.js';

/** Sheet y/n → true/false. Accepts y, yes, true, 1 (any case). */
export function yes(v) {
  return v === true || /^(y|yes|true|1)$/i.test(String(v ?? '').trim());
}

/** The lunch/soup columns in a Plan row, in display order. */
export const SLOTS = [
  { key: 'lunch_dal', label: 'Dal' },
  { key: 'lunch_sabzi', label: 'Sabzi' },
  { key: 'lunch_carb', label: 'Carb' },
  { key: 'lunch_salad', label: 'Salad' },
  { key: 'lunch_side', label: 'Side' },
  { key: 'soup', label: 'Soup' },
];

export const CATEGORIES = ['dal', 'sabzi', 'carb', 'salad', 'soup', 'side'];

/** Build lookups once after loading. Everything else reads from this object. */
export function buildIndex(raw) {
  const str = (v) => String(v ?? '').trim();

  const recipes = raw.recipes.map((r) => ({ ...r, id: str(r.id), category: str(r.category).toLowerCase() }));
  const recipesById = Object.fromEntries(recipes.map((r) => [r.id, r]));
  const ingredientsById = Object.fromEntries(raw.ingredients.map((i) => [str(i.id), { ...i, id: str(i.id) }]));

  // recipe id → its ingredient rows (with the ingredient attached)
  const ingredientsByRecipe = {};
  for (const row of raw.recipeIngredients) {
    const rid = str(row.recipe_id);
    (ingredientsByRecipe[rid] ||= []).push({
      ...row,
      ingredient: ingredientsById[str(row.ingredient_id)] || { id: str(row.ingredient_id), name: str(row.ingredient_id) },
      soak: yes(row.soak_overnight),
    });
  }

  const planByDate = {};
  for (const p of raw.plan) if (p.date) planByDate[str(p.date)] = p;

  return {
    user: raw.user,
    settings: raw.settings || {},
    rules: raw.rules || {},
    recipes,
    recipesById,
    ingredientsById,
    ingredientsByRecipe,
    planByDate,
    loadedAt: raw.loadedAt,
  };
}

/** The recipes planned for a date: { row, dal, sabzi, carb, salad, side, soup } (missing = null). */
export function dayMeals(idx, iso) {
  const row = idx.planByDate[iso];
  if (!row) return null;
  const get = (key) => idx.recipesById[String(row[key] ?? '').trim()] || null;
  return {
    row,
    dal: get('lunch_dal'),
    sabzi: get('lunch_sabzi'),
    carb: get('lunch_carb'),
    salad: get('lunch_salad'),
    side: get('lunch_side'),
    soup: get('soup'),
    // ids typed in the Plan that don't match any recipe, so we can warn
    unknown: SLOTS.map((s) => String(row[s.key] ?? '').trim()).filter((id) => id && !idx.recipesById[id]),
  };
}

/** Every recipe on a day, lunch and soup. */
export function dayRecipeList(meals) {
  if (!meals) return [];
  return [meals.dal, meals.sabzi, meals.carb, meals.salad, meals.side, meals.soup].filter(Boolean);
}

/**
 * What must be soaked the evening BEFORE this date.
 * Returns [{ ingredient, quantity, unit, recipes: [names] }], merged per ingredient+unit.
 */
export function soaksFor(idx, iso) {
  const meals = dayMeals(idx, iso);
  const merged = {};
  for (const recipe of dayRecipeList(meals)) {
    for (const ri of idx.ingredientsByRecipe[recipe.id] || []) {
      if (!ri.soak) continue;
      const key = `${ri.ingredient.id}|${ri.unit}`;
      const m = (merged[key] ||= { ingredient: ri.ingredient, unit: ri.unit, quantity: 0, recipes: [] });
      m.quantity += Number(ri.quantity) || 0;
      if (!m.recipes.includes(recipe.name)) m.recipes.push(recipe.name);
    }
  }
  return Object.values(merged);
}

/** Recipes on this day whose soak needs your review (set by the seed script). */
export function soakReviews(idx, iso) {
  return dayRecipeList(dayMeals(idx, iso)).filter((r) => String(r.soak_review ?? '').trim());
}

export function isCheeseNight(meals) {
  return !!meals && yes(meals.row.cheese_night);
}

/**
 * Is the evening of this date a calcium-tablet evening?
 * Settings.calcium_tablet_days can list weekdays ("Tue,Fri") and/or dates ("2026-11-12").
 */
export function isCalciumNight(idx, iso) {
  const list = String(idx.settings.calcium_tablet_days ?? '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const dayName = DAY_SHORT[weekday(iso)].toLowerCase();
  return list.some((x) => x === iso || x.slice(0, 3) === dayName);
}

/** How many things to soak before the card shows the "several soaks" warning. */
export function soakWarnAt(idx) {
  return Number(idx.rules.soaks_per_night_warn) || 2;
}

/** The Mon–Sat dates of the week starting on this Monday. */
export function weekDates(mondayIso) {
  return [0, 1, 2, 3, 4, 5].map((n) => addDays(mondayIso, n));
}

/** Dates (sorted) on which a recipe is planned. */
export function datesForRecipe(idx, recipeId) {
  return Object.keys(idx.planByDate)
    .filter((d) => SLOTS.some((s) => String(idx.planByDate[d][s.key] ?? '').trim() === recipeId))
    .sort();
}
