# Mesa — Agent Handoff

Last updated: October 18, 2026

## Start here

Read these files before changing the app:

1. `AGENTS.md` — requires using the exact Expo SDK 57 documentation before writing code.
2. `Mesa-build.md` — product vision, roadmap, Phase 0 scope, and technical direction.
3. `DESIGN.md` — Mesa's visual identity and the Surface Sheet interaction model.
4. `data/food-db/README.md` — the food database, nutrition sources, the on-device classifier and their licences.

The authoritative Expo reference for this repository is:

https://docs.expo.dev/versions/v57.0.0/

## Product summary

Mesa is a local-first food journal. Its Phase 0 product loop is:

```text
Open → Capture food → Confirm details → Save → Browse history
```

That loop now works end to end. The roadmap originally kept AI out of Phase 0; the product owner chose to add a small **on-device** classifier that only pre-fills the details form (the app still works fully without it). Accounts, cloud sync, VLMs, recommendations and social features remain out of scope.

## Current implementation

**Home** — dynamic date; headline driven by saved meals ("3 meals on the table today."); Meal History sheet with a two-column photo grid (newest first, dish name + time).

**Capture** — `expo-camera` viewfinder with shutter animation, flash and haptics; preview with Retake / Confirm. In development builds on emulators/simulators (`__DEV__ && !Device.isDevice`) the shutter returns bundled sample food photos instead, because virtual cameras only produce black frames.

**Details sheet** — after Confirm, the photo sits on the canvas and a Surface Sheet holds the form:
- dish search over the food database (or "Use '…'" for a custom name)
- portion chips (counts for pieces/glasses, ½–2 for katoris/bowls/plates) and a live nutrition estimate
- meal type pre-selected from the time of day; Home-cooked / Takeout / Dine-out (+ place); cost (₹, optional); notes
- Save is pinned beside the title; ✕ discards; Retake returns to the camera

**On-device recognition** — on Confirm, the photo is center-cropped to 192×192 and run through Google's AIY food_V1 TFLite classifier (`react-native-fast-tflite`). Top guess ≥ 50% and mapped to a dish → pre-filled ("Recognised on this phone"); 10–50% → suggestion chips; all < 10% → "Couldn't recognise a dish". Unavailable in Expo Go (recognition quietly returns null).

**Storage** — SQLite (`mesa.db`, schema v3) via `SQLiteProvider`. Photos are copied from the cache into `Paths.document/meal-photos/`; only the file name is stored. Each meal stores a snapshot of its nutrition and the classifier's top guess + confidence (training data for later).

## File map

```text
App.tsx                               SQLiteProvider + screen switch (home / capture / details)
metro.config.js                       Bundles .tflite assets
src/theme.ts                          Colors, type, spacing, device radius
src/components/
  SurfaceSheet.tsx                    Peek/Revealed/Expanded sheet; initialSnap, ref.snapTo,
                                      dragFromHeaderOnly, titleAccessory, onExpandedChange
  screen.ts                           SCREEN_HEIGHT (true drawable height; see gotchas)
  CloseGlyph.tsx
src/features/
  home/HomeScreen.tsx                 Date, headline, history sheet
  history/MealHistoryGrid.tsx         Photo grid
  capture/CaptureScreen.tsx           Camera, preview, warms up the classifier
  capture/devSamplePhoto.ts           Emulator sample photos
  details/MealDetailsScreen.tsx       The details form + recognition UI
  meals/mealStore.ts                  Schema, migrations, saveMeal/listMeals, MealDetails type
  meals/useMeals.ts                   Loads/adds meals
  foods/foodDb.ts                     Search, portions, nutrition math
  foods/foods.json                    GENERATED food database (241 dishes)
  recognition/recognizeFood.ts        Model load, preprocessing, suggestions
  recognition/modelLabels.json        GENERATED model output index → [label, dish id]
assets/models/food_v1.tflite          AIY food_V1 (20 MB, Apache-2.0)
data/food-db/                         Food database source data and build script (see its README)
```

`foods.json` and `modelLabels.json` are generated — edit `data/food-db/` and run `build_nutrition.py` instead.

## Toolchain and dependencies

- Expo SDK `~57.0.30`, React Native `0.86.3`, React `19.2.3`, TypeScript `~6.0.3`
- Reanimated `4.5.1` + Worklets `0.10.1` (current SDK 57 pins — the old `0.10.0` pin crashed newer Expo Go builds; keep these matched to `npx expo install --fix`)
- Gesture Handler `~2.32.0`
- expo-camera, -haptics, -image, -sqlite, -file-system, -asset, -device, -image-manipulator, -status-bar, -dev-client
- `react-native-fast-tflite` + `react-native-nitro-modules`, `jpeg-js`
- **Android builds need JDK 17.** JDK 24+ (including Android Studio's bundled JDK 25) fails in `configureCMake` because prefab prints a "restricted method" warning that AGP treats as an error. Temurin 17 is installed per-user at `~/Library/Java/JavaVirtualMachines/jdk-17.0.20.1+1`.

## Running the app

Mesa uses native modules (TFLite), so it runs as an **Expo development build**. Expo Go still opens it, without recognition.

Build and install on the Pixel 5 (USB) — only needed when native dependencies change:

```bash
JAVA_HOME="$HOME/Library/Java/JavaVirtualMachines/jdk-17.0.20.1+1/Contents/Home" ANDROID_HOME=~/Library/Android/sdk npx expo run:android --device Pixel_5
```

Day to day, start the dev server and connect the phone over USB:

```bash
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client --port 8081
```

The Android emulator `TheSystemTest` (arm64) can run the same debug APK (`adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk`). Another app on that emulator (`com.appscelestial.thesystem`) can come to the front when Expo Go/Mesa is force-stopped; launch Mesa explicitly.

Type-check:

```bash
npx tsc --noEmit
```

Rebuild the food database / label map after editing `data/food-db/`:

```bash
python3 data/food-db/build_nutrition.py /path/to/usda-download-folder
```

`android/` and `ios/` are generated by prebuild and git-ignored. iOS has not been built since the native dependencies were added.

## Gotchas

- **Screen height:** on edge-to-edge Android, `Dimensions.get('window')` excludes the system bars. Use `SCREEN_HEIGHT` from `src/components/screen.ts` for full-screen layout, or the sheet's Expanded state stops short of the top.
- **Migrations:** add a new entry to `MIGRATIONS` in `mealStore.ts`; never edit an existing one. Each step runs in a transaction with its `user_version` bump.
- **Classifier limits:** no "not food" signal (its background class never fires — low confidence is the only hint); no labels for dosa, naan, roti or plain dal; no drinks; one label per photo.
- **Dev menu button:** development builds show a floating gear top-right that overlaps the Retake button. It is not present in release builds.

## Next work

1. Test recognition on real meals with the phone and tune the 50% / 10% thresholds.
2. Meal detail page (tap a history tile): view and edit all fields, delete a meal.
3. Barcode scanning for packaged food (`expo-camera` barcode scanning + Open Food Facts lookup, cached locally, queued when offline).
4. Retrain a classifier on the dish list's `visual_group`s (plus "not food" / "packaged"), using saved predictions vs. user corrections.
5. Make the history grid scroll inside the sheet (use `dragFromHeaderOnly` + a ScrollView, as the details sheet does).
6. Automated tests (food search/portions, migrations, suggestion ranking), accessibility, reduced motion, iOS build.
7. Decide whether `assets/models/food_v1.tflite` (20 MB) should move to Git LFS.

## Last verification (October 18, 2026)

- `npx tsc --noEmit` passes.
- Pixel 5 (Android 14), development build: home, camera, details sheet and recognition run; a non-food photo shows "Couldn't recognise a dish".
- Emulator, same build: sample ramen photo recognised at 94% and pre-filled (≈ 635 kcal / bowl), saved without errors; fresh install migrated 0 → 3.
- Expo Go on the emulator: v1 → v2 migration kept existing meals; full capture → details → save → history flow verified.
