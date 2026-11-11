# Independent verification, Sol

Public aggregate research only. No INSIGHT repository edits or private records accessed. New barley source was independently retrieved through Firecrawl and the original PDF text through web. No prior closed study was recomputed; the three supplied Heaton ratios were used as frozen donor constants.

## Primary source and access

Granfeldt et al. 1994, AJCN 59:1075–1082, DOI 10.1093/ajcn/59.5.1075, PMID 8172094. Author-upload original available at:

https://www.researchgate.net/profile/Yvonne-Granfeldt/publication/15027355_Granfeldt_YE_Liljeberg_HGM_Drews_A_Newman_R_Bjrck_IME_Glucose_and_insulin_responses_to_barley_products_influence_of_food_structure_and_amylose-amylopectin_ratio_Am_J_Clin_Nutr_59_1075-1082/links/553017470cf20ea0a06f64d5/Granfeldt-YE-Liljeberg-HGM-Drews-A-Newman-R-Bjrck-IME-Glucose-and-insulin-responses-to-barley-products-influence-of-food-structure-and-amylose-amylopectin-ratio-Am-J-Clin-Nutr-59-1075-1082.pdf

Original 8-page PDF text parsed successfully. A direct local download returned 403; screenshot requests timed out. Thus actual table text independently checked, but visual page layout not independently verified in this track. Table 1 is p1076, preparation/methods p1076–1077, HI methods p1078, Table 2 p1079. The document has only Figure 1 (glucose); no quantitative H20/H30 graph/points found. HI180 is available and must retain its definition.

Bornet 1989 DOI 10.1093/ajcn/50.2.315: PubMed abstract available, no numeric targets secured. OpenAlex gives public archive link https://hal.inrae.fr/hal-02728571v1/file/1989_Colonna_Am.J.Clin.Nutr_1.pdf ; web could not fetch, local urllib timed out. Publisher PDF403 and no indexed Firecrawl full text. Do not treat the abstract as quantitative evidence or assert the paper itself is unavailable everywhere.

## Source interpretation

- Four Glacier barley genotypes. Covered normal has 33% amylose; covered high-amylose 42%; hull-less high-amylose44%; waxy hull-less7%. Quantification starch basis, Table1. Covered hulls gently removed before use. The paper explicitly says normal and high-amylose covered kernels were milled for the two flour products. Thus these two within-genotype contrasts have genuine source linkage.
- Kernels boiled25min, water1:2 for covered normal/high; flour milled through0.8mm and boiled2.5min with water1:3. All served fresh/directly, 91–99% gelatinized. This is a preparation contrast including time/water, not milling alone in isolation.
- Clinical meals all50g potentially available starch, total protein19.0g using cheese, fat8.4g using butter, approximately1480kJ, with water/tea/coffee. Table1 bare grain composition should not replace these total meal values.
- Ten healthy subjects, five men/five women; age34±8SD; BMI21±2SD; normal glucose tolerance. Same subjects across meals, one withdrawal from both porridges, so kernel n10 versus flour n9.
- Methods specify capillary serum insulin by Boehringer Mannheim ELISA, at baseline,30,45,95,120min. Table2 labels its block plasma insulin, which is a source wording inconsistency; retain the methods' serum assay terminology when precision matters. Glucose was also measured70/180min; insulin was not measured180min.
- II90/II120 based on incremental area relative to the individual's white bread response, calculated similarly to GI with sub-baseline values treated zero. The average indices cannot be reconstructed by dividing group mean areas. No individual paired covariance/data available.
- HI is area of chewed-food amylolysis/dialysis curve0–180min relative to bread chewed by same person, n6. Cheese/butter/salt omitted. Table2 HI values44,47,34,34,75,56 take precedence over inconsistent rounded prose36–50,60,80.

## Independent arithmetic

Run `python verify_barley.py` in this folder; output is `verified_results.json`. It includes native90, native120, and II120 as distinct endpoints, two matched-formulation milling cases and all seven within-form genotype comparisons. Affine predictions use the stated higher-amylose numerator orientation; affine maps are not reciprocal under arbitrary reversal.

For native120, normal kernel/flour5.8/11=.5272727 and high5.2/10.2=.5098039. Heaton median is1238/2341=.5288338. Direct HI ratios47/75=.6266667 and34/56=.6071429. Mean absolute log errors over the two barley cases: Heaton.0198022, direct HI.1737174, pulse.3091288, affine HI.4925327, power HI.5330449, equality.6568832. This is a same-study two-case descriptive summary, not an independent sampling performance estimate. Printed rounding cannot reverse the central-arm mean R/HI order.

Within covered genotype contrast (high/normal), native120 kernel5.2/5.8=.8965517 and flour10.2/11=.9272727. Amylopectin dose sensitivity is58/67=.8656716 for either form. Direct HI predicts34/47=.7234043 and56/75=.7466667; it overstates the genotype effect. Power predicts.9203617/.9278582; affine.8905829/.8997852. Absolute log errors for kernel/flour respectively: equality.1091993/.0755076; amylopectin.0350503/.0687421; direct HI.2145878/.2166289; power.0262107/.0006312; affine.0066798/.0300917. These within-form results were evaluated after outcome exposure and have no untouched validation status. Other genotypes retain different fiber, hull, and compositional properties; all pairwise values remain in JSON rather than excluding inconvenient cases. Notably both high-amylose kernel HI values34 predict a tie, while native120 hull-less/covered=.7115385.

## Matched-nine deletion bounds

For n10 mean m and sample SEM e, sample sum of squared deviations90e². If omitted person's value is x, the other nine deviations sum to m−x and their squares are at least(x−m)²/9. Hence |x−m|≤9e and retained-nine mean m9=(10m−x)/9 lies in[m−e,m+e]. Requiring individual areas nonnegative also gives m9≤10m/9 and m9≥0. This proves the requested envelope. It is an algebraic missing-person envelope, not a confidence interval or a claim that these extremes are probable.

Native120 ratio envelope normal[.4363636,.5858586]; high[.3137255,.5664488]. Geometric R-versus-HI boundaries.5756757 and.5666372. Normal can cross. High stays below only by.0001884 at exact printed central inputs. With clinical means±.05 and integer SEM±.5 as rounding intervals, normal envelope[.3846154,.5936073], high[.2585366,.5747126], so both can cross. Varying printed HI means±.5 additionally gives midpoint ranges[.5705300,.5808478] and[.5597882,.5735308].

The aggregate two-case ranking is also not identified for matched-nine subjects: omission of a zero-area participant in both kernel conditions yields both upper bounds jointly, compatible with these moments. The direct HI mean log error can then be lower than R's. Native120 observed-arm central ranking can be stated; unknown paired subset ranking cannot be asserted as robust. Native90 high subset remains below the corresponding R/HI midpoint even with requested printed rounding; native90 normal does not. Different endpoints remain separate.

No sampling confidence interval for the observed ratio, model difference, or paired effect can be recovered from arm means and SEM alone. No formula was fitted to barley outcomes. No absolute insulin concentration prediction or individual health prediction is supported.

## Superseding source note — 2026-11-04

The Bornet access-status paragraph above records the initial retrieval attempt only. The public original has since been recovered and independently visually inspected. Current extraction, calculations, uncertainty qualifications, and source SHA appear in Bornet_VERIFICATION.md, Bornet_results.json, and Bornet_verification_receipt.json. The original access blocker no longer applies.
