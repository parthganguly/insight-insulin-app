# Wheat RS4 bar → potato RS4 bars: frozen transfer result

Author: Opus 5.5 (`claude-opus-5-5`). This follows `../PLAN.md`.

**Run:** `python -I -X utf8 rs_transfer.py --check` (stdlib).

**Order of work:** forecasts were frozen at 04:14:06Z (`FREEZE_RECEIPT.json`) before the target's Table 4 was read.

**Exposure before the freeze:** the target's title and the Results prose ("venous insulin iAUC significantly reduced with fiber bars, p < 0.001"); no numbers. Open-access source XMLs are kept in `../opus_raw_local/` and are not for the curated upload.

## Sources and inputs (`inputs.json`)

**Donor:** Al-Tamimi 2010, PMC2925102. Crossover, n = 13.

- **Bars:** puffed-wheat control 65 g vs cross-linked wheat RS4 bar 80 g.
- **Composition (Table 2):** available carbohydrate 51/51 g (total CHO − measured TDF); TDF 5/20 g.
- **Insulin (Table 3):** iAUC over 2 h, 8,758 ± 1,132 vs 3,659 ± 974 pM·2h (mean ± SE).
- **Operator:** Prism trapezoid; below-baseline handling unspecified.

**Target:** Gourineni 2020, Foods 9:1679, PMC7698388. Double-blind crossover; 41 randomized, 38 evaluable.

- **Bars (Table 1):** control / medium / high potato-RS4 (VERSAFIBE 1490). Available carbohydrate 35.60/35.23/34.86 g; "dietary fiber (RS)" 2.01/21.06/29.69 g. These are *calculated by labeling software*, not assayed.
- **Endpoint:** venous insulin iAUC 0–120 as area above the pre-consumption value with no subtraction below (**participant-positive**, i.e. INSIGHT's target), mean ± SEM, Table 4.

## Frozen forecasts and observed (ratio to control)

| Rule | Medium | High | High/medium |
|---|---:|---:|---:|
| Equality | 1 | 1 | 1 |
| Available CHO (source-independent dose) | 0.990 | 0.979 | 0.990 |
| Generic enriched (donor factor 0.4178 × dose) | 0.413 | 0.409 | 0.990 |
| Graded fibre density (k = −2.967 per g TDF/g AC) | 0.199 | 0.092 | 0.466 |
| **Observed iAUC 0–120** | **0.682** | **0.635** | **0.931** |

**Scores (|ln(pred/obs)|):**

| Rule | Primary mean (2 enriched/control) | High/medium |
|---|---:|---:|
| Available CHO | **0.403** | 0.061 |
| Equality | 0.419 | 0.072 |
| Generic enriched | 0.470 | 0.061 |
| Graded | 1.580 | 0.692 |

The peak insulin endpoint is a separate operator. It gives the same ordering: available CHO 0.337, equality 0.353, generic 0.536, graded 1.646.

## What this shows

1. **Neither dose-only nor generic enrichment is supported over the other.**
   - The observed ratios lie between them, essentially at their geometric midpoint: medium 0.682 vs midpoint 0.640, high 0.635 vs 0.633.
   - The 0.07-log primary difference is far smaller than the marginal ratio SE: about 0.15 at ρ = 0, and 0.016–0.218 over the unknown paired correlation.
   - The donor-uncertainty band of the generic factor (ρ = 0) contains both observed ratios.
   - **Interpretation:** a real reduction (source letters a/b/b; RM-ANOVA p < 0.001) of about half the donor's log effect.
2. **The graded fibre-density rule fails clearly.** Its target fibre-density gaps are **1.84× and 2.70×** the donor's (extrapolated beyond support). It predicts strong dose grading (high/medium 0.47), whereas the observed 0.93 is close to flat, with the source letters not separating medium from high. Its donor band excludes both observed ratios.
3. **Dose response.** In this bar system, doubling the RS4 fibre above about 21 g added little reduction. A graded composition effect is not supported; a near-saturating or "present/absent" formulation effect is compatible.

## Limits

- **Donor vs target ingredients:** wheat vs potato RS4 (different chemical modification products).
- **Available carbohydrate:** 51 g vs about 35 g.
- **Fibre basis:** measured TDF vs software-calculated "dietary fiber (RS)". Neither is verified RS chemistry, so no pure-RS effect is claimed or extrapolated.
- **Assays:** LINCOplex vs electrochemiluminescence. The donor sampled to 120 min with a different grid; its clipping convention is unspecified.
- **Sample sizes:** per-arm n for the target iAUC is not printed (Figure 2 shows n = 37/36/37), and the donor has n = 13.
- **No paired ratio CI** in either study.
- **Relative only:** no absolute food-only forecast.
- **Steele:** remains an exposed earlier study and is not used here.

## Decision relevance

- A single donor RS4 contrast transfers in **direction**, but its magnitude is about twice the target's log effect.
- Available carbohydrate alone misses the real reduction.
- On these data the two are statistically indistinguishable; the graded composition extension is rejected.
- **Next discriminating need:** a same-ingredient RS dose series with measured (not calculated) RS/TDF and a paired insulin contrast.
