// recipe-md.js — reads recipes written in the Markdown format from
// tools/seed/FORMAT.md (the same format build_seed.py reads), and checks them.
//
// This is how recipes written by Claude get into the app: paste the Markdown
// on the "Add recipes" screen, check the preview, save.

import { CATEGORIES } from './plan.js';

const UNITS = '(?:g|kg|ml|l|tsp|tbsp|cups?|pieces?|pcs?|bunch(?:es)?|pinch|cloves?|inch)';
const UNIT_NAMES = { pieces: 'piece', pc: 'piece', pcs: 'piece', cups: 'cup', cloves: 'clove', bunches: 'bunch' };
const YN_FIELDS = ['contains_paneer', 'contains_tofu', 'contains_cheese', 'contains_curd', 'cruciferous', 'kidney_caution'];
const DEVANAGARI = /[ऀ-ॿ]/;
// "soak in hot water", "soak for 30 minutes"… but not "add hot water if needed" while cooking.
const SHORT_SOAK = /(hot|warm|garam|gungun[ae])\s+(water|paani|pani)[^.\n]*(soak|bhig)|(hot|warm|garam|gungun[ae])\s+(water|paani|pani)\s+(for\s+\d+\s*min|mein\s+\d+\s*minute)|(soak|bhig)[^.\n]*(hot|warm|garam|gungun[ae])\s+(water|paani|pani)|soak(ed)?\s+(it\s+)?for\s+\d+\s*(min|minutes|mins)|\b(15|20|30|45)\s*(min|minutes|mins)\b[^.\n]*soak|half an hour[^.\n]*soak|soak[^.\n]*half an hour/i;
// A long pre-boil before cooking: should be an overnight soak instead.
const PRE_BOIL = /pre-?boil|par-?boil|\bboil[^.\n]{0,40}\b(20|25|30|40|45)\s*(min|minutes|mins)\b|\b(20|25|30|40|45)\s*(min|minutes|mins|minute)\b[^.\n]{0,30}\b(boil|ubal)|\bubal[^.\n]{0,30}\b(20|25|30|40|45)\s*minute/i;
const RINSE = /rinse|already soak|bhig[oa]|bhigoya|\bdho/i;

export function slug(text) {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function number(text) {
  if (text.includes('/')) {
    const [a, b] = text.split('/');
    return Math.round((Number(a) / Number(b)) * 1000) / 1000;
  }
  return Number(text);
}

/** "- 150 g rajma (soak overnight); picked over" → { quantity, unit, name, soak, prep_note } */
export function parseIngredientLine(line) {
  let text = line.replace(/^[-*\s]+/, '').trim();
  let prep_note = '';
  const semi = text.indexOf(';');
  if (semi >= 0) {
    prep_note = text.slice(semi + 1).trim();
    text = text.slice(0, semi).trim();
  }
  let soak = false;
  const paren = text.match(/\(([^)]*)\)\s*$/);
  if (paren && /soak/i.test(paren[1])) {
    soak = true;
    text = text.slice(0, paren.index).trim();
  }
  const m = text.match(new RegExp(`^(\\d+(?:[./]\\d+)?)\\s*(${UNITS})?\\s+(.+)$`, 'i'));
  if (m) {
    let unit = (m[2] || 'piece').toLowerCase();
    unit = UNIT_NAMES[unit] || unit;
    return { quantity: number(m[1]), unit, name: m[3].trim(), soak, prep_note };
  }
  return { quantity: '', unit: '', name: text, soak, prep_note };
}

/** Split the text on "## " headings; read "- field: value" lines and "### " sections. */
export function parseRecipes(text) {
  const blocks = String(text ?? '').replace(/\r\n?/g, '\n').split(/^## +/m).slice(1);
  return blocks.map((block) => {
    const lines = block.split('\n');
    const r = { name: lines[0].trim(), ingredients: [] };
    const sections = {};
    let section = null;
    for (const raw of lines.slice(1)) {
      const line = raw.replace(/\s+$/, '');
      const h = line.match(/^### +(.+)$/);
      if (h) {
        section = h[1].trim().toLowerCase();
        sections[section] ||= [];
        continue;
      }
      if (section === null) {
        const f = line.trim().match(/^[-*]\s*([a-z_]+)\s*:\s*(.*)$/);
        if (f) r[f[1]] = f[2].trim();
      } else if (section === 'ingredients') {
        if (/^\s*[-*]/.test(line)) r.ingredients.push(parseIngredientLine(line));
      } else {
        sections[section].push(line);
      }
    }
    const sec = (k) => (sections[k] || []).join('\n').trim();
    r.steps_en = sec('steps');
    r.steps_hindi = sec('steps (hindi)');
    r.reheat_en = sec('reheat');
    r.reheat_hindi = sec('reheat (hindi)');
    r.notes = sec('notes') || r.notes || '';
    if (r.reel) r.instagram_reel_url = r.reel;
    delete r.reel;
    r.id = slug(r.id || r.name);
    r.category = String(r.category ?? '').trim().toLowerCase();
    return r;
  });
}

/**
 * Check one parsed recipe against the house rules.
 * Returns { errors: [...], warnings: [...] }. Errors block saving.
 */
export function checkRecipe(r, idx, { replace = false } = {}) {
  const errors = [];
  const warnings = [];
  const yesish = (v) => /^(y|yes|true|1)$/i.test(String(v ?? '').trim());

  if (!r.name) errors.push('Needs a name after “## ”.');
  if (!CATEGORIES.includes(r.category)) errors.push(`Category must be one of: ${CATEGORIES.join(', ')}.`);
  if (idx.recipesById[r.id] && !replace) errors.push(`A recipe with id “${r.id}” already exists. Tick “Replace recipes that already exist” to overwrite it.`);
  if (idx.recipesById[r.id] && replace) warnings.push(`Will replace the existing “${idx.recipesById[r.id].name}”.`);

  const texts = [r.name, r.name_hindi, r.steps_en, r.steps_hindi, r.reheat_en, r.reheat_hindi, r.notes, ...r.ingredients.map((i) => i.name)];
  if (texts.some((t) => DEVANAGARI.test(String(t ?? '')))) errors.push('Has Devanagari text. Write Hindi in Latin letters.');

  if (r.category === 'dal' && !r.dal_type) warnings.push('Add dal_type (needed for the no-repeat rule).');
  if (r.category === 'soup' && !r.soup_style) warnings.push('Add soup_style.');
  if (!r.steps_en) warnings.push('No steps.');
  if (!r.ingredients.length) warnings.push('No ingredients listed.');
  if (r.category === 'salad' && yesish(r.cruciferous)) warnings.push('Cruciferous vegetables must not be raw in salads.');

  const script = `${r.steps_en}\n${r.steps_hindi}`;
  if (SHORT_SOAK.test(script)) warnings.push('Mentions a short or hot-water soak. Make it an overnight soak instead.');
  if (PRE_BOIL.test(script)) warnings.push('Has a long pre-boil (20+ minutes). Make it an overnight soak the evening before instead.');
  if (r.category === 'dal' && String(r.dal_type ?? '').toLowerCase() !== 'kadhi' && !r.ingredients.some((i) => i.soak)) {
    warnings.push('Every dal is soaked overnight: mark the dal “(soak overnight)” and tell the cook to rinse it.');
  }
  if (r.ingredients.some((i) => i.soak) && !RINSE.test(script)) {
    warnings.push('Has an overnight soak, but the script doesn’t tell the cook it’s already soaking and to rinse it.');
  }

  const known = new Set();
  for (const i of Object.values(idx.ingredientsById)) {
    known.add(String(i.id).toLowerCase());
    known.add(String(i.name ?? '').trim().toLowerCase());
  }
  const fresh = r.ingredients.filter((i) => !known.has(i.name.toLowerCase()) && !known.has(slug(i.name))).map((i) => i.name);
  if (fresh.length) warnings.push(`New ingredients will be added: ${fresh.join(', ')}. Fill in their shop section in the Sheet.`);

  for (const f of YN_FIELDS) {
    if (r[f] !== undefined && !/^(y|n|yes|no)$/i.test(String(r[f]).trim())) warnings.push(`${f} should be y or n.`);
  }
  return { errors, warnings };
}

// --- Plan block -----------------------------------------------------------------
//
// A paste can also fill in plan days, with a "# Plan" heading and a table:
//
//   # Plan
//   | date       | dal        | sabzi    | carb       | salad    | side | soup        | cheese | note |
//   |------------|------------|----------|------------|----------|------|-------------|--------|------|
//   | 2026-11-10 | dal-dhokli | Turai…   | wheat-roti | …        |      | tomato-soup | y      | …    |
//
// Dish cells take a recipe id or its exact name. Blank cells clear that dish.

const PLAN_COLUMNS = {
  date: 'date', dal: 'lunch_dal', lunch_dal: 'lunch_dal', sabzi: 'lunch_sabzi', lunch_sabzi: 'lunch_sabzi',
  carb: 'lunch_carb', lunch_carb: 'lunch_carb', salad: 'lunch_salad', lunch_salad: 'lunch_salad',
  side: 'lunch_side', lunch_side: 'lunch_side', soup: 'soup', cheese: 'cheese_night', cheese_night: 'cheese_night', note: 'note',
};
export const PLAN_DISH_FIELDS = ['lunch_dal', 'lunch_sabzi', 'lunch_carb', 'lunch_salad', 'lunch_side', 'soup'];

/** Split a paste into { recipes, plan }. The "# Plan" block is taken out before reading recipes. */
export function parsePaste(text) {
  const src = String(text ?? '').replace(/\r\n?/g, '\n');
  const m = src.match(/^# +Plan[^\n]*\n([\s\S]*?)(?=^#{1,2} +|(?![\s\S]))/m);
  const recipesText = m ? src.slice(0, m.index) + src.slice(m.index + m[0].length) : src;
  return { recipes: parseRecipes(recipesText), plan: m ? parsePlanTable(m[1]) : [] };
}

function parsePlanTable(block) {
  const rows = block.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|'));
  if (!rows.length) return [];
  const cells = (l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const head = cells(rows[0]).map((h) => PLAN_COLUMNS[h.toLowerCase().replace(/\s+/g, '_')] || null);
  return rows.slice(1)
    .filter((l) => !/^\|[\s:|-]+\|?$/.test(l)) // the |---| line
    .map((l) => {
      const row = {};
      cells(l).forEach((c, i) => { if (head[i]) row[head[i]] = c === '-' || c === '—' ? '' : c; });
      return row;
    })
    .filter((r) => r.date);
}

/**
 * Check plan rows and turn dish names into ids, using existing recipes and the
 * ones in the same paste. Returns { errors, warnings } and fixes up `plan` in place.
 */
export function checkPlan(plan, idx, pastedRecipes) {
  const errors = [];
  const warnings = [];
  const byName = new Map();
  for (const r of [...idx.recipes, ...pastedRecipes]) {
    byName.set(String(r.id).toLowerCase(), r.id);
    byName.set(String(r.name ?? '').trim().toLowerCase(), r.id);
  }
  for (const row of plan) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) { errors.push(`“${row.date}” isn’t a date like 2026-11-10.`); continue; }
    const [y, mo, d] = row.date.split('-').map(Number);
    if (new Date(y, mo - 1, d, 12).getDay() === 0) errors.push(`${row.date} is a Sunday, which has no cook.`);
    for (const f of PLAN_DISH_FIELDS) {
      if (!row[f]) continue;
      const id = byName.get(row[f].toLowerCase()) || byName.get(slug(row[f]));
      if (id) row[f] = id;
      else errors.push(`${row.date}: no recipe called “${row[f]}”.`);
    }
    if (row.cheese_night !== undefined) row.cheese_night = /^(y|yes|true|1)$/i.test(row.cheese_night) ? 'y' : 'n';
    if (idx.planByDate[row.date]) warnings.push(`${row.date} is already planned and will be overwritten.`);
  }
  return { errors, warnings };
}
