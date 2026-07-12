Last updated: 2026-07-06
# Scoring Model Spec

## Purpose

This app has two modeled outputs:

1. **Acute Insulin Demand** — per-meal relative insulin-demand score
2. **Chronic Insulin Load Trend** — rolling daily/weekly trend using DIL/DII-style aggregation

Nutrition estimation is an input layer. Insulin impact is the product output layer.

## Core principle

Use **Food Insulin Index (FII)** as the primary driver whenever available.

Why:
- FII measures postprandial insulin response to iso-energetic portions
- it captures insulin demand from carbs, protein, and some fats
- mixed-meal evidence suggests FII can outperform carb grams or glycemic load alone

## Acute scoring

### Per-item processing

For each item:
1. determine eaten energy (`kcal_item`)
2. resolve FII using this priority:
   - exact measured food match
   - mapped nearest measured food
   - macro fallback
   - unknown
3. compute `insulin_load_item`

### Item source labels

Each item must carry:
- `fii_source`: `exact_fii | mapped_fii | macro_fallback | user_confirmed | unknown`
- `why`: short explanation string

### Acute meal result

- `insulin_load_meal = sum(insulin_load_item)`
- `acute_score` = normalized relative meal score derived from `insulin_load_meal`
- also return visible meal nutrition totals (kcal, carbs, protein, fat)
#### Acute Score Definition

acute_score = (meal_insulin_load / reference_meal_insulin_load) * 100

Where:
- reference_meal_insulin_load is a fixed internal constant (30.0). It is an
  uncalibrated normalization reference, not a measured "typical meal"; the
  scoring code flags it as requiring calibration against real meal history.

Interpretation:
- 100 = the internal reference value (uncalibrated; not a percentage, not a
  maximum, and not a validated typical meal)
- <100 = lower relative insulin demand than the reference
- >100 = higher relative insulin demand than the reference (realistic mixed
  meals commonly exceed 100 with the current dataset)

### Important hierarchy

- FII is primary
- energy scaling is required
- protein and fat are modifiers/context
- GI/GL are optional context, not the main driver when FII exists

## Chronic scoring

Chronic trend should follow daily aggregation:

- `daily_dil = sum(FII-scaled item insulin loads for the day)`
- `daily_dii = daily_dil / total_daily_energy`
- compute rolling trends for 7 / 14 / 28 days

The backend should expose at least a 7-day trend endpoint.

## Fallback rules

If direct FII is unavailable:
1. attempt mapped FII from normalized/decomposed food
2. else use macro-based fallback
3. mark estimate quality clearly

Do not present fallback as equivalent to exact FII.

## Food normalization

Before scoring, normalize mixed dishes where possible.

Examples:
- `chicken biryani` -> `rice + chicken + oil`
- `fried rice` -> `rice + oil + protein/veg components`
- `layer cake` -> `cake base + frosting` if itemization exists

Store both:
- original user-facing meal name
- normalized/scored components

## UI rules

Keep these separate:
1. meal naming
2. nutrition estimate
3. insulin impact

### Nutrition estimate card
This card is only for pre-save nutrition guidance.
Do not show a raw confidence percent unless its meaning is explicitly defined.

### Insulin impact copy
Use copy such as:
- “We estimate nutrition first.”
- “Then we estimate insulin impact from FII and meal composition.”
- “When direct FII data is unavailable, we use a lower-confidence fallback.”

## Data contract requirements

### POST /meals
Client sends raw meal inputs only:
- meal name
- timestamp
- items[]
- editable nutrition fields if known

Backend computes:
- per-item kcal
- per-item insulin load
- meal insulin load
- acute score
- source quality labels
- explanation fields

### Provided-FII request boundary (POST /meals)

Scoring is split into two layers (decision: issue #44):

1. **Raw scoring core** — the deterministic scoring functions. They trust
   their inputs: any provided FII value, including `0`, is scored as
   `fii_source = "user_confirmed"` with confidence 1.0. The Rust crate's
   raw core deliberately preserves this behaviour as a parity layer
   against the backend raw scoring functions.
2. **Request boundary** — the layer that normalizes untrusted client
   input *before* it reaches the raw core. In the Python backend this is
   the `POST /meals` boundary (`normalize_non_positive_fii` in
   `backend/models.py` plus `resolve_positive_provided_fii` in
   `backend/api/meals.py`): non-positive and blank provided FII values
   (`0`, `"0"`, `""`, whitespace-only, negative, `null`) are neutralized
   to "not provided", and the item falls through to the deterministic
   lookup chain (`exact_fii` → `mapped_fii` → `macro_fallback` →
   `unknown`). Only a positive provided FII becomes
   `fii_source = "user_confirmed"` with confidence 1.0.

Request field contract:

- **`fii` is the canonical request field.** The frontend and all future
  clients must send `fii`, not `fii_value`.
- **`fii_value` is deprecated in place** as a legacy compatibility
  alias. The backend continues to accept it (and currently resolves it
  ahead of `fii`), and it remains covered by the trust-boundary tests
  (`backend/tests/test_ai_fii_trust_boundary.py`), but no client should
  send it. Deprecation here changes documentation and intent only — not
  behaviour.
- **Removing `fii_value` from the request contract is a breaking change**
  and requires its own separately approved issue/PR. It is not
  authorized by this deprecation.

For clients that bypass HTTP (future UniFFI/Kotlin/Swift callers of the
Rust core), the equivalent normalization must come from the shared Rust
request-boundary wrapper, not from per-client reimplementations. See
"Raw scoring core versus request boundary" in
`docs/target-architecture.md`.

### GET /meals
Returns raw + derived fields.

### GET /metrics/chronic
Computes chronic trend from meal history, not from client-submitted scores.

## Must-store fields

Per item:
- original_name
- normalized_name (optional)
- quantity
- unit
- kcal
- carbs_g
- protein_g
- fat_g
- sat_fat_g (if known)
- gi (optional)
- fii_value (if known; this is the *stored* per-item field, distinct
  from the deprecated `fii_value` request alias described above)
- fii_source
- why
- insulin_load_item

Per meal:
- meal_name
- meal_estimate fields if AI-generated
- insulin_load_meal
- acute_score
- estimate_quality
- main_insulin_drivers[]
