/**
 * Main.gs — entry points for the web app.
 *
 * The website sends every request as a POST whose body is JSON text:
 *   { "action": "bootstrap", "idToken": "<Google sign-in token>", ...other fields }
 *
 * We always answer with JSON:
 *   { "ok": true,  "data": ... }                          on success
 *   { "ok": false, "error": "<code>", "message": "..." }  on failure
 *
 * Apps Script web apps cannot set HTTP status codes, so the "ok" flag is how
 * the website knows whether something went wrong.
 */

/**
 * Every action the website may call, mapped to the name of the function that handles it.
 * Names are looked up when called, so if one file wasn't updated in the Apps Script
 * editor, only that action fails (with a clear message) instead of the whole app.
 */
var ACTIONS_ = {
  bootstrap: 'actionBootstrap_',     // Phase 1: load everything the app needs
  savePlanDay: 'actionSavePlanDay_', // Phase 2: change one day of the plan
  addRecipes: 'actionAddRecipes_',   // Phase 2: add (or replace) recipes pasted into the app
};

function getHandler_(action) {
  var name = ACTIONS_[action];
  if (!name) throw apiError_('unknown_action', 'Unknown action: ' + action);
  var fn = globalThis[name];
  if (typeof fn !== 'function') {
    throw apiError_('setup_incomplete', 'The Apps Script is missing ' + name +
      '. Paste the latest apps-script files (especially Actions.gs), save, and deploy a new version.');
  }
  return fn;
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_request', message: 'Body must be JSON.' });
  }

  try {
    // 1. Who is calling? Throws if the token is bad or the email isn't allowed.
    var user = verifyUser_(req.idToken);

    // 2. Run the requested action.
    var data = getHandler_(req.action)(req, user);

    return json_({ ok: true, data: data });
  } catch (err) {
    // apiError_ sets err.code; anything else is an unexpected bug.
    if (!err.code) console.error(err && err.stack ? err.stack : err);
    return json_({
      ok: false,
      error: err.code || 'server_error',
      message: String(err.message || err),
    });
  }
}

/** Visiting the URL in a browser just confirms the script is deployed. No data is returned. */
function doGet() {
  return json_({ ok: true, message: 'Meal planner API is running. The app talks to it with POST.' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Create an Error with a short machine-readable code the website can react to. */
function apiError_(code, message) {
  var err = new Error(message || code);
  err.code = code;
  return err;
}
