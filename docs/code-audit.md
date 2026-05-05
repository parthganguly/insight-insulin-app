Last updated: 2026-03-21
# Code Audit Summary

## Critical Issues (must fix first)

1. Chronic scoring does not follow DIL/DII model
2. Missing item-level explanation (`why`) and standardized source labels
3. Frontend and backend scoring logic diverge
4. UI mixes nutrition estimate with insulin-impact semantics

## Goal

Align implementation with docs/scoring-model.md using backend-first changes.
 Findings

  1. High: Chronic scoring implementation does not match the spec’s daily_dii = daily_dil / total_daily_energy model. The backend /
     metrics/chronic endpoint in main.py:70 aggregates only insulin_load_total, computes a 7-day moving average of that raw total,
     then feeds it into compute_acute_score(). The frontend chronic score in utils.ts:5 is a separate heuristic based on GI, carbs,
     sat fat, and kcal, not daily DIL/DII at all. This is the largest spec mismatch because the spec explicitly requires chronic
     trend from daily DIL and daily energy.
  2. High: Required item source labels are incomplete. The spec requires each item to carry fii_source and why, with constrained
     labels like exact_fii | mapped_fii | macro_fallback | user_confirmed | unknown. The backend stores only fii_source and
     confidence in db_models.py:45, and returns only fii_source in api/meals.py:15. No why field exists in models, DB, or API, and
     the current labels (provided, fii_lookup, weighted_decomposed_fii_lookup, gi_carb_protein_fallback, gi_carb_fallback,
     macro_fallback, insufficient_data_fallback) do not match the spec taxonomy in scoring-model.md:23.
  3. High: GET /meals does not return the visible meal nutrition totals required by the spec. The spec says acute meal results should
     also return visible meal totals and GET /meals should return raw + derived fields. The backend MealResponse in models.py:80
     returns id, created_at, meal_name, items, insulin_load_total, and acute_score, but not meal-level kcal/carbs/protein/fat totals,
     estimate quality, or main insulin drivers.
  4. Medium: Food normalization is used transiently for scoring but normalized/scored components are not stored.
     compute_weighted_decomposed_insulin_load() in scoring_service.py:11 decomposes mixed dishes and applies weighted FII, but the DB
     schema in db_models.py:32 has no original_name, normalized_name, normalized component storage, why, or main_insulin_drivers[].
     This misses the spec’s “store both original user-facing meal name and normalized/scored components.”
  5. Medium: Acute score normalization is underspecified relative to the spec. The current backend acute score in
     scoring_service.py:147 is simply (insulin_load_total / effective_tdee) * 100. The spec says acute score is a normalized relative
     meal score derived from insulin_load_meal, but does not define TDEE normalization explicitly. The implementation may be
     acceptable, but because the spec emphasizes meal-relative insulin demand and not TDEE dependence, this needs explicit
     reconciliation in the doc or code comments.
  6. Medium: Preview UI mixes nutrition-estimate semantics with scoring semantics. The pre-save “Estimated Meal Nutrition” card in
     PreviewMeal.tsx:368 shows a raw confidence percent from the AI estimate, while the backend uses a separate item-level confidence
     for FII/fallback quality in scoring_service.py:81. The spec explicitly says not to show a raw confidence percent unless its
     meaning is defined, and to keep meal naming, nutrition estimate, and insulin impact separate.
  7. Medium: Frontend fallback scoring still exists independently of backend-derived scores. calculateAcuteScore() in utils.ts:22
     uses backend meal.acute_score if present, but otherwise computes a local FII-weighted calorie average. calculateChronicScore()
     in utils.ts:5 is entirely frontend heuristic logic. The spec says chronic trend should come from backend meal history
     computations, not client-submitted or client-derived scores.
  8. Low: The backend stores fii as an integer on MealItemDB in db_models.py:43, but the spec’s required field is fii_value (if
     known). This is mostly naming, but it affects API clarity and source-quality semantics.

  1. Exact backend files involved

  - scoring_service.py
  - api/meals.py
  - main.py
  - models.py
  - db_models.py
  - food_normalizer.py
  - fii_lookup.py

  2. Exact frontend files involved

  - utils.ts
  - PreviewMeal.tsx
  - AiMealAdd.tsx
  - api.ts
  - Meal.ts
  - AcuteScoreProgressbar.tsx
  - Dashboard.tsx
  - Meals.tsx

  3. Current acute scoring logic

  Backend source of truth after save:

  - kcal_item = quantity * kcalPerUnit in api/meals.py:72
  - per-item insulin load is computed by compute_insulin_load_item() in scoring_service.py:70
  - meal insulin load is sum(insulin_load_item) in api/meals.py:77
  - acute score is (insulin_load_total / effective_tdee) * 100 in scoring_service.py:147

  Frontend:

  - display uses backend meal.acute_score when present in utils.ts:22
  - otherwise falls back to local sum(item.fii * item.amount * item.kcalPerServing) / totalKcal in utils.ts:28

  Mismatch with spec:

  - acute path does use FII as primary driver, which aligns
  - but the client-side fallback acute formula is not described in the spec and can diverge from backend scoring

  4. Current chronic scoring logic

  Backend /metrics/chronic:

  - sums meal.insulin_load_total per day in main.py:87
  - computes 7-day moving average of raw daily insulin load in main.py:95
  - converts the latest moving average to current_chronic_score using compute_acute_score() in main.py:109

  Frontend dashboard:

  - ignores backend chronic endpoint
  - computes a custom chronic score from GI, carbs, sat fat, and kcal in utils.ts:5

  Mismatch with spec:

  - spec requires daily_dil, daily_dii = daily_dil / total_daily_energy, and rolling 7/14/28-day trends
  - current backend only exposes a 7-day moving average of raw insulin load
  - current frontend uses a separate non-DIL/DII heuristic

  5. Where FII is used today

  Backend:

  - explicit FII path in scoring_service.py:85
  - lookup FII path in scoring_service.py:102
  - mixed-dish weighted decomposition with FII lookup in scoring_service.py:92
  - lookup implementation lives in fii_lookup.py

  Frontend:

  - AI draft items store fii in AiMealAdd.tsx:99
  - saved meals hydrate fii from backend response in PreviewMeal.tsx:75
  - local fallback acute score uses fii in utils.ts:28
  - UI also displays FII as item.fii * item.amount in PreviewMeal.tsx:513, which is not a spec-defined user-facing metric

  6. Where fallback logic is used today

  Backend fallback hierarchy is in scoring_service.py:70:

  - explicit FII
  - weighted decomposed FII for mixed meals
  - direct FII lookup
  - second decomposition attempt
  - GI + carb (+ protein) fallback
  - macro fallback
  - insufficient-data fallback

  Mismatch with spec:

  - spec says fallback order is mapped FII -> macro fallback -> unknown
  - current code adds GI/carb fallback as an intermediate path, which is not in the doc
  - current code returns several internal fallback labels not reflected in the spec

  Frontend:

  - no explicit fallback-quality messaging beyond raw source display in modal and raw confidence % on estimate card

  7. Whether source-quality labels exist

  Partially.

  Existing:

  - backend stores and returns fii_source in db_models.py:49 and api/meals.py:31
  - frontend surfaces source on saved items in PreviewMeal.tsx:346

  Missing / mismatched:

  - no why
  - no estimate_quality
  - no main_insulin_drivers[]
  - source labels are not normalized to the spec’s allowed set
  - AI draft items default source: "ai" in AiMealAdd.tsx:98, which is unrelated to FII source quality

  8. Whether the preview UI incorrectly mixes nutrition estimate and insulin-impact semantics

  Yes.

  Evidence:

  - pre-save meal header can show total calories from meal_estimate via utils.ts:65, while item cards and later save logic rely on
    item sums
  - preview shows a raw confidence percent for the AI nutrition estimate in PreviewMeal.tsx:406, but that number is only the AI’s own
    meal-estimate confidence from services.py:51
  - backend scoring confidence is a different item-level concept from scoring_service.py:98
  - the spec explicitly says to keep meal naming, nutrition estimate, and insulin impact separate, and not to show raw confidence
    percent unless meaning is defined

  File-by-file recommendation:

  - PreviewMeal.tsx: separate pre-save nutrition guidance copy from post-save insulin-impact copy; do not reuse “confidence” loosely
  - AiMealAdd.tsx: keep estimate metadata clearly typed as nutrition-only
  - Meal.ts: distinguish nutrition estimate quality from scored item source-quality fields if retained

  9. Safest implementation order

  1. Backend data contract first.

  - Align MealItemResponse, DB schema, and /meals outputs with the spec: add why, normalize fii_source labels, add meal-level derived
    totals, and decide how estimate_quality / main_insulin_drivers[] are represented.
  - Files: models.py, db_models.py, api/meals.py, scoring_service.py

  2. Chronic model alignment second.

  - Replace the current backend chronic endpoint with DIL/DII-based daily aggregation and rolling 7/14/28 series.
  - Remove or deprecate the frontend heuristic chronic calculation once backend output exists.
  - Files: main.py, utils.ts, Dashboard.tsx

  3. Frontend acute/chronic fallback cleanup third.

  - Stop computing independent scoring heuristics on the client where backend-derived fields exist.
  - Files: utils.ts, AcuteScoreProgressbar.tsx

  4. Preview semantics cleanup last.

  - Separate nutrition estimate UI from insulin-impact UI and replace ambiguous confidence messaging.
  - Files: PreviewMeal.tsx, AiMealAdd.tsx

  If you want, I can turn this into a concrete implementation checklist next, grouped by backend schema/API, scoring logic, and
  frontend UI.
