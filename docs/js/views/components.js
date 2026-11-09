// components.js — pieces of HTML used by more than one view.
//
// Buttons don't carry their text in the HTML; they carry a key into the
// `actions` map below. app.js listens for clicks on [data-action] and runs
// the matching function. The map is cleared every time a view is drawn.

import { esc, copyText, shareLink } from '../lib/format.js';

const actions = new Map();
let nextId = 0;

/** Remember a function and return the attribute that triggers it on click. */
export function onClick(fn) {
  const key = `a${nextId++}`;
  actions.set(key, fn);
  return `data-action="${key}"`;
}

export function runAction(key) {
  actions.get(key)?.();
}

export function resetActions() {
  actions.clear();
}

/** "Rajma masala · राजमा मसाला" heading for a dish. */
export function dishTitle(recipe, tag = 'h3') {
  return `<${tag} class="dish-title">
    <a href="#/recipe/${encodeURIComponent(recipe.id)}">${esc(recipe.name)}</a>
    ${recipe.name_hindi ? `<span class="hi" lang="hi">${esc(recipe.name_hindi)}</span>` : ''}
  </${tag}>`;
}

/**
 * A read-aloud script: Hindi on top (big), English underneath, with a copy button.
 * Until a Hindi script is added, the English one is shown as the main text.
 */
export function scriptBlock(hindi, english, emptyText = 'No script yet.') {
  hindi = String(hindi ?? '').trim();
  english = String(english ?? '').trim();
  if (!hindi && !english) return `<p class="muted">${esc(emptyText)}</p>`;

  const main = hindi || english;
  return `<div class="script">
    ${hindi
      ? `<p class="script-hi" lang="hi">${esc(hindi)}</p>
         ${english ? `<p class="script-en">${esc(english)}</p>` : ''}`
      : `<p class="script-main">${esc(english)}</p>
         <p class="muted small">Hindi script not added yet.</p>`}
    <div class="btn-row">
      <button class="btn" ${onClick(() => copyText(main, 'Script copied'))}>Copy${hindi ? ' Hindi' : ''}</button>
      ${hindi && english ? `<button class="btn ghost" ${onClick(() => copyText(english, 'English copied'))}>Copy English</button>` : ''}
    </div>
  </div>`;
}

/** Open/share buttons for an Instagram reel. Returns '' when there's no link. */
export function reelButtons(recipe) {
  const url = String(recipe.instagram_reel_url ?? '').trim();
  if (!/^https?:\/\//i.test(url)) return '';
  return `<div class="btn-row">
    <a class="btn reel" href="${esc(url)}" target="_blank" rel="noopener">Open reel</a>
    <button class="btn ghost" ${onClick(() => shareLink(url, recipe.name))}>Share reel</button>
  </div>`;
}

/** Small coloured tags for a recipe's flags. */
export function flagChips(recipe, yes) {
  const chips = [];
  if (recipe.soakNeeded) chips.push(['soak', 'Soak']);
  if (yes(recipe.contains_paneer)) chips.push(['dairy', 'Paneer']);
  if (yes(recipe.contains_tofu)) chips.push(['dairy', 'Tofu']);
  if (yes(recipe.contains_cheese)) chips.push(['dairy', 'Cheese']);
  if (yes(recipe.contains_curd)) chips.push(['dairy', 'Curd']);
  if (yes(recipe.cruciferous)) chips.push(['warn', 'Cruciferous']);
  if (yes(recipe.kidney_caution)) chips.push(['warn', 'Kidney caution']);
  if (String(recipe.instagram_reel_url ?? '').trim()) chips.push(['reel', 'Reel']);
  if (String(recipe.soak_review ?? '').trim()) chips.push(['warn', 'Soak: review']);
  if (!yes(recipe.active)) chips.push(['off', 'Inactive']);
  return chips.map(([cls, text]) => `<span class="chip ${cls}">${text}</span>`).join('');
}
