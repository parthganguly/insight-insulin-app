# Extension and native-anchor test: results and short audit

Author: Opus 5.5 (`claude-opus-5-5`), 2026-11-05. Plans: `../EXTENSION_PLAN.md`, `../NATIVE_PLAN.md`. Python 3.13.12, stdlib only, no network.

## Files

- `facts.json`: transcribed Tables 1 and 3, units, operators, matrix and assay.
- `extension.py`: the implementation.
- `PARAMS.json` + `FREEZE_RECEIPT.json`: potato-trained parameters, frozen 04:22:44Z.
- `RESULTS.json`: all results.
- `EXECUTION.json`: the actual runs and checks.
- `OPUS_RESULT_CORRECTION.md`: corrected wording for the primary result.

## Execution record

- `freeze` ran at 04:22:44Z.
- `run` ran at 04:22:51Z, then again at 04:23:34Z. The second run added tie-point fields only; parameters and all scores were unchanged.
- `--check` gave PASS at 04:23:35Z.
- `../opus/rs_transfer.py --check` still gives PASS. The hashes of the frozen `../opus` files are recorded in RESULTS.json and re-verified by `--check`.

## Exposure

- **Training data:** potato training used Gourineni outcomes, so it is outcome-informed development.
- **Read before the freeze:** I read cookie and scone Tables 1 and 3 before freezing. Neither the cookie nor the scone result is blind; both are sequential exposed-development tests.
- **Du:** UNAVAILABLE. No numeric arm data exist, so no verdict is computed.

## A. Extension: Stewart 2017 potato-RS4 cookie (one contrast vs control)

**Parameters.**

| | Generic factor | Density slope |
|---|---:|---:|
| Potato-trained | 0.6683 | −0.5905 |
| Wheat-trained | 0.4178 | −2.967 |

The fit residuals for the potato training are −0.053 and +0.036.

**The cookie input sits far outside both training ranges.** Its fibre-density difference is 1.883. That is 2.37× the potato training maximum (0.795) and 6.4× the wheat donor difference (0.294).

**The quantities are kept separate:**

| Quantity | Control | Fibre cookie |
|---|---:|---:|
| Serving (g) | 47.02 | 48.00 |
| Reported dietary fibre (g, ESHA-calculated) | 0.55 | 24.13 |
| VERSAFIBE 1490 (g; nominal 22.5 g TDF) | 0 | 25 |
| Available CHO (g) | 36.28 | 12.71 |
| Total CHO (g, matched) | 36.84 | 36.84 |

**Observed ratio:** 124/229 = 0.5415.

- Endpoint: serum iAUC, explicitly positive-only, reported as mean ± SD.
- Arm counts are unequal (n 27/25).
- Marginal log SE over ρ is 0.047–0.256; at ρ = 0 it is 0.184.

| Model | Predicted | \|ln error\| |
|---|---:|---:|
| Available CHO (D) | 0.350 | **0.435** |
| Equality | 1 | 0.613 |
| Potato generic | 0.234 | 0.838 |
| Wheat generic | 0.146 | 1.308 |
| Potato graded | 0.115 | 1.548 |
| Wheat graded | 0.0013 | 6.024 |

**How stable the order is.**

- D and equality would have equal error at an observed ratio of 0.592. That value lies inside the ρ = 0 scenario (0.378–0.777), so their order is fragile.
- D would tie the best attenuator, potato generic, only at an observed ratio of 0.286. That is below even the ρ = −1 lower limit (0.328).

**Challenge: no attenuating factor can help on the cookie.**

- Any forecast of the form D-ratio × m with m ≤ 1 is ≤ 0.350, which is already below the observed 0.5415. Its error is therefore at least D's 0.435. Every fibre-attenuation model is structurally worse than D here, whether generic or graded, wheat- or potato-trained.
- Matching the cookie would need m = 1.546, an amplifying factor.
- The fibre-arm residual (observed/D) changes sign across settings:

| Setting | Observed/D |
|---|---:|
| Gourineni bars | 0.65–0.69 |
| Cookie | 1.55 |
| Scone | 0.88 |

  **No single RS4 factor transfers between these settings.**
- Exposed comparators, development only and not validation: energy proxy 0.523 (error 0.036), printed kcal 0.604 (error 0.109), D+P 0.423 (error 0.246). The proxy's cookie advantage did not carry over to the scone (section B).

## B. Native anchor: scone forecasts from the cookie control

**Anchor.** The control cookie's iAUC of 229 is printed as "pmol/L·h". It becomes 13,740 pmol·min/L only *conditionally*:

- The same table also prints Cmax with "·h", so its unit labels are unreliable.
- A minute reading would imply a mean 0–120 increment of 1.9 pmol/L despite a Cmax of 280 pmol/L. That is implausible, but the source text does not exclude it.
- The anchor's own mean uncertainty is about ×0.82–1.23 (95%, marginal).

**Observed scone values.** Control 19,229 and fibre 12,592 pmol·min/L (mean ± SEM, n = 32). The decrement is 6,637 and the ratio is 0.6548. The ratio's log SE is 0.037–0.231 over ρ.

| Score (scone / cookie control) | Control | Fibre | Two-arm MAE (primary) | Decrement | Ratio | \|ln ratio error\| |
|---|---:|---:|---:|---:|---:|---:|
| Constant | 13,740 | 13,740 | 3,318 | 0 | 1 | 0.423 |
| D | 14,694 | 10,945 | 3,091 | 3,749 | 0.745 | **0.129** |
| D+P | 15,146 | 11,549 | **2,563** | 3,597 | 0.763 | 0.152 |
| 4D+4P+9fat | 22,232 | 18,296 | 4,353 | 3,936 | 0.823 | 0.229 |
| Printed kcal (separate) | 20,991 | 17,279 | 3,224 | 3,712 | 0.823 | 0.229 |

**Central orders.**

- Primary MAE: D+P < D < printed kcal < constant < proxy.
- Ratio: D < D+P < proxy ≈ kcal < constant.

**How stable the ratio order is.** The ratio ties with D lie inside the ρ = 0 observed scenario (0.474–0.906):

- D+P ties with D at 0.754.
- The energy proxy and printed kcal tie with D at 0.783.
- Constant ties with D at 0.863.

Under ρ = +1 (0.609–0.704) the order is stable. Every model under-predicts the scone's relative reduction.

**Label accounting.** The scone's printed kcal are Atwater values computed from the same label inputs, so they match the proxy to within 0.4 kcal. The cookie's kcal method is not stated, and its printed values exceed the proxy by 12.2 kcal (control) and 23.9 kcal (fibre). As a result the same scone ratio (0.823) gives native levels that differ by ×1.060, the cookie control's printed/proxy factor.

**Cross-recipe stress: Gourineni control anchor** (11,871.6 pmol·min/L as printed; no printed kcal, so that score is UNAVAILABLE).

| Score | MAE |
|---|---:|
| Energy proxy | 3,080 |
| Constant | 4,039 |
| D+P | 4,411 |
| D | 4,622 |

The ratios are identical to those from the cookie anchor. **The native-level winner depends on the anchor**: D+P with the cookie anchor, the energy proxy with the Gourineni anchor. No native composition rule is supported.

## Limits that bear on the anchor transfer

- **Matrix and assay.** The cookie anchor is serum at Life Labs (assay not stated). The scone and Gourineni are plasma ECL at Cleveland Heart Lab.
- **Area operator.** The cookie is explicitly positive-only. Gourineni is participant-positive. The scone says only "trapezoidal rule" citing Brouns/Wolever, so its positive-only handling is *not stated*.
- **Baseline and sampling.** Baselines were fasting, −15 min and −5 min respectively. All three use the same 15–120 min sampling grid.
- **Cohorts.** Different cohorts and sites; the scone n is 32 of 36 randomized, with missing samples not imputed.
- **Statistics.** SD for the cookie vs SEM for the others; the cookie's arm counts are unequal.
- **Foods and portions.** The cookie is 47 g (ESHA-calculated composition). The scone is 84 g, laboratory-analysed, with 16 g fat; its total CHO is not matched (42.8 vs 46.4 g) and fat and protein also fell.
- **Ingredients.** The scone uses maize RS4 (VERSAFIBE 2470), not potato.
- **Separate windows.** Scone 0–180 values (23,850 / 14,192) are a separate operator window and are not predicted.

## Verdict

- **Extension.** On the cookie, available CHO is centrally first. Every fibre-enrichment transfer, potato- or wheat-trained, is structurally worse, and the graded models are extrapolated. Du: no verdict.
- **Native.** A single scone forecast gives anchor-dependent orders. **No new validated native claim follows from one favourable meal ratio.**
