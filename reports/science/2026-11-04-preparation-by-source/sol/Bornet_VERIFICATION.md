# Bornet independent verification

This supersedes the earlier access-status paragraph in INDEPENDENT_VERIFICATION.md. The full public original PDF is now available and visually inspected. No individual Table2 records were used. Source SHA256: `8801cf69c4aaeb7127c22e77776d6c9f5bfcbf1dace14fbd85dae2671bd39880`.

## Independent numerical extraction

H30 is an independent reading of Figure4 x coordinates, cross-checked against Figure3 product labels. Our allowance is ±0.4 percentage points, except raw cassava ±0.25 because its marker nearly touches the y-axis. These are graph-reading bands only. A later coarse independent Figure3 H20 check is recorded below; three individual centers remain unresolved, so exact nine-arm H20 forecasts do not receive independent verification here.

| Group/product | H30 % | Table5 insulin180 mean ±SEM | Figure2 signed mean-curve120 |
|---|---:|---:|---:|
| Raw wheat | 8.6 | 11.0 ±2.1 | 8.55 |
| Raw cassava | 0.7 | 3.4 ±1.4 | 2.59 |
| Raw smooth pea | 7.3 | 8.0 ±1.2 | 7.13 |
| Gel wheat | 32.9 | 24.8 ±4.2 | 22.72 |
| Gel cassava | 50.3 | 29.2 ±4.8 | 26.51 |
| Gel smooth pea | 16.2 | 19.1 ±4.1 | 17.22 |
| Extruded wheat | 37.1 | 22.5 ±3.7 | 20.97 |
| Tapioca | 40.2 | 29.5 ±8.6 | 27.39 |
| Mung noodles | 12.2 | 8.0 ±1.3 | 7.44 |

Insulin area units nmol/L·min. Figure2 readings retain a zero anchor and trapezoids at0,30,60,90,120. The executable stores original marker pixel coordinates and calibration. Conservative per-arm reading ranges are approximately ±0.9–1.15 area units; these are not clinical SEMs. Source graph has negative late tails. Table5 calls its endpoint incremental0–180 area but does not explicitly specify the sub-baseline clipping convention; do not relabel its exact values participant-positive or definitively signed. Signed120 is our integration of group mean curves, not mean individual positive iAUC. The central group means through120 are nonnegative, so no group-level clipping was applied.

## Assay interpretation

The p316–317 protocol uses aliquots containing18g starch, passed through a1mm sieve, incubated with3000U hog pancreatic α-amylase in200mL phosphate buffer at37°C under30rpm stirring for3h. Samples were taken every5min during the first30min and thereafter at longer intervals, precipitated with ethanol/acetic acid, stored overnight, centrifuged, and soluble carbohydrate measured by sulfuric-orcinol assay. The figure percentage is hydrolyzed starch relative to the starch substrate, not relative to the180-minute maximum, white bread, or a clinical response. The paper does not provide an explicit mass-balance equation for that percentage; the substrate interpretation follows its stated percentage-starch-hydrolyzed terminology and18g loading. This is a sieved laboratory starch digestibility assay, not an untouched served-food measurement.

The paper says **intraassay** reproducibility15% at30min and4% at180min. It does not identify the15% statistic as a coefficient of variation or a confidence interval. Do not use15% as a measured error bound on these H30 ratios. The separate insulin radioimmunoassay reproducibility6% is also distinct.

## Frozen-rule comparison

Per group, primary score averages absolute log errors for the two non-wheat/wheat ratios. All third legume/cassava comparisons remain in JSON. No barley or Bornet outcome fitting was performed. Equal/form, amylopectin, direct H30, external power, and external affine scores respectively:

| Group | Table5 incremental180 | Signed mean-curve120 |
|---|---|---|
| Raw | .7463, .7524, .7444, .4038, .4897 | .6881, .6943, .6660, .3457, .4315 |
| Gels | .2122, .0900, .3543, .0670, .0318 | .2156, .0934, .3509, .0704, .0445 |
| Industrial | .6525, .5528, .1344, .4997, .4819 | .6517, .5521, .1315, .4989, .4812 |

Central family rankings agree with the coordinator on both endpoints: power best in raw, affine in gels, direct H30 in industrial. H30 reading-band corner ranges for180 scores are also recorded. Direct H30 versus equality in raw is unstable: .5636–.9920 versus fixed .7463, so no precise superiority claim there. Gels direct loses to composition, whereas the calibrated mappings improve. Industrial direct decisively improves on these cheap candidates at the tabulated central endpoints and survives H30 reading bands. Clinical sampling uncertainty is not resolved by these coordinate checks.

Relative to coordinator120 readings, our raw areas are systematically2.86–3.97% higher, consistent with slightly different zero/scale calibration. Other arms differ−0.76% to+1.53%. H30 differences range−0.20 to+0.45 percentage points (raw cassava−0.07). Independent reading intervals overlap; exact small score margins should not be overinterpreted. The nine Table5 means agree exactly.

## Cassava versus wheat, raw to gel

The exact180 ratios change from3.4/11=.30909 to29.2/24.8=1.17742, interaction3.80930. Independent signed120 interaction3.85125; coordinator3.82072. Composition/source-factor times common heat predicts1. Direct H30 predicts18.7833, external power2.12068, affine1.89945. Thus H30 supplies the direction of the interaction but direct proportional release greatly overstates its magnitude; calibration improves this specific aggregate diagnostic. Raw-to-gel cohorts are independent, so this is not a paired within-person heating effect.

Native additive cassava-minus-wheat differences are−7.6 raw and+4.4 gel, giving difference-in-differences+12.0 area units. With unknown within-cohort correlationsρr,ρg, its variance from reported SEMs is47.05−5.88ρr−40.32ρg. For correlations in[−1,1], SE ranges0.92195–9.65660. This dependence envelope is not a confidence interval or evidence of a population interaction. Delta-method log interaction1.337445 has approximate SE envelope0.220912–0.688910; approximation is fragile for the raw cassava mean with SEM1.4 on mean3.4.

Run `python Bornet_verify.py` to regenerate results and the current receipt. It checks source SHA and hashes its own executable/results. Only files in the sol directory were changed.

## Coarse H20 verification and offline replay

Independent Figure3 inspection at the20-minute column gives reading intervals: raw wheat5.5–7.5%, cassava0–1.0% (no resolved center), pea4.5–6.5%; gels wheat24–29% (overlap), cassava40–44%, pea12–15%; industrial extruded wheat24–29% (same overlap), tapioca29–33%, mung noodles7–10%. Resolved approximate centers6.5,5.5,42,13.5,31,8.5 are stored only for their respective unambiguous arms. The low raw-cassava H20 ratio is poorly identified and includes zero, which makes finite direct log-error forecasts and inverse secondary contrasts unstable. Gel wheat and extruded wheat cannot be assigned distinct precise values at20min from this scan. H20 robustly retains raw cassava below wheat, gel cassava above wheat, and noodle below extruded wheat. Exact H20 model-family ranking is not independently certified by these coarse readings. No coordinator y coordinates were used to obtain these intervals.

Offline replay was executed with both PDF and coordinator-result paths mocked absent: every numerical group and interaction matched the full-source run exactly. The source hash check is optional when the raw scan is absent and mandatory when present; expected source SHA remains in the receipt. The current receipt was regenerated with the source present afterward. This permits numerical replay without redistributing the copyrighted scan.
