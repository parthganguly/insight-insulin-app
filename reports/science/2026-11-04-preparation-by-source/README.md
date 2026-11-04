# What transfers when barley is milled or starch is cooked?

**A grain-preparation reference forecast two barley kernel/flour contrasts closely. It could not explain a different result: cooking changed which starch source produced the larger insulin area.** In the latter study the matched-food digestion measurement predicted the reversal, but taking insulin area as proportional to hydrolysis greatly overstated its size. These are research results on specified meals. Decision D remains open.

## Equal starch, opposite source order

Bornet et al. assigned 18 healthy adults to three groups of six. Within each group everyone received three isolated starches, on separate mornings, in a fixed preparation category. The raw suspensions and cooked, cooled gels used wheat, cassava (manihot) and smooth pea. The industrial group received extruded wheat, tapioca and mung-bean noodles. All meals supplied 35 g starch on a dry basis. The gels were heated from 20 to 96 °C over 20 minutes and stored 24 hours at room temperature. The industrial products underwent distinct processes and subsequent cooking. Meal mass and eating time varied. The digestion assay used preparation-specific samples passed through a 1-mm sieve, so it does not represent chewing or the entire eating protocol. [Original paper, pp. 315–321](https://doi.org/10.1093/ajcn/50.2.315) · [Repository copy](https://hal.inrae.fr/hal-02728571v1/file/1989_Colonna_Am.J.Clin.Nutr_1.pdf)

| Cassava / wheat | Raw suspension | Cooked gel | Gel ratio / raw ratio |
|---|---:|---:|---:|
| Signed 0–120 min insulin area, reconstructed from arm-mean curves | 0.301 | 1.149 | **3.821** |
| Printed 0–180 min incremental insulin area | 0.309 | 1.177 | **3.809** |
| Same starch dose | 1.000 | 1.000 | 1.000 |
| Amylopectin dose | 1.137 | 1.137 | 1.000 |
| Direct 30-minute hydrolysis, Figure 3 reading | 0.093 | 1.541 | 16.66 |
| Hydrolysis raised to the frozen hummus exponent | 0.543 | 1.117 | 2.06 |
| New affine mapping calibrated on the same hummus donor | 0.641 | 1.214 | 1.89 |

A source multiplier times a common cooking multiplier preserves the cassava/wheat ratio at both preparations. Whatever coefficients it uses, its last-column forecast is 1. This restriction misses the **point estimates**. The measured assay provides information on how two starch sources respond differently to cooking. Absolute calibration remains poor. Sol's reading from Figure 4, with Figure 3 used to identify preparations, gave a direct 30-minute change of about 18.8. The coordinator's reading of raw cassava was below 1% hydrolysis. Small ordinate changes matter there. The figure-reading envelope for the observed signed two-hour change was 3.20–4.62 under the coordinator's coordinate convention. That range describes the scan, not sampling uncertainty. [Coordinate records](bornet_inputs.json) · [Calculations](bornet_results.json)

The exact three-hour cassava-minus-wheat differences were −7.6 and +4.4 nmol·min/L, a change of +12.0 between groups. The 0–180 table reports incremental areas without specifying a positive-clipping convention. The possible standard error of the difference-in-differences ranges from 0.92 to 9.66 across the unknown within-group correlations. The change describes these samples; separate raw and gel cohorts, short visits, eating-rate differences and missing paired covariance limit inference about a population interaction. No participant-positive two-hour area can be recovered by clipping these group curves. [Uncertainty calculations](sensitivity_results.json)

### What happened to the other predictions?

Each primary error is the mean absolute log error on the two non-wheat/wheat ratios in its own group. The pea in the first two groups and the mung-bean noodle in the third are different products. Each row below uses the **exact printed three-hour** insulin areas.

| Preparation | Equal dose | Amylopectin | Direct H30 | Hummus-calibrated power | Hummus-calibrated affine |
|---|---:|---:|---:|---:|---:|
| Raw | 0.746 | 0.752 | 0.675 | **0.419** | 0.491 |
| Gels | 0.212 | 0.090 | 0.354 | 0.067 | **0.035** |
| Industrial products | 0.652 | 0.553 | **0.127** | 0.503 | 0.485 |

Both calibrations use one external contrast from a hummus study. They use no Bornet insulin for prediction. With (h) the ratio of starch released, the power rule is `h**0.2563` and the affine rule is `1 + 0.3956 × (h − 1)`. Each maps equality to equality and reproduces the same donor point. The industrial products are a counterexample to using the smaller effects from either calibrated rule everywhere. The raw direct-versus-equality ranking is sensitive to the read near zero. The measured phenotype is new information; the power and affine functions are transformations of that same information. Sol's alternate reading preserves the industrial advantage of the direct mapping and the poor direct result on gels. The published correlation across all nine means does not answer these within-group prediction questions.

For the 20-minute time used by the donor assay, the primary two-hour errors for direct/power/affine were 1.100/0.239/0.422 (raw), 0.346/0.063/0.064 (gel), and 0.092/0.480/0.456 (industrial). The raw cassava 20-minute reading is very close to the graph baseline. Its reading range includes zero, so a finite upper bound on the direct raw-to-gel change is unavailable. These H20 point scores are coordinator reading scenarios. Sol independently recovered broad H20 ranges but could not resolve individual central readings for raw cassava, cooked wheat and extruded wheat. H30 provides the stronger quantitative comparison. The published intra-assay reproducibility of 15% at 30 minutes is not a numerical allowance for graphical reading. The two-hour signed results, three-hour results, third within-group contrast and alternate purity assumption remain in the executable comparison. [Independent readings](sol/Bornet_results.json)

## Can a cheaper preparation reference compete with a digestion measurement?

Heaton's whole/fine ratios of three-hour insulin areas were 0.512 for wheat, 0.529 for maize and 0.840 for oats. We applied the median, **0.529**, unchanged to barley in a different laboratory. The donor includes differences in cooking treatment and uses the lower of fasting or 10-minute insulin as its baseline. This is a preparation-matched empirical reference learned from human responses, independent of the evaluation cohort. It does not supply an absolute insulin forecast from the ingredient list. [Heaton et al.](https://doi.org/10.1093/ajcn/47.4.675)

Granfeldt et al. compared cooked kernels with porridge from flour milled from the corresponding covered barley genotypes. Kernels cooked 25 minutes, porridges 2.5 minutes. Clinical meals contained 50 g potentially available starch, about 19 g protein and 8.4 g fat. The published methods set eating onset to time zero, treat below-baseline glucose as zero and describe an analogous insulin index. Exact baseline-crossing interpolation is unspecified. The assay measured a three-hour hydrolysis index relative to white bread on matched chewed barley preparations; cheese, butter and salt from the served clinical meal were excluded. It has no reported H20/H30 value. [Granfeldt et al., Tables 1–2](https://doi.org/10.1093/ajcn/59.5.1075)

| Kernel / flour | Native 0–120 min means (nmol·min/L) | Observed | Grain reference | Direct hydrolysis index |
|---|---:|---:|---:|---:|
| Normal covered barley | 5.8 / 11.0 | 0.527 | 0.529 | 0.627 |
| High-amylose covered barley | 5.2 / 10.2 | 0.510 | 0.529 | 0.607 |

Across these printed arm means the grain reference scored **0.020** versus **0.174** for the direct hydrolysis index, **0.309** for the external hummus reference and **0.657** for equality. It was also closer for the separate bread-normalized indices and the 90-minute areas. The source notes that the normal kernel and flour insulin measures were not significantly different. A good forecast of two aggregate means does not establish population accuracy.

**One missing participant changes what can be concluded.** All ten participants ate kernels; nine ate the porridges. If a nonnegative individual area is omitted, the nine-person kernel mean lies within one full-sample SEM of the ten-person mean and cannot exceed ten-ninths of that mean. Before printed rounding, the resulting matched-nine ratio bounds are 0.436–0.586 and 0.314–0.566. A feasible case in which the same omitted participant has zero area on both kernel visits reverses the average error ranking (0.086 grain, 0.068 hydrolysis). This is an algebraic witness, not an estimate of that person's results or a sampling interval. The matched-nine means, or those two omitted kernel areas, would settle the sample comparison. [Bounds, rounding and separate endpoints](barley_results.json) · [Independent reconstruction](sol/verified_results.json)

### Differences within a preparation

The covered high/normal ratios were 0.897 within kernels and 0.927 within flours. Form alone predicts 1. Amylopectin fraction predicts 0.866 in both. Direct hydrolysis predicted 0.723/0.747; its two attenuated mappings predicted 0.920/0.928 (power) and 0.891/0.900 (affine). The covered-versus-hull-less high-amylose comparison is an important exception: the two kernel hydrolysis indices both equal 34, yet the reported hull-less/covered insulin ratio was 0.712. The power rule cannot distinguish those products. These comparisons share arms, were explored after the initial barley means were disclosed, and include genetic and compositional differences beyond amylose. An illustrative combined prediction applies the grain factor between forms and a preparation-specific assay adjustment within form; its ratio predictions and every kernel comparison are retained as development only. [All meal forecasts](barley_results.json)

## Decision for INSIGHT

Keep plant source and preparation together in research records. For the familiar kernel/flour operation, a specific inexpensive preparation reference is competitive. For raw versus gelled starch, a source-only multiplier and a shared heat adjustment miss a reversal. Measuring early release helped identify it, while the best magnitude mapping changed with the processing category. The evidence supports testing these branches separately. Decision D and the absolute consumer score remain open.

The next useful transfer would keep these numerical rules fixed in a separately collected comparison of **the same starch sources under at least two specified processes**, with matched early-release measurements. A same-cohort contrast or paired uncertainty would distinguish a change in source ordering more sharply. For the existing barley trial the matched-nine summary would resolve a narrower uncertainty. No author request was sent.

Run `python -B reproduce.py` for the offline analysis; the optional `python -B audit_source.py DIRECTORY` checks the original Bornet scan and the retained public barley Table 2 text if supplied. [Study admission and working contributions](RECONCILIATION.md) · [Coverage and the prior fixed-forecast midpoint](coverage_results.json)
