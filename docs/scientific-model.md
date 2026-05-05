Last updated: 2026-03-21
# Insulin Impact Model — Scientific Basis

## Overview

This system estimates the **insulin demand of meals** using established physiological research, primarily the Food Insulin Index (FII), and extends it to mixed meals and longitudinal patterns.

It is designed as a **population-level, physiology-informed estimation model**, not a direct measurement of individual insulin response.

---

## Core Principles

### 1. Food Insulin Index (FII)

The model is based on the Food Insulin Index, which measures the **postprandial insulin response to foods under iso-energetic conditions (~240 kcal portions)**.

Key implications:

- Insulin response is not determined by carbohydrates alone
- Protein and fat contribute to insulin secretion
- Foods with identical calories can produce different insulin responses

This provides a **more complete representation of insulin demand than glycemic index/load alone**

---

### 2. Meal Insulin Load (Acute Model)

For a given meal:

- Each food item contributes an **insulin load**
- Meal insulin load is approximated as the **sum of item-level insulin loads**
- Acute score is a relative index of meal insulin demand, normalized against a fixed reference meal baseline.

A score of 100 represents the insulin demand of a typical mixed meal.
“Typical meal” refers to an average mixed meal in common dietary patterns, used as a normalization reference rather than a strict physiological constant.
This normalization is for interpretability and comparison only, not a direct physiological measurement.

```text
meal_insulin_load = Σ(item_insulin_load)
```

### 3. Non-goals

This system does NOT:
- predict exact glucose or insulin spikes
- personalize responses without physiological data
- replace CGM or medical diagnostics
