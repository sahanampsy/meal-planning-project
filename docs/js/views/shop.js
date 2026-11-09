// shop.js — the Mon–Sat shopping list. Ticks are saved on this phone only.

import { esc, copyText } from '../lib/format.js';
import { addDays, longLabel, mondayOf, defaultWeekMonday } from '../lib/dates.js';
import { shoppingList, listAsText } from '../lib/shop.js';
import { onClick } from './components.js';

const tickKey = (monday) => `mp_shop_${monday}`;

function loadTicks(monday) {
  try { return new Set(JSON.parse(localStorage.getItem(tickKey(monday))) || []); } catch { return new Set(); }
}

function saveTicks(monday, ticks) {
  try { localStorage.setItem(tickKey(monday), JSON.stringify([...ticks])); } catch {}
}

export function renderShop(idx, params, rerender) {
  const monday = params[0] ? mondayOf(params[0]) : defaultWeekMonday();
  const list = shoppingList(idx, monday);
  const ticks = loadTicks(monday);
  const title = `Shopping, ${longLabel(monday)} to ${longLabel(addDays(monday, 5))}`;

  const nav = `<div class="day-nav">
      <div>
        <div class="eyebrow">${esc(longLabel(monday))} to ${esc(longLabel(addDays(monday, 5)))}</div>
        <h1>Shopping list</h1>
      </div>
      <div class="day-arrows">
        <a class="arrow" href="#/shop/${addDays(monday, -7)}" aria-label="Previous week">‹</a>
        <a class="arrow" href="#/shop/${addDays(monday, 7)}" aria-label="Next week">›</a>
      </div>
    </div>`;

  if (!list.days) {
    return `${nav}<section class="card rule"><h2>Nothing planned this week</h2>
      <p class="muted">Plan some days first, then the list fills itself in.</p>
      <a class="btn ghost" href="#/week/${monday}">Open the week</a></section>`;
  }

  const item = (i) => `<li>
      <label class="shop-item ${ticks.has(i.key) ? 'done' : ''}">
        <input type="checkbox" data-key="${esc(i.key)}" ${ticks.has(i.key) ? 'checked' : ''}>
        <span>
          <span class="shop-text">${esc(i.text)}</span>
          <span class="muted small">for ${esc(i.recipes.join(', '))}</span>
        </span>
      </label>
    </li>`;

  const copyBtn = onClick(() => copyText(listAsText(list, loadTicks(monday), title), 'List copied'));
  const shareBtn = onClick(async () => {
    const text = listAsText(list, loadTicks(monday), title);
    try { await navigator.share({ text }); } catch (e) { if (e.name !== 'AbortError') copyText(text, 'List copied'); }
  });
  const clearBtn = onClick(() => { saveTicks(monday, new Set()); rerender(); });

  queueMicrotask(() => wire(monday, list));

  return `${nav}
    <p class="muted small" id="shop-left">${leftText(list, ticks)}</p>
    <div class="btn-row shop-actions">
      <button class="btn" ${copyBtn}>Copy list</button>
      ${navigator.share ? `<button class="btn quiet" ${shareBtn}>Share</button>` : ''}
      ${ticks.size ? `<button class="btn ghost" ${clearBtn}>Clear ticks</button>` : ''}
    </div>
    <div id="shop">
      ${list.groups.map((g, n) => `<section class="card ${n === 0 ? 'rule' : ''}">
        <h2>${esc(g.label)}</h2>
        <ul class="shop-list">${g.items.map(item).join('')}</ul>
      </section>`).join('')}
      ${list.inStock.length ? `<section class="card">
        <h2>Check you have</h2>
        <p class="muted small">Marked in stock on the Pantry tab.</p>
        <ul class="shop-list">${list.inStock.map(item).join('')}</ul>
      </section>` : ''}
    </div>`;
}

function leftText(list, ticks) {
  const toBuy = list.groups.flatMap((g) => g.items);
  const left = toBuy.filter((i) => !ticks.has(i.key)).length;
  return left ? `${left} of ${toBuy.length} items left to buy, for ${list.days} planned day${list.days === 1 ? '' : 's'}.` : 'Everything is ticked off.';
}

function wire(monday, list) {
  const box = document.getElementById('shop');
  if (!box) return;
  box.addEventListener('change', (e) => {
    const key = e.target.dataset.key;
    if (!key) return;
    const ticks = loadTicks(monday);
    if (e.target.checked) ticks.add(key); else ticks.delete(key);
    saveTicks(monday, ticks);
    e.target.closest('.shop-item').classList.toggle('done', e.target.checked);
    document.getElementById('shop-left').textContent = leftText(list, ticks);
  });
}
