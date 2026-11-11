# Independent source and reconstruction review

Scope: research-only external artifacts. No current, compatibility, target, or deferred application code changed. No scientific model, calibration, claims, or product privacy behavior changed. All observations are published group summaries, with no participant records.

Primary source: van Loon et al., J Nutr 130:2508–2513, DOI 10.1093/jn/130.10.2508, PMID11015482. Publisher PDF is linked in raw/independent_points.json; Figure 2 and Figure 3 are on printed p2511. The original PDF and rendered page remain local raw material, not a publication bundle.

## Protocol and formulation

Eight trained male cyclists underwent glycogen depletion, then five randomized blinded beverage trials. Six 3.5mL/kg boluses at 0,30,60,90,120,150min; blood each30min through180. Carbohydrate1.2g/kg/h; added nitrogen-source mix0.2 or0.4g/kg/h. Control has none. Wheat alone and 50:25:25 wheat-hydrolysate:free-leucine:free-phenylalanine each have both doses. High mixture matches resting drink9 in nitrogen-source composition, not carbohydrate composition or context.

Actual prepared glucose68.5g/L and maltodextrin102.8g/L establish40:60 glucose:maltodextrin. One later parenthetical reverses names; do not use it to overwrite prepared masses. Prepared rounded concentrations and nominal rates have small rounding discrepancies. At120min, four prior boluses provide2.4g/kg CHO and0.4/0.8g/kg nitrogen-source mixture; the dose administered at120 is not exposure during the preceding120min.

Resting primary: DOI10.1093/ajcn/72.1.96, PMID10871567, Table1 printedp97. https://cris.maastrichtuniversity.nl/ws/files/526718/guid-3a70aa35-87d0-4a49-b3ba-2f588d60238f-ASSET1.0 . n8 healthy nonobese males; four3.5mL/kg boluses0..90; glucose57.1+maltodextrin57.1g/L; carbohydrate0.8g/kg/h and nitrogen-source0.4g/kg/h; samples15min through120. Drinks9/10 were designed after analysis1–8. Its abstract101/103% increases refer to SECOND HOUR, not full two-hour AUC. At matched120min, new study CHO exposure is50% higher; nominal high nitrogen-source exposure is the same, low is half.

## Endpoints and uncertainty

New paper statistics explicitly use area above t=0 baseline across180min. Published relative increases52±10%,107±17%, and high-v-low36±6% are means±SEM n8 and native180min only. Do not assign them to120min. Nor assume ratio of digitized group-AUC bars must equal published relative-response summaries; participant-level normalizations and unreported integration details cannot be recovered from figures.

check.py reconstructs120 and180min signed baseline-subtracted trapezoids from independently read Figure2 marker centers. All points above baseline after0, so positive-only and signed agree for these approximations. raw/independent_points.json preserves readings. RECEIPT.json contains numerical output and SHA256. +/-10pmol/L at every marker and baseline yields conservative sensitivity envelopes using +/-2*10*duration area bounds. These envelopes describe reading sensitivity only, not sampling variability, statistical significance, or predictive uncertainty. Baseline errors are propagated; each noncontrol ratio lets numerator and denominator vary independently, conservative. The control divided by itself is exactly1.

At120 the central ratios to control are1.041,1.027,1.535,1.953 for wheatlow,wheathigh,mixlow,mixhigh. Mix high/low1.272 and wheat high/low0.987. At180 the group-curve mix high/low1.362 closely matches native reported1.36, while group-curve/control ratios differ from native relative summaries. Retain both, do not tune readings to reported percentages. No individual-level inference is available.

This experiment can challenge recipe-source and dose-transfer predictions under changed physiology, carbohydrate background and dosing horizon; it cannot isolate exercise from carbohydrate or establish universal amino-acid coefficients. Native180min outcome, reconstructed0–120, and resting second-hour endpoint are three different estimands.

Run portable checker from any directory: python path/to/sol/check.py . Only relative input/output paths are used; no user identifiers or environment values enter JSON receipts. Forecast review pending receipt of frozen forecast files.

## Marker-identity correction after independent cross-review

Initial high-wheat30min reading225 incorrectly followed the overlapping blend-high circle; source marker square is near170. At120min initial wheat square identities were reversed; low corrected310 and high290. This was an identification error, not a measurement average or favorable selection. Blend values unchanged. Wheat120min high/low changed1.0831 to0.9868, and180min changed1.0858 to1.0212. Revised120min log dose-change interaction ln(mixture high/low)-ln(wheat high/low) is about0.2543. Independent readings now agree with Astra within the stated reading sensitivity. Raw JSON records the correction.

## Frozen forecast verification

check_forecasts.py uses relative sibling paths and independently recomputes all six Dutch candidate level formulas and five derived contrasts for every reference set. All pass. It also recomputes every Oxford method's native/relative errors and all source/dose/interaction errors. Oxford source-curve joint point-estimate criterion passes: level mean absolute log error0.067520 versus prior named0.147024; interaction log error0.245044 versus0.343082. Absolute native MAE335.138 versus687.141. Predicted source-dose interaction1.120927 remains well below observed1.432183. The low-dose source contrast worsens relative to prior named: error0.031710 versus0.001997. These are descriptive exposed-development comparisons, with no sampling-significance claim.

Pea2021 accepted manuscript acquired through urllib after browser403; raw/pea2021.pdf and extracted text remain local. Table2 verifies120min means3369.6,4668.7,4952.8 and SD1516.5,1904.6,2382.5. Methods explicitly specifies25/50g NUTRALYS S85Plus POWDER; baseline is mean of two predrink samples. Manuscript does not state trapezoid/below-baseline conventions, so native iAUC is retained with this qualification. Product name matches but lot equivalence is unestablished.


## Native Figure 3 unit correction

Direct inspection of the rotated embedded native label in ../astra/raw/axis-read.png resolves the first letter as p with a descender: printed label is pmol L^-1 � 3h. My earlier nmol assertion from the reduced whole-page rendering was incorrect; there is no evidence of a different edition. Preserve the unusual printed unit verbatim; no numerical conversion to the group-curve pmol min/L reconstruction is justified. This does not alter any ratio, forecast, or error calculation.
