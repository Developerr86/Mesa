# Mesa

A local-first food journal for Android. Take a photo of your meal; Mesa recognises the dishes on the plate **on your phone**, estimates nutrition, and keeps a private photo history of what you ate. For packaged food, scan the barcode. No accounts and no cloud: your meals and photos stay on the device. The only network request is the barcode lookup, which sends just the barcode number to Open Food Facts.

> [!WARNING]
> **Personal use only. Not for commercial use.**
> Mesa's Indian food detector (`assets/models/food_detector.tflite`) was trained partly on [IndianFoodNet-30](https://universe.roboflow.com/indianfoodnet/indianfoodnet), whose images may only be used for non-commercial research. It was trained with [Ultralytics](https://github.com/ultralytics/ultralytics), which is AGPL-3.0. As a result, the app, and any APK built from this repository, may not be sold, used commercially, or shipped in a commercial product. See [Licences](#licences).

## What it does

- **Capture**: take a photo with the in-app camera.
- **Recognise every dish on the plate**: roti, dal, rice, sabzi, idli, chole, gulab jamun and 35 more Indian dishes, plus about 2,000 global dishes. Countable items are counted, so four idlis are filled in as "4 pieces".
- **Scan packaged food**: point the camera at a pack's barcode. Mesa looks it up on [Open Food Facts](https://world.openfoodfacts.org) and logs it by pack ("½ pack", "2 packs") or by serving for big packs, with the label's nutrition. Looked-up products are cached on the phone. A pack scanned offline is saved by its barcode and filled in the next time Mesa opens with a connection.
- **Check the photo first**: dark or blank photos and non-food photos get a gentle warning (with "Check for dishes anyway") instead of a confident wrong guess.
- **Fix anything quickly**: remove a dish, change portions (pieces, katoris, bowls), search 241 dishes, or add anything as a free-text **tag** ("Mango pickle from home").
- **Nutrition estimates**: kcal, protein, carbs and fat for the whole plate, from USDA FoodData Central.
- **Meal details**: meal type (preset from the time of day), home-cooked, takeout or dine-out, place, cost in ₹, and notes.
- **History**: a photo grid of past meals. Open one to view, edit or delete it.
- **Settings**: choose whether Mesa asks for a cost on home-cooked meals (off by default).

## How recognition works

All inference runs on the device with TensorFlow Lite ([`react-native-fast-tflite`](https://github.com/mrousavy/react-native-fast-tflite)). Each pass runs only if the previous one passed:

| Pass | Question | How |
|---|---|---|
| 0 | Is the photo usable? | Brightness and contrast check, no model |
| 1 | Is it food? | MobileNet V1 (ImageNet): total probability on food-related classes ≥ 0.4 |
| 2 | Which dishes, and how many? | **Mesa food detector** (YOLO11n, 42 Indian classes) finds and counts each serving; **AIY food_V1** checks the whole photo and 5 regions for global dishes. The results are merged per dish |

Dishes found with ≥ 50% confidence are added to the plate. Weaker guesses (≥ 10%) appear as "Also on the plate?" chips. The result is only a starting point: you can change everything before saving.

The detector scores 0.855 mAP50 on its held-out test set (roti 0.93, rice 0.92, sabzi 0.90, dal 0.88). Training data, per-class results, known limits and retraining steps are in [`data/food-detector/README.md`](data/food-detector/README.md).

## Install

Download `mesa-<version>.apk` from [Releases](https://github.com/Developerr86/Mesa/releases) and open it on your Android phone. You may need to allow installs from your browser or file manager. The APK is built for 64-bit ARM (`arm64-v8a`), which covers practically every current Android phone.

Release APKs are signed with the debug key from Expo's template. They're fine for installing on your own phone, but not for the Play Store.

## Development

Requirements: Node 20+, Android SDK, **JDK 17** (JDK 24+ breaks React Native's Android build), and an Android phone or emulator. Mesa uses native modules (TFLite), so it runs as an Expo **development build**, not in Expo Go.

```bash
npm install
npx expo run:android          # build and install the dev build (needed again only when native deps change)
npx expo start --dev-client   # day-to-day dev server
npx tsc --noEmit              # type-check
```

On emulators, the camera's shutter returns bundled sample photos, because virtual cameras only produce black frames.

The project uses **Expo SDK 57** (React Native 0.86). Use the versioned docs at https://docs.expo.dev/versions/v57.0.0/.

### Release APK

[`.github/workflows/android-release.yml`](.github/workflows/android-release.yml) builds a release APK on GitHub Actions. Run it from the Actions tab, with `gh workflow run android-release.yml`, or by pushing a `v*` tag. The APK is attached to the run as an artifact.

### Project layout

```text
App.tsx                        Screen switching, database provider, settings, Android back
src/components/                Surface Sheet and shared UI
src/features/
  home/                        Date, headline, Settings, history sheet
  capture/                     Camera and preview
  details/                     The "log this meal" form: items, tags, portions, recognition UI
  meal/                        Meal page: view, edit, delete
  meals/                       SQLite schema, migrations, meal + item storage
  foods/                       Dish database (generated), search, portions, nutrition maths
  recognition/                 The three recognition passes and their label maps
  products/                    Barcode lookup (Open Food Facts) and the on-phone product cache
  settings/                    Settings storage and screen
assets/models/                 TFLite models (see Licences)
data/food-db/                  Dish list, nutrition sources and build script
data/food-detector/            Detector training: dataset merge script, results, retraining
```

Data lives in SQLite (`mesa.db`): meals, the items on each meal, and cached barcode lookups. Photos are stored in the app's documents folder. Settings are kept in Expo's SQLite key-value store.

More docs:
- [`Mesa-build.md`](Mesa-build.md): product vision and roadmap
- [`DESIGN.md`](DESIGN.md): visual identity and the Surface Sheet
- [`HANDOFF.md`](HANDOFF.md): notes for contributors and agents
- [`data/food-db/README.md`](data/food-db/README.md): nutrition data and the classifier models

## Licences

| Component | Source | Licence |
|---|---|---|
| Mesa food detector (`food_detector.tflite`) | Trained here with Ultralytics YOLO11n on Indian_Food (Royal0wl), Thali (Calorie Detection) and IndianFoodNet-30 (Agarwal et al., 2023) | **Non-commercial.** IndianFoodNet images: non-commercial research only. Indian_Food and Thali: CC BY 4.0. Ultralytics: AGPL-3.0 |
| Dish classifier (`food_v1.tflite`) | Google AIY Vision food_V1 | Apache 2.0 |
| Food check (`mobilenet_v1_224_quant.tflite`) | Google MobileNet V1 | Apache 2.0 |
| Nutrition data | USDA FoodData Central | Public domain (CC0 1.0) |
| Packaged food data (looked up per barcode, not bundled) | Open Food Facts | Open Database License (ODbL) |

Attribution: *Indian_Food Dataset*, Royal0wl, Roboflow Universe, 2024. *Thali Dataset*, Calorie Detection, Roboflow Universe, 2023. *IndianFoodNet-30*, Agarwal, Bansal, Choudhury, Sarkar & Ahuja, Roboflow Universe, 2023. U.S. Department of Agriculture, Agricultural Research Service, FoodData Central, https://fdc.nal.usda.gov.

**Mesa is a personal project for personal use. It is not for commercial use** because of the detector model's training data. To use Mesa commercially, you would need to remove the detector or retrain it on licence-clean data with a permissively licensed toolkit.

Nutrition values are estimates for typical home recipes, not medical or dietary advice.
