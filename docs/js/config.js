// config.js — the only two values you need to fill in (see SETUP.md).
//
// Neither of these is a secret: the web app URL is useless without a valid
// sign-in from one of the two allowed accounts, and a Google OAuth client ID
// is designed to be public. Do NOT put emails, names or health details here.

export const CONFIG = {
  // Apps Script → Deploy → Manage deployments → Web app URL (ends in /exec)
  API_URL: 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE',

  // Google Cloud → Google Auth Platform → Clients → your Web client ID
  GOOGLE_CLIENT_ID: 'PASTE_YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',
};
