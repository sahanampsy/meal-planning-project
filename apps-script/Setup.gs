/**
 * Setup.gs — creates the tabs, default rules and (optionally) sample data.
 *
 * After pasting the code, reload the Google Sheet. A "Meal planner" menu
 * appears at the top. Use it to:
 *   1. Set up / repair tabs     (safe to run any time; never deletes data)
 *   2. Load sample data         (only if the Recipes tab is empty)
 *   3. Import seed from another Sheet   (replaces recipes/ingredients/plan)
 */

/**
 * The column headers for every tab. This is the single source of truth.
 * (tools/seed/build_seed.py has a copy; keep them in sync.)
 */
var SCHEMA = {
  Recipes: [
    'id', 'name', 'name_hindi',
    'category',        // dal | sabzi | carb | salad | soup | side  (kadhi counts as dal)
    'dal_type',        // toor, moong, masoor, chana, rajma, chole, urad, kadhi… for dals AND dal-based soups
    'soup_style',      // italian | indo-chinese | pasta | low-carb-veg | … (soups only)
    'region',
    'protein_g_per_person', 'kcal_per_person',
    'contains_paneer', 'contains_tofu', 'contains_cheese', 'contains_curd', // y/n
    'cruciferous', 'kidney_caution',                                        // y/n
    'equipment',       // comma list, e.g. "pressure cooker, kadai"
    'steps_en',        // English recipe / read-aloud script
    'steps_hindi',     // Hindi read-aloud script in Latin letters (can be added later)
    'reheat_en', 'reheat_hindi', // soups: how to reheat in the evening (Hindi in Latin letters)
    'instagram_reel_url',
    'soak_review',     // blank, or why this recipe's soak needs your attention
    'notes',
    'active',          // y/n — n hides it from planning
  ],
  RecipeIngredients: [
    'recipe_id', 'ingredient_id',
    'quantity', 'unit',      // for two adults, e.g. 150 / g
    'soak_overnight',        // y = you soak this the evening before
    'prep_note',             // e.g. "finely chopped"
  ],
  Ingredients: [
    'id', 'name', 'name_hindi',
    'section',               // vegetables | greens & herbs | dals & grains | dairy & extras | spices
    'grams_per_piece',       // so lists can say "400 g turai (about 3)"
    'perishable',            // y/n
  ],
  Pantry: ['ingredient_id', 'in_stock'],
  Plan: [
    'date',
    'lunch_dal', 'lunch_sabzi', 'lunch_carb', 'lunch_salad', 'lunch_side', // recipe ids
    'soup',                  // recipe id
    'cheese_night',          // y/n
    'pinned',                // y/n — plan builder (Phase 4) won't move this day
    'note',
  ],
  Ratings: ['date', 'recipe_id', 'user', 'stars', 'note', 'created_at'],
  Swipes: ['month', 'recipe_id', 'user', 'choice'],
  Rules: ['rule_key', 'value', 'description'],
  Settings: ['key', 'value', 'description'],
};

/** Default limits. Only rule keys that are missing get added; your edits are kept. */
var DEFAULT_RULES = [
  ['cheese_nights_min_per_week', 2, 'Fewest cheese nights per Mon–Sat week'],
  ['cheese_nights_max_per_week', 3, 'Most cheese nights per week'],
  ['paneer_tofu_max_per_week', 3, 'Paneer + tofu dishes combined, per week'],
  ['cruciferous_max_per_week', 3, 'Cruciferous dishes per week (cooked only)'],
  ['kidney_caution_max_per_week', 2, 'Dishes marked kidney_caution, per week'],
  ['curd_lunch_max_per_week', 2, 'Lunches with curd / raita / kadhi, per week'],
  ['dal_type_gap_days', 1, 'Days that must pass before the same dal type repeats'],
  ['soup_no_repeat_days', 6, 'Same soup may not repeat within this many days'],
  ['soaks_per_night_warn', 2, 'Highlight the evening card when this many things need soaking'],
  ['low_rating_threshold', 3, 'Average stars below this are weighted down by the plan builder'],
];

/** Default Settings rows (values are filled in by you, never stored in the repo). */
var DEFAULT_SETTINGS = [
  ['google_client_id', '', 'OAuth client ID from Google Cloud (ends in .apps.googleusercontent.com)'],
  ['allowed_email', '', 'First person allowed to sign in (one email per row)'],
  ['allowed_email', '', 'Second person allowed to sign in'],
  ['calcium_tablet_days', '', 'Evenings with a calcium tablet, e.g. Tue,Fri — the card says "skip the cheese"'],
  ['default_reheat_en', 'Reheat the soup on the gas on low-medium, stirring, until it simmers.', 'Shown when a soup has no reheat_en'],
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Meal planner')
    .addItem('1. Set up / repair tabs', 'setupSheet')
    .addItem('2. Load sample data (empty sheet only)', 'loadSampleData')
    .addSeparator()
    .addItem('Import seed from another Sheet…', 'importSeed')
    .addToUi();
}

/** Create any missing tabs and headers, and add missing default rules/settings. Never deletes anything. */
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(SCHEMA).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var existing = headers_(name).filter(String);
    var missing = SCHEMA[name].filter(function (h) { return existing.indexOf(h) === -1; });
    if (missing.length) {
      sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
    }
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold');
    sh.setFrozenRows(1);
  });

  // Make date columns display as yyyy-mm-dd.
  ['Plan', 'Ratings'].forEach(function (name) {
    ss.getSheetByName(name).getRange('A2:A').setNumberFormat('yyyy-mm-dd');
  });

  // Default rules (only keys that don't exist yet).
  var haveRules = readTable_('Rules').map(function (r) { return r.rule_key; });
  appendRows_('Rules', DEFAULT_RULES
    .filter(function (r) { return haveRules.indexOf(r[0]) === -1; })
    .map(function (r) { return { rule_key: r[0], value: r[1], description: r[2] }; }));

  // Default settings (only if the Settings tab is empty).
  if (readTable_('Settings').length === 0) {
    appendRows_('Settings', DEFAULT_SETTINGS.map(function (s) {
      return { key: s[0], value: s[1], description: s[2] };
    }));
  }

  // Remove the blank "Sheet1" a new spreadsheet starts with, if it's still empty.
  var blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);

  toast_('Tabs are ready. Next: fill in the Settings tab.');
}

/**
 * Import your real recipes. Upload the .xlsx made by tools/seed/build_seed.py to
 * Google Drive, open it with Google Sheets, copy its URL, then run this.
 * It REPLACES the Ingredients, Recipes, RecipeIngredients, Pantry and Plan tabs.
 * Ratings, Swipes, Rules and Settings are not touched.
 */
function importSeed() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt('Import seed', 'Paste the URL of the seed Google Sheet:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  var src = SpreadsheetApp.openByUrl(resp.getResponseText().trim());

  var tabs = ['Ingredients', 'Recipes', 'RecipeIngredients', 'Pantry', 'Plan'];
  var present = tabs.filter(function (t) { return src.getSheetByName(t); });
  var ok = ui.alert('Replace data?',
    'This will REPLACE these tabs with the seed: ' + present.join(', ') + '.\nRatings, Swipes, Rules and Settings are kept.',
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;

  setupSheet();
  present.forEach(function (name) {
    var values = src.getSheetByName(name).getDataRange().getValues();
    var srcHeaders = values[0].map(function (h) { return String(h).trim(); });
    var objects = values.slice(1)
      .filter(function (row) { return row.some(function (c) { return c !== ''; }); })
      .map(function (row) {
        var o = {};
        srcHeaders.forEach(function (h, i) { o[h] = row[i]; });
        return o;
      });
    replaceRows_(name, objects);
  });
  toast_('Imported: ' + present.join(', '));
}

function toast_(msg) {
  SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Meal planner', 8);
}
