Last updated: 2026-03-23

# Scientific Validation Plan — Insulin App

## Purpose

This document defines:

- what the system claims
- what it does not claim
- which parts are grounded in empirical research
- which parts are product-level assumptions
- how the system will be validated internally and externally

The goal is to ensure the system evolves from **scientifically grounded** to **scientifically validated**.

---

## System Definition

This system is a **population-level, physiology-informed estimator of insulin demand from food composition**.

It provides:

- **Acute estimate** — relative insulin demand of a single meal
- **Chronic estimate** — rolling dietary insulin demand trend (DIL/DII-based)

It does not measure actual physiological response.

---

## Scientific Foundations

### 1. Food Insulin Index (FII)

Derived from controlled experimental studies measuring postprandial insulin response to iso-energetic food portions (~240 kcal).

Key properties:
- Captures insulin demand from protein and fat, not only carbohydrates
- Provides a more complete basis for insulin estimation than glycemic index alone

Role in system: primary driver for item-level insulin load calculation when a direct or mapped FII value is available.

---

### 2. Mixed Meal Approximation

Meal insulin load is approximated as the sum of item-level loads:

```
meal_insulin_load = Σ(item_insulin_load)
```

**Status:** Supported by the literature as a reasonable population-level approximation. Known to have interaction limitations (e.g., protein–fat–carbohydrate co-ingestion effects are not fully captured).

---

### 3. Chronic Model (DIL / DII)

- **Daily Insulin Load (DIL):** sum of item-level insulin loads across all meals in a day
- **Dietary Insulin Index (DII):** `daily_dil / total_daily_energy`

Role in system: longitudinal tracking of dietary insulin exposure via rolling 7-day DIL and DII trends.

---

## Product-Level Assumptions

These are decisions made for usability or practical modeling. They are not directly derived from empirical data.

### 1. Reference Meal Normalization

```
acute_score = (meal_insulin_load / reference_meal_insulin_load) × 100
```

A score of 100 represents the insulin demand of a typical mixed meal used as a fixed reference baseline.

**Status:** The reference value is a normalization constant chosen for interpretability, not a biological constant. It requires calibration against representative meal data and should be documented when updated.

---

### 2. Fallback Hierarchy

When a direct FII value is unavailable, the system falls back in order:

1. Mapped FII (nearest measured food or weighted decomposition)
2. Macro-based estimation (GI, carbs, protein)
3. Unknown (zero-confidence placeholder)

**Status:** Partially empirical (mapped FII), partially heuristic (macro fallback). Each level is labeled with a standardized source tag (`exact_fii`, `mapped_fii`, `macro_fallback`, `unknown`) and a plain-language explanation.

---

### 3. Interpretation Layer

User-facing output phrases (e.g., "may feel steady", "may feel heavy", "may feel sluggish or hungry later") are derived from the acute score and estimate quality.

**Status:** Based on general metabolic and satiety literature. Not individually predictive. Presented as estimates, not clinical findings.

---

## Non-Claims

The system does **not**:

- predict exact glucose spikes
- predict exact insulin levels
- model individual physiology
- replace CGM or clinical measurement
- provide medical diagnosis or advice

---

## Internal Validation Plan

### 1. FII Coverage Audit

Track the distribution of FII sources across saved meals:

| Source | Goal |
|---|---|
| `exact_fii` | Maximize |
| `mapped_fii` | Acceptable |
| `macro_fallback` | Minimize |
| `unknown` | Minimize, always surfaced to user |

---

### 2. Meal Ranking Consistency

Verify that the acute score correctly orders meals by expected insulin demand across representative test cases.

Example ordering:
```
refined-carb meal > balanced mixed meal > low-carb meal
```

Goal: correct relative ordering across known-profile meals, not exact score values.

---

### 3. Chronic Trend Sanity

Simulate two dietary scenarios and verify DIL/DII behavior:

- Repeated high-insulin meals → rising rolling DII
- Sustained low-insulin meals → falling rolling DII

Goal: DIL and DII respond monotonically to diet quality changes.

---

### 4. Uncertainty Propagation

Verify that estimation quality degrades gracefully:

- Low-quality or sparse inputs → `estimate_quality: low` or `unknown`
- UI reflects uncertainty appropriately (no false precision)
- Fallback paths are always labeled, never silently promoted

---

### 5. Backend/Frontend Contract Integrity

Verify that:

- the frontend does not recompute scores independently
- the backend is the sole source of truth for all scored fields
- all values displayed in the UI map to explicit backend response fields

---

## External Validation Plan

### Phase 1 — Structured Meal Testing

Compare system outputs against known FII literature values for common meals. Test score consistency across repeated inputs of the same meal type.

### Phase 2 — User Outcome Feedback

Collect self-reported post-meal outcomes:

- "felt steady"
- "felt heavy or tired"
- "felt hungry soon after"

Goal: assess whether predicted acute demand correlates with perceived outcomes at a population level.

### Phase 3 — Sensor Integration (CGM)

Collect paired meal logs and continuous glucose curves. Use this data to:

- assess how well the acute score predicts glycemic response
- build meal + context → glucose response models

Goal: move from estimation to prediction, conditioned on physiological outcome data.

---

## Evaluation Criteria

The system is considered scientifically stronger when:

- FII coverage is high and fallback usage is low
- fallback usage is transparently surfaced to the user
- meal ranking is consistent with expected insulin demand
- chronic trends respond logically to diet changes
- uncertainty is clearly communicated at every level
- no overclaiming occurs in copy, scoring, or UI

---

## Guiding Principle

Maintain a strict separation between two stages:

| Stage | Basis | Current status |
|---|---|---|
| **Estimation** | Known population-level physiology (FII, DIL, DII) | Implemented |
| **Prediction** | Individual physiological outcome data (CGM, biomarkers) | Future work |

---

## Summary

This system is:

- grounded in empirical insulin-response research (FII)
- extended to meals via additive load modeling
- normalized for usability via a reference meal baseline
- scaled to longitudinal trends via DIL/DII aggregation

It is not yet a personalized predictive system. That is treated as a future validation problem, contingent on collecting physiological outcome data, not an assumed capability of the current model.
