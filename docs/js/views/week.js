// week.js — Mon–Sat table: lunch (dal, sabzi, carb), soup, cheese night, and
// what to soak the evening before each day.

import { esc, qtyText } from '../lib/format.js';
import { addDays, shortLabel, longLabel, defaultWeekMonday, mondayOf, DAY_SHORT, weekday } from '../lib/dates.js';
import { dayMeals, soaksFor, soakWarnAt, isCheeseNight, isCalciumNight, weekDates } from '../lib/plan.js';

export function renderWeek(idx, params) {
  const monday = params[0] ? mondayOf(params[0]) : defaultWeekMonday();
  const dates = weekDates(monday);
  const name = (r) => (r ? esc(r.name) : '<span class="muted">—</span>');

  const rows = dates.map((d) => {
    const m = dayMeals(idx, d);
    if (!m) {
      return `<tr><th scope="row"><a href="#/tonight/${d}">${esc(shortLabel(d))}</a></th>
        <td colspan="6" class="muted">Not planned</td></tr>`;
    }
    const soaks = soaksFor(idx, d);
    const soakCell = soaks.length
      ? `<span class="${soaks.length >= soakWarnAt(idx) ? 'flag' : ''}">
          <span class="muted small">${DAY_SHORT[weekday(addDays(d, -1))]} eve:</span>
          ${soaks.map((s) => esc(qtyText(s.quantity, s.unit, s.ingredient))).join('<br>')}
        </span>`
      : '<span class="muted">—</span>';
    let cheese = isCheeseNight(m) ? '🧀' : '';
    if (cheese && isCalciumNight(idx, d)) cheese = '<span class="flag">skip</span>';

    return `<tr>
      <th scope="row"><a href="#/tonight/${d}">${esc(shortLabel(d))}</a></th>
      <td data-label="Dal">${name(m.dal)}</td>
      <td data-label="Sabzi">${name(m.sabzi)}</td>
      <td data-label="Carb">${name(m.carb)}</td>
      <td data-label="Soup">${name(m.soup)}</td>
      <td data-label="Cheese" class="center">${cheese || '<span class="muted">—</span>'}</td>
      <td data-label="Soak">${soakCell}</td>
    </tr>`;
  }).join('');

  const cheeseCount = dates.filter((d) => isCheeseNight(dayMeals(idx, d))).length;

  return `<div class="day-nav">
      <a class="btn ghost" href="#/week/${addDays(monday, -7)}" aria-label="Previous week">‹</a>
      <div class="day-nav-label">
        <div class="eyebrow">Week of</div>
        <h1>${esc(longLabel(monday))}</h1>
      </div>
      <a class="btn ghost" href="#/week/${addDays(monday, 7)}" aria-label="Next week">›</a>
    </div>
    <div class="table-wrap">
      <table class="week">
        <thead><tr><th>Day</th><th>Dal</th><th>Sabzi</th><th>Carb</th><th>Soup</th><th>Cheese</th><th>Soak</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="muted small">${cheeseCount} cheese night${cheeseCount === 1 ? '' : 's'} this week.
      Tap a day to open its card.</p>`;
}
