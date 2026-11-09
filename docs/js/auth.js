// auth.js — Google sign-in (Google Identity Services).
//
// Google gives us an "ID token" (a signed JWT) when you sign in. We keep it in
// localStorage so you don't have to sign in every time you open the app, and
// send it with every API call. It expires after ~1 hour; when that happens we
// ask Google again, which is usually automatic (one tap at most).

import { CONFIG } from './config.js';

const TOKEN_KEY = 'mp_id_token';
let onSignedIn = () => {};
let ready = null;

/** Wait for Google's script (loaded in index.html) and set it up. */
export function initAuth(callback) {
  onSignedIn = callback;
  if (!ready) {
    ready = new Promise((resolve) => {
      const check = () => {
        if (window.google?.accounts?.id) {
          google.accounts.id.initialize({
            client_id: CONFIG.GOOGLE_CLIENT_ID,
            callback: (resp) => {
              store(resp.credential);
              onSignedIn(resp.credential);
            },
            auto_select: true,            // returning users are signed in without a click
            cancel_on_tap_outside: false,
            use_fedcm_for_prompt: true,
          });
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
  return ready;
}

/** The current token, or null if missing / about to expire. */
export function getToken() {
  const t = load();
  if (!t) return null;
  const exp = tokenExpiry(t);
  return exp && exp * 1000 > Date.now() + 60_000 ? t : null;
}

/** Draw the Google button into an element, and also try the automatic prompt. */
export async function showSignIn(el) {
  await ready;
  if (el) {
    google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with' });
  }
  google.accounts.id.prompt();
}

export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

export function signOut() {
  clearToken();
  window.google?.accounts?.id?.disableAutoSelect();
}

// --- helpers ---------------------------------------------------------------

function store(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}

function load() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

/** Read the "exp" (expiry, in seconds) from the middle part of the JWT. */
function tokenExpiry(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part)).exp;
  } catch {
    return null;
  }
}
