# Carbohydrate-onset shift and meal order: revised result

Translating a reference insulin curve by 14 minutes predicted a smaller two-hour response when rice was eaten last. Its numerical accuracy depended strongly on which cohort supplied the curve. Source and target outcomes were already exposed. The two 14-minute forecasts had also been calculated by hand before operator B was named primary. Run `python -I -X utf8 clock_shift.py --check` to reproduce the results using the Python standard library.

## Question and plan

Does translating a carbohydrate-first group-mean insulin curve by the minute carbohydrate starts reproduce reported carbohydrate-last/first ratios of 0–120 min insulin area?

**Source shape.** Shukla 2015 ([doi](https://doi.org/10.2337/dc15-0429), Table 1) gives 18.8/62.4/125.4/152.0 µIU/mL at 0/30/60/120 min in 11 metformin-treated adults with type 2 diabetes. It is baseline-subtracted and piecewise-linear.

**Assumptions:**
- the whole curve translates;
- foods eaten before carbohydrate contribute zero additional modeled area above baseline;
- the shape transfers to a different population.

Holding the translated response and the first-arm denominator fixed, adding positive incremental area in the last arm raises its predicted last/first ratio.

**Operators:**
- A integrates the continuous shifted curve.
- B resamples it at 0/30/60/120 min and applies a positive trapezoid.

Both are areas of a *group-mean curve*. The observed values are ratios of *printed mean participant areas*, which is a different operator.
- Shukla carbohydrate-first: mean-curve area 10,101 vs printed 10,097.9. That is within the 10.5 allowed by rounding each printed concentration.
- Shukla carbohydrate-last: 5,146.5 vs 5,202.8, which exceeds that rounding allowance. The source does not establish the reason for this discrepancy.

**Comparators:** no change (1), the prior Shukla whole ratio (0.5152), and a flat window (120 − s)/120.

**Evaluation:** Imai 2023 ([doi](https://doi.org/10.3390/nu15051174), Table 2) studied 18 healthy young women. Rice started at 0, 14 or 7 min, and there was no fast carbohydrate-first arm. Error is |ln(pred/obs)| per panel, never pooled.

## Results (v1 numbers unchanged)

| Panel | Observed | No change | Whole ratio | Flat | Shift A | Shift B |
|---|---:|---:|---:|---:|---:|---:|
| P1 Imai slow-last/slow-first, s 14 | 0.7404 | 0.301 | 0.363 | 0.176 | 0.102 (0.820) | 0.065 (0.790) |
| P2 Imai fast-last/slow-first, s 7 (order, onset, pace together) | 0.7213 | 0.327 | 0.336 | 0.267 | 0.231 (0.909) | 0.216 (0.895) |
| P3 Imai fast-last/slow-last, 7 vs 14 (pace differs) | 0.9742 | 0.026 | 0.026 | 0.090 | 0.129 (1.109) | 0.151 (1.133) |
| P4 Shukla last/first in source, s 15 | 0.5152 | 0.663 | by construction | 0.530 | 0.449 (0.807) | 0.408 (0.775) |

Cell values are absolute log errors; predicted ratios are in brackets.

- **D1 (P1):** both operators have lower point error than no change, flat and whole ratio.
- **P1 reproduced log-ratio share:** 0.66 (A), 0.78 (B), 0.41 (flat).
- **D2 (P4):** neither operator is within the arbitrary v1 tolerance of 0.10. The reproduced shares are 0.32 (A) and 0.38 (B). These are ratios of log ratios. **They are not causal proportions**, and falling within the tolerance would not have shown a complete explanation either.
- **D3 (P3):** the shift predicts > 1. The observed mean is 0.974. This is a descriptive direction mismatch with pace confounded, not a rejection.
- **Terminal share:** under continuous translation, the predicted reduction equals the reference area's share in the final s minutes.
  - Matching P1 needs 0.260. A linear ramp gives 0.220, the Shukla curve 0.180 and a flat curve 0.117. P4 needs 0.485 against a ramp's 0.234.
  - Exceeding the ramp share means *more late area than a ramp*, not curvature: a late step to a plateau also satisfies it.
- **Operator gap:** ln(A/B) on P1 is 0.037.
- **Zero-correlation log SD:** one delta-method scenario, ignoring the unknown within-person covariance, gives 0.138 for P1. That figure is not a CI or a decision floor.

## What the Imai reference-curve check changes

The team digitized Imai Fig. 3B's slow carbohydrate-first group mean, using the two printed interior values 83.6 and 58.2. Its reading uncertainties are a graph-read baseline of about 6.43, occluded and extrapolated, and a terminal value of about 42.99. That calculation is a separate, credited file and uses an evaluation-arm curve. It is a within-cohort diagnostic, not a forecast.

Its mean-curve area is 5,741.5, against a printed 5,702. Shifted 14 min, it predicts 0.9065 (A) and 0.9233 (B); the 16 reading corners span [0.9048, 0.9084] and [0.9216, 0.9251]. That is error 0.20–0.22 and a reproduced share of about 0.33 (A) or 0.27 (B). The terminal share is 0.093, below the 0.260 required.

**Change in interpretation:**
1. P1's favourable fit came from borrowing a late-rising diabetic shape. With the evaluation cohort's own early-peaking group curve, translation reproduces about a third of the observed log ratio. That is worse than a flat window and outside the plan's arbitrary 0.05 descriptive tolerance.
2. Taken with P4, translating a carbohydrate-first group curve does not adequately describe either order contrast under these assumptions.
3. This finding is conditional on group curves, reading scenarios and zero modeled pre-carbohydrate increment. It does not identify a mechanism, estimate a causal share or test population uncertainty.
4. In Shukla 2017, the last/first ratio was 0.75 at 180 min in a different cohort. Establishing how a contrast changes with observation window requires data from the same cohort.

**Decision.** Record eating order, onset and pace as protocol descriptors. Do not use a window-alignment correction.

## Strategy (corrected)

1. **Worth claiming:** a map of which meal descriptors move *relative* 0–120 min insulin area and in which direction. It is not a consumer predictor or score.
   - Protein contrasts were underpredicted by all seven frozen composition models: Lan whey 5 g and 30 g, and Sun chicken. This is **empirical**. The family can predict rises (linear 1.148 for chicken).
   - A totals-only function must tie arms with identical inputs, which is structural, so order is outside it.
2. **Uncertainty:** there is no universal resolution floor. The within-person covariance is unknown, so the zero-correlation scenario may overstate or understate it. Small margins (e.g. Sun's saturation vs no change, 0.0012) are descriptive. Any numerical tolerance is a proposal without clinical meaning.
3. **Portion:** proportional carbohydrate is a serious within-food comparator. The evidence does not establish a universal portion law. It also does not prove that food and portion can never share parameters.
4. **Absolute target:** the native positive 0–120 min absolute target stays separate from the relative branches. The admitted evidence does not identify cross-study absolute calibration. A shared reference arm is one route; it is not a blanket requirement where other identification evidence exists.
5. **Stop:** exposed point-tally rankings of dose variants. **Continue:** structural checks and time-resolved sources.

**Next evidence that would change the decision.** Seek time courses for the carbohydrate component alone, the preload alone and the same components eaten in both orders. With known course timing and samples through return to baseline, independently measured component curves could predict a combined curve by superposition. Adding the preload to a whole mixed-meal curve would count it twice. Test both the time course and the area on held-out combinations. Equal long-window areas alongside different two-hour areas would support redistribution over time, but would not establish translation of an unchanged curve.

The admitted sources are published group summaries. No participant data were used, and access to them was not established.

## Limitations

- Five group means from two cohorts, all outcome-exposed.
- Shape transported from type 2 diabetes to healthy women.
- Shukla's visit order coincides with condition order.
- Pace is confounded in P2/P3.
- Clipping and individual baselines separate the operators.
- Imai's baseline reading is occluded.
- No covariance, no mechanism and no consumer claim.
