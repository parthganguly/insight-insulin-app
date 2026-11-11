# Katsanos 2006, v2: executed. Higher leucine fraction did not raise the insulin area; equal response is closest; discrimination remains impossible

Owner and implementer: Opus 5.5 (`claude-opus-5-5`).

**v1 files are unchanged:** `PLAN.md`, `katsanos.py`, `inputs.json`, `PREDICTIONS.json`, both receipts, `DESIGN_POWER.json`, `RESULT.md`.

**v2 files:**

| File | Role |
|---|---|
| `inputs_v2.json` | Source Table 2 composition |
| `PREDICTIONS_v2.json` + `PREDICTION_RECEIPT_v2.json` | Frozen *before* Figure 4 or the insulin Results text was read |
| `digitize_fig4.py` → `fig4_vector.json` | PyMuPDF vector extraction; needs the local reprint, not redistributed |
| `analysis_v2.py` → `RESULTS_v2.json` | Execution |

Replay: `python -I -X utf8 reproduce_v2.py`.

## Source facts (original APS reprint, recovered by Astra)

- **Table 2:** leucine **1.721 vs 2.790 g** (Δ 1.069), total EAA 6.726 g each.
  - Every other EAA is lower in the 41% mixture: His, Ile, Lys, Met, Phe, Thr, Val each about −21%.
  - The 26% mixture mirrors the EAA in 15 g whey.
- **Vehicle and dosing:** 250 ml noncaloric soft drink, **no carbohydrate**, single bolus at 0 min.
- **Groups:** four independent groups. Young n = 8 per arm; elderly n = 10 per arm.
- **Tracer infusion:** a primed constant phenylalanine-tracer infusion throughout, and the bolus contained tracer.
- **Insulin:** arterial insulin (µIU/ml) at −30, 0, 15, 30, 45, 60, 75, 90, 120, 150, 180, 210 min (Fig. 4, means ± SE). **No integrated insulin summary is printed.**
- **Authors' statistics:** no significant group effects, a significant time effect, and insulin above basal until 30 min (young) and 45 min (elderly).

## Reading

- **Method:** Fig. 4 is vector graphics. Means were taken from marker centres and SEs from whisker segments. The y axis is calibrated from 13 ticks.
- **Group assignment:** diamond = 26%, square = 41%, young = on a solid polyline, elderly = dashed. Young markers lie ≤ 0.02 pt from their polyline and elderly markers ≥ 0.59 pt.
- **Overlapping whiskers:** where markers overlap, whiskers are ambiguous and the larger one is taken.
- **Independent comparison:** Sol's digitization should be compared against this.

## Results (group-mean curves; ratio = 41% / 26% leucine)

**Primary declared quantity:** E2, the signed 0–120 min area of the group-mean curve above the pre-feed baseline, defined as the mean of −30 and 0. The plan did not fix the baseline, so the time-0-only baseline is shown as a sensitivity. E3 is the positive part of the group-mean curve.

| Age | Baseline | E2 signed 0–120 ratio | E3 positive group 0–120 ratio | Participant-positive ratio bounds |
|---|---|---:|---:|---|
| Young | mean(−30, 0) | **0.891** | 0.951 | [0.365, 2.639] |
| Young | t = 0 | 0.837 | 0.913 | [0.361, 2.558] |
| Elderly | mean(−30, 0) | **0.894** | 0.850 | [0.372, 2.565] |
| Elderly | t = 0 | 0.935 | 0.881 | [0.403, 2.454] |

**Errors at E2, primary baseline** (|ln(pred/obs)|):

| Age | Equal response (P0 = P1) | P3 slope, 1.115 | P2 fixed, 1.267 |
|---|---:|---:|---:|
| Young | **0.115** | 0.225 | 0.352 |
| Elderly | **0.112** | 0.222 | 0.349 |

- **Ranking:** every 0–120 cell, under both baselines and both E2/E3, ranks equal response > quantitative slope > fixed multiplier.
- **Direction:** the point direction is *opposite* to both enrichment rules. The 41% arm's areas are 5–16% lower.
- **Age interaction (E2):** 1.003, consistent with the age-free rules (all predict 1). Under E3 it is 0.893; under the t = 0 baseline, 1.117.

**Native (µIU/ml·min, group-mean signed 0–120, primary baseline):**

| Age | 26% | 41% | 41% − 26% |
|---|---:|---:|---:|
| Young | 390 | 348 | −43 |
| Elderly | 405 | 362 | −43 |

No absolute forecast was attempted.

## Tails, baselines and the 0–210 window (separate)

- **Below baseline:** every arm drops below its pre-feed baseline by 90–120 min, and stays below through 210.
- **Effect on 0–210:** the signed 0–210 area is therefore dominated by negative tails *and* by between-group baseline differences. The elderly 41% baseline is 6.53 vs 5.10 for 26%, a +28% imbalance between independent groups.
- **Instability:** the elderly 0–210 E2 ratio flips to 1.12 (primary baseline) or 1.21 (t = 0). There, P3 or P2 "win" by accident of baseline imbalance.
- **Interpretation:** 0–210 signed is reported but **not interpretable as an enrichment effect**. Positive areas are unaffected by the tails (E3 0–210 ≈ 0–120).

## Uncertainty and coverage

- **Conditional vs unconditional coverage.** The v1 scorer's z/LR statistics presuppose a printed AUC SEM, which the source does not provide. Point scoring above is unconditional. Source-derived uncertainty for areas is **unavailable**, and SEM = 0 is never assumed.
- **Illustrative and conservative.** SD(Σ w·X) ≤ Σ|w|·SD(X) holds for *any* within-group correlation across times, and arms are independent groups.
  - The resulting upper-bound log SE gives E2 intervals of about [0.13, 6.1] (young) and [0.08, 9.8] (elderly).
  - These are uninformative upper bounds, not CIs. The P2–P3 separation is 0.127.
- **Participant-positive bounds:**
  - Lower: Jensen positive part of the group curve.
  - Upper: nonnegative concentrations. At t = 0 with the two-sample baseline, D(0) = (X(0) − X(−30))/2 ≤ X(0)/2. It is **not** assumed that D(0) = 0.
  - They span about 0.36–2.6, which contains all rules and 1.
- **Verdict:** this confirms the v1 outcome-free conclusion. The design **cannot discriminate** the fixed and quantitative hypotheses, nor either from equal response, at any level of statistical support. The point estimates favour equal response.

## Interpretation

- **In this context (protein-only EAA drink, no carbohydrate, about 6.7 g)**, raising leucine from 26% to 41% at a matched total did not increase insulin area in either age. The 0.85–0.95 ratios are within substantial uncertainty.
- **The fixed multiplier 1.267 transfers a label across contexts.** It was set with a carbohydrate-rich, leucine + phenylalanine + wheat blend. As a label-only "enrichment" flag it performs worst here.
- **The quantitative slope** (trained on carbohydrate meals) also overpredicts.
- **The generic AA flag ties both drinks**, so it equals equal response by construction: a generic rule fits *as well as or better than* either composition rule.
- **Identification:**
  - leucine is confounded with a uniform about-21% cut in the other EAAs;
  - independent groups carry baseline imbalance;
  - there are only two leucine levels;
  - the insulin increments are small, about 10 µIU/ml peaks.
- **No evidence here that quantitative composition adds value beyond a flag.** The test is also too weak to show that it does not.

## Corrections to v1 (versioned; v1 files untouched)

- ΔLeu 1.005 g (stated percentages) → **1.069 g** (Table 2). P3 changes from 1.108 to 1.115; the fixed–slope separation from 0.134 to 0.127. `DESIGN_POWER.json` was computed with v1 ΔLeu; the conclusions are unchanged.
- **E1 is UNAVAILABLE.** No reported AUC exists.
- The baseline definition for E2 was unspecified in v1; both choices are reported, with the pre-feed two-sample mean as primary.
- **Exposure:** the PubMed abstract (FSR only) was read after the v1 freeze. Figure 4 and the insulin Results text were read only after `PREDICTION_RECEIPT_v2.json`.

## Challenge: Farup 2016 (three whey hydrolysates, DH 23/27/48%, 20 g)

1. **Not a composition test.** Degree of hydrolysis, amino-acid profile and residual fat change *together* across only three products. Any ordering is attributable to any of them, and with three products, a monotone DH, Leu or fat ordering can coincide by chance.
2. **P3 from leucine levels.** At 20 g, leucine differences between whey hydrolysates are likely tenths of a gram. P3 then predicts ratios about 1.01–1.03, so **P3 ≈ equality**. Its "ordering" is below any plausible resolution: by the `design_power.py` logic, a separation of 0.02 log needs hundreds per group even in a crossover.
3. **The Power calibration cannot transfer as used.** Power's 30% DH WPH/WPI ratio of 1.42:
   - is a 3-h above-baseline, 45 g, single-DH contrast with paired p = 0.21;
   - contrasts hydrolysate vs isolate. It contains no DH gradient, so it implies **no ordering among hydrolysates**. Used across DH it is equality.
4. **Endpoint.** The integration is unclear: arbitrary units with an unknown window and operator. Ratios are interpretable only if the units are linear in area and the operator is common across arms. Small n makes rank scoring nearly uninformative.
5. **Shape and kinetics** (signed AUC, time to peak, early AUC):
   - *Legitimate as separate, pre-declared descriptive endpoints.* Hydrolysis plausibly acts on absorption *timing* more than on area.
   - Hypothesis-generating only: n is small, curves are sparse, and they share the same three-way confounding.
   - Must not be selected after viewing.
6. **Robust alternative:**
   - **Resolution-aware prediction.** Predict a *tie* unless the frozen rule's log separation exceeds the design's detectable difference (2·SE). Score ordinal agreement with ties allowed.
   - **One pre-declared monotone trend contrast across DH** instead of three pairwise comparisons. It is summarised as a sign with a paired test when the paper reports it. This prevents a near-zero P3 difference from being scored as a "correct ordering".
