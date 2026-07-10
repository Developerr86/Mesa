# Mesa
*A food journal that earns the right to become your meal companion.*

---

# Build Plan

> **Current Status:** Phase 0 — Foundation
>
> Mesa is intentionally beginning life as a beautifully crafted food journal.
> The long-term ambition is much larger, but the product will only grow once every existing interaction feels polished enough to deserve another feature.

---

# Product Vision

Most food apps ask users to become accountants.

Calories.
Macros.
Weights.
Measurements.
Databases.

Mesa starts somewhere much simpler.

People naturally take photos of their food.

Mesa turns those moments into a beautiful personal food history with almost no friction.

Over time, that history becomes the foundation for answering a much harder question:

> **"What should I eat next?"**

That intelligence is earned—not assumed.

The recommendation engine should exist because people genuinely enjoy using Mesa every day, not because they are forced to fill in spreadsheets.

---

# Guiding Principles

## 1. Polish before features

Every interaction should feel intentional.

A smaller feature set with excellent execution is more valuable than dozens of unfinished ideas.

Motion, spacing, typography, haptics, and transitions are first-class product features.

---

## 2. Friction is the enemy

Logging a meal should take seconds.

The application should infer whenever possible.

The user should mostly confirm—not type.

---

## 3. Progressive Intelligence

Mesa should feel complete before any AI exists.

AI is an enhancement layer.

Never a requirement.

---

## 4. Build slowly

Features are earned.

Do not begin the next phase until the current one genuinely feels finished.

---

## 5. Design for evolution

Every architectural decision should make future intelligence easier to add without requiring major rewrites.

---

# Product Roadmap

---

# Phase 0
## Beautiful Food Journal

Current development target.

Goal:

Create the most enjoyable way to remember what you ate.

Core loop:

```
Open App

↓

Capture Food

↓

Confirm Details

↓

Save

↓

Beautiful History
```

This phase intentionally solves only one problem:

> "I want to remember this meal."

---

## Features

### Camera Capture

- Native-feeling camera experience
- Minimal UI
- Instant capture
- Responsive shutter animation
- Haptic feedback
- Full-screen preview

---

### Meal Details

Required

- Photo
- Cost
- Timestamp

Optional

- Restaurant / Place
- Home cooked / Takeout / Dine Out
- Notes

Future-ready fields

- Nutrition
- AI tags
- Meal rating

---

### History

The history screen is the product.

It should feel closer to an elegant photo gallery than a database.

Focus on:

- large photography
- generous spacing
- smooth scrolling
- spring animations
- delightful transitions

Browsing old meals should feel enjoyable.

---

### Search

Simple search.

Search by

- restaurant
- location
- month
- tags

Nothing more.

---

### Local-first

No accounts.

No login.

No cloud sync.

The app should work offline from day one.

---

# Phase 1
## Smart Logging

Goal:

Reduce the amount of information users need to enter manually.

Features:

- Location detection
- Restaurant lookup
- Automatic timestamps
- Smart place suggestions
- Remember previous meals
- Frequently visited places

The user begins confirming information instead of entering it.

---

# Phase 2
## AI Vision

The first intelligent layer.

The user still captures food exactly the same way.

Mesa simply becomes smarter afterwards.

Possible features

- Food recognition
- Meal labels
- Estimated calories
- Estimated macros
- Ingredient detection
- Confidence score

The logging experience should never become slower because AI exists.

---

# Phase 3
## Personal Food History

Mesa now understands patterns.

Examples

- Most visited restaurants
- Weekly spending
- Favorite meals
- Eating trends
- Meal frequency
- Time-of-day habits

Still no recommendations.

Only understanding.

---

# Phase 4
## Meal Recommendations

Mesa finally answers

> "What should I eat?"

Recommendations should balance

- nutrition
- budget
- convenience
- personal habits

Initially this should be entirely rules-based.

The reasoning should remain understandable.

Example

"You've eaten out three times this week and you're under your protein goal.

Cooking at home tonight saves ₹350 and improves today's nutrition."

---

# Phase 5
## Personal AI Companion

Only after Mesa already works well.

Possible capabilities

- conversational food history
- meal planning
- shopping suggestions
- budget coaching
- nutrition coaching
- grocery recommendations

AI becomes a natural extension of the history already collected.

---

# Future Ideas

Not commitments.

Only possibilities.

---

## Grocery Tracking

Maintain pantry inventory.

Suggest meals from available ingredients.

---

## Budgeting

Monthly food spending.

Restaurant breakdown.

Average meal cost.

Savings insights.

---

## Health

Protein trends.

Calorie trends.

Nutrition balance.

Hydration.

Weight integration.

---

## Wearables

Apple Health

Health Connect

Galaxy Watch

Apple Watch

Meal reminders.

---

## AI Memory

Remember

- favorite meals
- disliked foods
- allergies
- dietary goals

Recommendations improve naturally over time.

---

## Collections

Favorite meals.

Trips.

Restaurants.

Date nights.

Recipes.

---

# Explicit Non-Goals

For the foreseeable future Mesa is NOT:

- a calorie-counting app
- MyFitnessPal competitor
- social network
- recipe platform
- food delivery app

Those products already exist.

Mesa exists to build a beautiful history first.

Everything else grows from that history.

---

# Technical Direction

Framework

- React Native
- TypeScript

Primary Philosophy

- Native feeling over pixel-perfect sameness
- Respect both Android and iOS conventions
- Heavy use of gestures and spring animations

Storage

- Local-first database
- Future sync support
- Offline by default

Architecture

Feature-based.

Each feature should remain isolated and replaceable.

Example

Camera

↓

Storage

↓

History

↓

AI

↓

Recommendations

Each layer builds on the previous one.

---

# Success Criteria for Phase 0

Before building any AI:

✓ Logging a meal feels delightful.

✓ The app launches quickly.

✓ Capturing food takes only a few seconds.

✓ Every animation feels intentional.

✓ Browsing history feels like browsing memories.

✓ The user enjoys opening Mesa even when they don't need statistics.

Only once these goals are met should Mesa move beyond being a beautiful food journal.