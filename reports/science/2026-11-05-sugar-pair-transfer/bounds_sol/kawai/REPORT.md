# Independent external holdout: Kawai1985

The original [Kawai et al. paper](https://doi.org/10.1507/endocrj1954.32.933)
was read independently against the already frozen `public/SHAPE_PLAN.md`.
No donor numbers were fitted to this target. The two-window forecast uses full
precision donor I/S values .41470337160713994 and .5799043269598717.

## Findings

| Graph-derived signed mean area | 0-60 minutes | 0-120 minutes |
|---|---:|---:|
| Isomaltulose / palatinose | 558.9711 | 1258.5687 |
| Sucrose | 1432.4625 | 2739.1722 |
| I/S ratio | .39021693 | .45947047 |

Area units are microU min/ml. The ratio increases by **1.17747446** from
60 to 120 minutes; the frozen donor shape predicts **1.39835933**.

| Forecast | Mean absolute log error over 60/120 |
|---|---:|
| Frozen time-varying donor trajectory | .14682457 |
| Constant donor 120-minute I/S=.57990433 | .31447439 |
| External scalar I/S=.65477 | .43589528 |
| Equality, I/S=1 | .85936653 |
| Best possible target-fixed constant | **.08168593** |

Any fixed ratio from .39021693 through .45947047 attains that final optimum:
with two outcomes every constant between their log ratios minimizes absolute
log loss. It uses the target outcomes and is an oracle benchmark, not a
forecast. The frozen trajectory beats the three prespecified scalar forecasts,
but does **not** beat this best possible fixed ratio at the central reading.

For shape alone, the frozen prediction's absolute log error is .17192778;
no change (R120/R60=1) gives .16337186. Thus the central shape prediction
slightly loses to no change. **This shape-loss ordering is not robust to graph
reading uncertainty.** The target ratio increases robustly under the tested
reading ranges, but the amount of increase is overpredicted by the donor.

## Protocol and identity qualification

Figure 1's legend identifies solid filled circles as **palatinose**, which is
isomaltulose, and dashed open circles as **sucrose**. This is I/S, not T/G.
Eight healthy young adults (4 women, 4 men) received nominal 50 g sugar in
150 ml water after overnight fasting, over 2-3 minutes, in random-order
paired trials two days apart. The figure contains 0,15,30,60,90,120-minute
insulin means with SEM. It does not contain 180-minute measurements or a
numerical AUC table. Purity and hydrate/dry-carbohydrate corrections are not
specified; the result is qualified as nominal 50 g material. These are separate
subjects and laboratory from the overweight Maastricht donor, and the dose
differs. No clock fitting, pooling, or extrapolation to 180 minutes was used.

The paper's textual cumulative increments (56.5 versus 118.7 microU/ml) are
not reported in time-integrated area units and were not substituted for AUC.
Its textual isomaltulose fasting mean is 11.5 microU/ml; the independently
read graph baseline is about 11.34, within the declared +/-5 original-pixel
reading range. Both trajectories use their own fasting baseline.

## Reading and uncertainty

`digitization.csv` records coordinates in the original 4299x6071 page image,
extracted locally from the PDF. Insulin axis ticks are approximately y=5150,
4570,3990 for 0,25,50 microU/ml, giving 23.2 pixels per unit. The scanned
horizontal axis has slight slope. The central correction is .00215 y pixels
per x pixel; the sensitivity calculation permits [0,.0043]. A single y-axis
scale cancels in I/S and shape ratios. Absolute area intervals additionally
permit 23.0-23.4 pixels per unit.

The analysis uses linear interpolation between the displayed sample nodes
and signed trapezoids. For 60 minutes the postbaseline weights are
15,22.5,15 for the 15,30,60-minute increments. For 120 they are
15,22.5,30,30,15 for the five postbaseline increments. The exact baseline
subtraction coefficient is respectively 52.5 and 112.5 minutes. These
identities independently reproduced the program's segment-by-segment areas.
There are no interpolated 180-minute outcomes or invented participant cases.

| Reading uncertainty | R60 interval | R120 interval | R120/R60 interval |
|---|---:|---:|---:|
| +/-5 original mean/baseline pixels, scan slope range | .366143-.415155 | .428752-.491538 | **1.143134-1.214383** |
| +/-10 original pixels, scan slope range | .345259-.438283 | .404413-.519020 | **1.117259-1.247191** |

The shape-loss midpoint between predicted 1.39835933 and no-change one is
sqrt(1.39835933)=**1.18252244**. Both intervals cross it. Do not report a
certified shape-loss winner. Both intervals stay above one and below the
predicted donor shape. The frozen trajectory's advantage over the donor120
constant is robust even at +/-10 pixels because the entire R60 range lies
below sqrt(.41470337*.57990433); their 120-minute prediction is identical.
The analogous per-window geometric midpoints certify its advantage over
.65477 and equality. The central oracle-fixed advantage is not asserted for
every allowed reading.

Extrema enumerate all original mean/baseline interval vertices while retaining
the shared baseline in each curve. Each area is affine in those readings and
the scan slope; each within-sugar A120/A60 is linear-fractional with positive
denominator and attains its extrema at vertices. Shape extrema then combine
the separate sugar extrema. Allowing each sugar a separately extreme scan
slope is conservative despite the actual shared scan. These bounds describe
reading assumptions, not SEM propagation or sampling confidence intervals.

The study does not supply individual trajectories. The reported quantities
are signed areas of the sample mean curves, and their ratios. Positive-part
integration of the displayed means happens to coincide here but is not the
mean of participant-positive areas. No participant-positive or population
claim is identified by this analysis.

## Reproduction and review

Run `python holdout.py` to regenerate `results.json` and `digitization.csv`.
Python compilation passed; the separate weighted-area identities and the
two-window optimum-fixed-loss identity passed. No arbitrary synthetic cases
were added. The independent reader's calculations should be compared by the
coordinator with the other reader before final reporting.

Original PDF SHA256:
`D962607FC93E0564F395D4C4818F94F8B78B47E76EA61CD558F8C49D6D686273`.
Frozen plan SHA256:
`D551E0816EDBA3C43E08D9BAB4132E86BD4C15D0C0E63A6287B301E553E3342D`.
Files prefixed `private_` are local source/render working material; exclude
them from any public distribution. No application code or Git state changed.
