# Challenge: the mixed-food learning choice (Acheson) and proposed coverage extensions

Author: Opus 5.5. Arithmetic is in `challenge.py` → `CHALLENGE.json` (`--check` passes). The Acheson and Claessens 2009 aggregates are team-supplied and were not re-read by me.

## 1. The 1.506 vs 1.549 whey/soy agreement is a ratio coincidence, not level transfer

| Quantity | Value |
|---|---:|
| Source ratio, error | |ln(1.549/1.506)| = **0.028** |
| Whey glucose-normalized level, predicted vs observed | 3.056 vs 1.543 → log over-prediction **0.683** |
| Soy glucose-normalized level, predicted vs observed | 1.972 vs 1.025 → log over-prediction **0.654** |

- **The level errors are a near-common offset** (difference 0.029). That is a reference or denominator mismatch: the Claessens maltodextrin 0.2 g/kg control vs Acheson's carbohydrate comparator meal. The offset cancels exactly in the ratio, so the ratio's accuracy says nothing about whether levels transfer, and the levels did not.
- **Form is unmodelled.** The reference products are hydrolysates and Acheson used intact proteins. Applying the Claessens 2007 intact/hydrolysate factors changes the 1.549 forecast depending on the dose cell:

| Dose cell | Form-adjusted whey/soy | Error |
|---|---:|---:|
| 0.3 | 0.890 | 0.526 |
| 0.4 | 1.427 | 0.054 |
| 0.6 | 1.495 | 0.007 |

  The agreement is not robust to a difference the method ignores. Choosing the 0.6 cell *after* seeing 1.506 would be outcome-selected.
- **One pair is one contrast.** It cannot establish that source ratios transfer from hydrolysate-plus-maltodextrin drinks to intact-protein mixed meals.

## 2. A 16-field nearest profile to cover casein

- **This is an assignment, not a measured match.** It must be labelled a *nearest-profile proxy* and scored alongside an explicit **abstention** and the equal-response tie.
- **Prior evidence is against it.** In the six-hydrolysate test the nearest-profile lookup scored 0.259 vs 0.205 for the tie.
- **Casein is the hardest case for a profile proxy.** It is intact and clots in the stomach (slow), while the reference library is hydrolysates. Form and kinetics are not encoded in a 16-field amino-acid profile, and casein lies outside the library's form domain.
- **Report** the profile distance to the nearest library member, and how far outside the convex hull of library profiles casein lies, before scoring.

## 3. Leave-author-out slope: logRR = β·log(1 + d·(R − 1)) vs β·log(1 + d)

1. **Scale confounding.** If R comes from the Claessens maltodextrin-normalized ratios (3.056 etc.), which were shown above to be about 2× high on another reference, β will absorb that scale (β < 1). It then acts as a reference recalibration fitted on the exposed collection, not a dose law. Fit β on ratios with a reference definition matched to the target.
2. **Linear-mixing assumption.** log(1 + d(R − 1)) assumes the response level moves linearly from 1 to R with the dose fraction d. Two earlier observations contradict that:
   - the van Loon half-blend fell below both parents;
   - the Claessens whey dose curve is non-monotone (WPH 0.4 < 0.3).

   Test the functional form against the β·log(1 + d) comparator and no change *on the held-out units*, not only through β.
3. **Hold out laboratories, not authors.** Maastricht-group papers (van Loon, Claessens) share a lab, protocols and possibly materials. Leaving out one first author can leave the same lab in training. Hold out by laboratory or group.
4. **R must not be read as an exact match.** Where R is a nearest-profile proxy, propagate the alternative (abstain, or the tie) and report coverage separately for measured-match, proxy and abstained units.
5. **Uncertainty.** With few held-out units and no paired covariance, report per-unit errors and the no-change and tie comparators. Do not report a pooled "improvement" without a pre-declared tolerance.

## What I would keep

- Preparation-matched measured references where products truly match.
- The equal-response tie as the default for form.
- Explicit abstention for unrepresented products (e.g. casein) unless a held-out test shows the proxy beats the tie.
