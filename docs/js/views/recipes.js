// recipes.js — the recipe list (with filters) and a single recipe's page.

import { esc, qtyText } from '../lib/format.js';
import { longLabel, today } from '../lib/dates.js';
import { yes, CATEGORIES, datesForRecipe } from '../lib/plan.js';
import { dishTitle, scriptBlock, reelButtons, flagChips, altName } from './components.js';

// Filters are kept while you move around the app (reset on reload).
const filters = { q: '', category: '', region: '', soak: false, minProtein: '', inactive: false };

/** Add soakNeeded to each recipe (true if any of its ingredients is soaked overnight). */
function withSoak(idx, r) {
  return { ...r, soakNeeded: (idx.ingredientsByRecipe[r.id] || []).some((ri) => ri.soak) };
}

export function renderRecipes(idx, _params, rerender) {
  const regions = [...new Set(idx.recipes.map((r) => String(r.region ?? '').trim()).filter(Boolean))].sort();
  const hasProtein = idx.recipes.some((r) => Number(r.protein_g_per_person) > 0);

  const list = idx.recipes
    .map((r) => withSoak(idx, r))
    .filter((r) => filters.inactive || yes(r.active))
    .filter((r) => !filters.category || r.category === filters.category)
    .filter((r) => !filters.region || String(r.region ?? '').trim() === filters.region)
    .filter((r) => !filters.soak || r.soakNeeded)
    .filter((r) => !filters.minProtein || Number(r.protein_g_per_person) >= Number(filters.minProtein))
    .filter((r) => {
      if (!filters.q) return true;
      const hay = `${r.name} ${r.name_hindi} ${r.region} ${r.dal_type} ${r.soup_style}`.toLowerCase();
      return hay.includes(filters.q.toLowerCase());
    })
    .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || String(a.name).localeCompare(b.name));

  const opt = (value, label, current) => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`;

  const html = `<div class="day-nav"><h1>Recipes</h1><a class="btn quiet" href="#/add">Add recipes</a></div>
    <form class="filters" id="recipe-filters" onsubmit="return false">
      <input type="search" name="q" placeholder="Search" value="${esc(filters.q)}" aria-label="Search recipes">
      <select name="category" aria-label="Category">
        ${opt('', 'All categories', filters.category)}
        ${CATEGORIES.map((c) => opt(c, c[0].toUpperCase() + c.slice(1), filters.category)).join('')}
      </select>
      <select name="region" aria-label="Region">
        ${opt('', 'All regions', filters.region)}
        ${regions.map((r) => opt(r, r, filters.region)).join('')}
      </select>
      ${hasProtein ? `<select name="minProtein" aria-label="Protein">
        ${opt('', 'Any protein', filters.minProtein)}
        ${[5, 10, 15, 20].map((n) => opt(String(n), `≥ ${n} g protein`, filters.minProtein)).join('')}
      </select>` : ''}
      <label class="check"><input type="checkbox" name="soak" ${filters.soak ? 'checked' : ''}> Needs soak</label>
      <label class="check"><input type="checkbox" name="inactive" ${filters.inactive ? 'checked' : ''}> Show inactive</label>
    </form>
    <p class="muted small">${list.length} recipe${list.length === 1 ? '' : 's'}</p>
    <ul class="recipe-list">
      ${list.map((r) => `<li>
        <a class="recipe-row" href="#/recipe/${encodeURIComponent(r.id)}">
          <span class="cat">${esc(r.category || 'No category')}</span>
          <strong>${esc(r.name)}</strong>
          ${altName(r)}
          <span class="muted small">${esc([r.region, r.dal_type, r.soup_style].filter((x) => String(x ?? '').trim()).join(', '))}</span>
          <span class="chips">${flagChips(r, yes)}</span>
        </a>
      </li>`).join('')}
    </ul>`;

  // After drawing, listen for filter changes and redraw.
  queueMicrotask(() => {
    const form = document.getElementById('recipe-filters');
    if (!form) return;
    form.addEventListener('input', (e) => {
      const el = e.target;
      filters[el.name] = el.type === 'checkbox' ? el.checked : el.value;
      const pos = el.type === 'search' ? el.selectionStart : null;
      rerender();
      // Keep typing in the search box smooth after the redraw.
      if (pos !== null) {
        const box = document.querySelector('#recipe-filters input[name=q]');
        box.focus();
        box.setSelectionRange(pos, pos);
      }
    });
  });

  return html;
}

export function renderRecipe(idx, params) {
  const id = decodeURIComponent(params[0] || '');
  const r0 = idx.recipesById[id];
  if (!r0) return `<p>Recipe “${esc(id)}” not found.</p><a class="btn ghost" href="#/recipes">All recipes</a>`;
  const r = withSoak(idx, r0);
  const ingredients = idx.ingredientsByRecipe[r.id] || [];
  const upcoming = datesForRecipe(idx, r.id).filter((d) => d >= today()).slice(0, 6);

  const facts = [
    ['Category', r.category],
    ['Dal type', r.dal_type],
    ['Soup style', r.soup_style],
    ['Region', r.region],
    ['Protein / person', r.protein_g_per_person ? `${r.protein_g_per_person} g` : ''],
    ['kcal / person', r.kcal_per_person],
    ['Equipment', r.equipment],
  ].filter(([, v]) => String(v ?? '').trim());

  return `<a class="back" href="#/recipes">‹ All recipes</a>
    <header class="recipe-head">
      ${dishTitle(r, 'h1')}
      <div class="chips">${flagChips(r, yes)}</div>
      <dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${r.soak_review ? `<div class="alert warn" style="margin-top:14px"><strong>Soak review.</strong> ${esc(r.soak_review)}</div>` : ''}
      ${reelButtons(r)}
    </header>

    <section class="card rule">
      <h2>Ingredients <span class="muted small">(for two)</span></h2>
      ${ingredients.length ? `<ul class="ingredients">${ingredients.map((ri) => `<li>
          ${esc(qtyText(ri.quantity, ri.unit, ri.ingredient))}${ri.prep_note ? `<span class="muted">, ${esc(ri.prep_note)}</span>` : ''}
          ${altName(ri.ingredient)}
          ${ri.soak ? '<span class="chip soak">soak overnight</span>' : ''}
        </li>`).join('')}</ul>` : '<p class="muted">No ingredients listed.</p>'}
    </section>

    <section class="card">
      <h2>Script</h2>
      ${scriptBlock(r.steps_hindi, r.steps_en)}
    </section>

    ${r.category === 'soup' && (r.reheat_en || r.reheat_hindi) ? `<section class="card">
      <h2>Reheating</h2>
      ${r.reheat_en ? `<p>${esc(r.reheat_en)}</p>` : ''}
      ${r.reheat_hindi ? `<p class="muted" lang="hi-Latn">${esc(r.reheat_hindi)}</p>` : ''}
    </section>` : ''}

    ${r.notes ? `<section class="card"><h2>Notes</h2><p class="prewrap">${esc(r.notes)}</p></section>` : ''}

    <section class="card">
      <h2>Coming up</h2>
      ${upcoming.length
        ? `<ul class="upcoming">${upcoming.map((d) => `<li><a href="#/tonight/${d}">${esc(longLabel(d))}</a></li>`).join('')}</ul>`
        : '<p class="muted">Not planned in the coming days.</p>'}
    </section>`;
}
