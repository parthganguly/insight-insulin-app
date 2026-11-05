# Independent source facts

Read independently: Claessens thesis chapter 3, printed pp37-53 (PDF pages +1), and full Cambridge journal DOI 10.1017/S0007114507886314. Source URL https://www.cambridge.org/core/journals/british-journal-of-nutrition/article/glucagon-and-insulin-responses-after-ingestion-of-different-amounts-of-intact-and-hydrolysed-proteins/1367022BFC25BBFDA27BE96D4C140777

Two separate groups of 12 healthy nonobese males; 6 within-subject arms per group, Latin-square randomization, single-blind. Soy weight 72.2 +/-2.8 kg; whey 79.8 +/-2.6 kg. Source contrasts are between cohorts. Doses .3/.4/.6 g protein per kg body weight, not grams beverage powder. Energy 1.2/1.6/2.4 kcal/kg. No carbohydrate co-ingestion or zero-dose reference. Drinks about 250mL. Overnight >=10h fast; consumed within 5min; post-drink sampling 15,30,60,90,120min.

Endpoint: source calls total AUC, explicitly defined area above minus below baseline, a signed net incremental measure. Not positive-only iAUC. Plasma insulin concentration not secretion flux. SEM is across n12; paired covariance is unavailable. Mean/SEM of AUC displayed only as bars in Fig3.1 (journal Fig1), not numeric outcome table. Two tables concern molecular weight and amino acids.

Independent bar extraction from PDF vector rectangles and SEM stems: chapter3-extraction.json. extract_vectors.py requires pymupdf and private local thesis path. Portable check_independent.py uses only JSON and stdlib. Coordinates retain extraction provenance. Axis units are typographically ambiguous: thesis looks mU*2h*mL^-1, journal microU x 2h/ml. Use native plotted scale and dimensionless ratios; conventional microU min/mL interpretation was NOT established from an explicit source definition. Do not multiply AUC again by120. Extraction tolerance conservatively +/-15 AUC units separate from biological SEM. Bar order black .3, dark .4, light .6 confirmed from thesis legend. Journal figure visually crosschecked.

Soy form effect P=.018, intact higher. Whey form P=.754. Soy dose omnibus P=.001; whey P<.001. WPI .4 vs .6 P=.060; WPH dose omnibus P=.064; do not assert all pairwise or all form dose effects significant.

# Chapter 4 independent reading

DOI 10.1016/j.metabol.2007.04.001; thesis printed pp55 onward. n8 healthy nonobese males, crossover. All boluses .4g/kg BW protein hydrolysate or maltodextrin. Second bolus after 30min. Plasma sampling 0,15,30,60,90,120,150min (do not confuse abstract 'over 3h' or plotted 180-axis extent with measurement endpoint). Tables 4.2/4.3/4.4 source insulin mean +/-SEM:

SPH alone 1257.0 +/-188.6; CHO alone 1412.8 +/-332.5; SPH then CHO 2654.0 +/-577.7; CHO then SPH 3062.4 +/-691.7; PPH then CHO 3534.6 +/-588.5. Paired order comparison P=.26 (not evidence of identical values). Pea vs soy preload comparison P=.017 in prose (.02 rounded table). These are same SPH+CHO arm repeated across tables, not independent replicate.

Equal-dose tie baseline cannot predict pea-vs-soy difference. A150(first)+A120(second) respects 30min offset; A150(first)+A150(second) includes an extra 30min unobserved second response. These constructs presume component additivity and transportability of single-drink curves, and do not estimate an interaction term. Use baseline-relative curves, not raw levels, to avoid double counting basal insulin.

No repository code, science formula or product data changed. Research extraction only. Raw journal HTML/images and thesis rendering are local source assets, not portable distribution outputs.

## Actual-result reconciliation (2026-11-03)

PASS: 67 independent arithmetic checks in reconcile_actual.py, including native150 table outputs, independent trapezoidal120 outcomes, all four ratio predictions/absolute log errors/conditional levels, shared-zero pixel reading box, and35 graph coordinate conversions. This checks supplied coordinate arithmetic, not all marker identity choices against the PDF.

PASS: time-shift integration. On continuous piecewise-linear single-component curves,150 predictions soyfirst2761.91235, CHOfirst2688.07965;120 predictions2670.75795,2629.74135. Unshifted1502737.29315. Sampling the shifted component on the observed mixture grid misses its local15min peak (absolute45):150 graph predictions2574.073125,2629.728375;1202482.918725,2571.390075. This changes predicted order sign. Must report grid sensitivity, rather than assert intrinsic timing predicts wrong order under all conventions.

FAIL (await correction): original Opus O2 mixes conventions. bridge_same_source=I0/H0 and no_form_adjustment=1 are predictions of intact target divided by measured opposite form. Under that convention proportional_dose must be I0*(d/d0)/Hd; code uses I0/H0 instead. If dividing reciprocal predicted levels, bridge is (I0/H0)^2/(Id/Hd) and no_form_adjustment=Hd/Id. SPEC statement that all bridge/proportional O2 ratios coincide does not follow from its O1 models. O1 numerical implementation is consistent with the frozen formulas.

Mean-curve positive120 equals net120 for all three mixture arms, but mean individual positive area is not recoverable by clipping the mean. Optional empirical n8 SEM bound proof: empirical mean D^2=muD^2+7*SEM_D^2; SEM_D<=SEM_t+SEM0 by triangle inequality; E(-D)+=(E|D|-muD)/2 <=(sqrt(muD^2+7*(SEM_t+SEM0)^2)-muD)/2. Also <=mean X0 for nonnegative observations. Convexity makes endpoint trapezoidal integration of upper bounds valid for individual linearly interpolated concentration trajectories. This is an empirical curve-functional bound, not population CI or bound on unobserved nonlinear physiological trajectories. sem_bound_independent.py reproduces bounds from source-marginal SEM ceilings.

PASS: actual Opus RESULTS audited independently across80 O1 per-cell absolute-log errors, both calibration anchors and all5 rules. Independent vector bar readings differed by only2-4 native units, within declared tolerance. O2 semantic issue remains explicitly unresolved pending corrected supplemental output. PASS finite-n proof and16 actual bound/ratio checks; stressed finite-n outer ratio includes values below sqrt(93/71), so response-ratio bridge superiority to tie is not guaranteed for positive endpoint under graph stress, while pea>soy empirical ordering survives. Total actual numeric checks passed163; exhaustive scenario search not independently rerun.

Public extraction metadata corrects the preliminary unit label and exposes the PDF as an argument. The original local result is preserved (SHA-256 509a9088df421b4061def026de5a1bb0d8b20bc38966345125cf0c3c4c9433db). The numerical extractions did not change. The resolved O2 review is in REVIEW_LEDGER.md.
