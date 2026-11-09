// app.js — starts the app: sign-in, loading data, and switching between views.
//
// Routes (the part of the URL after #):
//   #/tonight            the evening card for tomorrow
//   #/tonight/2026-11-10 the card for a specific meal day
//   #/week               this week's table   (#/week/2026-11-09 for another week)
//   #/recipes            recipe list
//   #/recipe/<id>        one recipe

import { initAuth, getToken, showSignIn, signOut, clearToken } from './auth.js';
import { call, AUTH_ERRORS } from './api.js';
import { CONFIG } from './config.js';
import { buildIndex } from './lib/plan.js';
import { esc, toast } from './lib/format.js';
import { runAction, resetActions } from './views/components.js';
import { renderTonight } from './views/tonight.js';
import { renderWeek } from './views/week.js';
import { renderRecipes, renderRecipe } from './views/recipes.js';

const ROUTES = {
  tonight: renderTonight,
  week: renderWeek,
  recipes: renderRecipes,
  recipe: renderRecipe,
};

// Data is cached on the phone so the app opens instantly; it's refreshed from
// the Sheet every time you open the app or tap ↻.
const CACHE_KEY = 'mp_data_v1';
let idx = null; // the loaded data (see buildIndex in lib/plan.js)

const $ = (id) => document.getElementById(id);

// --- drawing ----------------------------------------------------------------

function render() {
  if (!idx) return;
  const [name, ...params] = location.hash.replace(/^#\/?/, '').split('/');
  const route = ROUTES[name] ? name : 'tonight';
  resetActions();
  $('view').innerHTML = ROUTES[route](idx, params, render);
  $('tabbar').hidden = false;
  $('refresh-btn').hidden = false;
  $('signout-btn').hidden = false;
  document.querySelectorAll('#tabbar a').forEach((a) => {
    const tab = a.dataset.tab;
    a.classList.toggle('active', tab === route || (tab === 'recipes' && route === 'recipe'));
  });
}

function showSignInScreen(message = '') {
  $('view').innerHTML = `<section class="card signin">
    <h1>Meal Planner</h1>
    ${message ? `<p class="alert warn">${esc(message)}</p>` : '<p class="muted">Sign in to see the plan.</p>'}
    <div id="gsi-button"></div>
  </section>`;
  $('tabbar').hidden = true;
  showSignIn($('gsi-button'));
}

/** Thin banner above the page, e.g. "sign in again to refresh". */
function showBanner(html) {
  const b = $('banner');
  b.innerHTML = html;
  b.hidden = !html;
}

// --- loading ------------------------------------------------------------------

async function refresh() {
  $('refresh-btn').classList.add('spin');
  try {
    const raw = await call('bootstrap');
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(raw)); } catch {}
    idx = buildIndex(raw);
    showBanner('');
    render();
  } catch (e) {
    if (AUTH_ERRORS.includes(e.code)) {
      clearToken();
      if (idx) {
        // Keep showing the cached plan, ask to sign in again to refresh it.
        showBanner('<span>Sign in again to get the latest plan.</span><div id="gsi-banner"></div>');
        showSignIn($('gsi-banner'));
      } else {
        showSignInScreen();
      }
    } else if (e.code === 'not_allowed') {
      signOut();
      idx = null;
      try { localStorage.removeItem(CACHE_KEY); } catch {}
      showSignInScreen(e.message);
    } else if (idx) {
      showBanner(`<span>Couldn’t refresh: ${esc(e.message)}</span>`);
    } else {
      $('view').innerHTML = `<section class="card"><h2>Couldn’t load the plan</h2>
        <p>${esc(e.message)}</p><button class="btn" onclick="location.reload()">Try again</button></section>`;
    }
  } finally {
    $('refresh-btn').classList.remove('spin');
  }
}

function loadCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY));
    return raw ? buildIndex(raw) : null;
  } catch {
    return null;
  }
}

// --- start ---------------------------------------------------------------------

async function start() {
  if (CONFIG.API_URL.startsWith('PASTE_') || CONFIG.GOOGLE_CLIENT_ID.startsWith('PASTE_')) {
    $('view').innerHTML = `<section class="card"><h2>Almost there</h2>
      <p>Fill in <code>docs/js/config.js</code> (see SETUP.md, step 6).</p></section>`;
    return;
  }

  // Clicks on any [data-action] button run the function registered for it.
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el) runAction(el.dataset.action);
  });
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  $('refresh-btn').addEventListener('click', () => (getToken() ? refresh() : showSignIn($('gsi-banner'))));
  $('signout-btn').addEventListener('click', () => {
    signOut();
    idx = null;
    try { localStorage.removeItem(CACHE_KEY); } catch {}
    $('refresh-btn').hidden = $('signout-btn').hidden = true;
    showBanner('');
    showSignInScreen();
    toast('Signed out');
  });

  // Called by Google whenever a sign-in (or silent re-sign-in) succeeds.
  await initAuth(() => refresh());

  idx = loadCache();
  if (idx) render();

  if (getToken()) {
    refresh();
  } else if (idx) {
    showBanner('<span>Sign in again to get the latest plan.</span><div id="gsi-banner"></div>');
    showSignIn($('gsi-banner'));
  } else {
    showSignInScreen();
  }
}

start();
