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
import { dishTitle, scriptBlock, reelButtons, altName } from './components.js';

export function renderTonight(idx, params) {
  const date = params[0] || defaultCardDate();
  const evening = addDays(date, -1);

  const nav = `<div class="day-nav">
    <div>
      <div class="eyebrow">Read on ${DAY_NAMES[weekday(evening)]} evening</div>
      <h1>${esc(longLabel(date))}’s food</h1>
    </div>
    <div class="day-arrows">
      <a class="arrow" href="#/tonight/${stepCookDay(date, -1)}" aria-label="Previous day">‹</a>
      <a class="arrow" href="#/tonight/${stepCookDay(date, 1)}" aria-label="Next day">›</a>
    </div>
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
        <p class="muted">Nothing is planned for this day yet.</p>
        <div class="btn-row"><a class="btn" href="#/edit/${date}">Plan this day</a><a class="btn ghost" href="#/week">Open the week</a></div>
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
    meals.row.note ? `<section class="card"><h2>Note</h2><p class="prewrap">${esc(meals.row.note)}</p></section>` : '',
    `<div class="save-bar"><a class="btn ghost" href="#/edit/${date}">Change this day</a></div>`,
  ].join('');
}

function soakSection(idx, date) {
  const soaks = soaksFor(idx, date);
  const reviews = soakReviews(idx, date);
  const many = soaks.length >= soakWarnAt(idx);

  const list = soaks.length
    ? `<ul class="soak-list">${soaks.map((s) => {
        const [qty, what] = splitQty(qtyText(s.quantity, s.unit, s.ingredient));
        return `<li>
          <span class="soak-qty">${esc(qty)}</span>
          <span class="soak-what">${esc(what)}${altName(s.ingredient)}</span>
          <span class="muted small">for ${esc(s.recipes.join(', '))}</span>
        </li>`;
      }).join('')}</ul>`
    : `<p class="big-empty">Nothing to soak</p>`;

  return `<section class="card for-you ${many ? 'highlight' : ''}">
    <div class="eyebrow">For you, before bed</div>
    <h2>Soak overnight</h2>
    ${many ? `<div class="alert warn"><strong>${soaks.length} soaks tonight.</strong> Tick each one off as you go.</div>` : ''}
    ${list}
    ${reviews.map((r) => `<div class="alert warn small">${esc(r.name)}: ${esc(r.soak_review)}</div>`).join('')}
  </section>`;
}

function dalSabziSection(meals) {
  const dish = (label, r) => r
    ? `<article class="dish">
        <div class="role">${label}</div>
        ${dishTitle(r)}
        ${scriptBlock(r.steps_hindi, r.steps_en)}
        ${reelButtons(r)}
        ${r.notes ? `<p class="muted small">Note: ${esc(r.notes)}</p>` : ''}
      </article>`
    : `<article class="dish"><div class="role">${label}</div><p class="muted">Not planned</p></article>`;

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
        <div class="role">${label}</div>
        ${dishTitle(r, 'h3')}
        <details><summary>Show script</summary>${scriptBlock(r.steps_hindi, r.steps_en)}</details>
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
    cheeseLine = `<div class="alert warn"><strong>Skip the cheese.</strong> It’s a calcium-tablet night, so toast only.</div>`;
  } else if (cheese) {
    cheeseLine = `<p class="pill yes">Cheese night: add cheese and toast</p>`;
  } else {
    cheeseLine = `<p class="pill">Not a cheese night: toast only</p>`;
  }

  return `<section class="card">
    <h2>${DAY_NAMES[weekday(date)]} evening</h2>
    ${s ? `<p><strong>Reheat ${esc(s.name)}:</strong> ${esc(reheatEn)}</p>` : ''}
    ${reheatHi ? `<p class="muted" lang="hi-Latn">${esc(reheatHi)}</p>` : ''}
    ${cheeseLine}
  </section>`;
}

/** "1 cup rajma" → ["1 cup", "rajma"], so the amount can be set large. */
function splitQty(text) {
  const m = String(text).match(/^([\d.,/½¼¾⅓⅔\s]+(?:g|kg|ml|l|tsp|tbsp|cups?|pieces?|bunch(?:es)?|pinch|cloves?|inch)?)\s+(.+)$/i);
  return m ? [m[1].trim(), m[2]] : ['', text];
}
