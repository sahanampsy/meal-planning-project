// shop.js — the week's shopping list, worked out from the plan.
//
// Every planned recipe's ingredients are added up per ingredient (grams with
// grams, ml with ml…). Items marked in stock on the Pantry tab go into a
// separate "Check you have" group instead of being hidden.

import { dayMeals, dayRecipeList, weekDates } from './plan.js';
import { qtyText } from './format.js';

export const SECTIONS = ['vegetables', 'greens & herbs', 'dals & grains', 'dairy & extras', 'spices'];
const SECTION_LABELS = {
  'vegetables': 'Vegetables', 'greens & herbs': 'Greens and herbs', 'dals & grains': 'Dals and grains',
  'dairy & extras': 'Dairy and extras', 'spices': 'Spices', '': 'Other',
};

// Units that can be added together, converted to a base unit.
const BASE = { g: ['g', 1], kg: ['g', 1000], ml: ['ml', 1], l: ['ml', 1000] };

/**
 * Returns { groups: [{ key, label, items }], inStock: [items], days: n }.
 * Each item: { key, text, recipes: [names] }.
 */
export function shoppingList(idx, monday) {
  const merged = new Map();
  let days = 0;

  for (const date of weekDates(monday)) {
    const meals = dayMeals(idx, date);
    if (!meals) continue;
    days++;
    for (const recipe of dayRecipeList(meals)) {
      for (const ri of idx.ingredientsByRecipe[recipe.id] || []) {
        const q = Number(ri.quantity) || 0;
        const rawUnit = String(ri.unit ?? '').trim().toLowerCase();
        const [unit, factor] = BASE[rawUnit] || [rawUnit, 1];
        const key = `${ri.ingredient.id}|${unit}`;
        const m = merged.get(key) || { key, ingredient: ri.ingredient, unit, quantity: 0, recipes: [] };
        m.quantity += q * factor;
        if (!m.recipes.includes(recipe.name)) m.recipes.push(recipe.name);
        merged.set(key, m);
      }
    }
  }

  // Same ingredient counted in pieces and in grams (2 tomatoes + 300 g tomato):
  // fold the pieces into the grams when we know what a piece weighs.
  for (const m of [...merged.values()]) {
    const gpp = Number(m.ingredient.grams_per_piece) || 0;
    const grams = merged.get(`${m.ingredient.id}|g`);
    if (!gpp || !grams || !['piece', ''].includes(m.unit)) continue;
    grams.quantity += m.quantity * gpp;
    for (const r of m.recipes) if (!grams.recipes.includes(r)) grams.recipes.push(r);
    merged.delete(m.key);
  }

  const items = [...merged.values()].map((m) => ({
    ...m,
    section: String(m.ingredient.section ?? '').trim().toLowerCase(),
    text: m.quantity ? qtyText(...bigUnit(m.quantity, m.unit), m.ingredient) : String(m.ingredient.name || m.ingredient.id),
  }));
  items.sort((a, b) => String(a.ingredient.name).localeCompare(String(b.ingredient.name)));

  const inStock = items.filter((i) => idx.inStock.has(i.ingredient.id));
  const toBuy = items.filter((i) => !idx.inStock.has(i.ingredient.id));
  const order = [...SECTIONS, ''];
  const groups = order
    .map((s) => ({ key: s || 'other', label: SECTION_LABELS[s], items: toBuy.filter((i) => (SECTIONS.includes(i.section) ? i.section : '') === s) }))
    .filter((g) => g.items.length);
  return { groups, inStock, days };
}

/** 1500 g → 1.5 kg; 1200 ml → 1.2 l. qtyText still adds "(about n)" for kg. */
function bigUnit(q, unit) {
  if (unit === 'g' && q >= 1000) return [q / 1000, 'kg'];
  if (unit === 'ml' && q >= 1000) return [q / 1000, 'l'];
  return [q, unit];
}

/** The list as plain text, for copying into WhatsApp or Notes. Ticked items are left out. */
export function listAsText(list, ticked, title) {
  const lines = [title, ''];
  for (const g of list.groups) {
    const left = g.items.filter((i) => !ticked.has(i.key));
    if (!left.length) continue;
    lines.push(`${g.label}:`, ...left.map((i) => `- ${i.text}`), '');
  }
  const check = list.inStock.filter((i) => !ticked.has(i.key));
  if (check.length) lines.push('Check you have:', ...check.map((i) => `- ${i.text}`), '');
  return lines.join('\n').trim();
}
