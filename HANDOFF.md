# Mesa — Agent Handoff

Last updated: July 10, 2026

## Start here

Read these files before changing the app:

1. `AGENTS.md` — requires using the exact Expo SDK 57 documentation before writing code.
2. `Mesa-build.md` — product vision, roadmap, Phase 0 scope, and technical direction.
3. `DESIGN.md` — Mesa's visual identity and the Surface Sheet interaction model.

The authoritative Expo reference for this repository is:

https://docs.expo.dev/versions/v57.0.0/

## Product summary

Mesa is a local-first food journal. Its Phase 0 product loop is:

```text
Open → Capture food → Confirm details → Save → Browse history
```

The long-term product may add smarter logging, vision, personal insights, and meal recommendations, but those are explicitly later phases. The current priority is a polished, low-friction journal and photo history.

## Current implementation

The application currently implements the visual foundation and empty home state only:

- The home canvas uses Mesa's warm near-black tone.
- The date is generated from the device's current date; no date text is hard-coded.
- A first-use empty state replaces the old mock meal count and spending summary.
- The Surface Sheet starts at its Peek snap point and can be dragged to Revealed or Expanded.
- The sheet contains a deliberate empty-history state.
- Reanimated drives the sheet position and corner-radius interpolation.
- Gesture Handler handles dragging, and Expo Haptics ticks across snap states.
- There is no meal persistence, camera flow, meal creation, or navigation yet.
- The three food images under `assets/` are currently unused legacy mock assets.

The Expo Go settings gear is not rendered by Mesa. It is development chrome injected by Expo Go. It cannot be removed from React Native application code. It will not appear in a standalone/native Mesa build.

## File map

```text
App.tsx
  Wraps the app in GestureHandlerRootView and renders HomeScreen.

src/theme.ts
  Shared colors, type sizes/weights, spacing, and device-radius token.

src/components/SurfaceSheet.tsx
  Gesture-driven Peek/Revealed/Expanded sheet with spring motion,
  haptics, and radius interpolation.

src/features/home/HomeScreen.tsx
  Dynamic date, empty canvas state, and empty meal-history state.

app.json
  Expo config. Android application ID: com.mesa.foodjournal.
```

## Toolchain and dependencies

- Expo SDK `~57.0.4`
- React Native `0.86.0`
- React `19.2.3`
- TypeScript `~6.0.3`
- React Native Reanimated `4.5.0`
- React Native Worklets `0.10.0`
- React Native Gesture Handler `~2.32.0`
- Expo Camera, Haptics, Image, SQLite, and Status Bar SDK 57 packages

`react-native-worklets` must stay pinned to `0.10.0`. Expo Go crashed in native Worklets/Hermes code when the transitive `0.10.2` package was used. SDK 57's bundled module list pins Worklets to `0.10.0`.

## Running the app

Install dependencies:

```powershell
npm.cmd install
```

Type-check:

```powershell
npx.cmd tsc --noEmit
```

Run in Expo Go:

```powershell
npm.cmd start -- --port 8082
```

Port `8081` was occupied on the development machine by an unrelated Expo SDK 54 project. Opening that server in Expo Go produces a misleading SDK mismatch message. Mesa resolves to SDK `57.0.0` and was successfully verified on a Pixel 5 running Android 14 through port `8082`.

For USB access to port 8082:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:8082 tcp:8082
```

Then open `exp://127.0.0.1:8082` in Expo Go.

## Native Android build status

`npx expo prebuild` generated an `android/` directory locally. The directory is intentionally ignored by `.gitignore`, so it is not part of the repository and can be regenerated from `app.json`.

A local release build was started to demonstrate the app without Expo Go's settings gear, but the long first Gradle compilation was cancelled before it produced an APK. Do not assume a release APK exists. To retry:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
npx.cmd expo run:android --variant release --no-bundler
```

## Known limitations and next work

1. Implement the camera capture flow with `expo-camera`.
2. Define a Meal data model and persist it locally with `expo-sqlite`.
3. Replace the always-empty home screen with data-driven empty and populated states.
4. Add the confirm-details Surface Sheet after capture.
5. Add an actual history gallery and meal-detail state.
6. Add automated tests for date formatting, empty states, and Surface Sheet behavior.
7. Test accessibility, reduced motion, smaller screens, and iOS safe areas.

Keep Phase 0 narrow. Do not add accounts, cloud sync, AI, calorie tracking, recommendations, or social features yet.

## Last verification

- `npx tsc --noEmit` passed after the empty-state implementation.
- Expo config resolved to SDK `57.0.0`.
- Mesa rendered successfully on the connected Pixel 5.
- The dynamic date displayed correctly as `Friday, July` on July 10, 2026.
- The empty canvas and Meal History sheet rendered without a runtime crash.
