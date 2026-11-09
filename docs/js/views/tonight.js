// tonight.js — the evening card. Read on evening X, it shows the food for day X+1.
//
// Order on the card:
//   1. For you: what to soak tonight
//   2. Dal and sabzi scripts (+ reel buttons if a dish has a reel)
//   3. Soup voice-note script
//   4. Carb, salad (and side)
//   5. That evening: reheating, cheese night, calcium-tablet warning

import { esc, qtyText } from '../lib/format.js';
import { addDays, longLabel, DAY_NAMES, weekday, stepCookDay, defaultCardDate } from '../lib/dates.js';
import { dayMeals, soaksFor, soakReviews, soakWarnAt, isCheeseNight, isCalciumNight } from '../lib/plan.js';
import { dishTitle, scriptBlock, reelButtons } from './components.js';

export function renderTonight(idx, params) {
  const date = params[0] || defaultCardDate();
  const evening = addDays(date, -1);

  const nav = `<div class="day-nav">
    <a class="btn ghost" href="#/tonight/${stepCookDay(date, -1)}" aria-label="Previous day">‹</a>
    <div class="day-nav-label">
      <div class="eyebrow">Read on ${DAY_NAMES[weekday(evening)]} evening</div>
      <h1>${esc(longLabel(date))}’s food</h1>
    </div>
    <a class="btn ghost" href="#/tonight/${stepCookDay(date, 1)}" aria-label="Next day">›</a>
  </div>`;

  // Saturday evening → Sunday: no cook.
  if (weekday(date) === 0) {
    const monday = addDays(date, 1);
    return `${nav}
      <section class="card">
        <h2>No cook tomorrow</h2>
        <p>Sunday is a day off. Monday’s card is read on Sunday evening.</p>
        <a class="btn" href="#/tonight/${monday}">See Monday’s card</a>
      </section>`;
  }

  const meals = dayMeals(idx, date);
  if (!meals) {
    return `${nav}
      <section class="card">
        <h2>Nothing planned</h2>
        <p class="muted">There’s no row for ${esc(date)} in the Plan tab.</p>
        <a class="btn ghost" href="#/week">Open the week view</a>
      </section>`;
  }

  return [
    nav,
    meals.unknown.length
      ? `<div class="alert warn">Plan has recipe ids that don’t exist in Recipes: ${meals.unknown.map(esc).join(', ')}</div>`
      : '',
    soakSection(idx, date),
    dalSabziSection(meals),
    soupSection(meals),
    carbSaladSection(idx, meals),
    eveningSection(idx, date, meals),
    meals.row.note ? `<section class="card"><h2>Note</h2><p>${esc(meals.row.note)}</p></section>` : '',
  ].join('');
}

function soakSection(idx, date) {
  const soaks = soaksFor(idx, date);
  const reviews = soakReviews(idx, date);
  const many = soaks.length >= soakWarnAt(idx);

  const list = soaks.length
    ? `<ul class="soak-list">${soaks.map((s) => `<li>
          <strong>${esc(qtyText(s.quantity, s.unit, s.ingredient))}</strong>
          ${s.ingredient.name_hindi ? `<span class="hi" lang="hi">${esc(s.ingredient.name_hindi)}</span>` : ''}
          <div class="muted small">for ${esc(s.recipes.join(', '))}</div>
        </li>`).join('')}</ul>`
    : `<p class="big-empty">Nothing to soak</p>`;

  return `<section class="card for-you ${many ? 'highlight' : ''}">
    <div class="eyebrow">For you · tonight</div>
    <h2>Soak overnight</h2>
    ${many ? `<div class="alert warn"><strong>${soaks.length} soaks tonight</strong> — don’t miss any.</div>` : ''}
    ${list}
    ${reviews.map((r) => `<div class="alert warn small">${esc(r.name)}: ${esc(r.soak_review)}</div>`).join('')}
  </section>`;
}

function dalSabziSection(meals) {
  const dish = (label, r) => r
    ? `<article class="dish">
        <div class="eyebrow">${label}</div>
        ${dishTitle(r)}
        ${scriptBlock(r.steps_hindi, r.steps_en)}
        ${reelButtons(r)}
        ${r.notes ? `<p class="muted small">Note: ${esc(r.notes)}</p>` : ''}
      </article>`
    : `<article class="dish"><div class="eyebrow">${label}</div><p class="muted">Not planned</p></article>`;

  return `<section class="card">
    <h2>Lunch: dal and sabzi</h2>
    ${dish('Dal', meals.dal)}
    ${dish('Sabzi', meals.sabzi)}
  </section>`;
}

function soupSection(meals) {
  const s = meals.soup;
  return `<section class="card">
    <h2>Soup voice note</h2>
    ${s
      ? `${dishTitle(s)}${scriptBlock(s.steps_hindi, s.steps_en)}`
      : '<p class="muted">No soup planned</p>'}
  </section>`;
}

function carbSaladSection(idx, meals) {
  const line = (label, r) => r
    ? `<div class="line-item">
        <div class="eyebrow">${label}</div>
        ${dishTitle(r, 'h3')}
        <details><summary>Details</summary>${scriptBlock(r.steps_hindi, r.steps_en)}</details>
      </div>`
    : '';

  return `<section class="card">
    <h2>Carb and salad</h2>
    ${line('Carb', meals.carb) || '<p class="muted">No carb planned</p>'}
    ${line('Salad', meals.salad) || '<p class="muted">No salad planned</p>'}
    ${line('Side', meals.side)}
  </section>`;
}

function eveningSection(idx, date, meals) {
  const s = meals.soup;
  const cheese = isCheeseNight(meals);
  const calcium = isCalciumNight(idx, date);
  const reheatEn = String(s?.reheat_en ?? '').trim() || String(idx.settings.default_reheat_en ?? '').trim();
  const reheatHi = String(s?.reheat_hindi ?? '').trim();

  let cheeseLine;
  if (cheese && calcium) {
    cheeseLine = `<div class="alert warn"><strong>Skip the cheese</strong> — calcium-tablet night. Toast only.</div>`;
  } else if (cheese) {
    cheeseLine = `<p class="pill yes">Cheese night — add cheese and toast</p>`;
  } else {
    cheeseLine = `<p class="pill">Not a cheese night — toast only</p>`;
  }

  return `<section class="card">
    <div class="eyebrow">${DAY_NAMES[weekday(date)]} evening</div>
    <h2>That evening</h2>
    ${s ? `<p><strong>Reheat ${esc(s.name)}:</strong> ${esc(reheatEn)}</p>` : ''}
    ${reheatHi ? `<p class="hi" lang="hi">${esc(reheatHi)}</p>` : ''}
    ${cheeseLine}
  </section>`;
}
