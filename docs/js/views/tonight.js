// tonight.js — the evening card. Read on evening X, it shows the food for day X+1.
//
// Order on the card (the same as the cook's evening routine):
//   1. For you: what to soak tonight
//   2. Voice note 1: the soup script
//   3. Voice note 2: ONE lunch script (dal, sabzi, carb, salad, side), with one copy
//      button, + reel buttons for dishes that have one
//   4. That evening: reheating, cheese night, calcium-tablet warning

import { esc, qtyText, copyText } from '../lib/format.js';
import { addDays, longLabel, DAY_NAMES, weekday, stepCookDay, defaultCardDate } from '../lib/dates.js';
import { dayMeals, soaksFor, soakReviews, soakWarnAt, isCheeseNight, isCalciumNight } from '../lib/plan.js';
import { dishTitle, scriptBlock, reelButtons, altName, hindiName, onClick } from './components.js';

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
    soupSection(meals),
    lunchSection(meals),
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

function soupSection(meals) {
  const s = meals.soup;
  return `<section class="card">
    <div class="eyebrow">Voice note 1</div>
    <h2>Soup</h2>
    ${s
      ? `${dishTitle(s)}${scriptBlock(s.steps_hindi, s.steps_en)}`
      : '<p class="muted">No soup planned</p>'}
  </section>`;
}

/** "a", "a aur b", "a, b aur c" (or "and" in English). */
function joinNames(names, and) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
}

/**
 * The whole lunch as one voice-note script, in the order the cook makes it:
 * an opening line naming the dishes, then each dish's script, then "keep lemon on the table".
 * Dishes without a Hindi script use their English steps in the Hindi version.
 */
export function lunchScript(meals) {
  const dishes = [meals.dal, meals.sabzi, meals.carb, meals.salad, meals.side].filter(Boolean);
  const text = (r, lang) => String((lang === 'hi' ? r.steps_hindi || r.steps_en : r.steps_en) ?? '').trim();
  const hiName = (r) => hindiName(r) || r.name;
  const hi = [
    `Kal dopahar ke khane mein ${joinNames(dishes.map(hiName), 'aur')} banana hai.`,
    ...dishes.filter((r) => text(r, 'hi')).map((r) => `${hiName(r)}: ${text(r, 'hi')}`),
    'Mez par nimbu rakhna.',
  ].join('\n\n');
  const en = [
    `Tomorrow's lunch is ${joinNames(dishes.map((r) => r.name), 'and')}.`,
    ...dishes.filter((r) => text(r, 'en')).map((r) => `${r.name}: ${text(r, 'en')}`),
    'Keep lemon on the table.',
  ].join('\n\n');
  return { dishes, hi, en, missingHindi: dishes.filter((r) => !String(r.steps_hindi ?? '').trim()) };
}

function lunchSection(meals) {
  const { dishes, hi, en, missingHindi } = lunchScript(meals);
  if (!dishes.length) {
    return `<section class="card"><div class="eyebrow">Voice note 2</div><h2>Lunch</h2><p class="muted">No lunch planned</p></section>`;
  }
  const roles = [['Dal', meals.dal], ['Sabzi', meals.sabzi], ['Carb', meals.carb], ['Salad', meals.salad], ['Side', meals.side]];

  return `<section class="card">
    <div class="eyebrow">Voice note 2</div>
    <h2>Lunch</h2>
    <ul class="lunch-dishes">
      ${roles.filter(([, r]) => r).map(([label, r]) => `<li>
        <span class="role">${label}</span>
        <a href="#/recipe/${encodeURIComponent(r.id)}">${esc(r.name)}</a>${altName(r)}
        ${reelButtons(r)}
      </li>`).join('')}
    </ul>
    ${missingHindi.length ? `<p class="muted small">No Hindi script yet for ${esc(missingHindi.map((r) => r.name).join(', '))}; its English steps are used.</p>` : ''}
    <div class="script">
      <p class="script-main" lang="hi-Latn">${esc(hi)}</p>
      <details><summary>English</summary><p class="script-en">${esc(en)}</p></details>
      <div class="btn-row">
        <button class="btn" ${onClick(() => copyText(hi, 'Lunch note copied'))}>Copy lunch note</button>
        <button class="btn ghost" ${onClick(() => copyText(en, 'English copied'))}>Copy English</button>
      </div>
    </div>
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
