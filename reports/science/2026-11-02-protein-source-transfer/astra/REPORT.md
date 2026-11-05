# Does a whey-specific dose response travel between studies?

In Gunnerud's 25 g glucose drinks, the whey slope learned from Thondre's 50 g glucose drinks reduced error at each of the three whey doses relative to predicting no change. Its mean absolute log-ratio error was 0.110. Lan's existing protein curve achieved 0.109 and the slope learned jointly from Thondre's pea and whey arms achieved 0.083. The external test supports using protein amount as a predictor in these whey drinks. It offers no empirical reason to prefer this particular whey-only calibration over both alternatives.

| Added whey protein, g | Observed area / glucose area | Whey-trained prediction | Pooled-source prediction | Lan prediction |
|---:|---:|---:|---:|---:|
| 4.5 | 1.301 | 1.203 | 1.138 | 1.150 |
| 9 | 1.205 | 1.405 | 1.276 | 1.228 |
| 18 | 1.644 | 1.810 | 1.552 | 1.367 |

The whey slope fits the two outer doses better than Lan while overshooting the middle dose. The target group's 4.5 g point mean exceeds its 9 g mean. Their Tukey groupings overlap. These monotonically increasing forecasts cannot reproduce this reversal, and the table cannot establish a reversal in the underlying population means. Only 18 g was distinguished from the glucose control by the source's adjusted test. The study reported a significant overall linear dose association.

| Predeclared dose rule | Whey-only fit | Pea-only fit | Pooled fit | Lan protein | No change |
|---|---:|---:|---:|---:|---:|
| Actual protein grams | 0.10953 | 0.16337 | 0.08277 | 0.10895 | 0.31578 |
| Protein per gram of glucose | 0.31649 | 0.07907 | 0.17319 | 0.08036 | 0.31578 |

The second rule doubles the dose-coordinate when moving from 50 to 25 g glucose. For instance, it evaluates the highest target dose at 36 g in the training setting, beyond the observed 16.2 g whey maximum. The original Lan interpolation stops at 30 g and supplies no forecast at 36 g. The predeclared sensitivity holds the 30 g Lan factor constant at this dose. That rule eliminates the whey forecast's advantage over no change. These data cannot separate a true glucose-load interaction from differences in formulation, cohort or assay. The sensitivity does not warrant selecting a pea coefficient for whey. Both cohorts included just one glucose load each.

**What was frozen.** The Thondre development data comprise the 120-minute glucose reference and two area means for each protein source. We used actual protein grams rather than branded powder grams, fitted one slope per comparison, and anchored the zero-addition ratio at 1. This was a source-only fit, using an unweighted squared-error loss on area ratios. Whey concentrate contributed 0.6/1.2 g fat in the two training arms. A fitted whey coefficient can absorb those formulation differences. Lan's reference curve also used whey, so its comparison tests transport of different empirical calibrations rather than whey specificity alone. No target control insulin is needed to predict a ratio. [Thondre et al., Tables 1 and 4](https://doi.org/10.1371/journal.pone.0340386)

**Target and uncertainty.** Gunnerud's separate Lund crossover served 25 g available glucose in water, with 0, 4.5, 9 or 18 g protein from spray-dried whey isolate. Twelve healthy volunteers enrolled. Eleven entered the analysis after the authors excluded one participant based on their insulin responses. Table 1 supplies native 0–120 min serum insulin iAUC means and SEMs. The authors calculated each participant's area by trapezoids. The calculation paragraph does not explicitly specify treatment of below-fasting values. We use the area column and obtain the reported rounded changes of +30%, +21% and +64%. The published statistical comparisons concern conditions. Without covariance, the printed SEMs cannot resolve uncertainty for competing forecasts' shared-reference errors. There are three related test contrasts in one cohort. [Gunnerud et al.](https://doi.org/10.1038/ejcn.2013.88) · [Author-uploaded original, Table 1](https://www.researchgate.net/publication/236599451_Effects_of_whey_proteins_on_glycaemia_and_insulinaemia_to_an_oral_glucose_load_in_healthy_adults_A_dose-response_study)

The prior abstract had disclosed a significant high-dose increase. The recorded predictions preceded inspection of the target's exact three area means. The original-language table heading in the HTML extraction has ambiguous unit glyphs, which cancel in the within-study ratios. The observed ratio is the ratio of group mean areas and does not establish absolute area transport or personal prediction. The 2026 training publication postdates the 2013 target, so this is retrospective calibration transfer. The distinct studies and investigators permit evaluating transfer without fitting to Gunnerud.

Run `python -I -X utf8 evaluate.py --check` with the five factual files in this directory. The script reproduces all predictions from the archived training means, verifies the prediction file's SHA-256, then checks the scoring under both dose rules. Keep the frozen JSON bytes as supplied when publishing the package.

Source-locator correction. The original plan labels the development composition table as Table 2. The protein grams are in Thondre Table 1. Table 4 supplies the insulin areas. The frozen numbers use those values.
