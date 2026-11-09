// api.js — talks to the Apps Script web app.
//
// Every call is a POST with a JSON body. We send it as "text/plain" on purpose:
// that keeps it a "simple" request, so the browser doesn't send a CORS
// pre-check that Apps Script can't answer.

import { CONFIG } from './config.js';
import { getToken } from './auth.js';

/** Errors that mean "please sign in again". */
export const AUTH_ERRORS = ['not_signed_in', 'token_invalid', 'token_expired'];

export async function call(action, payload = {}) {
  const idToken = getToken();
  if (!idToken) throw apiError('not_signed_in', 'Please sign in.');

  let res;
  try {
    res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, idToken, ...payload }),
    });
  } catch {
    throw apiError('network', 'Could not reach the server. Check your internet connection.');
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw apiError('bad_response', 'The server sent something unexpected. Is the Apps Script deployed with access "Anyone"?');
  }
  if (!json.ok) throw apiError(json.error, json.message);
  return json.data;
}

function apiError(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}
