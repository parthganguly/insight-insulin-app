Last updated: 2026-03-21
# Claude Review Brief — Insulin App

## Purpose

This file gives Claude Code the current system direction, what has already been changed, and what to review next.

Claude Code should treat this as a review/audit brief, not a prompt to redesign the app from scratch.

---

## Product Intent

This app is a **population-level, physiology-informed insulin-demand estimator**.

It is **not**:
- a CGM
- a direct insulin measurement tool
- a clinically validated individualized spike predictor

It is intended to:
- estimate meal insulin demand using Food Insulin Index (FII) logic
- estimate chronic dietary insulin load using DIL/DII-style aggregation
- translate results into plain-language guidance for users

See:
- `docs/scientific-model.md`
- `docs/future-model-roadmap.md` (or equivalent future-scaling doc)

---

## Scientific Direction

### Acute model
- meal insulin load is derived from item-level insulin load
- acute score is now **meal-relative**, not TDEE-relative
- acute score uses a **reference meal baseline**
- this is a relative product index, not a direct physiological measurement

### Chronic model
- chronic output is based on:
  - `daily_dil`
  - `daily_dii = daily_dil / total_daily_energy`
- rolling chronic trends come from backend, not frontend heuristics

### Source-quality honesty
Each meal/item should preserve:
- `fii_source`
- `why`
- `estimate_quality`
- `main_insulin_drivers`

Uncertainty must not be overstated.

---

## What Has Already Been Done

### Backend
Completed:
- chronic model aligned to DIL/DII direction
- acute score normalization moved away from TDEE
- source labels standardized
- `why` added
- `estimate_quality` constrained
- meal totals added
- backend returns meal-level derived fields consistently

### Frontend
Completed:
- local acute/chronic scoring removed
- frontend uses backend-derived acute/chronic fields
- pre-save AI flow remains nutrition-only
- raw nutrition confidence percentage removed from preview UI
- saved meals now show a plain-language post-save block:
  - “How This Meal May Feel”
  - based on backend `acute_score`, `estimate_quality`, `main_insulin_drivers`, and `why`
- saved meal rows no longer prominently expose raw FII/GI values

---

## Current UX Semantics

### Pre-save
This stage is for:
- meal naming
- nutrition estimate review
- manual editing

It should NOT present backend insulin-impact output as final truth.

### Post-save
This stage is for:
- backend-derived insulin-impact interpretation
- cautious plain-language messaging
- uncertainty-aware communication

---

## What Claude Code Should Review

Claude Code should audit the current system for:

1. **Scientific honesty**
   - Are we overstating what the model can know?
   - Are we accidentally presenting estimates as certainty?
   - Is acute vs chronic separation still coherent?

2. **Semantic coherence**
   - Is pre-save truly nutrition-only?
   - Is post-save truly backend-derived?
   - Is any UI still mixing nutrition confidence with insulin-impact meaning?

3. **User-language quality**
   - Does the wording stay human and understandable?
   - Does it avoid technical overload?
   - Does it avoid making medical claims the system cannot support?

4. **Contract consistency**
   - Are backend fields and frontend rendering still aligned?
   - Are there any stale UI assumptions left?

5. **Remaining technical leakage**
   - Are raw FII/GI/source details still exposed where they should not be?
   - Are driver strings too technical for users?

---

## What Claude Code Should NOT Do

Claude should NOT:
- redesign the whole product from scratch
- replace the core scientific model without evidence
- reintroduce client-side scoring
- convert this into a medical diagnosis tool
- assume personalized spike prediction is possible without sensor-linked outcome data

---

## Known Remaining TODOs

Potential follow-up items:
- rename dashboard “Chronic Score” into more human language
- check if any saved-meal modals still expose overly technical fields
- standardize backend driver strings for cleaner UI wording
- review reference-meal calibration documentation for acute score

---

## Desired Claude Output

Claude should return:

1. Major remaining issues only
2. File-by-file notes
3. Whether the system is now:
   - safe to proceed
   - or needs one more cleanup pass
4. Minimal, targeted suggestions
5. No unnecessary rewrites
