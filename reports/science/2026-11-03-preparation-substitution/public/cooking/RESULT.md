# Preparation-conditional test: Wei et al. 2026 (rice → potato, hard vs soft) — reconciled v2

Author: Opus 5.5 (`claude-opus-5-5`).

- **Correction:** the first author is **Jinjie Wei**. v1 misattributed the study to "Wang"; the v1 execution is preserved unchanged in the local execution archive (with a manifest).
- **Code:** `wei.py` (default run and `--check` are offline). `wei.py verify ../cooking.xml` is a separate, volatile source audit and passes.
- **Status:** development analysis. The outcomes were known before scoring, and no coefficient was fitted.

## Facts (from the source XML)

- **Citation:** Nutrients 2026;18:973, doi 10.3390/nu18060973.
- **Design:** randomized crossover; n = 20 healthy women; lunch after a standard breakfast.
- **Meals:** 90 g raw rice (RC), or 60 g rice + 130 g potato:
  - HP: pressure cooker to rated pressure + **30 s** hold, core temperature **57.6 °C**;
  - SP: **20 min** hold, core temperature **77.4 °C**.
- **Carbohydrate:** potato 23.2 g replaces part of the rice's 69.5 g (staple share 0.334). Meal totals are matched at 79.5 g; energy 562.9 vs 558.3 kcal.
- **Insulin:** capillary plasma (ELISA) at 0, 15, 30, 45, 60, 90, 120 min. iAUC "above baseline" by trapezoid.
- **Table 9** (arithmetic mean ± SEM, mIU·min/L): RC 23,224 ± 2,456; HP+R 14,517 ± 801; SP+R 21,635 ± 1,829. Friedman letters a/b/a.
- **Table 1:** potato 17.87 g/100 g available carbohydrate (by difference) but 10 g/100 g starch; rice 77.2 / 77.2.
- **Table 5:** the mixed-meal starch fractions reproduce exactly from 13 g + 46.32 g starch.

## Assumptions (stated, not facts)

- **Window:** iAUCins = 0–120. Inferred from sampling ending at 120 min and the HOMA-PP definition; the table itself is unlabelled.
- **Digestibility basis:** Table 5 percentages apply to the eaten cooked starch.
- **Non-starch potato grams.** The by-difference non-starch potato carbohydrate (10.2 g per serving) has unknown activity a_ns ∈ [0, 1]. It is **not** assumed active or inactive: it is swept at 0, ½ and 1.
- **Common 10 g.** The common non-staple carbohydrate (10 g from other foods, identical in all meals) has unknown activity a_bg ∈ [0, 1]. It enters numerator and denominator equally, so it only dilutes ratios toward 1 in proportion to a_bg. It is swept, not assumed. v1's "S2" implicitly set it to 1.
- **Donor rules:** donor-derived rules carry the Moravek operator (geometric means of participant iAUC) and instant potato, with geometric interpolation in exchange share.
- **Lentil chain:** the implication P/R = r_rice/r_potato (fixed) or its square (scaled) requires a shared lentil arm to cancel. It is a *necessary-only* consequence.

## Observed and uncertainty

| Contrast | Observed ratio | Paired log-SE across ρ ∈ [−1, 1] (ρ = 0 shown for reference) |
|---|---:|---|
| HP/RC | 0.625 | 0.051–0.161 (0.119) |
| SP/RC | 0.932 | 0.021–0.190 (0.135) |
| HP/SP | 0.671 | 0.029–0.140 (0.101) |

Crossover covariance is not reported. The extrema span the possibilities; ρ = 0 is only one scenario.

## Additive nonnegative restriction (verified)

If the insulin response were B + β·(rice grams) + P with B, β, P ≥ 0 and rice scaled linearly from 90 to 60 g, then every potato meal / rice meal ≥ 60/90 = **2/3**.

- **HP:** observed 0.625 lies **below** the bound. The log gap is 0.064, which is **0.40–1.27 paired SEs** over ρ ∈ [−1, 1]. This is a central-estimate restriction, not a statistically established violation.
- **SP:** 0.932 satisfies the bound.
- **Escape routes:** maps that are nonlinear in rice grams, allow potato to suppress the rice-driven response, or are non-additive avoid the restriction.

## Scores (|ln(pred/obs)|; mean over HP/RC and SP/RC; separation = error on HP/SP)

| Representation | HP/RC | SP/RC | Mean | Separation error |
|---|---:|---:|---:|---:|
| No change / proportional carbohydrate | 1 | 1 | 0.270 | 0.399 |
| Cheap total starch grams | 0.854 | 0.854 | 0.199 | 0.399 |
| Direct donor P/R^x (staple / whole-meal) | 1.223 / 1.192 | same | 0.471 / 0.446 | 0.399 |
| Lentil-chain fixed / scaled ^x (staple) | 1.128 / 1.272 | same | 0.390 / 0.511 | 0.399 |
| RDS × serving starch, a_ns = 0, a_bg = 0 | 0.714 | 1.013 | 0.109 | **0.050** |
| RDS, a_ns = 0, a_bg = 1 | 0.795 | 1.009 | 0.160 | 0.160 |
| RDS, a_ns = ½ / 1 (a_bg = 0) | 0.915 / 1.115 | 1.213 / 1.413 | 0.322 / 0.497 | 0.117 / 0.162 |
| RDS+SDS, a_ns = 0, a_bg = 0 | 0.693 | 0.833 | 0.107 | 0.215 |
| RDS+SDS, a_ns = 1, a_bg = 1 | 0.875 | 0.996 | 0.202 | 0.270 |
| RDS+SDS, potato AC treated as starch | 0.714 | 0.964 | 0.084 | 0.099 |
| *Post hoc limit:* HP contributes 0, SP like rice per g AC | 0.666 | 1.000 | 0.067 | 0.007 |

The full a_ns × a_bg grid is in `RESULTS.json`.

**Table 5 input ranges** (± as printed), predicted HP/SP:

- RDS: 0.665–0.743;
- RDS+SDS: 0.796–0.864.

## Interpretation

1. **Food identity alone predicts the wrong direction.** Every donor-derived identity rule predicts potato above rice and equal HP/SP, against observed HP/RC 0.625 and SP/RC 0.932. The HP gap is 0.575 log (vs 1.111): 3.6–11 paired SEs over the ρ range. That is a large point discrepancy, though not a formal test.
2. **Measured digestibility separates the preparations** in this sample. RDS × serving starch gives the best separation (0.050) and a mean error of 0.109, against 0.270 for no change.
   - This depends on the unknown activity of the 10.2 g of by-difference non-starch potato carbohydrate. If it is counted, RDS collapses. Treating potato available carbohydrate as starch favours RDS+SDS instead.
   - The paper does not resolve the accounting. No representation is selected.
3. **The post hoc limit is one limiting case**, chosen after seeing the outcomes. It is **not** a bound on all descriptors.
   - The additive analysis shows that the observed HP (0.625) sits slightly below even that rule's 2/3 central value. Non-additive descriptors could do better or worse.
4. **Not established:** a learned coefficient, population accuracy, or statistical superiority of any representation. Differences among the digestibility variants are well within the paired-SE range.
