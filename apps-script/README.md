# Apps Script backend

Paste these files into the Sheet's Apps Script project (Extensions → Apps Script). See `SETUP.md` steps 3–7.

| File | What it does |
|---|---|
| `Main.gs` | `doPost` entry point, routes `action` to a handler, JSON responses |
| `Auth.gs` | Verifies the Google ID token and the email allowlist in the Settings tab |
| `Sheets.gs` | Read/write tabs as objects keyed by header name |
| `Actions.gs` | One function per API action |
| `Setup.gs` | Tab/column schema, "Meal planner" menu, default Rules/Settings, seed import |
| `SampleData.gs` | Demo recipes + a 2-week plan for testing |
| `appsscript.json` | Manifest (time zone, scopes, web-app settings) |

## API

`POST <web app URL>` with body (sent as `text/plain`):

```json
{ "action": "bootstrap", "idToken": "<Google ID token>" }
```

Response: `{ "ok": true, "data": … }` or `{ "ok": false, "error": "<code>", "message": "…" }`.

| action | phase | returns |
|---|---|---|
| `bootstrap` | 1 | user, settings (without allowed emails / client ID), rules, recipes, ingredients, recipeIngredients, pantry, plan |

Error codes: `not_signed_in`, `token_invalid`, `token_expired`, `not_allowed`, `setup_incomplete`, `unknown_action`, `bad_request`, `server_error`.

After changing code: Deploy → Manage deployments → Edit → **New version**. This keeps the same URL.
