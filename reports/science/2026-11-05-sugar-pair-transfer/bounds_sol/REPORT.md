# Independent finite-sample participant-positive envelope

This is a research analysis outside the application repository. No application,
dataset, scoring formula, scientific claim, or Git state was changed. The subject
is the original van Can et al. IGT study, *British Journal of Nutrition*, DOI
10.1017/S0007114511006714, Figure 1c,d. The PDF's Methods and caption state n=10,
means with SEMs, sampling at -5,30,60,90,120,150,180 minutes, a 75 g carbohydrate
load, breakfast drinks, and lunch drinks with a mixed meal. Only 0-120 minutes
are analyzed here. Each period uses its own premeal baseline; the measured -5
minute concentration is held to nominal time zero. These graph-to-time and
piecewise-linear assumptions are essential and explicit.

## Answer

With independent +/-3 **original embedded-image** pixels allowed at every mean
and baseline, the conservative possible-sample envelope for

    Q = [mean participant-positive AUC_T / mean participant-positive AUC_G]
        / [mean participant-positive AUC_I / mean participant-positive AUC_S]

is **[0.779640, 1.889687] for lunch**, and **[0.459689, 2.093695] for
breakfast**. T/G means trehalose/glucose; I/S means isomaltulose/sucrose.
These are ratios of sample mean participant areas, not means of participant
ratios. The glucose and sucrose controls are separate denominators.

The old pair-specific projection is Q_old=0.345231/0.654771 (about 0.52725),
compared with Q_common=1. Under equal absolute log distance their midpoint is
sqrt(Q_old), about 0.726. Every lunch Q in the envelope exceeds that midpoint:
**lunch favors the common projection under this expressly specified loss even
after allowing participant positivity**. It also excludes the old pair-specific
Q itself. This result does not establish a population interaction, identify a
causal mechanism, establish equivalence to one, or establish Q>1 under
participant-positive integration. The outer bound includes values below one,
and inclusion alone is not a proof that any interior value is attainable.
Breakfast does not certify either projection as closer at +/-3 pixels.

## Results

| Period | Mean pixel bound | Positive T/G envelope | Positive I/S envelope | Positive Q envelope | Signed Q interval |
|---|---:|---:|---:|---:|---:|
| Breakfast | 0 | .500302-.763071 | .449431-.891751 | .561033-1.697861 | .968002 |
| Breakfast | +/-2 | .468748-.801680 | .411216-.953216 | .491753-1.949537 | .798063-1.175844 |
| Breakfast | +/-3 | .453267-.821884 | .392552-.986031 | .459689-2.093695 | .724771-1.297149 |
| Lunch | 0 | .724248-1.002642 | .596423-.834235 | .868159-1.681091 | 1.279442 |
| Lunch | +/-2 | .697658-1.036682 | .570141-.863581 | .807866-1.818292 | 1.155401-1.417365 |
| Lunch | +/-3 | .685105-1.054287 | .557916-.878744 | .779640-1.889687 | 1.098080-1.492097 |

The finite-n marginal-moment bound is reported above. The still simpler bound
using only nonnegative concentrations gives lunch Q [.779640,1.889687] at +/-3
pixels and [.807846,1.818335] at +/-2. Thus the key conclusion does not depend
on resolving a single SEM. Central signed Q is 1.279442 for lunch and .968002
for breakfast. Signed mean integration commutes with averaging participants;
positive integration does not. Neither signed Q nor positive integration of
the mean curve should be relabeled as the actual mean participant-positive Q.

## A rigorous elementary envelope

Write B_i>=0 for participant i's own period baseline and X_ij>=0 for their
postmeal concentrations at j=30,60,90,120. Let the participant trajectory be
linear between the measured nodes and have X_i0=B_i. Define

    A_i = integral_0^120 max(X_i(t)-B_i,0) dt.

By convexity (Jensen), its sample mean is at least

    L = integral_0^120 max(mean X(t)-mean B,0) dt.

The integral splits at the *actual zero crossing* of each affine mean segment.
It does not simply clip the endpoint values and use a trapezoid across a
crossing. If a<0<b on a segment of length h, its positive area is
h*b*b/[2*(b-a)] (and symmetrically if b<0<a).

For t in [0,30], write a=t/30. The individual increment is exactly
a*(X_i30-B_i), so its positive part is <=a*X_i30. Later it is <=X_i(t).
Therefore

    mean A <= U = 30*m30 + 30*m60 + 30*m90 + 15*m120.

This improves the looser bound integral mean X(t), which unnecessarily carries
the baseline mean over the first interval. If the mean increments stay positive
(as all current central and +/-3 pixel extreme mean trajectories do),

    L = U - 105*mean B.

The baseline factor is 105, not 120, because the first segment starts at zero
increment and rises linearly. For reading intervals, evaluate L using every
postmeal mean's lower endpoint and the baseline's upper endpoint. Evaluate U
using the postmeal upper endpoints. This is a simultaneous deterministic outer
bound; no probability distribution or covariance assumption is used.

## Additional finite-n mean/SEM envelope

Let x,b be the sample means and sx,sb upper bounds on their SEMs. SEM uses the
usual sample SD with denominator n-1, divided by sqrt(n). For any subset of k
participants, Cauchy and nonnegative concentrations imply

    mean_over_all [X * indicator_subset]
        <= min(x, k*x/n + c_k*sx),
    mean_over_all [B * indicator_subset]
        >= max(0, k*b/n - c_k*sb),
    c_k = sqrt((n-1)*k*(n-k))/n.

Take the subset with X_i>B_i. Its cardinality is one of k=0,...,n, so

    mean (X-B)+ <= max_k {min(x,k*x/n+c_k*sx)
                          - max(0,k*b/n-c_k*sb)}.

This finite-n bound is at least as useful as applying a generic second-moment
bound to the increments without using concentration nonnegativity. It requires
no guessed baseline-time or cross-time correlation. Unknown covariance is
bounded conservatively: between two postmeal nodes, sx(t) <= the linear
interpolation of their SEM upper bounds (triangle inequality for centered
participant vectors). On the first interval the increment's identity above is
used directly.

Every nonnegative finite sample satisfies SEM<=mean, since sum X_i^2 <=
(sum X_i)^2. **Unresolved SEMs use this upper bound, never zero.** The input CSV
leaves those original tip coordinates blank. At central zero-pixel readings,
all eight baselines and the overlapping lunch 30-minute T/G tips are unresolved.
The resulting SEM fallback is intentionally wide. The visible later error bars
add only negligible tightening; they cannot recover the unknown covariance.

For resolved tips the maximum SEM allows the sum of marker and tip reading
errors. For robustness the upper bound is evaluated at x_high,b_low,sx_high,
sb_high, permitting inconsistent extremal choices and thereby remaining
conservative. The SEM<=mean cap uses the applicable mean upper bound.

At each original interval, the true mean participant positive increment is
convex in time. Trapezoids of certified nodal upper bounds therefore bound its
integral from above. The implementation subdivides each interval 120 times;
this does not use unverified midpoint equalities. It is a certified upper sum,
not a numerical claim about actual participant crossings. The Jensen lower
bound uses exact crossing formulas. A simple concentration-only calculation
independently reproduces the principal +/-3 pixel results.

## Digitization and reproducibility

`digitization.csv` contains every original embedded-image mean y coordinate,
resolved upper-tip y coordinate, transformed concentration, and tip status.
Panel c and d axes are calibrated against the PDF's vector tick locations and
the embedded image placement. The common zero is y=637.6198894919515 in the
original 809x988 image. Units per original pixel are .7889098846778434 (c) and
.6587280135677293 (d). The image was extracted locally from the source PDF;
source/crop images are prefixed `private_` and are not intended for distribution.
The pixel bounds are sensitivity choices, not calibrated stochastic error or
confidence intervals. Axis locations were read from PDF vector coordinates;
no additional independent uncertainty on those coordinates is modeled.

Run `python envelope.py`. It regenerates `envelope.json`, `digitization.csv`,
and printed summaries, and first tests exact sign-crossing examples and the
finite-sample inequality on 10,000 synthetic n=10 pairs, including sparse
baseline extremes. Those checks passed. No real participant observations are
used in tests or reconstructed. This independent analysis still needs the
parent/human's actual review before being used as a scientific claim.

Additional checks passed Python compilation and 96 lower/upper consistency
checks using 1,60,120,240 subdivisions. A diagnostic assertion that refinement
must always tighten the numerical upper sum failed and was rejected as an
invalid premise: the pointwise *bound* need not itself be convex even though
the actual participant-positive trajectory is convex on each original segment.
Each subdivision's upper sum remains certified by the nodal convexity proof;
no monotone-convergence claim is made. The principal +/-3 pixel conclusion
uses the elementary concentration-only bound and is independent of subdivision.

The bound is descriptive of the n=10 sample and the displayed trajectories,
conditional on their stated interpolation and reading intervals. It is not a
population interval, a confidence interval, a recovered participant-positive
estimate, or a claim that every value inside the interval is feasible. Source
data or substantially stronger justified constraints would be needed to make
the participant-positive ordering itself identifiable.
