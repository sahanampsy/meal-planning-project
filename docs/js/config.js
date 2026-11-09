// config.js — the only two values you need to fill in (see SETUP.md).
//
// Neither of these is a secret: the web app URL is useless without a valid
// sign-in from one of the two allowed accounts, and a Google OAuth client ID
// is designed to be public. Do NOT put emails, names or health details here.

export const CONFIG = {
  // Apps Script → Deploy → Manage deployments → Web app URL (ends in /exec)
  API_URL: 'https://script.google.com/macros/s/AKfycbygIYr86eM48jcn1dMcD8Ulv-F3ks6XQmQLmd_jYH7iRQc41C-vtSIHRmd6AR9CB2qBhA/exec',

  // Google Cloud → Google Auth Platform → Clients → your Web client ID
  GOOGLE_CLIENT_ID: '672996115860-k006au4mb4kdliam9gd3foc99jq6f383.apps.googleusercontent.com',
};
