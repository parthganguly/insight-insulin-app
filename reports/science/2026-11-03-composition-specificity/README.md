# Does measuring leucine fraction or hydrolysis improve the insulin forecast?

**At fixed total free amino acids, more leucine predicted a rise in insulin area that the measured mean curves did not show.** In a second product family, higher leucine and greater hydrolysis both pointed away from the best-performing simple reference. Detail helped in one hydrolysate pair but worsened accuracy over the full panel. Retain empirical family references; these findings do not justify a universal upward adjustment for either field.

## Fixed total and form, different amino-acid composition

Katsanos et al. gave a single fasting oral bolus of free essential amino acids in a noncaloric vehicle. The base mixtures contained 6.726 g EAA and either 1.721 or 2.790 g leucine. Raising leucine displaced other EAAs; the phenylalanine tracer also made a small contribution. Young (8/arm) and older (10/arm) participants were in separate treatment groups. The original arterial insulin figure supplies group means and SEs; the paper does not print an insulin area or an SE of that area. Its significant time effect and nonsignificant group effect are separate from the muscle protein synthesis result. [Original trial, Table 2 and Figure 4](https://doi.org/10.1152/ajpendo.00488.2005)

Before reading the figure, Opus froze three forecasts for the ratio of the 41%- to 26%-leucine arm: equality (1.000), the high-enrichment label (1.267, the geometric mean of two previous per-bolus forecasts in the cyclist analysis), and the externally trained substitution rule exp(0.10222046 × change in leucine grams). The last gives **1.115**, using the exact 1.069 g change. The whey- and soy-trained slope sensitivities give 1.058 and 1.163. The comparison transfers the substitution rule to a carbohydrate-free recipe. The earlier addition multiplier was never used. A flag for *any* free-AA enrichment assigns both drinks the same value; a flag specifically for the higher-leucine recipe can assign them different values. With only one nonzero fraction contrast, a freely fitted label could duplicate any chosen slope at this design point. **These frozen forecasts can nevertheless be compared.**

| Two-hour measure, mean of the two prefeed draws as baseline | Young | Older |
|---|---:|---:|
| Signed area of standard / higher-leucine arm, µIU·min/mL | 390 / 348 | 405 / 362 |
| Higher/standard signed-area ratio | .891 | .894 |
| Absolute log error, equality | .115 | .112 |
| Absolute log error, quantitative substitution | .225 | .222 |
| Absolute log error, fixed high-enrichment multiplier | .352 | .349 |
| Higher/standard ratio after clipping the group-mean curves at baseline | .951 | .850 |

All four group curves increased early. Each higher-leucine arm had a smaller central signed two-hour area than its comparator. The same ordering holds with the time-zero-only baseline. Averaging two basal draws was an analysis choice after source inspection, and the point results are descriptive. Under ±0.25 PDF point displacement of each marker (about .047 µIU/mL), the signed-area ratio stays below one in both strata. A deliberately wider ±0.25 **µIU/mL** stress allows a ranking change. These are different reading allowances; neither accounts for sampling. Negative tails also change the signed long-window result: with the two-draw baseline the older 0–210 ratio is about 1.12. Results over 210 minutes remain separate. [Frozen plan](public/transfer/PLAN.md) · [Native curve reconstruction](astra/README.md) · [All windows and forecasts](public/transfer/RESULTS_v2.json)

### Why even the best point forecast cannot be declared the winner for participant-positive area

Signed integration of the mean curve commutes with averaging if the grid is complete. Clipping each individual above their own baseline does not. The available evidence gives more than an outer interval that happens to include 1. We constructed **explicit examples with identical marginal means and SEs at every sampled instant through 120 minutes** and different rankings for participant-positive area.

Within each arm of size n, k=n/2−1 synthetic values were set to µ + SE·sqrt((n−1)(n−k)/k), the remainder to µ − SE·sqrt((n−1)k/(n−k)). These are nonnegative at every draw, reproduce the digitized mean and conventional sample SEM, and require no participant records. From two aligned prefeed draws, the higher values after feeding either stayed with the same rows or went to a disjoint set of rows. Every example integrates each row's linearly interpolated positive change above its own two-draw baseline, then averages. Only the cross-time assignment changes: these are mathematical witnesses, not reconstructions of the actual volunteers. They impose the published marginals, not the unreported covariance or all inferential test statistics.

| Age | Examples of attainable higher/standard mean participant-positive ratios | Consequence |
|---|---:|---|
| Young | 0.757 and 1.149 | Equality wins in the first example; the 1.115 forecast wins in the second. |
| Older | 0.708, 1.173 and 1.488 | Equality, the frozen slope and the fixed 1.267 multiplier can each be closest. |

The examples are neither confidence limits nor extremal feasible values. Figure-reading precision and a larger simulation cannot recover the missing within-person associations. The decisive extra summary would be **each arm's arithmetic mean positive 0–120 area calculated per volunteer**, with the baseline and crossing rule, n, and dispersion if population uncertainty is wanted. Raw participant records are unnecessary. [Executable construction](panel/witnesses.py) · [Independent verification](sol/panel-independent-verification.md)

## Three hydrolysed products, with a separate intact-casein reference

Farup et al. administered 20 g protein in flavored 500-mL solutions in a randomized four-way crossover. Five men contributed to high DH, medium DH and casein; the low-DH occasion for one man was excluded after water consumption. Table 1 reports protein by nitrogen × 6.38, amino-acid composition, and OPA-assayed degree of hydrolysis (% cleaved peptide bonds). Fat and the rest of the amino-acid profile also varied. Low DH delivered approximately 1.6 g fat vs .026 g for medium and high DH using the paper's as-is composition. The reported insulin AUCs are on the source's arbitrary scale for its pre-to-120-minute sampling protocol. Insulin concentrations were log-transformed for the longitudinal analysis, and the curve is plotted as geometric means. The numerical AUC's baseline, transformation and integration recipe are unspecified. The mean participant-positive area cannot be reconstructed from it. [Original study, Table 1 and Figure 4B](https://doi.org/10.1186/s40064-016-1995-x)

| Product | DH (%) | Leucine at 20 g protein (g) | Reported insulin AUC (95% CI) |
|---|---:|---:|---:|
| High DH whey | 48 | 3.24 | 210.6 [133.3, 287.9] |
| Medium DH whey | 27 | 1.60 | 226.0 [61.6, 390.4] |
| Low DH whey | 23 | 1.96 | 217.1 [124.1, 310.1] |
| Intact casein | Unreported | 1.84 | 69.2 [−6.2, 144.7] |

Each whey AUC differed from casein in the paper; the whey AUCs were not statistically separated. Individual time points did distinguish some whey conditions. None of those statements is evidence of physiological equivalence or a constant timing profile.

We compared the same three within-whey pairs, using the paper's positive printed AUC estimates as supplied. To get a numerical DH forecast without fitting these outcomes, the Power 45 g, three-hour WPH/WPI mean ratio 10.8/7.6 was spread in log space over the reported 30 percentage points of DH. Treating intact whey as zero additional industrial hydrolysis, and transferring dose, operator and protocol, are assumptions. This stress test is not a validated assay-response function. The donor form test gave p=.21. We also applied the frozen leucine slope to the Table 1 grams, alone and combined with DH. Combining these terms may count overlapping information. [Power trial](https://doi.org/10.1007/s00726-008-0156-0)

| Model | Mean absolute log error, three within-whey pairs |
|---|---:|
| Same response for each whey hydrolysate | **.047** |
| Quantitative leucine | .159 |
| Quantitative DH | .215 |
| DH with 20/45 serving-size scaling | .120 |
| Both leucine and DH | .323 |

**Why changing positive weights cannot rescue the whole panel.** For three products the mean of the three absolute log-ratio errors equals two-thirds of the range of their signed log residuals. High DH has *both* more leucine and greater DH than medium, yet it has the smallest reported AUC and medium the largest. Any positive-valued score nondecreasing in these two inputs must therefore have mean error at least the tie's error **plus (2/3)·log(predicted high/medium)**. A flat mapping can tie the benchmark. This restriction is on this metric and these published point estimates, with widely overlapping uncertainty. It does not establish a universal failure of measured form, a direct causal coefficient, or how the proteins would respond in an ordinary meal.

The middle comparison is informative: medium/low was 1.041, the DH-only forecast was 1.048, equality was 1, and the leucine-only forecast was .964. A whey-hydrolysate label alone predicts equality for that pair. Broader family information carried useful level differences: an external whey-hydrolysate/casein ratio of 47.5/36 = 1.319 predicted the direction of all three whey/casein contrasts (observed 3.04–3.27), although it underestimated their size. Its mean log error across *all six* source pairs was .458 vs .597 for universal equality. Using the separate Swiss intact-whey/casein ratio was a different matrix and form sensitivity. These family forecasts require prior human measurements; none supplies a food-input-only native AUC. The developmental family extension centers the within-whey log adjustments so that upgrading the three whey products does not secretly recalibrate their average reference. Casein receives no invented DH measurement. [Numerical comparisons](panel/form.json)

## A narrow favorable comparison at a common time

Glynn et al. tested 10 g free-EAA mixtures containing 1.85 vs 3.50 g unlabeled leucine in young adults; the Table 2 tracer amounts add .10 vs .19 g. At 30 minutes the reported concentrations were 103 vs 92 pmol/L and the respective baselines were 30 vs 33. The higher/standard *increment* ratio was **59/73 = .808**, whereas the ratio of actual 30-minute concentrations was .893. The Katsanos young-group 30-minute increment ratio of .969 transferred more closely to .808 than equality did (log errors .181 vs .213). Rescaling the donor's log ratio by 1.65/1.069 predicted .952, error .164. With the two-draw donor baseline the direct prediction was closer to one and its advantage smaller. The timing-matched donor had already been measured in humans and comes from the same institution. The earlier ratio, the 30-minute target means, and their selection were exposed; this one point is supporting evidence for a timing-matched comparison. At 60 minutes only the enriched arm had a printed numeric value here. A 30-minute change, a maximum and a positive two-hour area remain separate endpoints. [Glynn trial, Table 2 and insulin Results](https://doi.org/10.3945/jn.110.127647) · [30-minute comparison and tracer sensitivity](panel/early.json)

## INSIGHT decision

Keep the accepted Oxford native-level improvement and its stronger straight-line comparator. The earlier cyclist result still supports the two specified enrichment contrasts in that sample. It supplies no portable reason to raise a consumer score for added leucine or a higher DH. The current two-hour evidence favors retaining **preparation-specific references and the simpler same-class comparison** over requiring these measurements. Decision D remains open. A future test of a freely fitted fraction rule needs another independent fraction contrast on a comparable substrate; a comparison of already frozen forecasts needs an admissible outcome. These are distinct requirements.

Run `python -B reproduce.py` from the study directory. The portable replay uses the retained public aggregate inputs and includes independent calculations. Optional original-source checks and the exact access limitations are in [the source registry](sources.json) and [the participation record](RECONCILIATION.md).