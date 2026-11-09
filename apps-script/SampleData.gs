/**
 * SampleData.gs — a handful of generic demo recipes and a 2-week plan, so you
 * can test the app before importing your own recipes. Replace it later with
 * "Import seed from another Sheet…".
 */

function loadSampleData() {
  setupSheet();
  if (readTable_('Recipes').length > 0) {
    SpreadsheetApp.getUi().alert('The Recipes tab already has data, so sample data was not loaded.');
    return;
  }

  // [id, name, name_hindi, section, grams_per_piece, perishable]
  var ingredients = [
    ['moong-dal', 'Yellow moong dal', 'पीली मूंग दाल', 'dals & grains', '', 'n'],
    ['rajma', 'Rajma', 'राजमा', 'dals & grains', '', 'n'],
    ['chana-dal', 'Chana dal', 'चना दाल', 'dals & grains', '', 'n'],
    ['besan', 'Besan', 'बेसन', 'dals & grains', '', 'n'],
    ['atta', 'Wheat atta', 'गेहूं का आटा', 'dals & grains', '', 'n'],
    ['rice', 'White rice', 'चावल', 'dals & grains', '', 'n'],
    ['pasta', 'Small pasta', 'पास्ता', 'dals & grains', '', 'n'],
    ['onion', 'Onion', 'प्याज़', 'vegetables', 120, 'n'],
    ['tomato', 'Tomato', 'टमाटर', 'vegetables', 100, 'y'],
    ['bhindi', 'Bhindi', 'भिंडी', 'vegetables', '', 'y'],
    ['lauki', 'Lauki', 'लौकी', 'vegetables', 700, 'y'],
    ['turai', 'Turai', 'तुरई', 'vegetables', 130, 'y'],
    ['cauliflower', 'Cauliflower', 'फूलगोभी', 'vegetables', 600, 'y'],
    ['peas', 'Green peas', 'मटर', 'vegetables', '', 'y'],
    ['carrot', 'Carrot', 'गाजर', 'vegetables', 80, 'y'],
    ['cucumber', 'Cucumber', 'खीरा', 'vegetables', 200, 'y'],
    ['capsicum', 'Capsicum', 'शिमला मिर्च', 'vegetables', 150, 'y'],
    ['cabbage', 'Cabbage', 'पत्ता गोभी', 'vegetables', 800, 'y'],
    ['zucchini', 'Zucchini', 'ज़ुकिनी', 'vegetables', 250, 'y'],
    ['spinach', 'Spinach', 'पालक', 'greens & herbs', '', 'y'],
    ['coriander', 'Coriander', 'हरा धनिया', 'greens & herbs', '', 'y'],
    ['basil', 'Basil', 'तुलसी (बेसिल)', 'greens & herbs', '', 'y'],
    ['lemon', 'Lemon', 'नींबू', 'greens & herbs', 50, 'y'],
    ['ginger', 'Ginger', 'अदरक', 'greens & herbs', '', 'y'],
    ['garlic', 'Garlic', 'लहसुन', 'greens & herbs', '', 'n'],
    ['green-chilli', 'Green chilli', 'हरी मिर्च', 'greens & herbs', 5, 'y'],
    ['paneer', 'Paneer', 'पनीर', 'dairy & extras', '', 'y'],
    ['curd', 'Curd (Milky Mist)', 'दही', 'dairy & extras', '', 'y'],
    ['parmesan', 'Parmesan', 'परमेज़ान चीज़', 'dairy & extras', '', 'n'],
    ['ghee', 'Ghee', 'घी', 'dairy & extras', '', 'n'],
    ['soy-sauce', 'Soy sauce', 'सोया सॉस', 'dairy & extras', '', 'n'],
    ['cumin', 'Cumin seeds', 'जीरा', 'spices', '', 'n'],
    ['turmeric', 'Turmeric', 'हल्दी', 'spices', '', 'n'],
    ['garam-masala', 'Garam masala', 'गरम मसाला', 'spices', '', 'n'],
    ['black-pepper', 'Black pepper', 'काली मिर्च', 'spices', '', 'n'],
  ];

  // Short field names keep this readable; anything not listed is left blank.
  var recipes = [
    { id: 'moong-dal-tadka', name: 'Moong dal tadka', name_hindi: 'मूंग दाल तड़का', category: 'dal', dal_type: 'moong', region: 'North Indian',
      equipment: 'pressure cooker, kadai',
      steps_en: '1. Wash the moong dal well.\n2. Pressure cook with turmeric, salt and 3 cups water for 2 whistles.\n3. Tadka in ghee: cumin, garlic, green chilli, onion, tomato.\n4. Pour over the dal, simmer 5 minutes, add coriander.' },
    { id: 'rajma-masala', name: 'Rajma masala', name_hindi: 'राजमा मसाला', category: 'dal', dal_type: 'rajma', region: 'Punjabi', kidney_caution: 'y',
      equipment: 'pressure cooker, kadai',
      steps_en: '1. The rajma is already soaking — drain and rinse it first.\n2. Pressure cook with salt for 6–7 whistles until soft.\n3. Make a masala of onion, ginger-garlic, tomato and garam masala.\n4. Add the rajma with its water, mash a few beans, simmer 15 minutes.' },
    { id: 'chana-dal-lauki', name: 'Chana dal lauki', name_hindi: 'चना दाल लौकी', category: 'dal', dal_type: 'chana', region: 'North Indian',
      equipment: 'pressure cooker, kadai',
      steps_en: '1. The chana dal is already soaking — drain and rinse it first.\n2. Pressure cook with lauki pieces, turmeric and salt for 3 whistles.\n3. Tadka of cumin, ginger, tomato; pour over and simmer.' },
    { id: 'punjabi-kadhi', name: 'Punjabi kadhi', name_hindi: 'पंजाबी कढ़ी', category: 'dal', dal_type: 'kadhi', region: 'Punjabi', contains_curd: 'y',
      equipment: 'kadai',
      steps_en: '1. Whisk curd, besan, turmeric and water until smooth.\n2. Bring to a boil while stirring, then simmer 20 minutes.\n3. Tadka of cumin and onion on top.' },
    { id: 'bhindi-do-pyaza', name: 'Bhindi do pyaza', name_hindi: 'भिंडी दो प्याज़ा', category: 'sabzi', region: 'North Indian',
      equipment: 'iron kadai',
      steps_en: '1. Wash and fully dry the bhindi, cut into pieces.\n2. Fry in the iron kadai until no longer sticky.\n3. Add onion petals, spices; cook until onions are soft.' },
    { id: 'palak-paneer', name: 'Palak paneer', name_hindi: 'पालक पनीर', category: 'sabzi', region: 'Punjabi', contains_paneer: 'y',
      equipment: 'kadai, mixer grinder',
      steps_en: '1. Blanch spinach 2 minutes, grind with green chilli.\n2. Cook onion, ginger-garlic, tomato.\n3. Add spinach puree and paneer cubes, simmer 5 minutes.' },
    { id: 'gobhi-matar', name: 'Gobhi matar masala', name_hindi: 'गोभी मटर मसाला', category: 'sabzi', region: 'North Indian', cruciferous: 'y',
      equipment: 'non-stick pan',
      steps_en: '1. Cut cauliflower into florets.\n2. Cook with cumin, onion, tomato and spices.\n3. Add peas, cover and cook until tender.' },
    { id: 'turai-tamatar', name: 'Turai tamatar', name_hindi: 'तुरई टमाटर', category: 'sabzi', region: 'North Indian',
      equipment: 'kadai',
      steps_en: '1. Peel and chop turai.\n2. Cook with cumin, garlic and tomato until soft.\n3. Finish with coriander.' },
    { id: 'phulka', name: 'Phulka (plain atta roti)', name_hindi: 'फुल्का', category: 'carb', equipment: 'tawa',
      steps_en: 'Make 6 plain wheat atta phulkas.' },
    { id: 'plain-rice', name: 'Plain white rice', name_hindi: 'सादा चावल', category: 'carb', equipment: 'pressure cooker',
      steps_en: 'Cook 1 cup white rice.' },
    { id: 'kachumber', name: 'Kachumber with lemon', name_hindi: 'कचुंबर', category: 'salad',
      steps_en: 'Chop cucumber, tomato and onion. Add salt, pepper and plenty of lemon.' },
    { id: 'carrot-cucumber', name: 'Carrot cucumber salad', name_hindi: 'गाजर खीरा सलाद', category: 'salad',
      steps_en: 'Slice carrot and cucumber, add lemon, salt and coriander.' },
    { id: 'cucumber-raita', name: 'Cucumber raita', name_hindi: 'खीरा रायता', category: 'side', contains_curd: 'y',
      steps_en: 'Grate cucumber into whisked curd, add roasted cumin and salt.' },
    { id: 'minestrone', name: 'Minestrone', name_hindi: 'मिनेस्ट्रोन सूप', category: 'soup', soup_style: 'italian', region: 'Italian', contains_cheese: 'y',
      equipment: 'pressure cooker, hand blender',
      steps_en: '1. Sauté onion, garlic, carrot, zucchini.\n2. Add chopped tomato and water, simmer 15 minutes.\n3. Add small pasta and cook until soft. Season with pepper and basil.',
      reheat_en: 'Reheat on low gas; add a splash of water if thick. Top with parmesan.' },
    { id: 'hot-and-sour', name: 'Hot and sour veg soup', name_hindi: 'हॉट एंड सॉर सूप', category: 'soup', soup_style: 'indo-chinese', region: 'Indo-Chinese',
      equipment: 'kadai',
      steps_en: '1. Finely chop cabbage, carrot, capsicum.\n2. Stir-fry with garlic and ginger, add water, soy sauce and pepper.\n3. Thicken lightly, finish with lemon.',
      reheat_en: 'Reheat on medium gas until it bubbles. Add lemon after heating.' },
    { id: 'tomato-basil-pasta', name: 'Tomato basil pasta soup', name_hindi: 'टमाटर बेसिल पास्ता सूप', category: 'soup', soup_style: 'pasta', region: 'Italian',
      equipment: 'pressure cooker, hand blender',
      steps_en: '1. Cook tomatoes, onion and garlic; blend smooth.\n2. Simmer with water and small pasta until cooked.\n3. Add torn basil and pepper.' },
    { id: 'lemon-coriander', name: 'Lemon coriander veg soup', name_hindi: 'नींबू धनिया सूप', category: 'soup', soup_style: 'low-carb-veg',
      equipment: 'kadai',
      steps_en: '1. Sauté garlic, ginger, chopped vegetables.\n2. Add water, simmer 10 minutes.\n3. Finish with coriander and lemon.' },
  ];

  // [recipe_id, ingredient_id, quantity, unit, soak_overnight, prep_note]
  var ri = [
    ['moong-dal-tadka', 'moong-dal', 120, 'g', '', ''], ['moong-dal-tadka', 'tomato', 1, 'piece', '', 'chopped'], ['moong-dal-tadka', 'onion', 1, 'piece', '', 'chopped'], ['moong-dal-tadka', 'ghee', 1, 'tbsp', '', ''], ['moong-dal-tadka', 'cumin', 1, 'tsp', '', ''],
    ['rajma-masala', 'rajma', 150, 'g', 'y', ''], ['rajma-masala', 'onion', 2, 'piece', '', ''], ['rajma-masala', 'tomato', 300, 'g', '', 'pureed'], ['rajma-masala', 'garam-masala', 1, 'tsp', '', ''],
    ['chana-dal-lauki', 'chana-dal', 100, 'g', 'y', ''], ['chana-dal-lauki', 'lauki', 350, 'g', '', 'cubed'], ['chana-dal-lauki', 'tomato', 1, 'piece', '', ''],
    ['punjabi-kadhi', 'curd', 300, 'g', '', ''], ['punjabi-kadhi', 'besan', 40, 'g', '', ''], ['punjabi-kadhi', 'onion', 1, 'piece', '', ''],
    ['bhindi-do-pyaza', 'bhindi', 300, 'g', '', ''], ['bhindi-do-pyaza', 'onion', 2, 'piece', '', 'petals'],
    ['palak-paneer', 'spinach', 400, 'g', '', ''], ['palak-paneer', 'paneer', 150, 'g', '', 'cubed'], ['palak-paneer', 'tomato', 1, 'piece', '', ''],
    ['gobhi-matar', 'cauliflower', 400, 'g', '', 'florets'], ['gobhi-matar', 'peas', 100, 'g', '', ''], ['gobhi-matar', 'tomato', 1, 'piece', '', ''],
    ['turai-tamatar', 'turai', 400, 'g', '', ''], ['turai-tamatar', 'tomato', 2, 'piece', '', ''],
    ['phulka', 'atta', 180, 'g', '', ''],
    ['plain-rice', 'rice', 150, 'g', '', ''],
    ['kachumber', 'cucumber', 1, 'piece', '', ''], ['kachumber', 'tomato', 1, 'piece', '', ''], ['kachumber', 'lemon', 1, 'piece', '', ''],
    ['carrot-cucumber', 'carrot', 2, 'piece', '', ''], ['carrot-cucumber', 'cucumber', 1, 'piece', '', ''], ['carrot-cucumber', 'lemon', 1, 'piece', '', ''],
    ['cucumber-raita', 'curd', 200, 'g', '', ''], ['cucumber-raita', 'cucumber', 1, 'piece', '', 'grated'],
    ['minestrone', 'carrot', 1, 'piece', '', ''], ['minestrone', 'zucchini', 1, 'piece', '', ''], ['minestrone', 'tomato', 300, 'g', '', ''], ['minestrone', 'pasta', 40, 'g', '', ''], ['minestrone', 'parmesan', 20, 'g', '', 'to serve'],
    ['hot-and-sour', 'cabbage', 150, 'g', '', ''], ['hot-and-sour', 'carrot', 1, 'piece', '', ''], ['hot-and-sour', 'capsicum', 1, 'piece', '', ''], ['hot-and-sour', 'soy-sauce', 1, 'tbsp', '', ''],
    ['tomato-basil-pasta', 'tomato', 500, 'g', '', ''], ['tomato-basil-pasta', 'pasta', 50, 'g', '', ''], ['tomato-basil-pasta', 'basil', 10, 'g', '', ''],
    ['lemon-coriander', 'carrot', 1, 'piece', '', ''], ['lemon-coriander', 'cabbage', 100, 'g', '', ''], ['lemon-coriander', 'coriander', 1, 'bunch', '', ''], ['lemon-coriander', 'lemon', 1, 'piece', '', ''],
  ];

  appendRows_('Ingredients', ingredients.map(function (r) {
    return { id: r[0], name: r[1], name_hindi: r[2], section: r[3], grams_per_piece: r[4], perishable: r[5] };
  }));
  appendRows_('Pantry', ingredients.map(function (r) {
    return { ingredient_id: r[0], in_stock: r[3] === 'spices' ? 'y' : 'n' };
  }));
  appendRows_('Recipes', recipes.map(function (r) {
    var row = {};
    SCHEMA.Recipes.forEach(function (h) { row[h] = r[h] || ''; });
    ['contains_paneer', 'contains_tofu', 'contains_cheese', 'contains_curd', 'cruciferous', 'kidney_caution'].forEach(function (h) {
      row[h] = r[h] || 'n';
    });
    row.active = 'y';
    return row;
  }));
  appendRows_('RecipeIngredients', ri.map(function (r) {
    return { recipe_id: r[0], ingredient_id: r[1], quantity: r[2], unit: r[3], soak_overnight: r[4] || 'n', prep_note: r[5] };
  }));

  // Two weeks, Mon–Sat, starting this week's Monday.
  var dals = ['moong-dal-tadka', 'rajma-masala', 'punjabi-kadhi', 'chana-dal-lauki', 'moong-dal-tadka', 'rajma-masala'];
  var sabzis = ['bhindi-do-pyaza', 'turai-tamatar', 'gobhi-matar', 'palak-paneer', 'turai-tamatar', 'bhindi-do-pyaza'];
  var soups = ['minestrone', 'hot-and-sour', 'tomato-basil-pasta', 'lemon-coriander', 'minestrone', 'hot-and-sour'];
  var today = new Date();
  var monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  var plan = [];
  for (var w = 0; w < 2; w++) {
    for (var d = 0; d < 6; d++) {
      var date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + w * 7 + d);
      var i = (d + w * 2) % 6;
      plan.push({
        date: date,
        lunch_dal: dals[i],
        lunch_sabzi: sabzis[i],
        lunch_carb: d % 2 ? 'plain-rice' : 'phulka',
        lunch_salad: d % 2 ? 'carrot-cucumber' : 'kachumber',
        lunch_side: dals[i] === 'punjabi-kadhi' ? '' : (d === 4 ? 'cucumber-raita' : ''),
        soup: soups[(d + w) % 6],
        cheese_night: (d === 0 || d === 3) ? 'y' : 'n',
        pinned: 'n',
        note: '',
      });
    }
  }
  appendRows_('Plan', plan);

  toast_('Sample data loaded: ' + recipes.length + ' recipes, ' + plan.length + ' planned days.');
}
