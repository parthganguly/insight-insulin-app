# Independent Sol verification, 2026-11-05

Scope: external research only, following frozen public/PLAN.md. No application,
repository, scoring formula, dataset, or scientific-claim edits. Published
aggregate facts only; no participant records inferred. Sources independently
retrieved from Cambridge. Acquisition manifests record URLs and SHA256 hashes.
Calculation scripts use only the Python standard library; PDF rendering and
text extraction used PyMuPDF, and analytical image cropping used Pillow.

## Decisive result

Frozen pair-specific forecast D=0.5272544842 loses to common-factor D=1 in both
the independently read signed 0–120 supporting endpoint and the printed
3-hour areas. This does not test the intended participant-positive 0–120
endpoint directly. The exact participant-positive endpoint is unavailable.

| Endpoint | T/G | I/S | D | frozen D ALE | common D ALE |
|---|---:|---:|---:|---:|---:|
| Table, fasting 3h | .619414 | .788834 | .785227 | .398289 | .241783 |
| Table, linked lunch 3h | .859114 | .664062 | 1.293726 | .897598 | .257526 |
| Figure, fasting signed120 | .587763 | .593044 | .991095 | .631127 | .008945 |
| Figure, linked lunch signed120 | .848011 | .667313 | 1.270784 | .879706 | .239634 |

At fasting signed120, ±2 original-GIF-pixel errors at every mean center give
D in [.9004,1.0913]; linked lunch gives [1.2077,1.3373]. These are reading
sensitivity ranges, not confidence intervals. Both remain beyond the frozen
D versus equality geometric midpoint .7261229.

The table's fasting D points in the expected direction but the discrimination
magnitude is too small to beat equality on the frozen loss. The lunch D
reverses direction. Choosing a window after seeing outcomes would erase this
failure. Full comparator component errors are in results.json.

## Arm, cohort, clock, operator

Evaluation DOI 10.1017/S0007114511006714: ten overweight IGT adults (6 men,
4 women), each participated in all four single-blind randomized trials,
1-week washout. Treatment was given fasting AND with lunch on the same day.
The lunch result is linked to the morning treatment and is not an isolated
matrix intervention or an independent cohort.

Fasting drink: 75g carbohydrate equivalents in400mL, 08:45. Linked lunch:
12:30, total energy50% calculated 24h resting expenditure,55% carbohydrate,
30% fat,15% protein;25% lunch energy as the tested sugar beverage. The
protocol's general75g load sentence plus individualized lunch-energy
description does not establish exact75g sugar in every lunch. Do not assign
a universal exact lunch gram amount from this paper.

Sampling: -5,30,60,90,120,150,180 minutes. Calculations subtract each arm's
own -5 minute baseline and interpolate linearly across -5 to30 to begin the
integral at0. There is no measured t0 sample and no extrapolation. Relocating
the baseline measurement to t0, a separately labelled convention, changes
D120 to .9856 fasting and1.2676 lunch, without changing the frozen loss.

Printed tables explicitly say3h. They are author-labelled iAUC calculated
by trapezoids, without sufficient detail to establish clipping individual
negative increments. They are not positive120 FII values. The signed180
figure reconstruction agrees closely fasting and in I/S lunch. T/G lunch
figure levels differ2–3% from Table2, beyond my ±2pixel envelope; do not
silently force agreement. My approximate manual figure readings are not
underlying exact records.

Insulin assay: Linco double-antibody RIA. Figure and table insulin units
are microU/mL; conversion to pmol/L given by authors is x6. Table numerical
areas are consistent in scale with integration over minutes, despite the
printed unit label 'over3h'. Preserve native numerical labels rather than
claim precisely harmonized native units across all donors.

## 2009 donors, independent source check

Both original PDFs downloaded independently. Trehalose DOI
10.1017/S000711450999050X table fasting T4868/G9264, afternoon T10693/G14634.
Isomaltulose DOI10.1017/S0007114509990687 fasting I3176/S4726, afternoon
I10693/S14634. The two exact afternoon insulin entries recur across the two
different pairs. The same demographic summaries recur:10 adults,8men2women,
age31, BMI27.7, glucose5.1, insulin14. They are not evidence of two independent
donor cohorts. A joint protocol locator supplied separately by coordinator
may establish overlap; my original individual articles alone do not state it.

Matching printed3h donor fasting D=(4868/9264)/(3176/4726) is approximately
.782 and therefore transfers very well to evaluation fasting D=.785, while
both donor afternoon ratios are identical by the suspicious duplicated
table entries, giving D=1 and no source-table discrimination. This supports
careful source-conditioned diagnosis, not global validation. Prior mean
donor insulin assay and population differ from IGT evaluation and do not
justify a causal dose curve or individualized prediction.

## Exposed secondary direct T/I comparison

Coordinator supplied matched donor signed120 levels T3936.03/I2583.40 and
T7826.56/I5635.36. These donor levels are supplied, not independently extracted
in this script. They predict T/I1.523585 fasting and1.388831 lunch.
My independently read target signed120 ratios are1.663224 and1.487985;
absolute log errors .08769 and .06896, vs equality .50876 and .39742.

This is explicitly post hoc, distinct from frozen D. It can show a direct
arm ordering transfers, but does not rescue the substitution-specific
primary objective or uniquely identify a product-reference gain.

A fair constituent baseline supplied by coordinator is
1/((1+1.2/8.1)/2)=1.741935. It has smaller fasting point error .04624 than
the matched reference .08769; its midpoint with matched forecast is1.629106.
My ±2px target signed T/I range straddles that midpoint. At lunch constituent
baseline error .15757 exceeds matched .06896; midpoint1.555395 is beyond my
±2px signed range.

The same-budget generic fractional-reduction comparator predicts direct T/I
equal to matched donor G/S, because its common multiplier cancels. It MUST
be considered before claiming unique product-specific benefit. Coordinator
supplied G/S1.76325167 fasting and1.61118669 lunch. Its direct ALE is .05840
fasting (better than matched .08769), and .07955 lunch (slightly worse than
matched .06896). The donor/generic geometric midpoints1.63904 and1.49588
lie inside my respective ±2pixel signed T/I ranges[1.56615,1.76737] and
[1.44531,1.53205]. Small preferences between these same-information
forecasts are not secure to this independent reading range.

## Deterministic finite-sample positive-area bounds

Assume nonnegative individual insulin concentrations and piecewise-linear
curves through actual sampling times, arm-specific baseline at -5.
Jensen gives mean participant-positive area >= positive area of mean
increment. Every group-mean increment here is positive through120 so this
lower bound equals signed120. For any person, max(X-B,0)<=X. On the first
interval, positive increment <=(t+5)/35 * X30; integrate from0 to30, giving
(120/7)*meanX30, then use mean-concentration trapezoids from30 to120 as upper
bound. No participant values, pairing, baseline covariance, normality, or
positive-area equality is assumed.

My resulting target T/I positive120 interval is [1.12830,2.14709] fasting
and [1.18256,1.75874] lunch. With ±2pixel center reading uncertainty it is
[1.08681,2.24704] and[1.15975,1.79742]. These are conservative deterministic
bounds conditional on the curve model, NOT confidence or population bounds.

Thus T>I holds for this finite-sample projected positive operator under
these assumptions. The matched prediction lies inside the broad intervals;
that does not validate its numerical accuracy. On fasting bounds, donor
superiority to equality is not guaranteed: sqrt(1.523585)=1.2343 lies above
the lower feasible bound. Donor superiority against stronger comparators
requires its own midpoint checks.

## Engineering verification and limits

calculate.py is readable, records all transcribed centers, actual time
schedule, scale, trapezoids, all frozen comparators, endpoint separation,
and exhaustive ±2pixel sensitivity. direct.py adds post-hoc direct T/I and
finite-sample operator bounds. Four stdlib unittest checks pass, including
a synthetic case where participant-positive area exceeds clipped group area
and a synthetic bound verification. No repository test suite applies because
no repository files changed.

Do not claim independent sample n=40 or count fasting and lunch as n=20.
Do not derive paired D uncertainty from marginal SEM bars or paired t-test
P-values. The tables do not report enough area covariance to estimate it.
Do not declare product calibration, personal response prediction, insulin
dose guidance, or validation of the current app from these narrow contrasts.

## Exposed secondary time-trajectory objective

The coordinator requested an additional objective after seeing outcomes:
equal-weight mean absolute log error on D at the predeclared nested windows
60,120,180 within each protocol. These are correlated summaries of one time
course, not independent replications. Supplied aggregate donor vectors are
embedded in trajectory.py and explicitly labelled as supplied.

For any three observed positive D values, the minimum possible mean error
over ALL fixed D choices is (max(log D)-min(log D))/3, attained at their
log median. This evaluation-fitted oracle is a lower-bound diagnostic,
not an externally trained predictor.

My fasting target D=(1.260565,.991095,.782601). External matched-donor
nominal trajectory(1.160103,.864077,.761956) gives mean ALE .082312,
beating the best possible fixed D minimum .158897. Using donor linear
interpolation to zero gives .065726; donor stated08:40 clock gives .038023.
Relocating target baseline to zero gives errors .076931/.060788/.038325,
all below the corresponding fixed oracle .161057.

Lunch fails: target D=(1.331665,1.270784,1.228720); nominal donor
(.989769,.861993,.860892) error .346872 vs fixed-oracle .026819.
Donor linear-zero error .341350; relocating target baseline to zero
preserves failure. No protocols or repeated windows are pooled.

Thus the external fasting time-dependent discrimination trajectory captures
change better than any constant on this exposed diagnostic. It remains
secondary to the frozen signed120 failure. It is not a statistical test,
not a primary objective win, not evidence of a biological crossing time,
and not a participant-positive or population uncertainty conclusion.
The full independent ±2pixel envelope was not optimized jointly across
windows for this new objective; clock sensitivity alone is demonstrated.

Reproduce: python calculate.py; python direct.py; python trajectory.py; python -m unittest
test_arithmetic.py (working directory: this sol folder). Source PDFs and
figure assets stay local in this laboratory folder; only aggregate facts
and scripts should enter public outputs.
