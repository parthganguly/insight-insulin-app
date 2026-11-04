# Independent input and endpoint review — 2026-11-04

Research-only evidence preparation; no application, formula, dataset or Git mutation. Public aggregate facts only. Numerical insulin outcomes remain withheld until root protocol freeze.

## Bajka 2021 linked to 2023

2021 primary XML acquired independently from https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7859705/fullTextXML and retained locally. Read table 1 together with methods: recipe is one 12-roll batch. Wheat flour mass per eaten roll is (540.4+396.0)/12 = 78.033333 g control;688.6/12 =57.383333 g 30%;350.8/12 =29.233333 g 60%. Added vital gluten is separate:1.225,4.158333,11.783333 g/roll. ICP is0,26.458333,61.658333 g/roll. Wet-dough percentages multiplied by baked serving masses are invalid because of baking moisture loss.

Bread amylolysis methods: crumbs1–2mm; starch-normalized amylase ratio; PAHBAH reducing sugars sampled0,10,20,30,40,50,60,75,90,120min; own t0 subtracted. Figure3A and text give first-order fitted Cinf and k, respectively(68.3,.040),(51.4,.045),(44.9,.032). Companion JSON gives independent Cinf*(1-exp(-k*t)) at20 and120min. These are MODEL-DERIVED fitted curve points, not observed raw measurements. Parameters are published means with SE and covariance, so no invented independent uncertainty propagation.

2023 primary https://pmc.ncbi.nlm.nih.gov/articles/PMC10131617/ statistical methods and Figure1 define insulin iAUC as individual FIRST PEAK above fasting baseline using trapezoids. Figure1E reports means±SEM;n20,20,19. This is an exploratory, data-driven operator. Prespecified primary window0–60min;secondary0–120,30–90,90–240 available in supplemental table1. Do not call first-peak result120min iAUC or median. The ingredient recipe is independently earlier than the 2023 insulin endpoint, but2021 and2023 are linked work and not independent laboratory replication.

## Alshaalan2024 hummus

Primary publisher PDF viewed via https://kclpure.kcl.ac.uk/ws/portalfiles/portal/323409227/1-s2.0-S0963996924005878-main.pdf (direct urllib download403; browser web PDF extraction succeeds). DOI10.1016/j.foodres.2024.114517.

Preparation methods: ICC157g drained canned precooked Kabuli chickpeas vs RCC76.5g dry-milled flour(<150um) heated100C5min. Both are blended with20g olive oil,3.3g coriander,13.4g lemon juice,4g spices,2g salt,13.4g tahini;added water26.7g ICC vs289.7g RCC. Carrot20g and red pepper20g served alongside. Starch matched26.8g (rounded27g). Hummus portions240g ICC and423g RCC;energy460 vs510kcal,fat29.5 vs30.1g, so structure comparison does not mean all measured nutritional values identical. Drinking water adjusted to standardize total meal size/water. Same-day fresh preparation.

Fig4 assay only90min;nearest late endpoint is90, not120. RCC fitCinf71.7%,k.036/min;ICC Cinf is not reliable because curve linear over observed duration. Do not extrapolate ICC to120 using fabricated exponential parameters. Microscope samples excluded oil, but other experiments/human meals included oil;do not assume assay excluded it.

Human Fig7B means±SEM,n15;analysis on absolute blood concentrations,repeated-measures ANOVA with Fisher LSD. Correction after visual inspection: Figure 7B includes an author-labelled iAUC bar. The insulin integration method for that bar is unclear. It is not the fixed 120-minute signed donor used here. Any trapezoid0–180 area reconstructed from mean graph must be labeled newly derived mean-curve AUC, not participant-level iAUC or reported primary result. Exact time grid/baseline handling must be frozen before numerical graph extraction.


## Unmasked Bajka verification

Coordinator authorized insulin unmask after finding original Supplemental Table1 and disclosed that numerical outcomes were encountered during input gathering. Therefore this is a retrospective predeclared-workflow exercise, not a fully blinded prospective prediction. Independent extraction directly from raw/target_mmc.docx (zip XML) finds0–120 insulin means4523,4189,2540;SEM1125,880.8,755.9. These are arithmetic means±SEM. The separate supplemental Table2 values3662,4031,1983 refer to another/geometric first-peak characterization and must not be substituted.

Run stdlib verify_bajka.py to reproduce three contrasts and free-sugar sensitivity. Approximate Figure3A observed values were independently read from multiple measured replicate markers, with deliberately broad±2percentage-point reading sensitivity;these are not exact digitization. Fitted endpoints remain a distinct sensitivity. Exact assay raw observations were not obtained.

Common jam contributes less than0.4g sugar, modeled as0 and0.4g bounds;12.8g sorbitol/polyols are not added as free sugars. Bread total sugar is2.76,3.45,5.67g per serving. Adding sugar grams to starch hydrolysis grams is a simple prespecified mass sensitivity, not physiological conversion, not insulin potency evidence. Distinct monosaccharide composition and timing are not modeled.

Three ratio ordering is robustly control>30>60 for wheat and assay views,but target insulin mean30 is much closer to control. No uncertainty for paired ratios can be recovered from marginal SEM alone. Root predictions/thresholds should be checked against these source facts without describing group mean closeness as validated individual accuracy.
