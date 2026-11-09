// rules.js — checks a Mon–Sat week against the limits on the Rules tab.
// Used by the edit-day screen, so you see the effect of a change before saving.

import { addDays, longLabel } from './dates.js';
import { dayMeals, dayRecipeList, isCheeseNight, weekDates, yes } from './plan.js';

/** Plain-language warnings for the week starting on this Monday. */
export function weekWarnings(idx, monday) {
  const rules = idx.rules;
  const num = (k, d) => (rules[k] === '' || rules[k] === undefined ? d : Number(rules[k]));
  const dates = weekDates(monday);
  const days = dates.map((d) => ({ date: d, meals: dayMeals(idx, d) })).filter((d) => d.meals);
  const out = [];

  const count = (test) => days.reduce((n, d) => n + dayRecipeList(d.meals).filter(test).length, 0);

  const cheese = days.filter((d) => isCheeseNight(d.meals)).length;
  const cMin = num('cheese_nights_min_per_week', 2);
  const cMax = num('cheese_nights_max_per_week', 3);
  if (days.length === 6 && cheese < cMin) out.push(`Only ${cheese} cheese night${cheese === 1 ? '' : 's'} this week (aim for at least ${cMin}).`);
  if (cheese > cMax) out.push(`${cheese} cheese nights this week (limit ${cMax}).`);

  const limit = (key, d, n, what) => {
    const max = num(key, d);
    if (n > max) out.push(`${n} ${what} this week (limit ${max}).`);
  };
  limit('paneer_tofu_max_per_week', 3, count((r) => yes(r.contains_paneer) || yes(r.contains_tofu)), 'paneer or tofu dishes');
  limit('cruciferous_max_per_week', 3, count((r) => yes(r.cruciferous)), 'cruciferous dishes');
  limit('kidney_caution_max_per_week', 2, count((r) => yes(r.kidney_caution)), 'kidney-caution dishes');
  limit('curd_lunch_max_per_week', 2,
    days.filter((d) => [d.meals.dal, d.meals.sabzi, d.meals.carb, d.meals.salad, d.meals.side].some((r) => r && yes(r.contains_curd))).length,
    'lunches with curd');

  // Same dal type too close together (looks back into the previous week too).
  const gap = num('dal_type_gap_days', 1);
  for (const d of days) {
    const type = String(d.meals.dal?.dal_type ?? '').trim().toLowerCase();
    if (!type) continue;
    for (let k = 1; k <= gap; k++) {
      const prev = dayMeals(idx, addDays(d.date, -k));
      if (String(prev?.dal?.dal_type ?? '').trim().toLowerCase() === type) {
        out.push(`${type} dal on ${longLabel(addDays(d.date, -k))} and ${longLabel(d.date)}: too close together.`);
      }
    }
  }

  // Same soup repeated within N days.
  const soupGap = num('soup_no_repeat_days', 6);
  for (const d of days) {
    const id = d.meals.soup?.id;
    if (!id) continue;
    for (let k = 1; k <= soupGap; k++) {
      const prev = dayMeals(idx, addDays(d.date, -k));
      if (prev?.soup?.id === id) {
        out.push(`${d.meals.soup.name} on ${longLabel(addDays(d.date, -k))} and ${longLabel(d.date)} (keep soups ${soupGap} days apart).`);
        break;
      }
    }
  }
  return out;
}
