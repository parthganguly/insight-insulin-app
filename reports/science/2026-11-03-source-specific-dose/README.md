# Protein-specific dose forecasts in two human crossover series

**Dose data from other studies improved the Oxford point forecast, with no insulin measurement from the evaluation cohort.** They captured part of the increase in the whey–pea contrast when servings doubled. Straight lines fitted separately for each protein predicted native response levels about as well. A second graded experiment shows why a source label by itself is insufficient: nearly the same preparations changed order between the resting study and the postexercise study.

## Oxford: earlier curves forecast an exposed evaluation series

The 2026 trial tested 50 g glucose plus 10/20 g pea powder or 8.1/16.2 g actual whey protein in 30 adults. We transferred the Lund whey ratios at 4.5/9/18 g actual protein with 25 g glucose and the earlier Oxford pea ratios at 25/50 g of the same named powder with 50 g glucose. Each ratio uses the donor's own glucose-only mean. Linear interpolation through the measured knots includes the glucose-only point at zero added protein. No extrapolation or monotonic smoothing was used. The pea product is NUTRALYS S85 Plus; published identity does not establish common lots. We did not convert the earlier powder weights into unreported grams of pure protein. Ordinary glucose-only ratio = 1 is an identity at zero addition; absolute insulin at that point is nonzero. [Lund dose study](https://doi.org/10.1038/ejcn.2013.88) · [Earlier Oxford preparation and Table 2](https://pubmed.ncbi.nlm.nih.gov/33515092/) · [Oxford evaluation Tables 1 and 4](https://doi.org/10.1371/journal.pone.0340386)

The native scale comes from the earlier Oxford 50 g glucose arm, mean 3369.6. Both Oxford studies used capillary plasma insulin, a Cobas E411 assay, and fasting samples at −5 and 0 minutes. The target glucose mean 3373.4 was read for evaluation only. The earlier paper prints µU/ml/min; we interpret its time-integrated response on the conventional µU·min/mL scale. It does not specify how it clipped below-baseline excursions. The target reports trapezoidal iAUC under its ISO protocol. These forecasts concern **reported native two-hour iAUC**. They do not settle the participant-positive convention across all three studies, nor isolate a causal source effect from carbohydrate dose, assay and preparation. Participant overlap between the Oxford cohorts is undocumented.

| Target | External-curve native forecast | Observed native iAUC | Predicted / observed ratio to glucose |
|---|---:|---:|---:|
| Pea, lower | 3889 | 4069.7 | 1.154 / 1.206 |
| Pea, higher | 4409 | 4104.9 | 1.308 / 1.217 |
| Whey, lower | 4127 | 4183.3 | 1.225 / 1.240 |
| Whey, higher | 5244 | 6043.07 | 1.556 / 1.791 |

| Model, same four targets | Mean absolute log error of levels | Native MAE, µU·min/mL | Predicted change in whey/pea ratio |
|---|---:|---:|---:|
| Observed | — | — | **1.432** |
| Earlier calibrated named reference | .147 | 687 | 1.016 |
| Unfitted dose-adjusted named reference | .099 | 466 | 1.040 |
| Energy | .112 | 550 | .997 |
| Earlier fitted constant | .104 | 513 | 1 |
| Source-blind average of the two dose curves | .111 | 544 | 1 |
| Separate external dose curves | **.068** | **335** | **1.121** |
| Separate straight lines through control | **.065** | **318** | **1.113** |
| External curves, protein/carbohydrate coordinate | .130 | 625 | .850 |

The stated joint criterion was an improvement over the prior named reference on both level error and the change in contrast; it passed at these means. Low-dose whey/pea was predicted 1.061 vs 1.028 observed; the earlier model's 1.026 was closer there. High-dose whey/pea was 1.189 vs 1.472, improving on 1.043. The predicted whey and pea dose steps were 1.271 and 1.134, versus 1.445 and 1.009 observed. This leaves a large high-whey residual. The exposed Oxford means were excluded from fitting; they were known when the experiment was chosen. Historical same-lab calibration supplies four native forecasts and is a material input. These are population-mean point predictions in a closely described protocol, with no individual predictions or demonstrated population error interval.

The whey dose coordinate matters. Transferring by protein/carbohydrate scales Oxford whey doses to 4.05/8.1 g in Lund and reverses the predicted change. Dropping Lund's 9 g knot removes the improvement on change (log error .347 vs .343 for the previous model); dropping 18 g leaves high whey outside support. Removing the highest pea knot changes neither pea forecast: both target servings fall between zero and the **first** nonzero pea dose. The experiment does not establish a need for nonlinear pea measurements. Moving the external glucose scale by one donor SEM (3097–3642) retains the curve's native MAE gain over the prior calibration but can reverse its small difference from the straight lines. This is an anchor sensitivity, not sampling inference. [Frozen plan](mixed/PLAN.md) · [All model and coverage results](mixed/result.json)

## A distinct preparation-by-dose test after exercise

Eight male cyclists received six drinks at 30-minute intervals after glycogen-depleting exercise. In the first two hours there were four boluses before the endpoint. Both formulations contained 1.2 g carbohydrate/kg/h. At low and high dose the nitrogen-source ingredients totaled 0.2 and 0.4 g/kg/h. They were either wheat hydrolysate alone or half wheat with a quarter each free leucine and free phenylalanine. The resting study had matching high-dose formulations (within printed rounding), four boluses, 0.8 g carbohydrate/kg/h and a 15-minute rather than 30-minute sampling grid. The enriched resting drink was introduced after observing the first eight formulations. Cohort overlap is unknown. [Postexercise Fig. 2 and Fig. 3](https://doi.org/10.1093/jn/130.10.2508) · [Resting formulations and windows](https://doi.org/10.1093/ajcn/72.1.96)

| First 120 minutes | Plain low | Plain high | Enriched low | Enriched high |
|---|---:|---:|---:|---:|
| Observed mean signed curve area, pmol·min/L | 22,531 | 22,183 | 33,213 | 42,340 |
| Relative to CHO-only area of 21,569 | 1.045 | 1.028 | 1.540 | 1.963 |
| Resting response, dose-scaled increments | 1.270 | 1.540 | 1.210 | 1.419 |

The enrolled participants' group-mean curve is integrated above minus below each arm's time-zero mean. The main external preparation forecast predicted enriched/plain ratios .952 and .922, whereas the observations were **1.474 and 1.909**. The predicted high/low change was **.968**, vs **1.295** observed. The matched-cheaper energy and pooled-dose comparators each had mean level error .259 vs .291 for the preparation-specific rule. A resting bar-based ratio sensitivity also ranks the blend below plain at the high dose. Restricting both studies to the second hour gives a favorable direction on that window, but does not resolve the full-window failure. The effect of exercise cannot be separated from carbohydrate exposure, study composition and sampling here.

The paper's whole-study outcome is 180 minutes. The enriched high-versus-low response was reported as +36% (SEM 6%, p<.05); the plain dose comparison was not distinguished. That is not a paired test of the interaction. Preserve the authors' +52%/+107% blend-vs-control figures and the distinct Fig. 3 bar ratios of about +44%/+94%. The source does not establish why those summaries differ. Fig. 3 prints “pmol L⁻¹·3h”; its bars were not converted into two-hour native areas. [Opus freeze](public/transfer/PLAN.md) · [Reconciled calculations](public/transfer/RECONCILE.json)

### What is supported on the positive two-hour endpoint?

A post hoc application of the **previously trained substitution slope**, 0.10222046 log units per gram leucine difference, predicts the two enriched/plain ratios **1.171 and 1.371** when applied to the *per-bolus* recipe at mean body mass (70 kg). It supplies relative source contrasts only. Its use here assumes that each added bolus scales its prepared-mixture response similarly across the window. Phenylalanine, free-versus-bound form and wheat displacement also change; the study cannot identify a leucine mechanism. Applying the very same slope to total grams across all four boluses predicts **1.880 and 3.535** instead. The addition multiplier from earlier work was not used.

For nonnegative insulin, complete observations of the same eight people and linear interpolation on the nominal draw grid, the graphs bound the *average of individual positive areas*. For the lower bound, integrate the positive part of the interpolated group-mean change using low follow-up means and high fasting mean (Jensen's inequality). For the upper bound, the positive increment at a draw is at most the absolute insulin concentration. Its value at time zero is exactly zero. Joining the upper endpoint bounds is conservative by convexity. This needs no invented participants, marginal SEMs or covariance. Each figure ordinate is allowed ±6 native pixels (8.19 pmol/L); neither interval endpoint need be attainable. No excursion between draws or population confidence coverage is assumed.

| Sample positive-area ratio | Outer bounds under reading stress | Per-bolus forecast |
|---|---:|---:|
| Enriched / plain, low dose | 1.213–1.768 | 1.171 |
| Enriched / plain, high dose | 1.577–2.244 | 1.371 |
| High contrast / low contrast | 0.892–1.851 | 1.171 |

At each serving the forecast is closer than a tie under absolute log loss throughout the bounds, even though it **underpredicts** the positive-area ratio throughout. A fixed enrichment multiplier of 1.267 (the geometric mean of both forecasts, using no outcomes) has exactly the same mean contrast error at the two signed point estimates, .281. The dose-sensitive forecast is closer on the signed *change* (.100 vs .258 log error). The positive-area bounds do not establish that the enrichment advantage grows with dose. Indeed any positive per-bolus slope below about .24998 log/g would also beat a tie at both doses throughout these bounds; the success does not select the specific coefficient. For the native additive change-in-differences the stressed positive-area interval spans −1126 to +19,932 pmol·min/L. These are within-sample mathematical comparisons, not population estimates of model accuracy.

## Implication

Retain grams of the specified preparation per serving and the eating schedule as research inputs. Separately measured dose curves can improve on a common calibrated coefficient, including on native levels when a suitable historical control exists. The Oxford data do not show that nonlinear curves improve on separate straight lines. Resting food responses alone failed to transfer the postexercise formulation ordering. To distinguish a generic enrichment flag from a quantitative composition effect, the informative next evaluation would vary the proportion or form of free amino acids independently of dose at a declared carbohydrate load and schedule. Decision D remains open.

Run `python -B reproduce.py`. The standard-library replay operates on a temporary copy and checks the frozen forecasts, raw-coordinate reconstructions, sensitivity and independent calculations. The [source registry](sources.json) identifies the original assets for the optional PDF audit. See [participation and corrections](RECONCILIATION.md) for how the independent readers resolved the obscured wheat marker and the Power wording.