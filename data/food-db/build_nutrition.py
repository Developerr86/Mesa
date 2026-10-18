"""Builds nutrition.csv (per 100 g) for every dish in dishes.csv.

Usage:
  python3 build_nutrition.py <usda-dir>

Writes nutrition.csv here, plus two files for the app:
  src/features/foods/foods.json               the food database
  src/features/recognition/modelLabels.json   classifier output index -> label and dish id

<usda-dir> must contain the unzipped USDA FoodData Central downloads
(https://fdc.nal.usda.gov/download-datasets/):
  surveyDownload.json                              FNDDS 2021-2023 (JSON)
  FoodData_Central_sr_legacy_food_csv_2018-04/     SR Legacy (CSV)
  FoodData_Central_foundation_food_json_*.json     Foundation Foods (JSON)
"""

import csv
import glob
import json
import os
import sys

from sources import INGREDIENTS, SOURCES, USDA, R

NUTRIENTS = ['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugars_g', 'sodium_mg']
NUTRIENT_NUMBERS = {'208': 'kcal', '203': 'protein_g', '205': 'carbs_g', '204': 'fat_g',
                    '291': 'fiber_g', '269': 'sugars_g', '307': 'sodium_mg'}
SR_NUTRIENT_IDS = {'1008': 'kcal', '1003': 'protein_g', '1005': 'carbs_g', '1004': 'fat_g',
                   '1079': 'fiber_g', '2000': 'sugars_g', '1093': 'sodium_mg'}
HERE = os.path.dirname(os.path.abspath(__file__))
APP_FOODS_JSON = os.path.join(HERE, '..', '..', 'src', 'features', 'foods', 'foods.json')
APP_MODEL_LABELS_JSON = os.path.join(HERE, '..', '..', 'src', 'features', 'recognition', 'modelLabels.json')


def load_usda(usda_dir):
    foods = {}  # fdc_id -> (description, {nutrient: per 100 g})

    with open(os.path.join(usda_dir, 'surveyDownload.json')) as f:
        for food in json.load(f)['SurveyFoods']:
            values = {NUTRIENT_NUMBERS[n['nutrient']['number']]: n['amount']
                      for n in food.get('foodNutrients') or [] if n['nutrient']['number'] in NUTRIENT_NUMBERS}
            foods[food['fdcId']] = (food['description'], values)

    for path in glob.glob(os.path.join(usda_dir, 'FoodData_Central_foundation_food_json_*.json')):
        with open(path) as f:
            for food in json.load(f)['FoundationFoods']:
                if not food:
                    continue
                values = {}
                for n in food.get('foodNutrients') or []:
                    number, amount = n['nutrient']['number'], n.get('amount')
                    if amount is None:
                        continue
                    if number in NUTRIENT_NUMBERS:
                        values.setdefault(NUTRIENT_NUMBERS[number], amount)
                    elif number in ('957', '958'):  # Atwater energy when 208 is absent
                        values.setdefault('kcal', amount)
                foods[food['fdcId']] = (food['description'], values)

    sr_dir = os.path.join(usda_dir, 'FoodData_Central_sr_legacy_food_csv_2018-04')
    with open(os.path.join(sr_dir, 'food.csv')) as f:
        sr = {int(r['fdc_id']): (r['description'], {}) for r in csv.DictReader(f)}
    with open(os.path.join(sr_dir, 'food_nutrient.csv')) as f:
        for r in csv.DictReader(f):
            if r['nutrient_id'] in SR_NUTRIENT_IDS and int(r['fdc_id']) in sr:
                sr[int(r['fdc_id'])][1][SR_NUTRIENT_IDS[r['nutrient_id']]] = float(r['amount'])
    foods.update(sr)

    return foods


def main(usda_dir):
    foods = load_usda(usda_dir)
    with open(os.path.join(HERE, 'dishes.csv')) as f:
        dishes = list(csv.DictReader(f))
    dish_ids = [d['id'] for d in dishes]

    missing = [d for d in dish_ids if d not in SOURCES]
    unknown = [d for d in SOURCES if d not in dish_ids]
    if missing or unknown:
        sys.exit(f'sources.py out of sync with dishes.csv. Missing: {missing}. Unknown: {unknown}')

    results, gaps = {}, []

    def usda_values(fdc_id, context):
        if fdc_id not in foods:
            sys.exit(f'{context}: FDC id {fdc_id} not found in USDA data')
        description, values = foods[fdc_id]
        for n in NUTRIENTS:
            if n not in values:
                gaps.append(f'{context}: {description} has no {n} (treated as 0)')
        return {n: values.get(n, 0.0) for n in NUTRIENTS}, [fdc_id]

    def resolve(dish_id, stack=()):
        if dish_id in results:
            return results[dish_id]
        if dish_id in stack:
            sys.exit(f'Circular dish reference: {" -> ".join(stack + (dish_id,))}')
        source = SOURCES[dish_id]

        if isinstance(source, USDA):
            values, refs = usda_values(source.fdc_id, dish_id)
            result = (values, 'usda_dish', refs, source.note)
        else:
            totals = {n: 0.0 for n in NUTRIENTS}
            refs, weight = [], 0.0
            for name, grams in source.ingredients.items():
                weight += grams
                if name.startswith('dish:'):
                    values, sub_refs = resolve(name[5:], stack + (dish_id,))[0], []
                elif name not in INGREDIENTS:
                    sys.exit(f'{dish_id}: unknown ingredient "{name}"')
                elif INGREDIENTS[name] is None:  # water
                    continue
                else:
                    values, sub_refs = usda_values(INGREDIENTS[name], f'{dish_id}/{name}')
                refs += sub_refs
                for n in NUTRIENTS:
                    totals[n] += values[n] * grams / 100
            cooked = source.cooked or weight
            values = {n: totals[n] * 100 / cooked for n in NUTRIENTS}
            result = (values, 'recipe_calc', sorted(set(refs)), source.note)

        results[dish_id] = result
        return result

    with open(os.path.join(HERE, 'nutrition.csv'), 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['id', *NUTRIENTS, 'source', 'usda_fdc_ids', 'note'])
        for dish_id in dish_ids:
            values, kind, refs, note = resolve(dish_id)
            writer.writerow([dish_id,
                             *[round(values[n]) if n in ('kcal', 'sodium_mg') else round(values[n], 1) for n in NUTRIENTS],
                             kind, ' '.join(map(str, refs)), note])

    # Compact copy bundled into the app (read-only reference data)
    app_foods = [{
        'id': d['id'],
        'name': d['name'],
        'category': d['category'],
        'cuisine': d['cuisine'],
        'diet': d['diet'],
        'portionUnit': d['portion_unit'],
        'portionGrams': float(d['portion_g']),
        'visualGroup': d['visual_group'],
        'per100g': {n: round(results[d['id']][0][n], 1) for n in NUTRIENTS},
    } for d in dishes]
    with open(APP_FOODS_JSON, 'w') as f:
        json.dump(app_foods, f, separators=(',', ':'))

    # Classifier output index -> (model label, our dish id or null)
    with open(os.path.join(HERE, 'aiy_food_V1_labelmap.csv')) as f:
        model_labels = [r['name'] for r in csv.DictReader(f)]
    with open(os.path.join(HERE, 'model_labels.csv')) as f:
        label_to_dish = {r['model_label']: r['dish_id'] for r in csv.DictReader(f)}
    bad_labels = [l for l in label_to_dish if l not in model_labels]
    bad_dishes = [d for d in label_to_dish.values() if d not in dish_ids]
    if bad_labels or bad_dishes:
        sys.exit(f'model_labels.csv: unknown model labels {bad_labels}, unknown dish ids {bad_dishes}')
    os.makedirs(os.path.dirname(APP_MODEL_LABELS_JSON), exist_ok=True)
    with open(APP_MODEL_LABELS_JSON, 'w') as f:
        json.dump([[label, label_to_dish.get(label)] for label in model_labels], f, separators=(',', ':'))

    kinds = [results[d][1] for d in dish_ids]
    print(f'Mapped {len(label_to_dish)} of {len(model_labels)} classifier labels onto {len(set(label_to_dish.values()))} dishes')
    print(f'Wrote {len(dish_ids)} dishes: {kinds.count("usda_dish")} direct USDA matches, {kinds.count("recipe_calc")} recipe calculations')
    for gap in sorted(set(gaps)):
        print('  note:', gap)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
