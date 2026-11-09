// edit-day.js — change one day of the plan: the dishes, cheese night and a note.
// The week's rule warnings update as you change things, before you save.

import { esc } from '../lib/format.js';
import { addDays, longLabel, mondayOf, weekday, stepCookDay, defaultCardDate, DAY_NAMES } from '../lib/dates.js';
import { SLOTS, yes } from '../lib/plan.js';
import { weekWarnings } from '../lib/rules.js';
import { onClick } from './components.js';

// Unsaved changes, per date, kept while you move around the app.
const drafts = {};

const CATEGORY_FOR = { lunch_dal: 'dal', lunch_sabzi: 'sabzi', lunch_carb: 'carb', lunch_salad: 'salad', lunch_side: 'side', soup: 'soup' };
const FIELDS = [...SLOTS.map((s) => s.key), 'cheese_night', 'note'];

function rowToDraft(row) {
  const d = {};
  for (const k of FIELDS) d[k] = String(row?.[k] ?? '').trim();
  d.cheese_night = yes(row?.cheese_night) ? 'y' : 'n';
  return d;
}

export function renderEditDay(idx, params, rerender, app) {
  const date = params[0] || defaultCardDate();
  const original = rowToDraft(idx.planByDate[date]);
  const draft = (drafts[date] ||= { ...original });

  const nav = `<a class="back" href="#/tonight/${date}">‹ Back to the card</a>
    <div class="day-nav">
      <div>
        <div class="eyebrow">Change the plan</div>
        <h1>${esc(longLabel(date))}</h1>
      </div>
      <div class="day-arrows">
        <a class="arrow" href="#/edit/${stepCookDay(date, -1)}" aria-label="Previous day">‹</a>
        <a class="arrow" href="#/edit/${stepCookDay(date, 1)}" aria-label="Next day">›</a>
      </div>
    </div>`;

  if (weekday(date) === 0) {
    return `${nav}<section class="card"><h2>Sunday is a day off</h2>
      <a class="btn" href="#/edit/${addDays(date, 1)}">Plan Monday instead</a></section>`;
  }

  const select = (slot) => {
    const cat = CATEGORY_FOR[slot.key];
    const current = draft[slot.key];
    const options = idx.recipes
      .filter((r) => r.category === cat && (yes(r.active) || r.id === current))
      .sort((a, b) => String(a.name).localeCompare(b.name));
    const unknown = current && !idx.recipesById[current];
    return `<label class="field">
      <span class="field-label">${slot.label}</span>
      <select name="${slot.key}">
        <option value="">None</option>
        ${unknown ? `<option value="${esc(current)}" selected>${esc(current)} (not in Recipes)</option>` : ''}
        ${options.map((r) => `<option value="${esc(r.id)}" ${r.id === current ? 'selected' : ''}>${esc(r.name)}${yes(r.active) ? '' : ' (inactive)'}</option>`).join('')}
      </select>
    </label>`;
  };

  const saveBtn = onClick(async () => {
    const btn = document.getElementById('save-day');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    const done = await app.save('savePlanDay', { date, day: draft });
    if (done) {
      delete drafts[date];
      location.hash = `#/tonight/${date}`;
    } else {
      btn.disabled = false;
      btn.textContent = 'Save';
    }
  });
  const resetBtn = onClick(() => {
    drafts[date] = { ...original };
    rerender();
  });

  queueMicrotask(() => wireForm(idx, date, draft, original));

  return `${nav}
    <form class="card rule edit-form" id="edit-day" onsubmit="return false">
      <h2>Lunch</h2>
      ${SLOTS.filter((s) => s.key !== 'soup').map(select).join('')}
      <h2 class="spaced">${DAY_NAMES[weekday(date)]} evening</h2>
      ${select(SLOTS.find((s) => s.key === 'soup'))}
      <label class="check"><input type="checkbox" name="cheese_night" ${draft.cheese_night === 'y' ? 'checked' : ''}> Cheese night</label>
      <label class="field">
        <span class="field-label">Note for the card</span>
        <textarea name="note" rows="3" maxlength="500">${esc(draft.note)}</textarea>
      </label>
    </form>
    <section class="card" id="week-check"></section>
    <div class="save-bar">
      <button class="btn" id="save-day" ${saveBtn}>Save</button>
      <button class="btn ghost" id="reset-day" ${resetBtn}>Undo changes</button>
    </div>`;
}

/** Keep the draft in step with the form, and refresh the rule check and buttons. */
function wireForm(idx, date, draft, original) {
  const form = document.getElementById('edit-day');
  if (!form) return;
  const update = () => {
    const changed = FIELDS.some((k) => draft[k] !== original[k]);
    document.getElementById('save-day').disabled = !changed;
    document.getElementById('reset-day').hidden = !changed;
    document.getElementById('week-check').innerHTML = weekCheck(idx, date, draft);
  };
  form.addEventListener('input', (e) => {
    const el = e.target;
    draft[el.name] = el.type === 'checkbox' ? (el.checked ? 'y' : 'n') : el.value;
    update();
  });
  update();
}

/** The week's rule warnings, as if the draft were already saved. */
function weekCheck(idx, date, draft) {
  const planByDate = { ...idx.planByDate, [date]: { ...(idx.planByDate[date] || {}), date, ...draft } };
  const warnings = weekWarnings({ ...idx, planByDate }, mondayOf(date));
  return `<h2>This week’s rules</h2>
    ${warnings.length
      ? warnings.map((w) => `<div class="alert warn">${esc(w)}</div>`).join('')
      : '<p class="pill yes">Everything is within the limits on the Rules tab.</p>'}`;
}
