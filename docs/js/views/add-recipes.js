// add-recipes.js — paste recipes written by Claude (Markdown, see
// tools/seed/FORMAT.md), check the preview, and save them into the Sheet.

import { esc, toast } from '../lib/format.js';
import { parsePaste, checkRecipe, checkPlan } from '../lib/recipe-md.js';
import { longLabel } from '../lib/dates.js';
import { onClick } from './components.js';

// Kept while you move around the app, so a half-checked paste isn't lost.
const state = { text: '', replace: false };

export function renderAddRecipes(idx, _params, _rerender, app) {
  const saveBtn = onClick(async () => {
    const { recipes, plan } = parsePaste(state.text);
    checkPlan(plan, idx, recipes); // turns dish names into ids
    const btn = document.getElementById('save-recipes');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    const done = await app.save('addRecipes', { recipes, plan, replace: state.replace });
    if (!done) {
      btn.disabled = false;
      btn.textContent = saveLabel(recipes.length, plan.length);
      return;
    }
    state.text = '';
    state.replace = false;
    const n = done.added.length + done.replaced.length;
    const days = (done.planDays || []).length;
    const parts = [n && `${n} recipe${n === 1 ? '' : 's'}`, days && `${days} plan day${days === 1 ? '' : 's'}`].filter(Boolean);
    const extra = done.newIngredients.length ? ` New ingredients: ${done.newIngredients.join(', ')}.` : '';
    toast(`Saved ${parts.join(' and ')}.${extra}`);
    if (days) location.hash = `#/week/${done.planDays[0]}`;
    else location.hash = done.ids.length === 1 ? `#/recipe/${encodeURIComponent(done.ids[0])}` : '#/recipes';
  });

  queueMicrotask(() => wire(idx));

  return `<a class="back" href="#/recipes">‹ All recipes</a>
    <div class="eyebrow">Paste from Claude</div>
    <h1>Add recipes</h1>
    <p class="muted intro">Ask Claude to write the recipe in the meal-planner format, then paste it here.
      You can paste several recipes at once. Each one starts with a line beginning “## ”.
      A “# Plan” table in the same paste fills in plan days too.</p>
    <form class="edit-form" id="add-form" onsubmit="return false">
      <label class="field">
        <span class="field-label">Recipe Markdown</span>
        <textarea name="text" rows="14" spellcheck="false" placeholder="## Lauki chana dal&#10;- category: dal&#10;- dal_type: chana&#10;&#10;### Ingredients&#10;- 100 g chana dal (soak overnight)&#10;…">${esc(state.text)}</textarea>
      </label>
      <label class="check"><input type="checkbox" name="replace" ${state.replace ? 'checked' : ''}> Replace recipes that already exist</label>
    </form>
    <div id="add-preview"></div>
    <div class="save-bar">
      <button class="btn" id="save-recipes" ${saveBtn} disabled>Save</button>
    </div>`;
}

function saveLabel(n, days = 0) {
  const parts = [n && `${n} recipe${n === 1 ? '' : 's'}`, days && `${days} plan day${days === 1 ? '' : 's'}`].filter(Boolean);
  return parts.length ? `Save ${parts.join(' and ')}` : 'Save';
}

function wire(idx) {
  const form = document.getElementById('add-form');
  if (!form) return;
  const update = () => {
    const { recipes, plan } = parsePaste(state.text);
    const checked = recipes.map((r) => ({ r, ...checkRecipe(r, idx, { replace: state.replace }) }));
    const planCheck = checkPlan(plan, idx, recipes);
    const ids = recipes.map((r) => r.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    const blocked = (!recipes.length && !plan.length) || dupes.length || planCheck.errors.length || checked.some((c) => c.errors.length);

    const btn = document.getElementById('save-recipes');
    btn.disabled = !!blocked;
    btn.textContent = saveLabel(recipes.length, plan.length);
    document.getElementById('add-preview').innerHTML = preview(checked, dupes, state.text, plan.length) + planPreview(plan, planCheck, idx, recipes);
  };
  form.addEventListener('input', (e) => {
    if (e.target.name === 'text') state.text = e.target.value;
    if (e.target.name === 'replace') state.replace = e.target.checked;
    update();
  });
  update();
}

function preview(checked, dupes, text, planDays = 0) {
  if (!checked.length) {
    return text.trim() && !planDays
      ? '<div class="alert warn"><strong>No recipes found.</strong> Each recipe must start with a line like “## Rajma masala”.</div>'
      : '';
  }
  return `<div class="preview-list">
    ${dupes.length ? `<div class="alert warn"><strong>Same id twice:</strong> ${esc([...new Set(dupes)].join(', '))}. Give one of them a different “- id:”.</div>` : ''}
    ${checked.map(({ r, errors, warnings }) => `<section class="card preview">
      <div class="role">${esc(r.category ? r.category[0].toUpperCase() + r.category.slice(1) : 'No category')}</div>
      <h3>${esc(r.name || 'Untitled')}</h3>
      ${r.name_hindi && r.name_hindi.toLowerCase() !== r.name.toLowerCase() ? `<div class="muted" lang="hi-Latn">${esc(r.name_hindi)}</div>` : ''}
      <p class="muted small">${r.ingredients.length} ingredient${r.ingredients.length === 1 ? '' : 's'}${r.ingredients.some((i) => i.soak) ? `, soak overnight: ${esc(r.ingredients.filter((i) => i.soak).map((i) => i.name).join(', '))}` : ''}.
        ${r.steps_hindi ? 'Hindi script included.' : 'No Hindi script yet.'}</p>
      ${errors.map((e) => `<div class="alert warn"><strong>Fix:</strong> ${esc(e)}</div>`).join('')}
      ${warnings.length ? `<ul class="check-list">${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
      ${!errors.length && !warnings.length ? '<p class="pill yes">Ready to save</p>' : ''}
    </section>`).join('')}
  </div>`;
}

function planPreview(plan, { errors, warnings }, idx, recipes) {
  if (!plan.length) return '';
  const names = new Map([...idx.recipes, ...recipes].map((r) => [r.id, r.name]));
  const dish = (id) => (id ? esc(names.get(id) || id) : '');
  return `<section class="card rule preview">
    <h2>Plan</h2>
    ${errors.map((e) => `<div class="alert warn"><strong>Fix:</strong> ${esc(e)}</div>`).join('')}
    ${warnings.length ? `<ul class="check-list">${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
    ${plan.map((p) => `<div class="plan-row">
      <h3>${/^\d{4}-\d{2}-\d{2}$/.test(p.date) ? esc(longLabel(p.date)) : esc(p.date)}</h3>
      <p class="small">${[p.lunch_dal, p.lunch_sabzi, p.lunch_carb, p.lunch_salad, p.lunch_side].filter(Boolean).map(dish).join(', ')}</p>
      <p class="small muted">Soup: ${dish(p.soup) || 'none'}${p.cheese_night === 'y' ? '. Cheese night' : ''}</p>
    </div>`).join('')}
  </section>`;
}
