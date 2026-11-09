# Meal Planner

A small phone-friendly web app that replaces our daily meal-plan document:
- Mon–Sat vegetarian Indian lunches (dal + sabzi + carb + salad) and an evening soup.
- An evening card with the cook's read-aloud scripts and what to soak overnight.
- Change the plan, add recipes written by Claude, and a weekly shopping list.

- **Website:** plain HTML/CSS/JS in [`docs/`](docs/), served by GitHub Pages. No build step.
- **Data:** a private Google Sheet, read through a Google Apps Script web app ([`apps-script/`](apps-script/)).
- **Sign-in:** Google sign-in; the Apps Script allows only the emails listed in the Sheet's Settings tab.
- **Seed tool:** [`tools/seed/`](tools/seed/) turns recipes written in Markdown into an .xlsx to import.

Setup: see **[SETUP.md](SETUP.md)**.

Nothing personal is stored in this (public) repo: no emails, names or health details.
Real recipe exports go in `/seed`, which is git-ignored.

## Code map

```
docs/                      the website
  index.html
  css/styles.css
  js/config.js             API URL + Google client ID (public values)
  js/auth.js               Google sign-in, token storage
  js/api.js                call(action, payload) → Apps Script
  js/app.js                start-up, routing, caching
  js/lib/dates.js          date helpers (Mon–Sat weeks, "read on X evening")
  js/lib/plan.js           lookups, soak lines, cheese/calcium logic
  js/lib/format.js         escaping, "400 g turai (about 3)", copy/share
  js/lib/recipe-md.js      reads + checks recipes pasted as Markdown
  js/lib/rules.js          week checks against the Rules tab
  js/lib/shop.js           the week's shopping list
  js/views/tonight.js      the evening card
  js/views/week.js         Mon–Sat list
  js/views/recipes.js      recipe list + recipe page
  js/views/edit-day.js     change one day of the plan
  js/views/add-recipes.js  paste recipes written by Claude
  js/views/shop.js         shopping list (ticks saved on the phone)
  js/views/components.js   shared bits: script block, reel buttons, chips
apps-script/               backend (paste into the Sheet's Apps Script)
tools/seed/                build_seed.py + format docs + example
seed/                      your private exports (git-ignored)
```

## Testing locally (optional)

```bash
python3 -m http.server 8000 --directory docs
```

Then open http://localhost:8000. For sign-in to work, `http://localhost:8000` must be listed as an authorized origin.

## Phases

1. ✅ Daily reader + recipe data
2. ✅ Editing + shopping lists
3. Ratings and notes
4. Swipe to match + plan builder
