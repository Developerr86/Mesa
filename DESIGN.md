# Mesa — Design Identity

*This document defines Mesa's visual language: color, surface behavior, motion, and typography. For product scope and roadmap, see `Mesa-build.md`. This doc exists so any screen anyone builds — human or agent — inherits the same visual instincts without having to re-derive them.*

---

## 1. The core visual idea

Mesa is built around a single recurring shape relationship: **a contrasting surface that shares the device's own corner radius.**

A near-black (or near-white) full-bleed canvas holds the "moment" — a hero photo, a camera viewfinder, a greeting, a stat. Rising from the bottom edge is a second surface, opposite in tone, whose top corners are rounded to *exactly* match the physical corner radius of the phone screen itself. The effect: the sheet doesn't feel like a UI element floating on top of the app — it feels like a second screen nested inside the first, built to the same geometry as the device holding it.

This is the identity. Almost everything else in this document exists to protect and extend that one idea.

Two tones only, per screen. Never introduce a third competing surface color on the same screen — the contrast *is* the design; diluting it with a middle gray flattens the effect.

---

## 2. Anatomy of the signature component: the Surface Sheet

The Surface Sheet is Mesa's primary interaction pattern — used for meal confirmation, meal detail, and any drill-down from a full-bleed canvas. It has three states:

### Peek
Sheet rests near the bottom, showing a small preview — a drag handle, maybe one line of content. This is the resting/idle state, signaling "there's more here" without demanding attention. Corner radius = full device radius (e.g. ~44px on modern flagships — match the actual device metrics, not an arbitrary design-token radius).

### Revealed
User drags or taps to bring the sheet to a natural content height — enough to show the primary task (confirm cost, view meal details) without covering the canvas entirely. The canvas above remains visible and *contextual* — you can still see the photo, the camera, the hero content the sheet refers to. Corner radius unchanged from Peek.

### Expanded (fullscreen takeover)
Continued drag, or a deliberate secondary gesture, extends the sheet the rest of the way until it consumes the entire screen. **As it approaches fullscreen, the corner radius animates down toward 0** — the sheet doesn't just get taller, it visually *becomes* the screen. This radius interpolation is the detail that sells the whole pattern; without it, "expanded" just looks like a sheet that grew, not a surface that took over.

Collapsing reverses the same path: radius re-appears as it shrinks back below fullscreen, canvas content beneath fades back into focus.

### Mechanics
- Spring physics throughout — no fixed-duration eases. The sheet should feel like it has mass and settles, not like it's playing a timeline.
- Gesture-driven and interruptible at every snap point (Peek / Revealed / Expanded). A user should be able to reverse a drag mid-motion and have the sheet track their finger immediately, not finish committing to wherever it was headed.
- Snap points resolve on release based on velocity + position, not just position — a fast flick should be able to jump straight from Peek to Expanded even if the finger only traveled a short distance.
- Haptic tick on each snap point crossing (Peek → Revealed → Expanded), not just on final release.
- In React Native, this maps to `react-native-reanimated` + `react-native-gesture-handler`: drive the sheet's `translateY` and a derived `borderRadius` off the same shared value, so radius and position are mathematically locked together rather than two animations that could drift out of sync.

---

## 3. Color

**Two tones per screen, chosen from a single near-black / near-white pair** — not pure `#000`/`#FFF` (too harsh, no depth in photography), but close: a warm near-black canvas (food photography reads warmer against warm-black than cool-black) and a warm near-white sheet.

- Canvas (the "moment" layer — camera, hero photo, greeting): dark.
- Sheet (the "task" layer — confirm, detail, list): light.
- This polarity is fixed, not screen-dependent. Dark is always where something is being *shown*; light is always where something is being *done* or *confirmed*. Don't invert it for variety — the user should learn the polarity within one use and never have to re-interpret it.

**One accent color, used sparingly**, reserved for: the capture action, the drag handle, and confirmation states. Everything else in both tones stays achromatic. Small semantic icon accents (a colored footstep icon, a moon glyph) are fine as inline flourishes within body text — see §4 — but should never compete with the one reserved accent used for actions.

No gradients as a base surface treatment. Flat two-tone contrast is the point; a gradient canvas (as in the messaging reference) is a valid *occasional* variant for a hero moment but should not become Mesa's default — it softens the sharp contrast that makes the pattern read instantly.

---

## 4. Typography

- **Hero numerals** (date, a primary stat) run large and bold, set apart from surrounding text — think "09" scaled dramatically larger than anything else on the canvas. Used sparingly, once per screen at most, for the single most important piece of information on that screen (today's date, a meal's cost, a running total).
- **Body copy on the canvas layer mixes weights within a single sentence** — regular weight for connective words, bold for the data points, with small inline glyphs standing in for units or categories (a calendar glyph before "3 meetings", a moon glyph before a sleep stat). This turns a status line into something scannable at a glance rather than read word-by-word — the eye catches the bold fragments and glyphs first.
- **Sheet layer typography stays quieter** — this is the "doing" surface, not the "impression" surface. Standard body weight, high information density is fine here (a list, a form), because the drama already happened on the canvas above.
- Two weights only across the whole app: regular and medium/bold. No in-between weights, no light weights — they read as indecisive against this much tonal contrast.

---

## 5. How this applies to Mesa's actual screens

**Home** — dark canvas carries the day's hero: most recent meal photo, or a greeting/summary in the mixed-weight inline style (§4) if no meal has been logged yet today. A Surface Sheet rests at Peek showing the meal history list; dragging it to Revealed shows more entries at comfortable density; dragging further to Expanded turns the history into the true "elegant photo gallery" full-screen browsing experience described in the product doc.

**Capture** — dark canvas *is* the camera viewfinder, full-bleed, minimal chrome. On shutter tap, a Surface Sheet rises from Peek directly to Revealed, carrying the confirm-details form (cost, place, source type) over the now-frozen photo. The photo itself stays visible above the sheet at Revealed height — the canvas is still contextual, not replaced.

**Meal detail** — opening a past entry from the history gallery brings its Surface Sheet straight to Expanded — full radius-to-zero transition — since detail viewing is a "doing" (or at least a "dwelling") task, not a passing glance.

The corner-radius-matches-device detail should hold on every Surface Sheet in the app, at Peek and Revealed. It's the signature; it should never be a one-off.

---

## 6. What this pattern is not

- Not a generic bottom sheet library default (no flat top edge, no arbitrary radius token disconnected from the device's actual geometry).
- Not a modal — nothing behind a Surface Sheet at Peek or Revealed should dim, gray out, or become inert. The canvas stays alive and visible; the sheet is additive, not a blocking overlay, until it reaches full Expanded state.
- Not decorative — every use of the pattern should correspond to a real state transition (idle → confirming, browsing → dwelling), not be added because it looks good in isolation.
