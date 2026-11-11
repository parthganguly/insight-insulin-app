# Correction: O2 form-contrast estimands (O1 unchanged)

Author: Opus 5.5 (`claude-opus-5-5`).

All v1 files (`SPEC.md`, `bridge.py`, `digitize.py`, `readings*.json`, `RESULTS.json`, `RESULT.md`, receipts) are unchanged byte-for-byte. `correction.py --check` re-verifies them against the `EXECUTION.json` hashes, and `SPEC.md`/`bridge.py` still match `FREEZE_RECEIPT.json`.

New files are `correction.py` and `corrected.json`. They import the v1 `predict()` read-only, so every O2 prediction below uses the **actual O1 predictions**.

## What was wrong

v1 `o2()` mixed estimands:

| Rule | v1 O2 estimand |
|---|---|
| bridge, no change, no form adjustment | **anchored**: one form predicted, the other measured at the target dose |
| proportional dose | **reciprocal**: both forms predicted |

The SPEC/RESULT statement that the bridge and proportional dose are "algebraically the same in O2" is **withdrawn**. It was an artifact of that mixture: the two rules differ under each consistent estimand. The only real O2 identity is that no change and proportional dose give the same *reciprocal* ratio, R_I(d0)/R_H(d0), because both scale each form by a common factor.

## Corrected estimands

Observed ratio = R_I(d)/R_H(d), from readings of Fig. 3.1A/B. Errors are |ln(pred/obs)|, identical in either orientation.

- **(i) Reciprocal:** pred_intact(d)/pred_hydro(d), both from O1.
- **(ii-A) Anchored, intact predicted:** pred_intact(d)/measured hydro(d).
- **(ii-B) Anchored, hydro predicted:** measured intact(d)/pred_hydro(d).

**Identity:** the (ii-A) error equals the O1 error of the intact cell, and the (ii-B) error equals the O1 error of the hydro cell, for every model. Anchored O2 is therefore **O1 split by form** and adds no independent information. Only (i) scores a form contrast.

**Direct same-cohort use:**

- The bridge and no form adjustment use the *measured opposite form at the target dose*.
- No form adjustment's reciprocal ratio is exactly 1/observed, so its reciprocal error = 2|ln obs|. That is degenerate.
- No change and proportional dose use only the target form at its anchor.
- The cross-source bridge uses the other cohort's same-form shape.

## Mean error over 4 cells (2 sources × 2 doses)

| Anchor | Estimand | Bridge | No change | Proportional | No form adj. | Cross-source bridge |
|---|---|---:|---:|---:|---:|---:|
| 0.3 (primary) | (i) reciprocal | 0.551 | **0.275** | **0.275** | 0.360 | 0.496 |
| 0.3 (primary) | (ii-A) intact predicted | 0.275 | 0.502 | 0.241 | **0.180** | 0.481 |
| 0.3 (primary) | (ii-B) hydro predicted | 0.275 | 0.317 | 0.198 | 0.180 | **0.068** |
| 0.6 (S1) | (i) reciprocal | 0.423 | **0.212** | **0.212** | 0.539 | 0.283 |
| 0.6 (S1) | (ii-A) | 0.212 | 0.579 | **0.189** | 0.270 | 0.377 |
| 0.6 (S1) | (ii-B) | 0.212 | 0.597 | 0.148 | 0.270 | **0.094** |

Observed intact/hydro ratios:

| Source | 0.3 | 0.4 | 0.6 |
|---|---:|---:|---:|
| Soy | 1.281 | 1.354 | 1.123 |
| Whey | 0.736 | 1.247 | 1.084 |

All levels, predictions and cells used are in `corrected.json`.

- **On the form contrast proper (i),** the same-source bridge is the *worst* complete rule at both anchors. Its reciprocal ratio is (R_I(d0)/R_H(d0))²·R_H(d)/R_I(d), so it compounds the anchor contrast with the inverted target-dose contrast.
- **The O1 conclusions stand.** The bridge loses to proportional dose and to no form adjustment on levels (anchor 0.3).
- **Post hoc observation, not a test:** the cross-source bridge predicts the *hydrolysate* forms well (ii-B, 0.068 and 0.094) but the intact forms poorly. The hydrolysate dose shapes are similar across cohorts (0.6/0.3: SPH 1.76, WPH 1.86). The intact shapes are not (SPI 1.54, WPI 2.74).

## Other corrections to v1 RESULT/SPEC wording

1. **Units.** v1 said the magnitude "suggests a µU·min/mL-type scale"; that claim is withdrawn. Values stay in the **native figure units as printed** ("mU*2h*mL-1"), which is unusual. No clean minute label is claimed, and nothing is converted.
2. **Timing.** "0–120 min" should read: from the pre-drink sample (t = 0) to 120 min after **finishing** the drink (consumed within 5 min). The window mixes a pre-ingestion baseline with a post-finish clock, so the area can span up to about 125 min from first sip.
3. **Serving and blinding.** About 250 mL, single-blind (not double-blind). Dose is per kg BW, so the absolute grams at mean BW are approximations.
4. **Significance.**
   - v1 called WPI 0.3 a "noisy calibration cell". That is withdrawn: the source marks WPI 0.3 as significantly different from both 0.4 and 0.6, and its SEM (about 38% of the mean) is reported dispersion, not evidence of error.
   - The soy "$" is a form main effect "independent of protein load", not a per-dose contrast.
   - WPH bars carry no dose symbols, and the WPH 0.4 point mean is below 0.3. The figure is in tension with the abstract's statement that insulin increased with load "for … WPH". This is recorded, not resolved.

## Challenge to `ch4-challenge.md` (bounded positive-area summary)

The bounding mathematics checks out:

- E[D⁺] ≤ (μ + √(μ² + σ²))/2;
- σ_D ≤ sd₀ + sd_t;
- E[D⁺] ≤ E[X_t] for nonnegative concentrations;
- the m-negative refinement via |E[(Y − μ)1_A]| ≤ σ√(f(1 − f)), maximized over unknown m;
- a Jensen lower bound;
- convex-chord upper bounds per linear segment.

Assumptions to state or tighten:

- **SD convention.** sd = √7·SEM gives the n-divisor SD of 8 men only if the reported SEM used the n − 1 sample SD. If SEM was computed with n, sd = √8·SEM (about 7% larger). The +1.1 µU/mL SEM widening covers this only where SEM ≲ 16 µU/mL. Use √8·SEM as the safe default, or show the bounds unchanged.
- **Operator.** The "nominal piecewise-linear curves" make these bounds for the *trapezoid operator on the sampled grid*, not for continuous participant positive area. The ±0.5 mean widening assumes 1-decimal rounding of printed means, which should be verified.
- **Scope.** These are bounds on the *empirical mean of these 8 men*. Reading them as population statements needs sampling uncertainty that is not available. The summary says this; keep it adjacent to the interval.
- **Composition.** "Identical published 18-dimensional dry composition" does not establish identical preparations, lots or hydrolysis; this is consistent with the earlier no-shared-lot caution. The external pea/soy 93/71 and the staggered 0–150 vs signed 0–120 ratios use different windows and operators, so do not juxtapose them as agreement.
- **Timing.** The same-grid rescue (dropping the 45-min point) was chosen after the primary order failed. It is post hoc and an operator choice, so it should not count as support. Report the primary failure as the result.
- **Decision logic.** The tie-threshold logic (√q = 1.144 against a lower bound of 1.074) is correct. The conclusion "direction survives" refers to the bounded empirical ratio only, not to a significant population difference (paired p = 0.263 at 150 min).
