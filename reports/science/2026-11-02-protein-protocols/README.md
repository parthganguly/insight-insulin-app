# Predicting insulin responses to protein added to carbohydrate

**Measuring the components separately improved a mixture forecast but left a substantial shortfall.** A second test asked what could be predicted from food composition alone. Scaling by reported leucine improved the four-arm average error over total protein, but predicted a high-dose whey/pea ratio of only **1.064**, against **1.472** observed. A third, post hoc comparison tests a restriction of a timing model. The three experiments use different endpoints and are scored separately.

## 1. Can measured components predict a co-ingested mixture?

Ten younger and ten older men each received flavored water (C), 30 g whey (P), 30 g glucose (G), and both together (GP). We froze `G + P − C` as the forecast for GP using each age group's own constituent measurements. Subtracting C once assumes a common background contribution. Flavoring and salt were not identical across all drinks. The endpoint is net change from fasting integrated over time **divided by the window duration**, yielding mU/L. Signed integration is linear. A sum of separately clipped positive areas would test a different model. [Oberoi et al., methods and Table 1](https://doi.org/10.3390/nu14153111)

| Window and cohort | Glucose alone | G + P − C | G + P | Measured GP | Shortfall of G + P − C |
|---|---:|---:|---:|---:|---:|
| 180 min, younger | 10.7 | 18.8 | 19.0 | 25.8 | 7.0 |
| 180 min, older | 11.6 | 19.7 | 21.2 | 26.6 | 6.9 |
| 60 min, younger | 27.1 | 41.8 | 43.6 | 46.2 | 4.4 |
| 60 min, older | 20.9 | 34.1 | 36.4 | 39.8 | 5.7 |

In both age groups the 180-minute absolute error fell by 8.1 mU/L relative to glucose alone. The uncorrected sum was closer still and also undershot the mixture. All 16 printed-precision scenarios per comparison preserve the shortfall and improvement over glucose alone. The 60-minute and 180-minute windows overlap. These forecasts require insulin measurements from the evaluation cohort.

The authors separately report a participant-wise comparison of GP versus the **uncorrected** sum at 180 minutes (28.3 vs 21.3 mU/L, paired p=.002). Simple equal-weight averages of the two printed Table 1 group values are 26.2 and 20.1. The source does not establish the reason for this difference or supply paired uncertainty for our control-adjusted residual. A previous eight-person, four-hour study reported that the single-component areas summed to 100.4% of the combined area with 50 g each of protein and glucose. The present result therefore does not supply a universal interaction multiplier. [Oberoi et al., §3.2](https://doi.org/10.3390/nu14153111) · [Krezowski et al.](https://doi.org/10.1093/ajcn/44.6.847)

## 2. Does a composition forecast distinguish two protein sources?

Thondre et al. report the 120-minute plasma insulin iAUC after five drinks in 30 completers. Each supplied 50 g available carbohydrate. The 10 g and 20 g labels refer to powder. Actual reported protein was 8 and 16 g for pea and 8.1 and 16.2 g for whey. We fixed the food-input predictions before opening the 120-minute arm means for scoring. Selected published contrasts and qualitative findings were already exposed. The 120-minute row is a reported trapezoidal incremental area. The authors do not explicitly specify how below-baseline insulin contributes, so compatibility with the native positive-area target remains qualified. [Thondre et al., Tables 1 and 4](https://doi.org/10.1371/journal.pone.0340386)

Both models use the same previously frozen Lan protein and fat addition curves, without fitting to Thondre. One uses protein grams. The other converts leucine grams to whey-equivalent protein using the target formulation's declared whey composition (8.1/1.29). Leucine adds source information; whey-equivalent grams are a transformation of that information. The two models must coincide for whey. Lan's unresolved marginal-summary convention and the assumed multiplication of protein and fat factors carry through. The evaluation glucose-arm insulin mean enters the observed ratios only. [Lan-Pidhainy and Wolever](https://doi.org/10.3945/ajcn.2009.28125)

| Powder and dose | Observed / glucose | Protein + fat | Leucine-scaled + fat |
|---|---:|---:|---:|
| Pea 10 g | 1.206 | 1.229 | 1.184 |
| Pea 20 g | 1.217 | 1.372 | 1.281 |
| Whey 10 g | 1.240 | 1.225 | 1.225 |
| Whey 20 g | 1.791 | 1.363 | 1.363 |

Mean absolute log-ratio error was **0.0889** for leucine scaling, **0.1059** for total protein, **0.1116** for proportional printed energy, and **0.2955** for no change. Nearly all the improvement over total protein came from the higher pea dose. Restricting the old forecast to whey covers two arms out of four and leaves the largest whey error in place.

At 10 g the leucine rule forecast whey/pea of 1.034 against 1.028 observed. At 20 g it corrected the ordering of the total-protein forecast (0.994) but missed most of the separation (1.064 versus 1.472). Doubling the whey powder gave a ratio of 1.445, against 1.112 predicted. Doubling pea gave 1.009, against 1.082 predicted. Only two powder formulations were tested. A two-entry source lookup can encode the same leucine-to-protein ratios, so this improvement cannot distinguish an amino-acid effect from the other formulation differences or justify requiring a leucine assay.

**Post hoc check of the model's range.** Rescaling pea alone cannot recover the printed high-dose contrast while the whey forecast stays fixed. Over the admitted 0–30 g range the Lan protein factor is at least 1. Even assigning pea zero effective protein leaves its fat factor, so the largest possible whey/pea forecast is about **1.328**. Removing that fat factor would raise the ceiling only to **1.363**, still below **1.472**. At the lower dose the observed ratio is inside the corresponding range. The finding concerns the fixed model and printed group means. It supplies neither a confidence limit on the true treatment ratio nor evidence that a particular nutrient caused the difference.

The source's 120-minute whey-20 minus pea-20 comparison was 1938.2 µU·min/mL (95% CI 867 to 3009.5, p<.001). Its whey-20 minus glucose comparison of 2558.5 (95% CI 1227.2 to 3889.8) differs from the Table 4 subtraction of 2669.67. Scoring uses the declared Table 4 means; the discrepancy is unresolved. Source comparisons used repeated measures and Sidak correction. The printed arm dispersions are SD. Neither supplies a confidence interval for the difference between model errors. The trial was industry funded, and access to individual data is restricted. [Thondre et al., results, data availability and disclosures](https://doi.org/10.1371/journal.pone.0340386)

## 3. What does moving whey after breakfast allow a shift model to predict?

This is an **outcome-exposed diagnostic**. In Allerton's 13-man randomized crossover, breakfast stayed at the same time and 20 g whey moved from 15 minutes before breakfast to during or 15 minutes after. The study's **total** insulin AUC from breakfast to 180 minutes was 96,340, 112,344 and 121,997 pmol·min/L, respectively (99,115 without the supplement). The paper reports lower PRE than DUR and POST. We use POST/DUR as a descriptive point ratio. Its paired uncertainty is unavailable here. These are different clocks and endpoints from the component and two-hour source tests. [Allerton et al., methods and Fig. 2d](https://doi.org/10.1017/S0007114518003793)

Suppose the breakfast response is fixed, the additional whey response is nonnegative, zero before ingestion, and just translates when whey moves. For an exact continuous integral to 180 minutes, shifting whey from 0 to +15 loses precisely the last 15 minutes of the original whey component. POST/DUR can be at most 1, assuming a positive denominator. The printed ratio is **1.086**. No choice of positive amplitude within this model class can get closer to that point than no change (absolute log error **0.0824**). For PRE/DUR the early area lost from the breakfast clock competes with a later tail, so the same inequality does not follow.

Clinical blood draws provide a sampled trapezoid and finite group estimates. The continuous-integral inequality does not automatically survive sampling. The script constructs a nonnegative triangular pulse for illustration: continuous DUR and POST areas both equal 185, whereas a sparse hypothetical grid yields 180 and 210. This is an existence example, not a reconstruction of the clinical grid or an explanation of the trial's result. The observed means therefore challenge the clock model as a predictor without identifying a biological mechanism or a population-level violation.

## Decision and replay

Keep component measurements as a benchmark where a cohort actually has them. Retain protein source, formulation, carbohydrate dose and timing in research records. Neither a universal additive correction nor a required leucine field follows. A stronger discriminator would test at least one new formulation for which protein identity and leucine density are not interchangeable, or measure the two component time courses and both orders in the same cohort on a common clock. The [earlier clock-shift result](../2026-11-02-meal-order/clock-shift/README.md) still includes both its favorable external prediction and its poor own-cohort fit. Decision D and absolute native positive two-hour validation remain open.

Run from this directory with Python 3:

```text
python -I -X utf8 components/combination.py --check
python -I -X utf8 source-transfer/evaluate.py --check
python -I -X utf8 source-transfer/separation_bound.py
python -I -X utf8 timing.py
```

The first two commands check the frozen forecasts and reconstruct the scored results from factual aggregate cells. The last two print the post hoc source-discrimination bound and the separate timing diagnostic.
