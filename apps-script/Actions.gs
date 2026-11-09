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
