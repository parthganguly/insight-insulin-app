# Gallagher mixed-muffin crossover

Gallagher et al., AJCN 2016, PMID 27099245, DOI 10.3945/ajcn.115.129866. Of 29 randomized healthy adults of mixed weight, 27 completed all three meals. Serum insulin sampled fasting and at 30-minute intervals through 240 minutes. Each breakfast comprised three small muffins. The sweeteners were matched for sweetness. Cream accompanied the fructose (24 g) and sucrose (32 g) muffins to bring fat doses close together. Participants could have tea/coffee with optional milk and replicated this intake on later visits. The full text reports serum insulin, not a glucose proxy. [Original article](https://doi.org/10.3945/ajcn.115.129866).

| Per meal, Table 1 | Fructose | Sucrose | Sucralose |
|---|---:|---:|---:|
| Energy, kcal | 1101 | 1128 | 998 |
| Protein, g | 17 | 17 | 19 |
| Fat, g | 67 | 66 | 67 |
| Total carbohydrate, g | 109 | 119 | 80 |
| Starch, g | 57 | 54 | 80 |
| Sugars, g | 52 | 65 | 0 |

Use published total carbohydrate as D because it is the reported sum of starch and sugars at the displayed gram precision. Fibre is not separately reported. The 0.1 g sucralose was provided in 10 g Splenda; its approximately 10 g maltodextrin is already inside the 80 g starch. The trial registry lists slightly different intended input doses. Calculations use the published recipes. [Primary methods and Table 1](https://ajcn.nutrition.org/article/S0002-9165(23)04172-2/fulltext) and [registry](https://www.anzctr.org.au/Trial/Registration/TrialReview.aspx?id=368062).

| Measured serum insulin | Fructose | Sucrose | Sucralose | F/S | Sucralose/S |
|---|---:|---:|---:|---:|---:|
| Fig 4, 0–240 min author iAUC, μIU·h/mL (mean ± marginal SEM, approximate) | 92 ± 14 | 146 ± 22 | 128 ± 20 | 0.632 | 0.877 |
| Fig 3, signed 0–120 min area reconstructed from mean concentrations, μIU·min/mL | 3248 | 4521 | 4045 | 0.718 | 0.895 |

The paper specifies trapezoidal AUC and iAUC without giving a below-baseline clipping rule. Fig 4 is the authors' four-hour iAUC operator. They report differences between fructose and sucrose (iAUC p<0.001) and fructose and sucralose (p=0.006). The sucrose and sucralose comparison did not reach significance. Comparisons use repeated measures with log-transformed insulin; marginal SEMs on graph bars cannot give paired uncertainty. Fig 3 is a signed integral of plotted means. No participant-level positive two-hour area was recovered. Pixel digitization at x=40,82,125,167,210 for early readings is reproducible in calculate.py. The three time-zero traces overlap at this resolution. Allowing ±2 vertical pixels independently per reading changes a signed 120-minute area by at most ~161 μIU·min/mL. This reading sensitivity excludes sampling variability. For Fig 4 ±1 pixel at a bar top corresponds to ~1.28 μIU·h/mL. [Original Fig 3](https://ars.els-cdn.com/content/image/1-s2.0-S0002916523041722-gr3_lrg.jpg) and [Fig 4](https://ars.els-cdn.com/content/image/1-s2.0-S0002916523041722-gr4_lrg.jpg).

| Prespecified food-input model | Pred F/S | Pred Sucralose/S | Mean abs log error on Fig 4 | Mean abs log error on Fig 3 early area |
|---|---:|---:|---:|---:|
| Equality | 1.000 | 1.000 | .295 | .221 |
| Total carbohydrate | .916 | .672 | .319 | .264 |
| Starch + glucose + R × fructose | .709 | .876 | .058 | .017 |

R=1.2/8.1 from the 25 g donor sugar pair. The starch weight of 1 and the nominal 50:50 split for sucrose were prespecified. The comparison concerns these three whole breakfasts and two overlapping contrasts in a single cohort. The recipes' different starch, fat, protein and energy preclude attributing contrasts solely to sweetener chemistry. A finding in these high-fat meals cannot establish an effect size for normal meals in general, a dose-by-matrix interaction, or sample-level prediction.

**Acquisition and reproducibility**. The published full text and captions were available via the [author-posted copy](https://www.researchgate.net/publication/301563100_Fructose_acute_effects_on_glucose_insulin_and_triglyceride_after_a_solid_meal_compared_with_sucralose_and_sucrose_in_a_randomized_crossover_study). The two primary figures downloaded from the publisher CDN are hashed in results.json. The article identifies Supplemental Figures 6–9 as scatterplots corresponding to its four-hour insulin iAUC. The historic supplementary-material URL returned HTTP 403; presumed Elsevier supplement PDF, document and zip paths returned 404. No appendix bytes or participant linkage were verified. The public panels.py replays the observed ratios and model errors from the recorded figure coordinates. The local acquisition script also checked the original figure hashes. The JSON also lists optional total and signed four-hour integrations of Figure 3 as cross-checks; use Figure 4 for the published incremental endpoint.
