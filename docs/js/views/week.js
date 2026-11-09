// week.js — Mon–Sat list: lunch (dal, sabzi, carb), soup, cheese night, and
// what to soak the evening before each day. Tap a day to open its card.

import { esc, qtyText } from '../lib/format.js';
import { addDays, longLabel, defaultWeekMonday, mondayOf, DAY_SHORT, weekday, fromISO, today } from '../lib/dates.js';
import { dayMeals, soaksFor, soakWarnAt, isCheeseNight, isCalciumNight, weekDates } from '../lib/plan.js';

export function renderWeek(idx, params) {
  const monday = params[0] ? mondayOf(params[0]) : defaultWeekMonday();
  const dates = weekDates(monday);
  const now = today();

  const days = dates.map((d) => {
    const head = `<div><span class="d">${fromISO(d).getDate()}</span><span class="dn">${DAY_SHORT[weekday(d)]}</span></div>`;
    const cls = `week-day${d === now ? ' today' : ''}`;
    const m = dayMeals(idx, d);
    if (!m) {
      return `<a class="${cls} empty" href="#/tonight/${d}">${head}<div class="meals">Not planned</div></a>`;
    }

    const line = (label, value) => (value ? `<div><span>${label}</span>${value}</div>` : '');
    const name = (r) => (r ? esc(r.name) : '');

    const soaks = soaksFor(idx, d);
    const soakText = soaks.map((s) => esc(qtyText(s.quantity, s.unit, s.ingredient))).join(', ');
    const soakLine = soaks.length
      ? `<span class="${soaks.length >= soakWarnAt(idx) ? 'flag' : ''}">${DAY_SHORT[weekday(addDays(d, -1))]} eve: ${soakText}</span>`
      : '';

    let cheese = '';
    if (isCheeseNight(m)) cheese = isCalciumNight(idx, d) ? '<span class="flag">Skip (calcium night)</span>' : 'Cheese night';

    return `<a class="${cls}" href="#/tonight/${d}">
      ${head}
      <div class="meals">
        ${line('Dal', name(m.dal))}
        ${line('Sabzi', name(m.sabzi))}
        ${line('Carb', name(m.carb))}
        ${line('Soup', name(m.soup))}
        ${line('Soak', soakLine)}
        ${line('Cheese', cheese)}
      </div>
    </a>`;
  }).join('');

  const weeksAway = Math.round((fromISO(monday) - fromISO(mondayOf(now))) / (7 * 86400000));
  const title = { 0: 'This week', 1: 'Next week', [-1]: 'Last week' }[weeksAway] || `Week of ${longLabel(monday)}`;

  const cheeseCount = dates.filter((d) => isCheeseNight(dayMeals(idx, d))).length;

  return `<div class="day-nav">
      <div>
        <div class="eyebrow">${esc(longLabel(monday))} to ${esc(longLabel(addDays(monday, 5)))}</div>
        <h1>${esc(title)}</h1>
      </div>
      <div class="day-arrows">
        <a class="arrow" href="#/week/${addDays(monday, -7)}" aria-label="Previous week">‹</a>
        <a class="arrow" href="#/week/${addDays(monday, 7)}" aria-label="Next week">›</a>
      </div>
    </div>
    <div class="week">${days}</div>
    <p class="muted small week-foot">${cheeseCount} cheese night${cheeseCount === 1 ? '' : 's'} this week.
      Tap a day to open its card.</p>
    <div class="btn-row"><a class="btn" href="#/shop/${monday}">Shopping list</a><a class="btn ghost" href="#/edit/${firstEditable(dates)}">Change the plan</a></div>`;
}

/** The day the "Change the plan" button opens: the next cook day in this week, else Monday. */
function firstEditable(dates) {
  return dates.find((d) => d >= today()) || dates[0];
}
