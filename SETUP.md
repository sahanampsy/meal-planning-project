# Setup guide

This walks you through everything that isn't code. It takes about 45 minutes the first time.
Do the steps in order. You need a computer for setup; afterwards everything works on your phone.

**What you'll end up with**
- A Google Sheet that holds all the data.
- A small Apps Script "web app" attached to that Sheet: the only thing that can read it for the website.
- A Google sign-in "client" so the website can show a *Sign in with Google* button.
- The website itself, served free by GitHub Pages at `https://sahanampsy.github.io/meal-planning-project/`.

**Privacy recap**
- The repo is **public**, so nothing personal ever goes into it.
- Your emails, calcium-tablet days and real recipes live only in the Sheet (and in `/seed` on your own computer, which git ignores).
- The website shows nothing until one of the two allowed accounts signs in.

---

## Step 1. Make the repo public

GitHub Pages is free only for public repos. The code contains nothing personal, so this is safe.

1. On github.com open the repo → **Settings** → **General** → scroll to **Danger Zone** → **Change visibility** → **Make public**.
2. Before you commit anything yourself, open https://github.com/settings/emails and tick **Keep my email addresses private**. Use the `…@users.noreply.github.com` address it shows for commits, so your real email isn't in the public history.

## Step 2. Create the Google Sheet

1. Go to https://sheets.new while signed in to the Google account that will **own** the data. Either of you can own it.
2. Name it, e.g. *Meal planner*.
3. Leave it **private**. Don't share it with anyone except your partner (Share → their email → Editor) if they want to edit it directly.

## Step 3. Add the Apps Script code

1. In the Sheet: **Extensions → Apps Script**. A new tab opens with a file called `Code.gs`.
2. Delete everything in `Code.gs`, then rename it to `Main` (click the ⋮ next to it → Rename).
3. For each file in this repo's `apps-script/` folder: `Main.gs`, `Auth.gs`, `Sheets.gs`, `Actions.gs`, `Setup.gs`, `SampleData.gs`
   - click **+ → Script**, name it without `.gs` (e.g. `Auth`),
   - open the file on GitHub, click the **copy raw file** button, and paste it in.
4. Optional but recommended, to set the time zone to India:
   - Click the ⚙️ **Project Settings** icon on the left.
   - Tick **Show "appsscript.json" manifest file in editor**.
   - Open `appsscript.json` and replace its contents with the repo's `apps-script/appsscript.json`.
5. Click 💾 **Save** (or Ctrl/Cmd+S).

## Step 4. Create the tabs

1. Go back to the Sheet tab and **reload the page**. After a few seconds a **Meal planner** menu appears at the top.
2. Click **Meal planner → 1. Set up / repair tabs**.
3. Google will ask for permission the first time:
   - **Continue** → choose your account.
   - You'll see *"Google hasn't verified this app"*. This is normal for your own scripts. Click **Advanced → Go to (project name) (unsafe)**.
   - Click **Allow**.
4. Run **Meal planner → 1. Set up / repair tabs** again if it stopped for the permission screen. You now have the tabs Recipes, RecipeIngredients, Ingredients, Pantry, Plan, Ratings, Swipes, Rules and Settings.
5. Click **Meal planner → 2. Load sample data**. This adds about 17 demo recipes and a two-week plan, so you can test before your real recipes are imported.

## Step 5. Create the Google sign-in client

This gives you a **Client ID**: a public identifier that lets the website show *Sign in with Google*.

1. Go to https://console.cloud.google.com and sign in.
2. Top bar → project picker → **New project** → name it *Meal planner* → **Create**. Make sure it's selected afterwards.
3. Open the ☰ menu → **APIs & Services → OAuth consent screen**. Newer consoles call this **Google Auth Platform**. Click **Get started**:
   - **App name:** *Meal planner*. **Support email:** your email.
   - **Audience:** **External**.
   - **Contact email:** your email. Agree and **Create**.
4. In **Audience**, leave the app in **Testing**, then under **Test users** click **Add users** and add **both** Google accounts.
   - This is an extra lock: no one else can even complete Google sign-in for this app.
5. Go to **Clients** (older consoles: *Credentials → Create credentials → OAuth client ID*) → **Create client**:
   - **Application type:** *Web application*. **Name:** *Meal planner web*.
   - **Authorized JavaScript origins** → **Add URI**:
     - `https://sahanampsy.github.io`
     - `http://localhost:8000` (only needed if you ever test on a computer)
   - Leave **Authorized redirect URIs** empty → **Create**.
6. Copy the **Client ID**. It ends in `.apps.googleusercontent.com`. You don't need the client secret, so never paste it anywhere.

## Step 6. Fill in the Settings tab

In the Sheet, open the **Settings** tab and fill in the `value` column:

| key | value |
|---|---|
| google_client_id | the Client ID from step 5 |
| allowed_email | your Google email |
| allowed_email | your partner's Google email |
| calcium_tablet_days | evenings with a calcium tablet, e.g. `Tue,Fri` (or specific dates like `2026-11-12`); leave blank if none |
| default_reheat_en | already filled; change it if you like |

Optional: add rows `display_name:you@gmail.com` → `Me` so ratings (Phase 3) show a short name.

The **Rules** tab already has default limits; edit the numbers whenever you like.

## Step 7. Deploy the Apps Script as a web app

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the ⚙️ next to *Select type* → **Web app**.
3. Fill in:
   - **Description:** `v1`
   - **Execute as:** **Me**. The script reads the Sheet as you.
   - **Who has access:** **Anyone**. This only means the URL can be *called*. The script itself refuses everyone whose Google sign-in isn't one of the two `allowed_email`s.
4. **Deploy**. Authorize again if asked (same *Advanced → Go to…* steps).
5. Copy the **Web app URL**. It ends in `/exec`.
6. Check it: open that URL in a browser. You should see `{"ok":true,"message":"Meal planner API is running..."}`.

> **When the Apps Script code changes later** (each phase), paste the new code, then use **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
> This keeps the same URL. Don't use *New deployment* again: that creates a different URL.

## Step 8. Put the two IDs into the website

1. On github.com, open `docs/js/config.js` and click the ✏️ pencil (Edit).
2. Replace the two placeholders:
   ```js
   API_URL: 'https://script.google.com/macros/s/AKfy.../exec',
   GOOGLE_CLIENT_ID: '1234-abc.apps.googleusercontent.com',
   ```
3. **Commit changes** directly to the branch GitHub Pages serves (step 9).

Both values are public by design, so it's fine that they're in the public repo.

## Step 9. Turn on GitHub Pages

1. Repo → **Settings → Pages**.
2. **Source:** *Deploy from a branch*.
3. **Branch:** pick the branch that has the code, and the folder **`/docs`** → **Save**.
   - Right now that's `claude/adoring-noether-accneh`, the only branch so far.
   - Later you can make a `main` branch from it and switch Pages to `main`.
   - Do step 8's edit on that same branch.
4. Wait 1–2 minutes and refresh the page. It shows *Your site is live at `https://sahanampsy.github.io/meal-planning-project/`*.

## Step 10. Open it on your phone

1. Open `https://sahanampsy.github.io/meal-planning-project/` in Chrome (Android) or Safari (iPhone).
2. Tap **Sign in with Google** and pick your account.
3. Add it to your home screen so it opens like an app:
   - **Android/Chrome:** ⋮ → **Add to Home screen**.
   - **iPhone/Safari:** Share → **Add to Home Screen**.
4. Your partner does the same with their account.

---

## Importing your real recipes (when ready)

1. Put your exported meal-plan doc in the `/seed` folder of your local copy of the repo, or give it to Claude in a session. Git ignores that folder, so it never goes to GitHub.
2. Claude converts it into `seed/recipes.md`, `seed/ingredients.csv` and `seed/plan.csv` (format in `tools/seed/FORMAT.md`), applying the soak rules. Then it runs:
   ```bash
   python3 tools/seed/build_seed.py seed/
   ```
   This makes `seed/out/meal-planner-seed.xlsx` and `seed/out/REVIEW.md` (things to check).
3. Upload `meal-planner-seed.xlsx` to Google Drive, then right-click → **Open with → Google Sheets**. Copy that Sheet's URL.
4. In your **real** planner Sheet: **Meal planner → Import seed from another Sheet…**, then paste the URL.
   - This replaces Ingredients, Recipes, RecipeIngredients, Pantry and Plan (removing the sample data).
   - Settings, Rules, Ratings and Swipes are kept.
5. In the app, tap ↻ to reload.

## Editing data by hand

You can always edit the Sheet directly; the app shows the changes after ↻.
- **Plan:** one row per day. The dish columns hold recipe **ids** (the `id` column in Recipes).
- **Soaks:** set `soak_overnight` = `y` on a RecipeIngredients row. It then appears on the previous evening's card with its quantity.
- **Reels:** paste a link into `instagram_reel_url` on the recipe.

## Troubleshooting

| What you see | Fix |
|---|---|
| "Almost there — fill in docs/js/config.js" | Step 8 isn't done (or GitHub Pages hasn't updated yet; wait 2 minutes). |
| The sign-in button doesn't appear, or Google says "origin not allowed" | Step 5.5: the origin must be exactly `https://sahanampsy.github.io` (no trailing slash, no repo name). Changes can take 5 minutes. |
| Google says "access blocked: app has not completed verification" | Add that account as a **Test user** (step 5.4). |
| "This Google account is not allowed" | The email isn't an `allowed_email` in Settings (check spelling). |
| "Fill in google_client_id in the Settings tab" | Step 6. |
| "The server sent something unexpected" | The deployment's access isn't **Anyone**, or the URL is wrong. Redo step 7 and check the URL ends in `/exec`. |
| Changes to Apps Script code don't take effect | Deploy a **new version** of the existing deployment (see the note in step 7). |
| The Meal planner menu is missing | Reload the Sheet; check `Setup.gs` was pasted and saved. |
