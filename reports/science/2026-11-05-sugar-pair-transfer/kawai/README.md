# External insulin-trajectory check in eight healthy Japanese volunteers

The cumulative isomaltulose/sucrose (I/S) insulin-area ratio rose from **0.391 at 60 minutes to 0.460 at 120 minutes**. The frozen Maastricht trajectory predicted 0.415 and 0.580. It beat both preselected fixed insulin-area ratios on absolute magnitude. Its prediction of the change between windows overshot the observed rise. The central estimates weakly favor no change on that separate objective, and plausible differences in reading the graph can reverse that comparison. The study ends at 120 minutes.

## Study and source acquisition

Kawai, Okuda and Yamashita studied eight healthy volunteers, four women and four men, age 23.0 (SEM 0.4) years. After overnight fasting participants drank 50 g palatinose (isomaltulose) or sucrose in 150 mL water over 2–3 minutes, in randomized order two days apart. Blood from a forearm catheter provided the plasma samples. Plasma immunoreactive insulin (IRI) was measured by radioimmunoassay, with results in µU/mL. Mitsui Sugar supplied the palatinose. The setting was the University of Tsukuba. [Original article, pp. 933–936](https://doi.org/10.1507/endocrj1954.32.933)

We downloaded the four-page publisher PDF from J-STAGE and inspected the complete methods, the figure legend and lower insulin panel of Fig. 1 on printed p. 934, and the numerical text on p. 935. PDF SHA-256 is d962607fc93e0564f395d4c4818f94f8b78b47e76ea61cd558f8c49d6d686273. Figure coordinates refer to the native 4,299 × 6,071 pixel monochrome scanned page, image xref 3 on the PDF’s second page, with pixel origin top left. The original, scan, and visual inspection crops are private. [J-STAGE PDF](https://www.jstage.jst.go.jp/article/endocrj1954/32/6/32_6_933/_pdf/-char/en)

## Curve reconstruction

The lower panel’s filled circles and solid line represent palatinose. Open circles and a dashed line represent sucrose. Sampling occurred at 0, 15, 30, 60, 90 and 120 minutes. We read marker centers directly in the embedded raster at full resolution, used the hollow interiors to locate the open centers, and inspected the overlap of fasting marks at higher magnification. Upper and lower error bars are one SEM. At baseline the bars and marks partly obscure each other, especially on the sucrose series. Coordinates and individual SEM readings are retained. Two calibration points at native y = 5150 and 3991 correspond to 0 and 50 µU/mL; the 25 tick is y = 4570. The trace uses each arm's own fasting mean and signed, linearly interpolated trapezoids. The observed 15-minute sample is included in the primary result.

The raster gives fasting palatinose 11.17 and sucrose 11.78 µU/mL. The paper gives fasting palatinose 11.5 (SEM 1.4) and 60-minute sucrose 43.8 (SEM 8.6), versus figure reads 11.17 (1.25) and 43.66 (8.41). Substituting the two printed values in a diagnostic gives I/S 0.379 and 0.446, with a growth factor of 1.177. Adjusting the y origin for the few pixels of local printed-axis distortion yields growth 1.176.

The paper reports cumulative increments ΣΔIRI of 56.5 (SEM 4.7) and 118.7 (SEM 20.3) µU/mL, with paired P<0.05. The unweighted sums of observed increases from the group curves are 55.6 and 117.5 in those concentration units. This cross-check supports the arm identities and calibration. The publication supplies no minute-weighted native area. The paired test applies to ΣΔIRI. Joint participant traces, paired time covariances, and individual positive-only areas were unavailable. [Results and Fig. 1](https://www.jstage.jst.go.jp/article/endocrj1954/32/6/32_6_933/_pdf/-char/en)

## Frozen prediction and results

| Window | Signed I (µU·min/mL) | Signed S | Observed I/S | Donor I/S | Signed log(forecast/observed) |
|---|---:|---:|---:|---:|---:|
| 0–60 min | 563.6 | 1440.1 | .3914 | .4147 | +.0579 |
| 0–120 min | 1265.1 | 2749.9 | .4601 | .5799 | +.2315 |
| 0–180 min | unavailable | unavailable | unavailable | .6888 | unavailable |

| Prediction | Equal-window mean absolute log error |
|---|---:|
| Maastricht window-specific ratios | .1447 |
| Maastricht fixed 120-minute ratio (.5799) | .3124 |
| Holub fixed ratio (.6548) | .4338 |
| Equality (1) | .8573 |
| Hindsight best possible fixed ratio | .0808 |

Every fixed ratio in [.3914, .4601] attains the same post-observation minimum. The geometric center is .4243. The donor's 60-minute ratio alone also falls in the interval, an exploratory observation about the sensitivity to the choice of fixed comparator.

For the shape-only question the predicted 120/60 growth was 1.3984 versus observed 1.1755. Absolute log errors were .1736 for the donor shape and .1617 for a constant ratio. Their break-even observed growth is 1.1825. Anchoring the prediction on the **measured** evaluation 60-minute ratio would give .5473 at 120 versus .3914 from flat carry-forward and .4601 observed. This comparison requires target physiology. Removing the actual 15-minute measurements to mimic the donor’s 30-minute grid gives growth 1.222 and reverses the central preference. This resampling is a sensitivity analysis.

Changing each marker y independently by ±4 native pixels (0.173 µU/mL, well inside the ~28-pixel circle width) and re-evaluating all 4,096 vertex configurations gives R60 .374–.409, R120 .440–.481 and growth **1.153–1.199**. The difference in shape loss, varying minus flat, ranges from −.0280 to +.0503 across these configurations. The direction of growth survives even the ±8-pixel check, while the winner on the shape objective does not. These perturbations quantify graph reading sensitivity. Participants' repeated measurements and nested windows preclude treating the two points as independent replication. The comparison is of signed mean area between two different 50 g and 75 g fasting studies.

## Separate 1989 diabetes paper

The 1985 paper contains only the healthy cohort. A subsequent Kawai et al. paper studied palatinose in diabetes. PubMed provides a bibliographic record, Crossref points to Thieme’s full-text PDF, and OpenAlex lists only DOI/PubMed landing pages with empty PDF fields. The publisher DOI, HTML, and PDF routes returned a “Please wait” HTML document instead of the article in this session. The Semantic Scholar record marks its PDF closed. Searches of the University of Tsukuba and Japan Science and Technology Agency records, as well as the manufacturer's publication list, yielded citations without original curve coordinates. No diabetes concentration/time series was verified or scored. Possible overlap of the 1989 control group with the 1985 volunteers remains unresolved. [1989 original DOI](https://doi.org/10.1055/s-2007-1009230) · [PubMed](https://pubmed.ncbi.nlm.nih.gov/2673967/) · [Japanese bibliographic record](https://jglobal.jst.go.jp/detail?JGLOBAL_ID=200902031423278751)

## Replay

Run `python -B kawai.py` in this directory. Only the standard library and `coordinates.csv` are required. The outputs are `curve.csv`, `areas.csv` and `results.json`. This artifact contains factual summary coordinates and derived results. No source pages, participant records, clinical prediction, or model update form part of the public replay.
