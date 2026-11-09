/**
 * Auth.gs — checks that the caller is one of the two allowed people.
 *
 * How it works:
 * 1. The website signs you in with Google ("Sign in with Google" button).
 *    Google hands the website an ID token: a signed note saying
 *    "this person is someone@gmail.com", valid for about 1 hour.
 * 2. The website sends that token with every request.
 * 3. Here we ask Google's tokeninfo endpoint whether the token is genuine,
 *    then check that:
 *      - it was issued for OUR sign-in client (aud == google_client_id in Settings)
 *      - it was issued by Google
 *      - it hasn't expired
 *      - the email is verified and listed as an allowed_email in Settings
 * 4. Successful checks are cached for up to 5 minutes so the app stays fast.
 */

var TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo?id_token=';
var GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

function verifyUser_(idToken) {
  if (!idToken) throw apiError_('not_signed_in', 'Please sign in.');

  var cache = CacheService.getScriptCache();
  var cacheKey = 'tok_' + sha256_(idToken);
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  var res = UrlFetchApp.fetch(TOKENINFO_URL + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw apiError_('token_invalid', 'Sign-in expired or invalid. Please sign in again.');
  var info = JSON.parse(res.getContentText());

  var settings = getSettings_();
  if (!settings.values.google_client_id) {
    throw apiError_('setup_incomplete', 'Fill in google_client_id in the Settings tab.');
  }
  if (info.aud !== settings.values.google_client_id) throw apiError_('token_invalid', 'Token was not issued for this app.');
  if (GOOGLE_ISSUERS.indexOf(info.iss) === -1) throw apiError_('token_invalid', 'Token was not issued by Google.');
  if (String(info.email_verified) !== 'true') throw apiError_('not_allowed', 'Email is not verified.');

  var now = Math.floor(Date.now() / 1000);
  var exp = Number(info.exp);
  if (!(exp > now)) throw apiError_('token_expired', 'Sign-in expired. Please sign in again.');

  var email = String(info.email).toLowerCase();
  if (settings.allowedEmails.indexOf(email) === -1) {
    throw apiError_('not_allowed', 'This Google account is not allowed to use the planner.');
  }

  var user = {
    email: email,
    name: settings.values['display_name:' + email] || email.split('@')[0],
  };
  cache.put(cacheKey, JSON.stringify(user), Math.max(1, Math.min(300, exp - now)));
  return user;
}

function sha256_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes);
}

/**
 * Reads the Settings tab (columns: key, value, description).
 * Returns { values: {key: value}, allowedEmails: [..] }.
 * allowed_email may appear on several rows, or as one comma-separated value.
 */
function getSettings_() {
  var rows = readTable_('Settings');
  var values = {};
  var allowed = [];
  rows.forEach(function (r) {
    var key = String(r.key || '').trim();
    var value = typeof r.value === 'string' ? r.value.trim() : r.value;
    if (!key) return;
    if (key === 'allowed_email') {
      String(value || '').split(',').forEach(function (e) {
        e = e.trim().toLowerCase();
        if (e) allowed.push(e);
      });
    } else {
      // display_name keys are matched case-insensitively on the email part.
      if (key.indexOf('display_name:') === 0) key = key.toLowerCase();
      values[key] = value;
    }
  });
  return { values: values, allowedEmails: allowed };
}
