# Power 2009 transfer, v2: design admitted; the whey form reference still loses to equal response

Author and implementer: Opus 5.5 (`claude-opus-5-5`).

The v1 files are unchanged: `SPEC.md`, `transfer.py`, `PREDICTIONS.json`, `RESULTS.json`, `addendum.py`, `ADDENDUM.json` and `RESULT.md`. All `--check` runs pass, and the frozen hashes match `FREEZE_RECEIPT.json`.

New code is `verify_v2.py` → `VERIFIED_v2.json`, which reuses the frozen `rules()`/`ratios()` read-only.

## Source-reading entry and access receipts

- **Design facts** come from Sol's separate read and the coordinator's inspection of the **author-uploaded full text on ResearchGate** (publication 23148702, Methods, Table 1, Fig. 2 text). They are credited to them in `target_inputs_v2.json`.
- **Not read by Opus:** my own requests to that page returned **HTTP 403** (WebFetch and local `urllib`).
- **Admitted facts:**
  - 16 men; within-person random order, visits 7 days apart; overnight fast.
  - Body mass 79.7 (SEM 2.79) kg, range 68.7–92.
  - 45 g protein in 500 mL: **Isolac WPI vs Optipep 80 WPH (DH 30%)**, protein- and energy-matched, with paracetamol 20 mg/kg.
  - 3-h insulin **AUC above baseline** by trapezoids: 7.6 (0.9) vs 10.8 (2.6), means (SEM); paired p = 0.21. Cmax p = 0.018, reported separately.
- **Figure 2 was not obtained.**
  - The Springer media URL returned a 3,038-byte HTML page.
  - The three pre-existing `raw/Power-Fig2.{gif,jpg,png}` files are the same 3,038-byte HTML (identical SHA-256 prefix 32ed63159c77e21e), not images. They are left in place.
  - **The 2-h group-curve endpoint (T1) stays UNAVAILABLE.**

## Predictions at the admitted cohort dose x = 45/79.7 = 0.564617 g/kg (inside training range; nearest 0.6)

| Rule (frozen definitions) | WPH/WPI | |ln(pred/1.42105)| | Training reading-box range | Native, reference-calibrated: WPH from measured WPI 7.6 | WPI from measured WPH 10.8 |
|---|---:|---:|---|---:|---:|
| R1 nearest dose (0.6) | 0.92263 | 0.432 | 0.419–0.445 | 7.01 | 11.71 |
| R2 log interpolation 0.4–0.6 | 0.90005 | 0.457 | 0.442–0.472 | 6.84 | 12.00 |
| R3 flat | 1 | **0.351** | — | 7.60 | 10.80 |
| R4 geometric mean of three whey ratios | 1.00186 | **0.350** | 0.327–0.372 | 7.61 | 10.78 |
| S1 soy-family R1 / R2 (sensitivity) | 0.891 / 0.862 | 0.467 / 0.500 | — | — | — |

- **Native values** are in the abstract's printed unit ("nM", not converted). Each needs the *measured opposite arm* of the target study, so these are reference-calibrated benchmarks, not food-input-only levels. Their log errors equal the ratio errors.
- **Individual dose spread** (descriptive): the 68.7–92 kg range maps to 0.489–0.655 g/kg. That spans the 0.4 nearest cell (0.802) up to a 0.6 extrapolation hold. The group-mean ratio is not a per-person prediction.
- **Uncertainty:** the observed ratio 1.421 has a zero-correlation log-SD scenario of 0.268, and pairing is unknown in magnitude. A paired p of 0.21 means the 3.2-unit difference is only about 1.3 paired SE. Model differences of about 0.08 log are far inside that.

## Corrections

1. **Log-mean typo.** SPEC prose gave the log-mean as **0.99803**. The actual geometric mean of the three whey WPH/WPI ratios is **1.001864** (Sol's catch, confirmed in code). The sealed SPEC is not edited; the code value governs.
2. **v1 abstract-only limits narrowed.** Body mass, design (within-person crossover), products, DH, operator (above baseline, trapezoid), window (3 h) and dispersion (SEM) are now admitted from the credited reading. The v1 R1/R2 abstentions resolve as above. The body-mass-conditional table in `ADDENDUM.json` is consistent: it gave R2 0.8987 at 80 kg vs 0.9001 at 79.7 kg.
3. **Estimand mismatch, now explicit.**
   - Training: *signed* net area, pre-drink to 120 min after finishing, about 250 mL protein-only.
   - Target: area *above baseline*, 3 h, 500 mL with paracetamol.
   - The training form ratio is also unstable across doses (1.36, 0.80, 0.92), and neither study reports a significant form effect on area.

## Conclusion

With the dose mapping now valid, the dose-specific whey reference still predicts WPH ≤ WPI and is farther from the target point than equal response. The transferable content is no established form effect on area, which equal response already encodes. This does not test the 2-h curves or the significant peak difference.
