/**
 * Actions.gs — one function per API action.
 * Each receives (req, user): the request body and the verified user {email, name}.
 */

/**
 * bootstrap: everything the app needs in one call.
 * The data is small (a few hundred rows), so the phone does all the
 * calculations (soak lines, week table, filters) itself.
 */
function actionBootstrap_(req, user) {
  var settings = getSettings_().values;

  // Never send the sign-in configuration or other people's emails to the page.
  var safeSettings = {};
  Object.keys(settings).forEach(function (k) {
    if (k === 'google_client_id' || k.indexOf('display_name:') === 0) return;
    safeSettings[k] = settings[k];
  });

  // Rules tab → { rule_key: value }, numbers stay numbers.
  var rules = {};
  readTable_('Rules').forEach(function (r) {
    if (r.rule_key) rules[String(r.rule_key).trim()] = r.value;
  });

  return {
    user: user,
    settings: safeSettings,
    rules: rules,
    recipes: readTable_('Recipes'),
    ingredients: readTable_('Ingredients'),
    recipeIngredients: readTable_('RecipeIngredients'),
    pantry: readTable_('Pantry'),
    plan: readTable_('Plan'),
    loadedAt: new Date().toISOString(),
  };
}

// --- Phase 2: editing ---------------------------------------------------------
//
// Write actions return { bootstrap, summary }: the fresh data (so the phone's
// cache stays in step with the Sheet) and a short description of what changed.

var PLAN_SLOTS_ = {
  lunch_dal: 'dal', lunch_sabzi: 'sabzi', lunch_carb: 'carb',
  lunch_salad: 'salad', lunch_side: 'side', soup: 'soup',
};
var CATEGORIES_ = ['dal', 'sabzi', 'carb', 'salad', 'soup', 'side'];
var RECIPE_YN_ = ['contains_paneer', 'contains_tofu', 'contains_cheese', 'contains_curd', 'cruciferous', 'kidney_caution'];
var DEVANAGARI_ = /[ऀ-ॿ]/;

function str_(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function slug_(text) {
  return str_(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function yn_(v, dflt) {
  var s = str_(v).toLowerCase();
  if (/^(y|yes|true|1)$/.test(s) || v === true) return 'y';
  if (/^(n|no|false|0)$/.test(s) || v === false) return 'n';
  return dflt;
}

/**
 * savePlanDay: { date: 'yyyy-MM-dd', day: { lunch_dal, lunch_sabzi, lunch_carb,
 *   lunch_salad, lunch_side, soup, cheese_night, note } }
 * Only the fields sent are changed. Creates the Plan row if the day has none.
 */
function actionSavePlanDay_(req, user) {
  var date = str_(req.date);
  withLock_(function () { upsertPlanDay_(date, req.day || {}, recipeIds_()); });
  return { bootstrap: actionBootstrap_(req, user), summary: { date: date } };
}

/** Set of every recipe id in the Recipes tab. */
function recipeIds_() {
  var ids = {};
  readTable_('Recipes').forEach(function (r) { ids[str_(r.id)] = true; });
  return ids;
}

/** Throw unless the plan day is valid. Returns the cleaned-up fields to write. */
function planFields_(date, input, ids) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw apiError_('bad_request', 'Plan dates must look like 2026-11-10 (got "' + date + '").');
  var p = date.split('-');
  if (new Date(+p[0], +p[1] - 1, +p[2], 12).getDay() === 0) throw apiError_('bad_request', date + ' is a Sunday, which has no cook.');
  var fields = {};
  Object.keys(PLAN_SLOTS_).forEach(function (k) {
    if (!(k in input)) return;
    var id = str_(input[k]);
    if (id && !ids[id]) throw apiError_('bad_request', date + ': there is no recipe with id "' + id + '".');
    fields[k] = id;
  });
  if ('cheese_night' in input) fields.cheese_night = yn_(input.cheese_night, 'n');
  if ('note' in input) fields.note = str_(input.note).slice(0, 500);
  return fields;
}

/** Update the Plan row for this date (only the fields given), or add it. Call inside withLock_. */
function upsertPlanDay_(date, input, ids) {
  var fields = planFields_(date, input, ids);
  var rows = findRows_('Plan', 'date', function (v) { return v === date; });
  if (rows.length) {
    updateRow_('Plan', rows[0], fields);
  } else {
    fields.date = date;
    fields.pinned = 'n';
    if (!('cheese_night' in fields)) fields.cheese_night = 'n';
    appendRows_('Plan', [fields]);
  }
}

/**
 * addRecipes: { recipes: [ { name, id?, category, …recipe columns…,
 *   ingredients: [ { quantity, unit, name, soak, prep_note } ] } ], replace: bool }
 *
 * Recipes come from the app's "Add recipes" screen (Markdown written by Claude,
 * parsed on the phone). Ingredients are matched to the Ingredients tab by id or
 * name; unknown ones are created (and added to Pantry as not in stock).
 * With replace = true, a recipe whose id already exists is overwritten,
 * including its ingredient list.
 *
 * plan (optional): [ { date, lunch_dal, …, soup, cheese_night, note } ] fills in
 * plan days after the recipes are saved, so it can use the new recipes.
 */
function actionAddRecipes_(req, user) {
  var list = Array.isArray(req.recipes) ? req.recipes : [];
  var plan = Array.isArray(req.plan) ? req.plan : [];
  if (!list.length && !plan.length) throw apiError_('bad_request', 'No recipes or plan days were sent.');
  if (plan.length > 60) throw apiError_('bad_request', 'Send at most 60 plan days at a time.');
  if (list.length > 50) throw apiError_('bad_request', 'Send at most 50 recipes at a time.');
  var replace = req.replace === true;

  var summary = withLock_(function () {
    var existing = {};
    readTable_('Recipes').forEach(function (r) { existing[str_(r.id)] = true; });

    var ingById = {};
    var ingByName = {};
    readTable_('Ingredients').forEach(function (i) {
      var id = str_(i.id);
      ingById[id] = true;
      ingByName[id] = id;
      ingByName[str_(i.name).toLowerCase()] = id;
    });

    var added = [], replaced = [], newIngredients = [], recipeRows = [], riRows = [], seen = {};

    list.forEach(function (r) {
      var name = str_(r.name);
      if (!name) throw apiError_('bad_request', 'Every recipe needs a name.');
      var id = slug_(r.id || name);
      if (!id) throw apiError_('bad_request', '“' + name + '” needs an id made of letters or numbers.');
      if (seen[id]) throw apiError_('bad_request', 'Two recipes have the id "' + id + '".');
      seen[id] = true;
      if (existing[id] && !replace) {
        throw apiError_('exists', '“' + name + '” already exists (id "' + id + '"). Tick “Replace recipes that already exist” to overwrite it.');
      }
      var category = str_(r.category).toLowerCase();
      if (CATEGORIES_.indexOf(category) < 0) {
        throw apiError_('bad_request', '“' + name + '”: category must be one of ' + CATEGORIES_.join(', ') + '.');
      }

      var row = {};
      SCHEMA.Recipes.forEach(function (h) { row[h] = str_(r[h]); });
      row.id = id;
      row.name = name;
      row.category = category;
      RECIPE_YN_.forEach(function (h) { row[h] = yn_(r[h], 'n'); });
      row.active = yn_(r.active, 'y');
      Object.keys(row).forEach(function (h) {
        if (DEVANAGARI_.test(row[h])) throw apiError_('bad_request', '“' + name + '”: write Hindi in Latin letters, not Devanagari (' + h + ').');
      });
      recipeRows.push(row);
      (existing[id] ? replaced : added).push(name);

      (r.ingredients || []).forEach(function (ing) {
        var ingName = str_(ing.name);
        if (!ingName) return;
        if (DEVANAGARI_.test(ingName)) throw apiError_('bad_request', '“' + name + '”: ingredient names must use Latin letters.');
        var iid = ingByName[ingName.toLowerCase()] || ingByName[slug_(ingName)];
        if (!iid) {
          iid = slug_(ingName);
          if (!ingById[iid]) {
            newIngredients.push({ id: iid, name: ingName.charAt(0).toUpperCase() + ingName.slice(1), name_hindi: '', section: '', grams_per_piece: '', perishable: '' });
            ingById[iid] = true;
          }
          ingByName[ingName.toLowerCase()] = iid;
        }
        var qty = str_(ing.quantity);
        riRows.push({
          recipe_id: id,
          ingredient_id: iid,
          quantity: qty === '' ? '' : Number(qty),
          unit: str_(ing.unit),
          soak_overnight: yn_(ing.soak, 'n'),
          prep_note: str_(ing.prep_note),
        });
      });
    });

    // Check the plan before writing anything, so a bad row doesn't leave a half-saved paste.
    var allIds = {};
    Object.keys(existing).forEach(function (k) { allIds[k] = true; });
    Object.keys(seen).forEach(function (k) { allIds[k] = true; });
    plan.forEach(function (day) { planFields_(str_(day.date), day, allIds); });

    // Write: replaced recipes are updated in place and lose their old ingredient rows.
    var fresh = [];
    recipeRows.forEach(function (row) {
      if (!existing[row.id]) { fresh.push(row); return; }
      var at = findRows_('Recipes', 'id', function (v) { return v === row.id; });
      if (at.length) updateRow_('Recipes', at[0], row);
      deleteRows_('RecipeIngredients', findRows_('RecipeIngredients', 'recipe_id', function (v) { return v === row.id; }));
    });
    appendRows_('Recipes', fresh);
    appendRows_('RecipeIngredients', riRows);
    appendRows_('Ingredients', newIngredients);
    appendRows_('Pantry', newIngredients.map(function (i) { return { ingredient_id: i.id, in_stock: 'n' }; }));

    // Plan days last, so they can use the recipes just added.
    var ids = recipeIds_();
    var planDays = plan.map(function (day) {
      var date = str_(day.date);
      upsertPlanDay_(date, day, ids);
      return date;
    });

    return {
      added: added,
      replaced: replaced,
      ids: recipeRows.map(function (r) { return r.id; }),
      newIngredients: newIngredients.map(function (i) { return i.name; }),
      planDays: planDays,
    };
  });

  return { bootstrap: actionBootstrap_(req, user), summary: summary };
}
