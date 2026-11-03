# Mesa food database

Reference nutrition for prepared (non-packaged) dishes. The same dish `id`s will be the classifier's labels, so a recognised dish maps straight to its nutrition.

| File | What it is |
|---|---|
| `dishes.csv` | The dish list: name, category, cuisine, diet, typical portion, and `visual_group` (dishes that look alike in a photo) |
| `sources.py` | Where each dish's numbers come from: a direct USDA match, or a home-style recipe in grams |
| `nutrition.csv` | Generated. Values per 100 g: kcal, protein, carbs, fat, fiber, sugars, sodium |
| `build_nutrition.py` | Regenerates `nutrition.csv` from `dishes.csv` + `sources.py` + the USDA data |
| `aiy_food_V1_labelmap.csv` | The on-device classifier's labels (see below) |
| `model_labels.csv` | Classifier label → dish `id` mapping |

## How the numbers are made

- **Direct USDA matches (`usda_dish`)** use USDA's FNDDS survey dishes, which include restaurant/takeout foods and some Indian dishes (dal, naan, samosa, biryani, dosa, palak paneer).
- **Recipe calculations (`recipe_calc`)** sum USDA ingredient data for a typical home recipe, then divide by the finished (cooked) weight. Most Indian dishes are built this way.
- Values are **estimates**. Oil, ghee and sugar vary a lot between kitchens and restaurants. Edit a recipe in `sources.py` and rebuild to adjust it.
- Proxies are noted in the `note` column (e.g. spinach for methi leaves, raw rice for poha, goat for "mutton").

## On-device food classifier

`assets/models/food_v1.tflite` is Google's AIY Vision Classifier **food_V1** (MobileNet V1, ~2,000 dishes; Apache License 2.0), downloaded unmodified from https://www.kaggle.com/models/google/aiy (TFLite › vision-classifier-food-v1). Its labels are in `aiy_food_V1_labelmap.csv` (from Google, same licence).

`model_labels.csv` maps the model's labels onto our dish `id`s. Only those labels produce a dish suggestion with nutrition; other labels are offered by name. Known limits of this model:

- It has no label for dosa, naan, roti/chapati or plain dal, and no drinks at all.
- Its `__background__` class does not fire on non-food photos, so it cannot tell "not food" by itself.
- It returns one label per photo (no multi-item plates).

Mesa's own Indian food detector (`data/food-detector`) covers the first and third: it finds roti, dal, rice, sabzi and 38 more classes, several per photo. The food/not-food check below covers the second.

## Food / not-food check

`assets/models/mobilenet_v1_224_quant.tflite` is Google's MobileNet V1 (224×224, quantized, ImageNet; Apache License 2.0), from https://storage.googleapis.com/download.tensorflow.org/models/tflite/mobilenet_v1_1.0_224_quant_and_labels.zip. Its labels are in `imagenet_labels.txt`. Recognition treats a photo as food when the model's probability on food-related ImageNet classes (`src/features/recognition/foodGateClasses.json`) reaches 0.4; on test photos food scored 0.55–0.99 and non-food 0.36 or less. ImageNet has no Indian dishes, so Indian plates score through classes like plate, soup bowl and bread — tune the threshold on real meals.

## Licensing

All data comes from **USDA FoodData Central**, which is public domain (CC0 1.0). USDA asks for attribution:

> U.S. Department of Agriculture, Agricultural Research Service. FoodData Central. https://fdc.nal.usda.gov

Indian Food Composition Tables (IFCT 2017, ICMR-NIN) and databases derived from them are **not** used: NIN's terms prohibit storing them electronically or building a product from them without written permission.

## Rebuilding

Download and unzip these from https://fdc.nal.usda.gov/download-datasets/ into one folder (about 10 MB zipped):

- `FoodData_Central_survey_food_json_2024-10-31.zip` (FNDDS 2021–2023)
- `FoodData_Central_sr_legacy_food_csv_2018-04.zip` (SR Legacy)
- `FoodData_Central_foundation_food_json_2026-04-30.zip` (Foundation Foods)

Then:

```bash
python3 build_nutrition.py /path/to/usda-folder
```

The script fails loudly if `sources.py` and `dishes.csv` fall out of sync, or if a referenced USDA ID or ingredient is missing.
