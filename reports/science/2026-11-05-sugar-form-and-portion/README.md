# Sugar identity improved a prepared-meal contrast and preserved the tested portion response

In Gallagher’s crossover, three muffin breakfasts contained different amounts of starch as well as different sweeteners. A rule calibrated on 25 g glucose and fructose drinks predicted fructose/sucrose and sucralose/sucrose breakfast insulin-area ratios of **0.709 and 0.876**. Counting all carbohydrate grams equally predicted **0.916 and 0.672**. The corresponding ratios were **about 0.718 and 0.895** on the signed two-hour group curves and **0.632 and 0.877** on the authors’ four-hour incremental areas. This supports using known recipe composition for specified substitutions. The serving-size comparison comes from a separate dose study in drinks. No study here tested all three muffins at multiple portions. [Gallagher et al., Table 1 and Figures 3–4](https://doi.org/10.3945/ajcn.115.129866) · [Every external forecast](panels_results.json)

## How the prediction was made

The development data were the 25 g pure glucose and fructose arms in Brenda Lee’s University of Toronto thesis. In eight healthy participants the arithmetic mean positive incremental plasma insulin areas over 0–120 min were 8.1 and 1.2 nmol·min/L. We set the weight on glucose grams to one and the weight on fructose grams to their ratio, **R = 0.148**. The primary score for a sugar drink was `G + R × F`. Sucrose contributed one half its ingested weight to each component. To test cooked mixed foods, we counted the stated starch as glucose-equivalent grams before adding the named sugars. This last step is an additional preparation assumption. The number 0.148 describes a training contrast in one cohort. [Thesis, Table 3-1, printed page 34](https://www.collectionscanada.ca/obj/s4/f2/dsk2/ftp04/mq28791.pdf) · [Frozen protocol](PLAN.md)

The coordinator and Sol both inspected the original table scan, including the footnote identifying 50 g glucose plus 50 g fructose. One participant omitted the 50 g pure fructose test after symptoms at 25 g. Five reported some symptoms at 50 g. Samples were taken fasting and at 15, 30, 45, 60, 90 and 120 min. The thesis excludes area below fasting for each person. Its normalized figures use a fitted bread reference, whereas this experiment uses ratios of arithmetic native means. We attribute the numerical rows to the thesis. The 1998 journal abstract describes 13 conditions and a same-dose bread index. The thesis has 14 conditions, including 75 g bread. The publication’s full numerical table remains unverified and supplies no independent replication here. [Journal report](https://doi.org/10.1038/sj.ejcn.1600666) · [Admitted native inputs](lee_inputs.json)

## Formulation and portion were scored separately

| Held-dose drink contrast | Observed mean-area ratio | Component forecast | Equal carbohydrate grams |
|---|---:|---:|---:|
| Fructose / glucose, 50 g | 0.147 | 0.148 | 1.000 |
| Sucrose / glucose, 50 g | 0.454 | 0.574 | 1.000 |
| Sucrose / glucose, 100 g | 0.694 | 0.574 | 1.000 |
| Free 1:1 mixture / glucose, 100 g | 0.591 | 0.574 | 1.000 |

Mean absolute log error across these four prespecified contrasts fell from **0.899 to 0.115**. Ignoring fructose entirely gave a partial error of 0.197 on three contrasts and a zero prediction for the positive pure-fructose arm. Across the five observed doubling steps in glucose, fructose and sucrose, the proportional-dose rules both scored **0.112** when the three foods were weighted equally. Their within-recipe predictions are identical by construction. An exponent of 0.778 learned independently from the 25-to-100 g solid-food portions in Wolever–Bolognesi worsened portion error to **0.208**. Thus resolving sugar composition improved formulation error without erasing the useful proportional-dose behavior in these drinks. The dose-specific errors and shared arms qualify the study-level averages. [Independent reconstruction](sol/independent-results.json) · [Original solid-food dose study](https://doi.org/10.1093/jn/126.11.2798)

Numerical levels require an insulin reference. With the measured glucose-25 area setting the scale and linear portion scaling, the constituent model’s mean absolute error was **1.05 nmol·min/L** across the six 50 or 100 g sugar arms, versus **7.80** for carbohydrate grams alone. These are calibrated levels in the same cohort. Neither metric predicts a person’s response to a meal. [Levels and errors by arm](graded_results.json)

Adding *measured* 50 g glucose and 50 g fructose areas gave 18.7 nmol·min/L versus 18.9 observed for their free mixture and 22.2 for 100 g sucrose. At 50 g sucrose the measured sum of the two 25 g arms gave 9.3 versus 7.4 observed. The glucose component alone, 8.1, came closer there. At 100 g, free mixture and sucrose had the same nominal composition but different sample means. The thesis did not distinguish those two means in its reported comparisons. This evidence supports retaining the measured-sum benchmark alongside its failures. [Component comparison](graded_results.json)

## Where the drink result transferred

| Separate study | Endpoint used | Observed ratios | Frozen forecasts |
|---|---|---:|---:|
| Grüneis, 30 g sucrose / glucose | Mean individual positive two-hour area | 0.785 | 0.574 |
| Jameel, 50 g fructose / glucose and sucrose / glucose | Authors’ plotted percentage-change AUC, Fig. 1D | ≈0.179, 0.829 | 0.148, 0.574 |
| Eckstein, 1 g/kg fructose / glucose and free 1:1 mixture / glucose | Signed area under displayed 0–120 min curves | ≈0.305, 0.735 | 0.148, 0.574 |

In 27 healthy men, Grüneis et al. reported positive-area means of **2,577 ± 278** for glucose and **2,024 ± 219** for sucrose (SEM). Equality gave lower absolute log error than the constituent rule, **0.242 versus 0.313**. A direct sucrose/glucose reference at 25 g from Lee also fell short (forecast 0.580). The glucose-only estimate of 0.5 was farther away. The authors’ paired comparison gave p = 0.053. Marginal SEMs do not quantify uncertainty in the ranking of models. The insulin concentration axis and area-caption units conflict, limiting absolute calibration. [Grüneis et al., Results and Figure 4](https://doi.org/10.1002/mnfr.202000472) · [External study plan](EXTERNAL_PLAN.md)

Jameel’s three-arm study replicated the gain for distinguishing pure fructose, while equality again came closer for sucrose on the author-displayed area summary. An empirical sugar-identity reference also retained that pure-fructose gain. Figure 1C represents percent changes at unequal time intervals. Our signed integrations of that panel gave ratios of approximately 0.151 and 0.583, different from Figure 1D, especially for sucrose. We keep both operators and the discrepancy. Neither supplies participant-positive insulin area in native units. [Jameel et al., Figure 1](https://doi.org/10.1186/1476-511X-13-195) · [Figure readings](jameel_markers.json)

Eckstein’s 15-person crossover used 0.5 g/kg of each constituent in the free mixture. The two-contrast central error favored the component rule (0.485 versus 0.747 for equal grams), though it underestimated both ratios. Interpolating the *measured same-study whole-dose* glucose and fructose curves instead predicted a mixture/glucose ratio of **0.653**, closer to 0.735. The free-mixture point is close enough to the equality-versus-component decision boundary that broader graph-reading scenarios change the ranking. The study does not explicitly label the plotted central statistic. Its signed curves, including the negative sucralose-control area, are separate from participant-positive iAUC. [Eckstein et al., Figure 1C](https://doi.org/10.3390/nu13114095) · [Reading and interpolation checks](panels_results.json)

Two separate 35 g reference arms provide a descriptive absolute-level check. The response was 1,373 mU·min/L to sucrose and 1,089 to the free mixture, in different cohorts and with different assays. Using the Grüneis glucose-30 calibration gives 1,726 for either nominal mixture under the constituent rule and 3,007 from undifferentiated grams. This post-result calculation assumes the Grüneis area has the unit implied by its concentration axis. Using the 2017 study’s stated conversion, its free-mixture mean was 7.56 nmol·min/L, versus 6.51 extrapolated from Lee’s glucose-25 reference. These comparisons cannot isolate a difference caused by the chemical bond. [Sucrose reference](https://doi.org/10.3945/ajcn.112.042184) · [Free-mixture reference](https://doi.org/10.1017/jns.2016.44)

## A prepared meal and the limits of the fitted weight

Gallagher served sweetness-matched breakfasts to 27 adults. The fructose, sucrose and sucralose recipes contained 57, 54 and 80 g starch, respectively, plus 52 g fructose, 65 g sucrose and essentially no sugar in the sucralose recipe. Maltodextrin in the sucralose carrier is already in its starch total. The paper’s carbohydrate totals equal starch plus sugars at its displayed precision. Cream and other recipe components differed. No insulin measurement from this cohort was used to predict its contrasts. [Original recipe and outcomes](https://doi.org/10.3945/ajcn.115.129866) · [Frozen meal test](MIXTURE_PLAN.md)

| Two-contrast mean absolute log error | Signed 0–120 mean curve | Reported 0–240 iAUC |
|---|---:|---:|
| Equal response | 0.221 | 0.295 |
| Total carbohydrate | 0.264 | 0.319 |
| Published calories | 0.159 | 0.222 |
| Count starch and glucose, give fructose zero weight | 0.060 | **0.048** |
| Starch and sugars with Lee’s fructose weight | **0.017** | 0.058 |

The improvement over carbohydrate grams persisted for both four-hour contrasts in independent figure readings. Early estimates came from overlapping baseline markers. Sol’s wider reading scenarios can reverse some two-hour comparisons. At four hours, published energy was especially close for sucralose/sucrose (0.885 forecast), despite a much larger fructose/sucrose miss (0.976 forecast). Setting the fructose weight to zero also improved the four-hour average. The measured 0.148 weight itself therefore has weaker support than the value of distinguishing starch and sugar replacements. [Prepared-meal comparisons](panels_results.json) · [Independent figure checks](sol/MIXTURE-REVIEW.md)

## What a label can support

For the linear model, write the score as `D − (1 − R)f`, with D the carbohydrate grams and f the grams assigned to fructose. If only total sugars T are known, the recipe permits f anywhere between 0 and T. For Gallagher this produces ranges of **0.544–1.713** for fructose/sucrose and **0.672–1.257** for sucralose/sucrose, at the frozen weight. The actual ingredient amounts made the forecasts specific enough to test.

The earlier potato cookie gives a sharper limit. At a proportional portion response, even allowing every assignment of the sugars and any common fructose weight from zero to one yields a maximum cookie/control ratio of **0.513**, below its observed **0.541**. At the learned 0.148 weight the maximum is 0.480. The bound changes under a different portion curve. In the earlier maize scone, the reported inputs admit ratios on either side of its observed value. The previous scone protein gain for absolute levels and its calibration sensitivity therefore stand as separate evidence. The earlier common-fibre/portion restriction also remains a result about a model class and sample means. [Label bounds and nonlinear sensitivity](label_results.json) · [Prior RS4 checkpoint](https://github.com/parthganguly/insight-insulin-app/tree/3627df2d639e6b382f5b64cc1339d916d77ecbde/reports/science/2026-11-05-serving-dose-and-rs4)

**Decision D remains open.** Carry the ingredient-specific rule as a comparator where the recipe identifies starch and named sugar grams. Its next discriminating test is a prepared recipe served at more than one portion with numerical positive two-hour insulin areas and quantitative substitutions. It would reveal whether the portion behavior observed in drinks survives in the same food where the formulation forecast helped. The existing evidence supports neither a common consumer adjustment nor an absolute food-only scale.

Run `python -B reproduce.py` for the offline replay. [Corrections, source identity and participation](RECONCILIATION.md)
