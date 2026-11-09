// dates.js — all dates are handled as local 'YYYY-MM-DD' strings, like the Sheet.

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Date → 'YYYY-MM-DD' (local time, not UTC). */
export function toISO(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 'YYYY-MM-DD' → Date at local midday (midday avoids daylight-saving edge cases). */
export function fromISO(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function today() {
  return toISO(new Date());
}

export function weekday(iso) {
  return fromISO(iso).getDay(); // 0 = Sunday
}

/** Monday of the Mon–Sat week containing this date (Sunday belongs to the week before). */
export function mondayOf(iso) {
  return addDays(iso, -((weekday(iso) + 6) % 7));
}

/** "Monday 10 Nov" */
export function longLabel(iso) {
  const d = fromISO(iso);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Mon 10" */
export function shortLabel(iso) {
  const d = fromISO(iso);
  return `${DAY_SHORT[d.getDay()]} ${d.getDate()}`;
}

/** The meal day the evening card is for by default: tomorrow. */
export function defaultCardDate() {
  return addDays(today(), 1);
}

/** Step to the next/previous cook day, skipping Sundays. */
export function stepCookDay(iso, dir) {
  let d = addDays(iso, dir);
  if (weekday(d) === 0) d = addDays(d, dir);
  return d;
}

/** The week to show by default: the one the next cook day falls in. */
export function defaultWeekMonday() {
  let d = defaultCardDate();
  if (weekday(d) === 0) d = addDays(d, 1);
  return mondayOf(d);
}
