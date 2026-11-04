# Independent verification: 2000 flakes and cross-source arithmetic

Public aggregate research only. This track wrote only under the assigned sol directory. No INSIGHT code, Git, private health records, participant records, or outreach. The target article was read before calculations; this is an outcome-exposed, uncalibrated arithmetic audit, not a blinded prospective validation.

## Source and replay receipt

Original: Granfeldt, Eliasson and Björck (2000), Journal of Nutrition 130:2207–2214, DOI 10.1093/jn/130.9.2207. Publisher PDF:

https://jn.nutrition.org/article/S0022-3166(22)14165-9/pdf

Firecrawl recovered an 8-page PDF parse, HTTP 200, scrapeId 01 a 1 a 66 c-0233-703 d-a 941-a 9833 ae 5 b 071. Full parse and receipt: `granfeldt 2000_original_pdf_parse.json`. Binary local download returned 403. This track did not visually inspect page images. The parser generated erroneous figure-derived tables; none were used. Explicit original Tables 2/4/6 were extracted to `granfeldt 2000_factual_extract.json` and `granfeldt 2000_tables_2_4_6.csv`, with 138 cells, numeric means, uncertainty values, and original significance letters. A SHA 256 of the saved source parse is in the extract. `extract_target_tables.py` regenerates these files and checks table dimensions.

1994 donor original author-upload transcript was independently read at https://www.researchgate.net/publication/15027355_ and preserved in `granfeldt 1994_source_retrieval.json`. The donor PDF parser returned only a watermark; the author-upload page transcript supplied methods/Table 2 instead. Heaton oat input 1111/1323 was supplied in the task and not independently source-recovered in this track; coordinator independently checked its paired ten-person oat cohort.

## Cohort and arms

2000 methods describe one cohort of 10 healthy volunteers,5 men/5 women, age 38 ± 8 SD years, BMI 21 ± 2 SD. All 8 breakfasts were given approximately weekly after an overnight fast: bread plus 7 flake arms. All outcome tables have n 10 and paired Wilcoxon tests with each person as own control. No randomized ordering is reported in the examined original methods. Insulin was sampled before eating and 30/45/95/120 min; the paper reports incremental 90/120 min areas. Insulin was not measured at 180 min. Tables 3/5 and methods say serum; Table 4 says plasma, a source wording inconsistency.

Table 1 actual arms and conditioning:

| Grain | Arm | Pre-rolling treatment |
|---|---|---|
| Oat |0.5 mm roasted|Roast then cold soak|
| Oat |0.5 mm roasted+steamed|Roast then steam; commercial simulation|
| Oat |1.0 mm raw|Cold soak|
| Oat |1.0 mm roasted|Roast then cold soak|
| Oat |1.0 mm steamed|Steam|
| Barley |0.5 mm steamed|Steam; commercial simulation|
| Barley |1.0 mm steamed|Steam|

Raw-soak conditioning: approximately 1 h, final moisture 13%. Roasting: steam-heated double-shell drum 0.11 MN/m²/120°C for 20–25 min, final grain temperature 95°C, followed by approximately 15 h cold soaking to 17% moisture. Steaming:0.11 MN/m²/120°C for 17–18 min, final grain temperature 104°C; grains rolled warm. Table 1 labels the roasted conditioning “soaking and roasting”; methods specify roasting followed by soaking. Oats dehulled, barley pearled, millVårgårda; cultivar/genotype not specified. The donor's covered normal/high-amylose Glacier grains are therefore not established as identical target materials.

Meals supplied 50 g starch; paper specifies 12.0 g protein/6.8 g fat, matched with cheese/butter for barley/bread. It also gives 200 mL milk and 150 mL coffee/tea in each meal, approximately 1621 kJ, flakes 82.6–94.8 g/bread 116.4 g. Do not reinterpret this as a flour porridge intervention.

## Native insulin areas versus indices

Means ± SEM, n 10. A 90/A 120 are original native incremental area numbers; no conversion between area windows or studies. Paper area unit typography is nmol/(min·L); concentration×time dimensional interpretation is nmol·min/L. II values are separately reported bread-relative individual-normalized indices, not ratios of the group arithmetic means.

| Arm |A 90|A 120|II 90|II 120|
|---|---:|---:|---:|---:|
| Bread|16.1 ± 2.2|18.0 ± 2.6|100|100|
| Oat 0.5 R+S|16.6 ± 3.8|18.1 ± 4.0|102 ± 16|101 ± 16|
| Oat 0.5 R|13.5 ± 2.0|14.9 ± 2.3|84 ± 10|84 ± 10|
| Oat 1.0 S|11.5 ± 2.7|12.3 ± 2.9|68 ± 7|65 ± 6|
| Oat 1.0 R|9.9 ± 2.1|10.8 ± 2.3|59 ± 7|58 ± 7|
| Oat 1.0 raw|11.0 ± 1.7|12.7 ± 1.9|74 ± 14|77 ± 15|
| Barley 0.5 S|13.6 ± 1.5|14.7 ± 1.6|87 ± 6|85 ± 5|
| Barley 1.0 S|14.3 ± 3.7|15.3 ± 3.9|84 ± 10|81 ± 9|

Heat-matched thickness comparisons are roasted oat 0.5 vs 1.0 and steamed barley 0.5 vs 1.0. Comparing oat 0.5 R+S with 1.0 S adds roasting differences; comparing thin roasted with thick raw adds heat/soak differences. Within the matched pairs, insulin area/II significance letters overlap: the source does not show a significant thick/thin insulin contrast within either grain. It does not test the cross-grain ratio-of-ratios interaction. Do not convert the descriptive native barley increase into an inferential finding.

## DSC basis

Table 2 is process-labelled and has no thickness column. Means ± SD,n 3: oat roasted enthalpy 6.48 ± 0.40 J/g, gelatinization 16.4%; steamed 6.54 ± 0.21/15.6%; roasted+steamed 5.88 ± 0.70/24.1%; raw 7.75 ± 0.51/0%. Barley steamed 5.89 ± 0.89/26.8%; raw 8.05 ± 0.3/0%. Temperatures and all uncertainty values are in the factual extract.

DSC uses dry matter:water 1:3, approximately 10 mg mixture,10°C/min scan 290–400 K, enthalpy relative to raw same-grain sample,100(1−ΔH/ΔHraw). Three replicate measurements are analytical replication. Drying/milling under 40°C vacuum to<0.8 mm is described in chemical analysis; do not treat that laboratory preparation as the food eaten by participants.

The single roasted oat DSC row cannot establish independent values for both 0.5/1.0 mm; likewise steamed barley has one row for two human thicknesses. Discussion associates thick/thin roasted oats with approximately 16% and thick/thin barley with approximately 27%; this supports process-level association but does not supply independently measured thickness-level DSC contrasts. Oat roasted+steamed, raw, and steamed each have only one relevant human arm thickness. No DSC standard error for a human-arm insulin association is provided.

## Between-study cohort/reference status

1994 cohort:10 healthy volunteers,5 M/5 F, age 34 ± 8 SD, BMI 21 ± 2 SD; one person withdrew from both flour meals. Same investigators/site and similar assay/sampling framework. Neither original examined states that its participants overlap, or that they are disjoint. Different publication dates/mean ages alone do not prove independence. No participant identity linkage was sought or accessed.

1994 bread A 12018.0 ± 4 versus 2000 18.0 ± 2.6; A 9018.0 ± 2 versus 16.1 ± 2.2; glucoseA 120123.2 ± 10 versus 88.9 ± 10.8. The 1994 meals specify 19.0 g protein/8.4 g fat, water rather than milk, approximately 1480 kJ. Same rounded A 120 does not establish shared bread observations or interchangeable baselines. Do not pool native bread references. Within the 2000 paper the repeated bread rows are the same cohort reference, not two independent bread groups.

## Cross-source transfer calculations

`python transfer_calculations.py` and `python contrast_sensitivity.py` regenerate JSON/CSV. Primary factors fixed from task: oat 1111/1323=.839758(native 180); covered barley normal 5.8/11=.527273 and high-amylose 5.2/10.2=.509804(native 120). Donor kernel/flour contrasts also change boiling time 25 vs 2.5 min and water 1:2 vs 1:3. They are not isolated rolling-thickness effects, and source windows differ.

Prediction = target thin arithmetic mean × external kernel/flour factor:

| Target native 120 |Observed thick|Species donor prediction|Common-factor prediction|No-transfer prediction|
|---|---:|---:|---:|---:|
| Oat roasted|10.8|12.5124|9.8316|14.9|
| Barley steamed|15.3|7.7509 or 7.4941|9.6996|14.7|

The common alternative is a declared, unfit species-neutral log-average: c=sqrt(rO×sqrt(rBN×rBH))=.659837, equal weight to each grain and equal weight to barley variants. It was chosen after target exposure for a transparent comparison, not selected by target optimization. None supports a performance estimate from two correlated contrasts. Native 90 predictions are oat 11.3367 against 9.9; barley 7.1709/6.9333 against 14.3. All are in prediction CSV.

Observed matched native 120 thick/thin ratios: oat.724832 and barley 1.040816; ratio-of-ratios 1.435941. Native 90 double ratio 1.433824. Separate II 120 ratios.690476/.952941 give double 1.380122; II 90 double 1.374635. The external barley/oat factor ratios are.627886/.607084, less than 1; observed double ratios exceed 1.

For every common positive power k, external double ratio is(.627886)^k or(.607084)^k<1. A common positive linear attenuation 1−k(1−r), with both mapped factors positive, also preserves barley<oat. Under 0<k≤1, native 120 predictions lie in[12.5124,14.9) for oats, [7.7509,14.7) or[7.4941,14.7) for barley. The upper no-change limit is excluded. The native target oat mean 10.8 is below its attenuated envelope and barley 15.3 above its envelope. A common factor predicts cross-grain double ratio 1 for every k, also unlike central target ratios. This is a check of the stipulated multiplicative contrast transfer, not proof of an alternative biological mechanism.

## Deletion and printed rounding

Barley kernel n 10 and flour n 9; for kernel mean m, sample SEM e, the retained-nine kernel mean lies in[max(0,m−e),min(m+e,10 m/9)]. This is an algebraic deletion envelope, not a confidence interval. Central native 120 factor envelopes: normal[.436364,.585859], high[.313725,.566449]. Cross mean rounding ± .05 and printed integer SEM rounding ± .5: normal[.384615,.593607], high[.258537,.574713]. Heaton pair has the same ten participants; no analogous missing-person correction applies.

Including Heaton integer mean rounding ± .5 yields external barley/oat double envelopes normal[.457628,.707464], high[.307616,.684946], entirely below 1. Target printed rounding gives native 120 double[1.415059,1.457147], native 90[1.411177,1.456853], II 120[1.343880,1.417391], II 90[1.339208,1.411047], entirely above 1. Thus those deterministic rounding/deletion bounds cannot repair the ordering for any common positive power k. They do not incorporate sampling uncertainty or identify an interaction confidence interval. Paired covariance is unavailable, so no population-level rejection, standard error of the double ratio, or claim of independent cohorts is justified.

Checks completed: all three scripts executed successfully, table dimensions/cell-count assertions passed, and sign-envelope assertions passed. Independent coordinator review of original text/actual artifacts remains necessary before adopting a research conclusion.
