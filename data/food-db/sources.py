"""Where each dish's nutrition comes from.

Every dish in dishes.csv maps to exactly one of:
  USDA(fdc_id)          a direct USDA FoodData Central match (usually an FNDDS survey dish)
  R({...}, cooked=g)    a standard home recipe, calculated from USDA ingredient data

Recipe ingredients are grams, keyed by an alias from INGREDIENTS below or by
"dish:<id>" to reuse another dish (e.g. a thali built from its parts).
`cooked` is the finished weight in grams; it defaults to the sum of the
ingredients. Set it when cooking adds water (dough, batters, steaming) or
removes it (meat shrinking, reductions, frying).

All USDA data is public domain (CC0). Recipes are typical home-style versions;
oil, ghee and sugar vary a lot between kitchens, so values are estimates.
"""

from dataclasses import dataclass


@dataclass
class USDA:
    fdc_id: int
    note: str = ''


@dataclass
class R:
    ingredients: dict
    cooked: float | None = None
    note: str = ''


# Ingredient aliases → USDA FoodData Central IDs (SR Legacy unless noted)
INGREDIENTS = {
    # Flours, grains, breads
    'atta': 168893,              # Wheat flour, whole-grain
    'maida': 168894,             # Wheat flour, white, all-purpose
    'semolina': 169715,
    'besan': 174288,             # Chickpea flour
    'rice_flour': 169714,
    'cornmeal': 169697,          # Makki atta
    'millet_flour': 172023,      # Bajra
    'cornflour': 169698,         # Cornstarch
    'oats': 173904,
    'rice_raw': 168877,
    'rice_cooked': 168878,
    'sabudana': 169717,          # Tapioca, pearl, dry
    'pav': 172796,               # Rolls, hamburger or hotdog, plain
    'bread': 174924,             # Bread, white
    'bread_toast': 2707599,      # FNDDS Bread, white, toasted
    'naan': 2707613,             # FNDDS Bread, naan
    'instant_noodles': 171177,   # Ramen noodle soup, dry, with seasoning
    'murmura': 2708161,          # FNDDS Chips, rice (proxy for puffed rice)
    'cornflakes': 2708453,       # FNDDS
    # Pulses (cooked, unsalted)
    'toor_cooked': 172437,       # Pigeon peas (red gram)
    'masoor_cooked': 172421,     # Lentils
    'moong_cooked': 174257,      # Mung beans
    'urad_cooked': 172427,       # Mungo beans (black gram)
    'urad_raw': 174259,
    'rajma_cooked': 175194,      # Kidney beans, red
    'chana_cooked': 173757,      # Chickpeas
    'moth_cooked': 172426,       # Mothbeans
    'white_peas_cooked': 172429, # Peas, split
    'soya_chunks': 174275,       # Soy flour, defatted (proxy for soya chunks)
    # Fats
    'ghee': 171314,
    'oil': 171411,               # Soybean oil
    'mustard_oil': 172337,
    'coconut_oil': 171412,
    'butter': 173410,
    # Dairy
    'milk': 171265,              # Whole milk
    'curd': 171284,              # Yogurt, plain, whole milk
    'cream': 170859,             # Heavy cream
    'paneer': 2705740,           # FNDDS Cheese, paneer
    'milk_powder': 170876,       # Whole milk powder (proxy for khoa)
    'condensed_milk': 171275,
    'cheese': 173414,            # Cheddar
    # Vegetables
    'onion': 170000,
    'tomato': 170457,
    'tomato_paste': 170459,      # Stand-in for ketchup and sauces (sugar added separately)
    'potato_boiled': 170440,
    'cauliflower': 169986,
    'peas': 170017,
    'okra': 169260,
    'eggplant': 169228,
    'spinach': 168462,           # Also the proxy for methi leaves
    'mustard_greens': 169256,
    'lauki': 169232,             # Bottle gourd (calabash)
    'cabbage': 169975,
    'beans': 169961,             # Green beans
    'carrot': 170393,
    'capsicum': 170427,
    'cucumber': 168409,
    'mushroom': 169251,
    'corn': 169998,
    'pumpkin': 168448,
    'sweet_potato': 168482,
    'garlic': 169230,
    'ginger': 169231,
    'green_chili': 170497,
    'coriander': 169997,
    'mint': 173475,
    # Fruit, nuts, sweeteners
    'coconut': 170169,
    'coconut_milk': 170172,
    'mango': 169910,
    'banana': 173944,
    'lemon_juice': 167747,
    'tamarind': 167763,
    'pomegranate': 169134,
    'dates': 168191,             # Base of sweet (imli-khajur) chutney
    'avocado': 2709223,          # FNDDS
    'cashew': 170162,
    'peanut': 173806,
    'almond': 170567,
    'sugar': 169655,
    'jaggery': 168833,           # Brown sugar (closest USDA match)
    # Meat, fish, egg
    'chicken': 171052,           # Chicken meat only, raw
    'chicken_breast': 171077,
    'mutton': 175303,            # Goat, raw (Indian "mutton")
    'lamb_mince': 174370,
    'fish': 171952,              # Carp, raw (rohu and katla are carps)
    'mackerel': 175122,
    'prawn': 175179,
    'egg': 171287,
    'grilled_chicken': 2706090,  # FNDDS Chicken fillet, grilled
    # Spices and seasoning (only salt and soy add meaningful sodium)
    'salt': 173468,
    'soy_sauce': 174278,
    'cumin': 170923,
    'turmeric': 172231,
    'chili_powder': 171319,
    'cardamom': 170919,
    'tea': 173227,
    'coffee': 171890,
    'water': None,
}

SOURCES = {
    # ── Breads ───────────────────────────────────────────────
    'roti': R({'atta': 30, 'salt': 0.2}, cooked=40),
    'phulka': R({'atta': 23, 'salt': 0.2}, cooked=30),
    'tandoori_roti': R({'atta': 45, 'salt': 0.5}, cooked=60),
    'plain_paratha': R({'atta': 50, 'ghee': 8, 'salt': 0.5}, cooked=80),
    'aloo_paratha': R({'atta': 50, 'potato_boiled': 50, 'onion': 5, 'ghee': 8, 'coriander': 2, 'salt': 1}, cooked=120),
    'gobi_paratha': R({'atta': 50, 'cauliflower': 45, 'ghee': 8, 'salt': 1}, cooked=120),
    'paneer_paratha': R({'atta': 50, 'paneer': 40, 'onion': 5, 'ghee': 8, 'salt': 1}, cooked=120),
    'methi_thepla': R({'atta': 30, 'besan': 5, 'spinach': 10, 'curd': 5, 'oil': 4, 'salt': 0.5}, cooked=50, note='Methi leaves approximated with spinach'),
    'lachha_paratha': R({'atta': 50, 'ghee': 12, 'salt': 0.5}, cooked=88),
    'plain_naan': USDA(2707613),
    'butter_naan': R({'naan': 95, 'butter': 5}),
    'garlic_naan': R({'naan': 93, 'butter': 5, 'garlic': 2}),
    'kulcha': R({'maida': 55, 'potato_boiled': 40, 'onion': 5, 'butter': 8, 'salt': 1}, cooked=120),
    'puri': R({'atta': 14, 'oil': 6, 'salt': 0.2}, cooked=25),
    'bhatura': R({'maida': 40, 'curd': 8, 'oil': 14, 'salt': 0.5}, cooked=70),
    'makki_roti': R({'cornmeal': 40, 'ghee': 3, 'salt': 0.3}, cooked=60),
    'bajra_roti': R({'millet_flour': 42, 'salt': 0.3}, cooked=60),
    'appam': R({'rice_raw': 25, 'coconut': 5, 'sugar': 1, 'oil': 1, 'salt': 0.2}, cooked=60),
    'kerala_parotta': R({'maida': 50, 'oil': 12, 'sugar': 1, 'salt': 0.5}, cooked=90),

    # ── Rice ─────────────────────────────────────────────────
    'steamed_rice': USDA(2708408),
    'jeera_rice': R({'rice_cooked': 150, 'ghee': 4, 'cumin': 1, 'salt': 1}),
    'veg_pulao': R({'rice_cooked': 180, 'peas': 20, 'carrot': 15, 'beans': 10, 'onion': 15, 'ghee': 8, 'salt': 2}),
    'lemon_rice': R({'rice_cooked': 170, 'oil': 8, 'peanut': 8, 'lemon_juice': 6, 'turmeric': 0.5, 'salt': 1.5}),
    'curd_rice': R({'rice_cooked': 120, 'curd': 80, 'milk': 20, 'oil': 2, 'salt': 1.5}),
    'tamarind_rice': R({'rice_cooked': 170, 'oil': 10, 'tamarind': 8, 'peanut': 6, 'jaggery': 3, 'salt': 2}),
    'bisi_bele_bath': R({'rice_cooked': 100, 'toor_cooked': 80, 'carrot': 15, 'beans': 15, 'peas': 15, 'tamarind': 4, 'ghee': 8, 'water': 20, 'salt': 2}),
    'khichdi': R({'rice_cooked': 120, 'moong_cooked': 100, 'ghee': 6, 'water': 20, 'salt': 2}),
    'veg_biryani': USDA(2708985),
    'chicken_biryani': USDA(2706538),
    'mutton_biryani': USDA(2706490),
    'egg_biryani': R({'dish:veg_biryani': 250, 'dish:boiled_egg': 50}),
    'hyderabadi_biryani': USDA(2706538, 'Generic chicken biryani'),
    'kolkata_biryani': R({'dish:mutton_biryani': 300, 'potato_boiled': 50}),
    'prawn_biryani': R({'dish:veg_biryani': 230, 'prawn': 60, 'oil': 4}, cooked=280),

    # ── Dals ─────────────────────────────────────────────────
    'dal_tadka': USDA(2707427),
    'dal_fry': USDA(2707427),
    'moong_dal': R({'moong_cooked': 100, 'water': 40, 'tomato': 10, 'ghee': 4, 'salt': 1.5}),
    'toor_dal': R({'toor_cooked': 110, 'water': 35, 'ghee': 3, 'turmeric': 0.3, 'salt': 1.5}),
    'gujarati_dal': R({'toor_cooked': 100, 'water': 50, 'tomato': 10, 'jaggery': 5, 'peanut': 3, 'ghee': 3, 'salt': 1.5}),
    'masoor_dal': R({'masoor_cooked': 100, 'water': 30, 'onion': 10, 'tomato': 10, 'oil': 4, 'salt': 1.5}),
    'dal_makhani': R({'urad_cooked': 90, 'rajma_cooked': 15, 'tomato': 25, 'butter': 8, 'cream': 12, 'salt': 1.5}),
    'rajma': R({'rajma_cooked': 100, 'onion': 20, 'tomato': 30, 'oil': 6, 'ginger': 2, 'garlic': 2, 'water': 20, 'salt': 1.5}),
    'chole': R({'chana_cooked': 100, 'onion': 20, 'tomato': 25, 'oil': 7, 'water': 15, 'salt': 1.5}),
    'kadhi': R({'curd': 80, 'besan': 18, 'onion': 10, 'oil': 8, 'water': 50, 'salt': 1.5}, cooked=150),
    'sambar': R({'toor_cooked': 50, 'water': 70, 'eggplant': 15, 'pumpkin': 15, 'onion': 10, 'tomato': 10, 'tamarind': 3, 'oil': 3, 'salt': 1.5}),
    'rasam': R({'water': 130, 'tomato': 30, 'toor_cooked': 10, 'tamarind': 4, 'ghee': 2, 'salt': 1.5}),
    'dal_baati': R({'atta': 80, 'ghee': 30, 'toor_cooked': 80, 'moong_cooked': 40, 'water': 30, 'salt': 2}, cooked=290),

    # ── Vegetable curries ────────────────────────────────────
    'aloo_gobi': R({'potato_boiled': 70, 'cauliflower': 70, 'onion': 10, 'tomato': 10, 'oil': 8, 'salt': 1.5}, cooked=150),
    'aloo_matar': R({'potato_boiled': 70, 'peas': 40, 'onion': 15, 'tomato': 30, 'oil': 7, 'water': 20, 'salt': 1.5}),
    'jeera_aloo': R({'potato_boiled': 140, 'oil': 8, 'cumin': 1, 'salt': 1.5}),
    'aloo_sabzi': R({'potato_boiled': 100, 'tomato': 30, 'water': 40, 'oil': 6, 'salt': 1.5}),
    'bhindi_masala': R({'okra': 120, 'onion': 20, 'oil': 10, 'salt': 1.2}, cooked=120),
    'baingan_bharta': R({'eggplant': 180, 'onion': 25, 'tomato': 25, 'oil': 8, 'salt': 1.5}, cooked=160),
    'mix_veg': USDA(2710067),
    'veg_kurma': R({'carrot': 30, 'beans': 30, 'peas': 25, 'potato_boiled': 30, 'coconut': 15, 'cashew': 5, 'water': 30, 'oil': 6, 'salt': 1.5}),
    'malai_kofta': R({'paneer': 25, 'potato_boiled': 25, 'maida': 4, 'oil': 6, 'onion': 20, 'tomato': 25, 'cashew': 8, 'cream': 15, 'butter': 4, 'water': 20, 'salt': 1.5}),
    'cabbage_sabzi': R({'cabbage': 130, 'peas': 15, 'oil': 6, 'salt': 1.2}, cooked=125),
    'beans_poriyal': R({'beans': 120, 'coconut': 12, 'oil': 5, 'salt': 1.2}, cooked=125),
    'lauki_sabzi': R({'lauki': 160, 'tomato': 15, 'oil': 5, 'salt': 1.2}, cooked=150),
    'methi_aloo': R({'potato_boiled': 90, 'spinach': 50, 'oil': 7, 'salt': 1.2}, cooked=125, note='Methi leaves approximated with spinach'),
    'sarson_saag': R({'mustard_greens': 120, 'spinach': 50, 'cornmeal': 6, 'onion': 10, 'ghee': 8, 'butter': 5, 'salt': 1.5}, cooked=160),
    'avial': R({'carrot': 25, 'beans': 25, 'potato_boiled': 20, 'pumpkin': 20, 'lauki': 20, 'coconut': 25, 'curd': 20, 'coconut_oil': 6, 'salt': 1.5}),
    'undhiyu': R({'potato_boiled': 30, 'sweet_potato': 30, 'eggplant': 25, 'beans': 30, 'besan': 8, 'coconut': 8, 'oil': 12, 'salt': 1.5}, cooked=150),
    'pav_bhaji_bhaji': R({'potato_boiled': 70, 'cauliflower': 25, 'peas': 20, 'capsicum': 15, 'tomato': 40, 'onion': 20, 'butter': 15, 'salt': 2}, cooked=200),
    'misal': R({'moth_cooked': 90, 'water': 80, 'onion': 15, 'tomato': 15, 'coconut': 5, 'oil': 10, 'dish:namkeen': 25, 'salt': 2}),
    'soya_chunks_curry': R({'soya_chunks': 25, 'water': 70, 'onion': 20, 'tomato': 30, 'oil': 7, 'salt': 1.5}, cooked=150),
    'mushroom_masala': R({'mushroom': 110, 'onion': 25, 'tomato': 30, 'oil': 8, 'cream': 5, 'salt': 1.5}, cooked=150),

    # ── Paneer ───────────────────────────────────────────────
    'paneer_butter_masala': R({'paneer': 60, 'tomato': 50, 'onion': 10, 'butter': 8, 'cream': 15, 'cashew': 6, 'sugar': 2, 'water': 10, 'salt': 1.5}),
    'shahi_paneer': R({'paneer': 60, 'onion': 20, 'curd': 20, 'cream': 18, 'cashew': 8, 'ghee': 6, 'water': 10, 'salt': 1.5}),
    'kadai_paneer': R({'paneer': 60, 'capsicum': 30, 'onion': 25, 'tomato': 30, 'oil': 8, 'salt': 1.5}),
    'matar_paneer': R({'paneer': 45, 'peas': 40, 'tomato': 35, 'onion': 20, 'oil': 7, 'water': 15, 'salt': 1.5}),
    'palak_paneer': USDA(2709631),
    'paneer_bhurji': R({'paneer': 80, 'onion': 20, 'tomato': 20, 'oil': 6, 'salt': 1.2}),
    'paneer_tikka': R({'paneer': 150, 'curd': 25, 'capsicum': 25, 'onion': 25, 'besan': 3, 'oil': 6, 'salt': 2}, cooked=200),
    'chilli_paneer': R({'paneer': 100, 'cornflour': 10, 'maida': 5, 'oil': 15, 'capsicum': 30, 'onion': 30, 'soy_sauce': 8, 'tomato_paste': 5, 'sugar': 3, 'salt': 1}, cooked=200),

    # ── Chicken ──────────────────────────────────────────────
    'butter_chicken': R({'chicken': 80, 'tomato': 50, 'butter': 10, 'cream': 20, 'cashew': 5, 'curd': 8, 'sugar': 2, 'salt': 1.5}, cooked=156),
    'chicken_tikka_masala': R({'chicken': 80, 'tomato': 45, 'onion': 20, 'cream': 15, 'oil': 8, 'curd': 8, 'salt': 1.5}, cooked=158),
    'chicken_curry': USDA(2706437),
    'kadai_chicken': R({'chicken': 90, 'capsicum': 25, 'onion': 25, 'tomato': 40, 'oil': 10, 'salt': 1.5}, cooked=167),
    'chicken_korma': R({'chicken': 85, 'onion': 30, 'curd': 30, 'cashew': 8, 'cream': 10, 'ghee': 10, 'salt': 1.5}, cooked=150),
    'chicken_chettinad': R({'chicken': 90, 'onion': 30, 'tomato': 30, 'coconut': 12, 'oil': 10, 'salt': 1.5}, cooked=149),
    'chicken_65': R({'chicken': 160, 'cornflour': 12, 'maida': 6, 'egg': 10, 'curd': 10, 'oil': 20, 'salt': 2}, cooked=190),
    'chicken_tikka': R({'chicken_breast': 240, 'curd': 30, 'besan': 3, 'lemon_juice': 5, 'oil': 8, 'salt': 3}, cooked=200),
    'tandoori_chicken': R({'chicken': 400, 'curd': 40, 'oil': 10, 'lemon_juice': 5, 'salt': 4}, cooked=300, note='Per 100 g of edible meat; the portion weight includes bone'),
    'chicken_seekh_kebab': R({'chicken': 60, 'onion': 6, 'besan': 2, 'oil': 3, 'salt': 0.8}, cooked=50),
    'chilli_chicken': USDA(2706794, 'General Tso chicken (closest battered, sauced match)'),

    # ── Mutton ───────────────────────────────────────────────
    'mutton_curry': R({'mutton': 90, 'onion': 30, 'tomato': 30, 'curd': 10, 'oil': 10, 'water': 20, 'salt': 1.5}, cooked=166),
    'rogan_josh': R({'mutton': 95, 'curd': 25, 'onion': 10, 'ghee': 12, 'water': 20, 'salt': 1.5}, cooked=138),
    'mutton_keema': R({'mutton': 100, 'onion': 25, 'tomato': 25, 'peas': 20, 'oil': 8, 'salt': 1.5}, cooked=150),
    'mutton_seekh_kebab': R({'lamb_mince': 60, 'onion': 6, 'besan': 2, 'salt': 0.8}, cooked=50),
    'galouti_kebab': R({'lamb_mince': 45, 'onion': 5, 'ghee': 4, 'salt': 0.6}, cooked=40),
    'shami_kebab': R({'mutton': 35, 'chana_cooked': 15, 'egg': 3, 'onion': 3, 'oil': 5, 'salt': 0.5}, cooked=50),
    'nihari': R({'mutton': 110, 'atta': 8, 'ghee': 15, 'water': 140, 'salt': 2.5}, cooked=250),
    'haleem': R({'mutton': 70, 'atta': 25, 'chana_cooked': 30, 'onion': 10, 'ghee': 15, 'water': 130, 'salt': 2.5}, cooked=250),

    # ── Seafood ──────────────────────────────────────────────
    'fish_curry': USDA(2706460),
    'goan_fish_curry': R({'mackerel': 80, 'coconut_milk': 50, 'tomato': 20, 'onion': 15, 'tamarind': 3, 'oil': 5, 'salt': 1.5}, cooked=160),
    'macher_jhol': R({'fish': 90, 'potato_boiled': 30, 'tomato': 20, 'mustard_oil': 10, 'water': 50, 'salt': 1.5}, cooked=186),
    'fish_fry': R({'fish': 110, 'semolina': 8, 'oil': 8, 'chili_powder': 1, 'salt': 1}, cooked=100),
    'prawn_masala': R({'prawn': 110, 'onion': 30, 'tomato': 30, 'oil': 10, 'salt': 1.5}, cooked=150),

    # ── Eggs ─────────────────────────────────────────────────
    'egg_curry': R({'egg': 100, 'onion': 30, 'tomato': 40, 'oil': 8, 'water': 20, 'salt': 1.5}),
    'egg_bhurji': R({'egg': 110, 'onion': 25, 'tomato': 20, 'oil': 8, 'salt': 1.2}, cooked=150),
    'masala_omelette': R({'egg': 100, 'onion': 20, 'tomato': 10, 'green_chili': 2, 'oil': 7, 'salt': 1}, cooked=125),
    'plain_omelette': USDA(2707200),
    'boiled_egg': USDA(2707154),
    'fried_egg': USDA(2707158),
    'bread_omelette': R({'bread': 60, 'egg': 100, 'onion': 15, 'oil': 8, 'butter': 5, 'salt': 1}, cooked=180),

    # ── South Indian breakfast ───────────────────────────────
    'idli': R({'rice_raw': 11, 'urad_raw': 4, 'salt': 0.3}, cooked=40),
    'plain_dosa': USDA(2708347),
    'masala_dosa': USDA(2709129),
    'rava_dosa': R({'semolina': 25, 'rice_flour': 15, 'maida': 5, 'onion': 5, 'oil': 10, 'salt': 1}, cooked=120),
    'set_dosa': R({'rice_raw': 25, 'urad_raw': 5, 'oil': 3, 'salt': 0.5}, cooked=80),
    'uttapam': R({'rice_raw': 35, 'urad_raw': 8, 'onion': 20, 'tomato': 10, 'oil': 7, 'salt': 0.8}, cooked=150),
    'medu_vada': R({'urad_raw': 18, 'onion': 2, 'oil': 9, 'salt': 0.4}, cooked=50),
    'upma': R({'semolina': 45, 'oil': 8, 'onion': 15, 'peas': 10, 'carrot': 10, 'peanut': 5, 'water': 110, 'salt': 1.5}, cooked=200),
    'pongal': R({'rice_cooked': 120, 'moong_cooked': 50, 'ghee': 12, 'cashew': 4, 'water': 15, 'salt': 1.5}),
    'pesarattu': R({'moong_cooked': 80, 'rice_flour': 5, 'onion': 10, 'oil': 5, 'salt': 0.6}),
    'puttu': R({'rice_flour': 55, 'coconut': 20, 'salt': 0.5}, cooked=150),
    'coconut_chutney': R({'coconut': 40, 'chana_cooked': 8, 'green_chili': 3, 'oil': 2, 'water': 45, 'salt': 1}),

    # ── North and West Indian breakfast ──────────────────────
    'poha': R({'rice_raw': 50, 'water': 70, 'onion': 20, 'potato_boiled': 15, 'peanut': 8, 'oil': 8, 'lemon_juice': 3, 'sugar': 2, 'salt': 1.5}, cooked=180, note='Flattened rice approximated with raw rice'),
    'sabudana_khichdi': R({'sabudana': 70, 'water': 40, 'peanut': 20, 'potato_boiled': 30, 'ghee': 10, 'sugar': 2, 'salt': 1.5}, cooked=180),
    'dhokla': R({'besan': 18, 'curd': 5, 'sugar': 2, 'oil': 2, 'water': 30, 'salt': 0.5}, cooked=55),
    'khandvi': R({'besan': 30, 'curd': 40, 'water': 50, 'oil': 6, 'coconut': 3, 'salt': 1}, cooked=120),
    'besan_chilla': R({'besan': 35, 'onion': 10, 'tomato': 10, 'oil': 5, 'water': 25, 'salt': 0.7}, cooked=80),
    'moong_dal_chilla': R({'moong_cooked': 60, 'onion': 8, 'oil': 5, 'water': 10, 'salt': 0.6}, cooked=80),
    'chole_bhature': R({'dish:chole': 200, 'dish:bhatura': 140, 'onion': 20}),
    'puri_bhaji': R({'dish:puri': 100, 'dish:aloo_sabzi': 180}),
    'bread_butter': R({'bread_toast': 30, 'butter': 5}),
    'oats_porridge': R({'oats': 40, 'milk': 180, 'water': 40, 'sugar': 8}, cooked=250),
    'cornflakes_milk': R({'cornflakes': 30, 'milk': 200, 'sugar': 5}),

    # ── Snacks and street food ───────────────────────────────
    'samosa': USDA(2708730),
    'kachori': R({'maida': 25, 'moong_cooked': 15, 'oil': 15, 'salt': 0.5}, cooked=60),
    'onion_pakora': R({'besan': 35, 'rice_flour': 5, 'onion': 45, 'oil': 20, 'salt': 1}, cooked=100),
    'aloo_tikki': R({'potato_boiled': 60, 'peas': 5, 'cornflour': 3, 'oil': 7, 'salt': 0.8}, cooked=70),
    'vada_pav': R({'pav': 45, 'potato_boiled': 50, 'besan': 15, 'oil': 15, 'dish:green_chutney': 10, 'coconut': 3, 'salt': 0.8}, cooked=140),
    'pav_bhaji': R({'dish:pav_bhaji_bhaji': 200, 'pav': 80, 'butter': 10, 'onion': 15}),
    'dabeli': R({'pav': 45, 'potato_boiled': 45, 'peanut': 8, 'pomegranate': 5, 'dish:namkeen': 8, 'dates': 5, 'butter': 5, 'salt': 0.8}),
    'pani_puri': R({'semolina': 20, 'oil': 8, 'potato_boiled': 30, 'chana_cooked': 15, 'water': 55, 'tamarind': 3, 'jaggery': 3, 'mint': 2, 'salt': 1.5}),
    'bhel_puri': R({'murmura': 50, 'dish:namkeen': 15, 'onion': 20, 'tomato': 15, 'potato_boiled': 20, 'dates': 10, 'dish:green_chutney': 10, 'peanut': 5, 'lemon_juice': 3, 'salt': 1}),
    'sev_puri': R({'maida': 25, 'oil': 10, 'potato_boiled': 30, 'onion': 15, 'dish:namkeen': 15, 'dates': 10, 'dish:green_chutney': 10, 'salt': 0.8}),
    'dahi_puri': R({'semolina': 15, 'oil': 6, 'potato_boiled': 25, 'chana_cooked': 10, 'curd': 60, 'dates': 10, 'dish:namkeen': 10, 'dish:green_chutney': 10, 'sugar': 3, 'salt': 1}),
    'papdi_chaat': R({'maida': 25, 'oil': 10, 'potato_boiled': 30, 'chana_cooked': 20, 'curd': 60, 'dates': 10, 'dish:green_chutney': 10, 'dish:namkeen': 5, 'sugar': 3, 'salt': 1}),
    'dahi_vada': R({'urad_raw': 25, 'oil': 10, 'water': 20, 'curd': 80, 'sugar': 4, 'dates': 10, 'salt': 1}),
    'samosa_chaat': R({'dish:samosa': 70, 'dish:chole': 70, 'curd': 40, 'dates': 10, 'dish:green_chutney': 10, 'onion': 10}),
    'ragda_pattice': R({'dish:aloo_tikki': 140, 'white_peas_cooked': 80, 'water': 20, 'onion': 10, 'dates': 10, 'dish:green_chutney': 10, 'dish:namkeen': 10, 'salt': 1}),
    'veg_momos': R({'maida': 60, 'cabbage': 50, 'carrot': 20, 'onion': 15, 'oil': 4, 'soy_sauce': 2, 'salt': 1.5}, cooked=170),
    'chicken_momos': USDA(2708708, 'Steamed meat dumpling'),
    'fried_momos': USDA(2708706, 'Fried dumpling, no meat'),
    'veg_sandwich': R({'bread': 60, 'butter': 6, 'cucumber': 25, 'tomato': 25, 'potato_boiled': 20, 'dish:green_chutney': 10, 'salt': 0.5}),
    'grilled_sandwich': R({'bread': 60, 'butter': 10, 'cheese': 30, 'capsicum': 15, 'onion': 10, 'tomato': 15, 'dish:green_chutney': 10}),
    'kathi_roll_chicken': R({'maida': 50, 'oil': 13, 'egg': 25, 'chicken': 70, 'onion': 20, 'dish:green_chutney': 10, 'salt': 1}, cooked=200),
    'kathi_roll_paneer': R({'maida': 50, 'oil': 13, 'paneer': 60, 'onion': 20, 'capsicum': 15, 'dish:green_chutney': 10, 'salt': 1}, cooked=200),
    'egg_roll': R({'maida': 50, 'oil': 13, 'egg': 55, 'onion': 20, 'green_chili': 2, 'tomato_paste': 5, 'sugar': 3, 'salt': 1}, cooked=180),
    'chicken_shawarma': USDA(2706962, 'Gyro sandwich (closest match)'),
    'maggi': R({'instant_noodles': 70}, cooked=220),
    'banana_chips': USDA(2709200),
    'namkeen': R({'besan': 60, 'oil': 35, 'salt': 2}, cooked=95),
    'roasted_peanuts': USDA(2707515),

    # ── Indo-Chinese ─────────────────────────────────────────
    'veg_hakka_noodles': USDA(2708799, 'Lo mein, meatless'),
    'chicken_hakka_noodles': USDA(2708803, 'Lo mein with chicken'),
    'schezwan_noodles': R({'dish:veg_hakka_noodles': 230, 'oil': 6, 'garlic': 3, 'chili_powder': 2, 'tomato_paste': 5, 'sugar': 2, 'salt': 1}),
    'veg_fried_rice': USDA(2708951),
    'chicken_fried_rice': USDA(2708953),
    'egg_fried_rice': USDA(2708952, 'Fried rice, NFS (typically includes egg)'),
    'veg_manchurian': R({'cabbage': 40, 'carrot': 15, 'maida': 10, 'cornflour': 13, 'oil': 16, 'water': 80, 'soy_sauce': 6, 'onion': 10, 'capsicum': 10, 'garlic': 3, 'sugar': 2, 'salt': 1}, cooked=200),
    'gobi_manchurian': R({'cauliflower': 120, 'maida': 15, 'cornflour': 15, 'oil': 22, 'soy_sauce': 6, 'tomato_paste': 6, 'onion': 15, 'capsicum': 10, 'garlic': 3, 'sugar': 3, 'salt': 1.5}, cooked=200),
    'spring_rolls': USDA(2708700, 'Egg roll, meatless (fried)'),
    'hot_sour_soup': USDA(2707136),
    'sweet_corn_soup': R({'corn': 50, 'water': 170, 'cornflour': 6, 'carrot': 10, 'butter': 2, 'sugar': 2, 'salt': 1.5}),

    # ── Pizza, burgers, fast food ────────────────────────────
    'margherita_pizza': USDA(2708615),
    'veg_pizza': USDA(2708630),
    'chicken_pizza': R({'dish:margherita_pizza': 85, 'grilled_chicken': 15, 'onion': 5, 'capsicum': 5}),
    'pepperoni_pizza': USDA(2708638),
    'veg_burger': USDA(2707481, 'Veggie burger on bun'),
    'chicken_burger': USDA(2707008, 'Fried chicken fillet sandwich'),
    'french_fries': USDA(2709461),
    'fried_chicken': USDA(2705949),
    'chicken_nuggets': USDA(2706093),
    'hot_dog': USDA(2707056),

    # ── Pasta, sandwiches, global ────────────────────────────
    'white_sauce_pasta': USDA(2708855),
    'red_sauce_pasta': USDA(2708830),
    'spaghetti_bolognese': USDA(2708837),
    'mac_and_cheese': USDA(2708811),
    'lasagna': USDA(2708752),
    'garlic_bread': USDA(2707627),
    'club_sandwich': USDA(2706997),
    'subway_sub': USDA(2706988, 'Chicken deli sub, restaurant'),
    'tacos': USDA(2708514),
    'burrito': USDA(2708534),
    'nachos': USDA(2708576),
    'sushi': USDA(2708959),
    'ramen': USDA(2709153),
    'thai_green_curry': R({'chicken': 80, 'coconut_milk': 80, 'eggplant': 20, 'beans': 15, 'oil': 5, 'sugar': 3, 'soy_sauce': 5, 'water': 20}, cooked=208),
    'pad_thai': USDA(2708804),
    'caesar_salad': R({'caesar_no_dressing': 170, 'caesar_dressing': 25}),
    'green_salad': USDA(2709822, 'No dressing'),
    'chicken_salad': USDA(2706810, 'Chicken garden salad, no dressing'),
    'kachumber': R({'cucumber': 40, 'tomato': 30, 'onion': 25, 'lemon_juice': 4, 'coriander': 2, 'salt': 0.8}),
    'fruit_bowl': USDA(2709288),
    'avocado_toast': R({'bread_toast': 60, 'avocado': 70, 'oil': 3, 'salt': 0.5}),
    'pancakes': USDA(2708304),
    'waffles': USDA(2708312),

    # ── Sides ────────────────────────────────────────────────
    'curd': USDA(2705418),
    'raita': R({'curd': 120, 'cucumber': 25, 'onion': 5, 'cumin': 0.5, 'salt': 1}),
    'papad': R({'urad_raw': 14, 'salt': 1}, cooked=15, note='Roasted; made from urad flour'),
    'pickle': R({'mango': 55, 'mustard_oil': 25, 'salt': 10, 'chili_powder': 5, 'turmeric': 1}),
    'green_chutney': R({'coriander': 40, 'mint': 15, 'green_chili': 4, 'lemon_juice': 6, 'water': 20, 'salt': 1}),

    # ── Thalis (built from their parts) ──────────────────────
    'veg_thali': R({'dish:roti': 80, 'dish:steamed_rice': 150, 'dish:dal_tadka': 150, 'dish:mix_veg': 120, 'dish:raita': 80, 'dish:papad': 15, 'dish:pickle': 10}),
    'nonveg_thali': R({'dish:roti': 80, 'dish:steamed_rice': 150, 'dish:chicken_curry': 180, 'dish:dal_tadka': 120, 'dish:raita': 80, 'dish:kachumber': 50, 'dish:pickle': 10}),
    'south_indian_meals': R({'dish:steamed_rice': 250, 'dish:sambar': 150, 'dish:rasam': 120, 'dish:beans_poriyal': 80, 'dish:avial': 80, 'dish:curd': 80, 'dish:papad': 15, 'dish:pickle': 10}),

    # ── Sweets and desserts ──────────────────────────────────
    'gulab_jamun': R({'milk_powder': 14, 'maida': 4, 'ghee': 4, 'sugar': 14, 'water': 12}, cooked=50),
    'rasgulla': R({'paneer': 22, 'semolina': 1, 'sugar': 9, 'water': 18}, cooked=50),
    'rasmalai': R({'paneer': 22, 'milk': 60, 'sugar': 10, 'almond': 1}, cooked=60),
    'jalebi': R({'maida': 30, 'curd': 3, 'oil': 15, 'sugar': 45, 'water': 15}, cooked=100),
    'gajar_halwa': R({'carrot': 120, 'milk': 100, 'sugar': 15, 'ghee': 8, 'milk_powder': 8, 'cashew': 3}, cooked=100),
    'sooji_halwa': R({'semolina': 25, 'ghee': 15, 'sugar': 22, 'water': 60, 'cashew': 3}, cooked=100),
    'kheer': R({'milk': 250, 'rice_raw': 12, 'sugar': 18, 'almond': 3, 'cardamom': 0.2}, cooked=150),
    'besan_ladoo': R({'besan': 18, 'ghee': 10, 'sugar': 13}, cooked=40),
    'motichoor_ladoo': R({'besan': 12, 'oil': 8, 'sugar': 18, 'water': 4}, cooked=40),
    'kaju_katli': R({'cashew': 9, 'sugar': 6, 'ghee': 0.3}, cooked=15),
    'barfi': R({'milk_powder': 13, 'sugar': 10, 'ghee': 2, 'water': 5}, cooked=30),
    'sandesh': R({'paneer': 22, 'sugar': 8}, cooked=30),
    'mysore_pak': R({'besan': 10, 'ghee': 15, 'sugar': 15}, cooked=40),
    'modak': R({'rice_flour': 15, 'coconut': 12, 'jaggery': 10, 'ghee': 1, 'water': 15}, cooked=50, note='Steamed (ukadiche) modak'),
    'shrikhand': R({'curd': 160, 'sugar': 30}, cooked=100, note='Strained curd; nutrients lost with the whey are ignored'),
    'kulfi': R({'milk': 250, 'sugar': 15, 'almond': 5, 'milk_powder': 5}, cooked=100),
    'ice_cream': USDA(2705630),
    'brownie': USDA(2707904),
    'cake_slice': USDA(2707853),

    # ── Drinks ───────────────────────────────────────────────
    'masala_chai': R({'milk': 60, 'water': 90, 'sugar': 8}, cooked=150),
    'filter_coffee': R({'milk': 100, 'coffee': 50, 'sugar': 8}, cooked=150),
    'cold_coffee': R({'milk': 250, 'coffee': 30, 'sugar': 18}),
    'cappuccino': USDA(2710472),
    'sweet_lassi': R({'curd': 180, 'water': 50, 'sugar': 22}),
    'mango_lassi': R({'curd': 140, 'mango': 80, 'sugar': 15, 'water': 15}),
    'chaas': R({'curd': 80, 'water': 170, 'cumin': 0.5, 'salt': 1}),
    'nimbu_pani': R({'water': 225, 'lemon_juice': 20, 'sugar': 15, 'salt': 1}),
    'fresh_juice': USDA(2709187, 'Orange juice, freshly squeezed'),
    'mango_shake': R({'milk': 200, 'mango': 100, 'sugar': 15}),
    'banana_shake': R({'milk': 200, 'banana': 100, 'sugar': 10}),
    'coconut_water': USDA(2707572),
    'haldi_doodh': R({'milk': 200, 'turmeric': 2, 'sugar': 8}),
}

# FNDDS dishes used as recipe ingredients
INGREDIENTS.update({
    'caesar_no_dressing': 2709591,  # FNDDS Caesar salad, romaine, no dressing
    'caesar_dressing': 2710199,     # FNDDS Caesar dressing
})
