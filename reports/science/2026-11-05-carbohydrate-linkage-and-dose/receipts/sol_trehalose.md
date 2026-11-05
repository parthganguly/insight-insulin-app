# Independent trehalose verification

Primary source: https://pmc.ncbi.nlm.nih.gov/articles/PMC5292800/ . Original full XML independently acquired from EuropePMC. Supplementary ZIP request timed out; no supplementary evidence claimed. TREHALOSE_PLAN was read before numeric extraction; study identity and design were already supplied. Receipt records original XML SHA256. Self-contained stdlib verify.py reproduces results.json. No repository edits or private records.

Twenty-four healthy Japanese participants entered; twenty were analyzed in the paired crossover. Four exclusions: anemia, high fasting insulin, and two cases of borborygmus/diarrhea after trehalose, beginning50 and90 minutes. The latter were medically considered osmotic diarrhea from incomplete digestion. Consequently, the estimates describe the analyzed participants, not universal complete absorption or tolerability. Exclusion can select for tolerated digestion.

TREHA contains more than98% trehalose dihydrate; the authors served28g product to supply their stated25g trehalose. Comparator25g is100% anhydrous glucose. Do not call the test25g dihydrate. Complete hydrolysis of25g anhydrous trehalose supplies approximately26.316g glucose because hydrolysis adds water: predicted mass-equivalent ratio1.05263. Direct28g product at98–100% dihydrate purity gives glucose-yield ratio1.04533–1.06667; this is a sensitivity range, not a measured available carbohydrate adjustment. Production and crystalline water cannot explain the large lower insulin response.

After overnight fasting, each drink was consumed in100mL water within2min, on visits at least1wk apart. Venous samples at baseline,15,30,45,60,90,120,180min. Serum insulin measured by chemiluminescent enzyme immunoassay. Main methods explicitly define IAUC as ignoring area below fasting concentration. No reference-method inference is needed for positive clipping. Table1 identifies0–2h; native participant-positive120 endpoint is therefore established here. Numerical integration interpolation rule is not expressly stated.

Native insulin positive120 areas: glucose1709±142 and trehalose590±101, means±SE,n20. Printed unit is microIU/mL times2h; numeric scale is consistent with a minute-integrated area, but ratio calculations do not need that unit interpretation. Paired t-test p<.01. Ratio of arm means is590/1709=.3452311293. Discussion separately reports mean individual insulin ratio36%; these are different estimators and agree in direction, not exactly numerically. Exact paired covariance, paired ratio CI, and individual traces are unavailable.

Frozen forecasts and absolute log errors:

| Forecast | Ratio | Error |
|---|---:|---:|
| Nominal grams |1|1.063541|
| Complete hydrolysis, stated mass basis |1.052630|1.114833|
| Holub120 ratio |.654771|.640072|
| Holub whole-curve scalar |.520758|.411071|
| Johansen33 reference |.420000|.196041|

All transport references improve the central native ratio forecast versus equality. The more extreme polymer reference is descriptively closest; this does not identify a trehalose coefficient or demonstrate common mechanism. Using36% instead preserves this central ranking. There is only one matched dose, so no dose curve is established.

Conservative uncertainty check: invert paired-t tests of T-rG using SE(T-rG) bounded above by SE_T+rSE_G for positive r. With df19,t=.975 critical2.093024, positive denominator, the resulting approximate covariance-robust ratio set is[(590-t101)/(1709+t142),(590+t101)/(1709-t142)]=[.18871638,.56764468]. This is conditional on paired-t assumptions, not distribution-free, not an exact Fieller interval from recovered covariance, and not simultaneous across cohorts. Worst integer-rounding envelope is also calculated in results.json.

Equality versus.420 has log-loss midpoint sqrt(.420)=.648074, above this entire set. Thus.420 beats equality throughout this conservative set. Holub scalar versus Holub q has midpoint.583933, also above the set, supporting scalar over q under this analysis. Conversely,.420 versus scalar midpoint.467673 and.420 versus q midpoint.524408 lie inside the set; marginal SEs cannot establish.420 as best among all transferred hypotheses. Integer rounding does not change these conclusions.

The study was conducted with manufacturer involvement. Neither lower insulin area nor exclusion of intolerance cases authorizes diagnostic, insulin-dose, universal digestibility, or long-term health claims.

Conditional cross-study level diagnostic (exposed, not refitted): retained Lee25g glucose8.1±1.6SE nmol min/L becomes1350 microIU min/mL using6pmol per microIU/mL. This underpredicts Yoshizane glucose1709 by359. Trehalose predictions for.420/.52075798/.65477135/1 are567/703.023273/883.941323/1350, versus590. The apparent23-unit miss with.420 partly reflects cancellation of an underpredicted control and overpredicted native trehalose/glucose ratio. Same-study control anchoring instead yields717.78/889.975388/1119.004237/1709, all above590. Cross-study level accuracy must not be conflated with formulation ratio accuracy.

The historical6.945 conversion gives a different anchor1166.306695, with resulting levels in results.json. It is an assay-convention sensitivity, not an interchangeable universal conversion or a new fitted reference. Lee marginal SE alone cannot reconstruct cross-study or paired calibration uncertainty.

Unit audit: printed Yoshizane heading is concentration times2h. Literal hour integration would bound mean positive areas by2 times(mean participant Cmax minus mean fasting concentration), because every participant concentration is no larger than their own maximum. Bounds are68.66 for glucose and22.5 for trehalose, far below1709 and590. Thus literal-hour interpretation is inconsistent with the published mean concentrations. Minute-scale integration is plausible but conditional; no silently corrected native unit. Ratio and log-loss calculations are unaffected by a common area-unit multiplier.
