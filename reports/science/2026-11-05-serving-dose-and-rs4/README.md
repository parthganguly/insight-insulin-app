# Serving dose and RS4 formulation made distinguishable predictions

With the same potato-derived resistant starch, the direction of the required correction to a proportional available-carbohydrate forecast changed across recipes. At almost equal available carbohydrate, the enriched cold-pressed bars produced less two-hour insulin area than their carbohydrate ratios predicted. In a baked cookie that replaced available carbohydrate, the carbohydrate ratio already predicted a larger reduction than the study reported. These are ratios of published arithmetic mean participant-positive areas in separate crossover samples. They limit how INSIGHT can combine a serving dose with a shared fibre adjustment. Decision D remains open. [Bar trial](https://doi.org/10.3390/foods9111679) · [Cookie trial](https://doi.org/10.3390/nu9030237)

## What transferred from the wheat bar

We selected the potato series for its two different fibre levels at nearly fixed available carbohydrate. Al-Tamimi et al. supplied the external training contrast. Its two wheat bars each contained 51 g available carbohydrate, with 5 and 20 g total dietary fibre and mean two-hour insulin areas of 8,758 and 3,659 in the study’s units. The enriched/control ratio was 0.418. The authors report trapezoidal incremental area and leave the handling of excursions below baseline unspecified. Ratio transfer to the explicit positive-area target therefore assumes compatible operators. [Wheat trial, Tables 2–3](https://doi.org/10.1155/2010/651063)

Let D denote available carbohydrate grams per serving and F total dietary fibre grams. The generic adjustment multiplies the D ratio by the observed donor ratio after dividing out the donor D ratio. The graded model calibrates the same one donor contrast per unit change in F/D, then applies the fitted factor at the target’s measured or reported input. Neither model used the target cohort’s insulin in its forecasts. The target used labelling software for food composition, while the donor measured total fibre and separately calculated available carbohydrate. Both papers subtract total dietary fibre from total carbohydrate for this input. The marketed ingredient weight and laboratory RS content are separate quantities. [Frozen plan](PLAN.md) · [Exact forecasts](opus/FORECASTS.json)

| Potato bars | Medium / control | High / control | High / medium | Mean absolute log error, first two comparisons |
|---|---:|---:|---:|---:|
| Observed insulin area | 0.682 | 0.635 | 0.931 | |
| Equal response | 1.000 | 1.000 | 1.000 | 0.419 |
| Available carbohydrate | 0.990 | 0.979 | 0.989 | **0.403** |
| Generic wheat adjustment | 0.413 | 0.409 | 0.989 | 0.470 |
| Graded wheat adjustment | 0.199 | 0.092 | 0.466 | 1.580 |

The wheat reference predicted both reductions in the correct direction. Applying its slope to fibre-density differences 1.84 and 2.70 times the training contrast greatly overstated them. The potato study reported a difference from control for both enriched bars (both p < 0.001). The medium and high bars share a significance letter. The paper enrolled 41 randomized participants, with 38 evaluable after completing control and at least one other condition. Figure 2 gives venous counts of 37, 36 and 37. The smaller error for D over the generic factor is a comparison of two correlated point estimates sharing a control. Paired model-error uncertainty is unavailable. [Target Tables 1 and 4](https://doi.org/10.3390/foods9111679) · [Independent arithmetic](sol/independent_results.json)

## Changing the calibration source

We fitted the generic and graded adjustments on the two exposed potato-bar contrasts and transported them to Stewart and Zimmer’s baked cookie, which used the same potato distarch phosphate. Available carbohydrate fell from 36.28 to 12.71 g. Total fibre rose from 0.55 to 24.13 g. Protein and fat were similar. The authors explicitly averaged native positive two-hour insulin area, reporting 229 versus 124 pmol·h/L in 27 and 25 evaluable observations. They used a square-root transformation for the significance test and reported untransformed means. The cookie starch therefore has stronger endpoint alignment with the potato bars than the original wheat donor. [Cookie Tables 1 and 3](https://doi.org/10.3390/nu9030237) · [Extension plan](EXTENSION_PLAN.md)

The observed cookie ratio was **0.541**. Available carbohydrate alone forecast **0.350**. The potato-trained generic and graded adjustments pushed it farther down to **0.234** and **0.115**. The descriptor was new relative to available carbohydrate, yet its predicted effect compounded the portion reduction. As a post hoc comparator, the energy calculated from the three available macronutrients predicted **0.523** and published calories predicted **0.604**. Published calories and the calculated energy proxy also differ for the cookie control. These results concern total fibre, food composition and the served recipe together. [Cookie predictions](sol/cookie_results.json)

## A common downward adjustment imposes a testable portion limit

We checked a broader model after seeing the contrasts. It allows any positive nonincreasing function g of fibre density, any common dose exponent a, and a different absolute scale in each study. Its food score is `study scale × D^a × g(F/D)`. The cookie’s fibre-density range (0.015 to 1.899 g/g) contains the entire high-bar range (0.056 to 0.852). Consequently, as the recipes move from control to enriched, g must fall at least as much proportionally for the cookie as for the bar.

For each study let r be the observed area ratio and d its available-carbohydrate ratio. Exact agreement requires `r_cookie / d_cookie^a ≤ r_bar / d_bar^a`. Substituting the observed ratios gives **a ≤ 0.1544** for the high bar and **a ≤ 0.2222** for the medium bar. At fixed food composition, the tighter bound permits at most a **1.113-fold** rise in area per doubling of available carbohydrate. This bound uses the trial means and model form alone. Neither another coefficient nor a nonlinear monotone function of the same fibre density avoids it. The endpoint of the allowed interval is attainable for the reported bar and cookie contrasts. [Executable restriction](nested.py) · [Independent derivation](sol/class_verification.md)

We compared this prediction with the retained seven-person Wolever–Bolognesi crossover. When the solid-food available carbohydrate rose from 25 to 50 g, the positive two-hour insulin-area ratios were **1.53 bread, 1.96 spaghetti, 2.14 barley and 2.27 potato**. All four still exceed the cap of 1.118 after allowing for printed rounding. The 50-to-100 g barley comparison is the near exception: its rounding range overlaps that wider cap. Treating a given food’s fibre density as fixed across its portions is an assumption about the solid food. Subjects kept their chosen accompanying beverage constant, including coffee with milk for four participants. These central-value constraints carry neither participant-level confidence coverage nor a claim about a population interaction. They combine the same total-minus-fibre carbohydrate convention across different food analyses and cohorts. [Original portion study, Table 2](https://doi.org/10.1093/jn/126.11.2798) · [Source-linked calculations](nested_results.json)

## Native area levels and the preparation difference

We next checked whether retaining protein and fat could improve forecasts using inputs obtainable for a serving. The baked-cookie control supplied an external scale of 13,740 pmol·min/L (229 pmol·h/L × 60). We applied the same scale per unit of each candidate input to two maize-RS4 scones in a separate study. No scone insulin measurement entered these predictions. The scone paper reports two-hour trapezoidal iAUC in 32 participants. It distinguishes satiety net area from insulin iAUC, but does not explicitly describe clipping below baseline for insulin. Numerical comparison uses its reported endpoint. The transfer also changes laboratory, assay or specimen context and food composition. [Native plan](NATIVE_PLAN.md) · [Scone trial, Tables 1 and 3](https://doi.org/10.3390/nu10020129)

| Cookie-control calibration | Scone control | Fibre scone | Two-arm native MAE | Fibre/control ratio |
|---|---:|---:|---:|---:|
| Observed, pmol·min/L | 19,229 | 12,592 | | 0.655 |
| Constant external area | 13,740 | 13,740 | 3,319 | 1.000 |
| Available carbohydrate D | 14,694 | 10,945 | 3,091 | **0.745** |
| D + protein grams | 15,146 | 11,549 | **2,563** | 0.763 |
| 4D + 4 protein + 9 fat | 22,232 | 18,296 | 4,353 | 0.823 |
| Published energy | 20,991 | 17,279 | 3,224 | 0.823 |

Protein reduced absolute error relative to D alone in both arms under this calibration. D alone came closest to the observed preparation ratio. All these forecasts underestimated the absolute decrement of 6,637 pmol·min/L. When the cold-pressed control supplied the scale, the three-macronutrient energy proxy gave the lowest two-arm error (3,080), versus 4,622 for D. The choice of external control changes absolute levels and cancels out of the within-study forecast ratio. The favorable cookie energy result therefore has a concrete counterexample on the scone ratio. The measurements support carrying these low-cost comparators forward separately for levels and for food substitutions. [Every forecast and decrement](sol/native_results.json)

## What remains identifiable

Du et al. tested baked bars with the same potato ingredient at nominal 0, 10 and 20 g levels. The published abstract reports no statistically significant difference in insulin iAUC. The registry supplies the insulin endpoint and time grid. We could not recover the three numerical insulin means and actual per-serving D and F needed for scoring. We retained this study as qualitative coverage. Earlier Steele dose results belong to an already exposed study family and provide no new cohort here. [Du publication](https://doi.org/10.1039/C9FO02674F) · [Trial registry](https://clinicaltrials.gov/study/NCT03844503) · [Acquisition record](du_acquisition.json)

For a future positive-area prediction, distinguish replacing carbohydrate in a recipe from increasing the portion of the same recipe. A transferable food-level model will need to preserve the latter response while forecasting the former. The cheap protein and energy inputs have earned further comparisons on absolute levels. Neither has earned a common preparation adjustment. The prior useful references, native forecasts and preparation-specific gains, and the failed amylose transfers, remain in the linked history. [Previous checkpoint](../2026-11-04-source-process-transfer/README.md)

Run `python -B reproduce.py` for the offline checks. The review ZIP includes the same runnable files. [Exposure, sources and participation](RECONCILIATION.md)
