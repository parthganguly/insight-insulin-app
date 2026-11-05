# Can a reference tell two sugar substitutions apart? Van Can 2012 IGT test

Author: Opus 5.5 (`claude-opus-5-5`), 2026-11-05, running as that exact model. Implements `../PLAN.md`; its hash matches `../FREEZE.json`. Stdlib Python, nothing fitted.

## Bottom line

- **The frozen primary forecast loses to "no discrimination" at both meals.** It pairs Yoshizane T/G with Holub I/S, giving D = 0.527.
  - Fasting: it gets the direction right (observed D = 0.785 < 1) but overshoots. Error 0.398 against 0.242 for any common factor.
  - Lunch: the observed D = 1.294 is on the wrong side of 1. Error 0.898 against 0.258.
- **The plan's matched-protocol donor route predicts the fasting D almost exactly.** That route uses van Can's own 2009 studies (same lab, 75 g, 3 h, same RIA). Forecast 0.782 against 0.785 observed (error 0.004), and it beats every common factor.
  - Both donor ratios run about 0.16 log too low for this IGT cohort. That shift cancels in D, which is exactly what a discriminator should do.
  - The observed D sits only 0.39–1.77 approximate SEs from the decision midpoint, and that SE is understated. This is a favourable point result, not an established win.
- **Source-integrity finding.** The 2009 trehalose and isomaltulose papers print **identical afternoon insulin means**, 10,693 and 14,634, both marked **. They are attributed to different sugar pairs. Their morning values differ, and their subject descriptions are identical. The lunch donor route is therefore **inadmissible** until this is resolved. I make no allegation; the cause is unknown.

## Admitted evaluation facts ([van Can et al., *Br J Nutr* 2012;108:1210](https://doi.org/10.1017/S0007114511006714))

| Item | Source fact |
|---|---|
| Design | 10 overweight IGT adults (6 M, 4 F). Each was "studied four times" (GLUC, TRE, SUC, IMU), so **all four conditions are verified** |
| Dose | "75 g CHO equivalents" in 400 ml water. The lunch beverage is described as **25 En% of the meal**, which the text does not reconcile with 75 g. The mass basis of the two disaccharides is not stated |
| Meals | The same sugar is taken after an overnight fast **and again with a mixed lunch the same day**, so lunch confounds composition with prior feeding |
| Sampling | −5, 30, 60, 90, 120, 150, 180 min; no 15 or 45 min samples |
| Assay | Plasma insulin, Linco double-antibody RIA; ×6 stated to convert to pmol/l |
| Endpoint | **3 h** iAUC by trapezoid; handling of area below baseline not stated. Tables give **means only, no SE**. Paired t-tests only within pairs |

Insulin iAUC over 3 h (μU/ml over 3 h), Tables 2–3:

| Meal | TRE | GLUC | IMU | SUC | T/G | I/S | D |
|---|---:|---:|---:|---:|---:|---:|---:|
| Fasting | 9,425 | 15,216 | 5,779 | 7,326 | 0.619 | 0.789 | **0.785** |
| Lunch | 17,934 | 20,875 | 11,726 | 17,658 | 0.859 | 0.664 | **1.294** |

**Endpoint caveat.** The plan's target is a participant-positive 0–120 area, and that is not reported. I scored the author 3 h iAUC as admitted. The signed 0–120 group-curve route was **not executed**: the accessible Fig. 1 image has a transparent background, so its axes don't render.

## A. Frozen primary forecasts (|ln error|)

| Rule | Forecast T/G, I/S | D | Fasting D error | Lunch D error | Fasting magnitude | Lunch magnitude |
|---|---|---:|---:|---:|---:|---:|
| Pair (Yoshizane 590/1709, Holub) | 0.345, 0.655 | 0.527 | 0.398 | 0.898 | 0.385 | 0.463 |
| Any common factor | — | 1 | **0.242** | **0.258** | — | — |
| ↳ Holub 0.655 (both pairs) | 0.655, 0.655 | 1 | | | **0.121** | **0.143** |
| ↳ Holub scalar 0.521 | | 1 | | | 0.294 | 0.372 |
| ↳ equality | | 1 | | | 0.358 | 0.281 |
| ↳ common geometric mean 0.475 | | 1 | | | 0.385 | 0.463 |
| ↳ 0.420 | | 1 | | | 0.509 | 0.587 |

**How the pair rule fails.** It beats a common factor only when D falls below the midpoint 0.726. Fasting D (0.785) misses by 0.078 log; lunch reverses direction.

**Magnitude can't separate the pair rule from its geometric mean.** At both meals every forecast lies below both observations, and in that case the two rules' magnitude errors are identical by construction (verified in code). Only D discriminates.

**Approximate paired uncertainty (fasting).** I back-calculated the SEs of the paired differences from the reported p-values (n = 10, t₉):
- TRE–GLUC: SE = 1,746 from p = 0.009.
- IMU–SUC: SE between 476 and 684, from 0.01 ≤ p < 0.05.

That puts the SE of ln D at about 0.07–0.30, depending on the unknown correlation between pairs. This is a lower-bound approximation, because it ignores uncertainty in the control means. At lunch the TRE test is only "not significant", so the uncertainty is **unbounded above**.

## B. Matched-protocol donor route

Donors: [van Can 2009 trehalose](https://doi.org/10.1017/S000711450999050X) and [van Can 2009 isomaltulose](https://doi.org/10.1017/S0007114509990687). Both: same lab, 75 g, 3 h ΔAUC, LINCO RIA, healthy overweight participants.

| Fasting | T/G | I/S | D | D error | Magnitude |
|---|---:|---:|---:|---:|---:|
| Donor pair (4868/9264, 3176/4726) | 0.525 | 0.672 | **0.782** | **0.004** | 0.162 |
| Donor common geometric mean | 0.594 | 0.594 | 1 | 0.242 | 0.162 (identical) |
| Observed | 0.619 | 0.789 | 0.785 | | |

**Lunch D (observed 1.294):**

| Lunch reference | D | Error | Note |
|---|---:|---:|---|
| Common D = 1 | 1 | **0.258** | |
| Donor afternoon at face value | 1 | 0.258 | inadmissible: duplicated values |
| Fasting donor for both meals | 0.782 | 0.503 | |
| Protocol change, D_lunch = observed D_fasting | 0.785 | 0.499 | uses target data |

**Conclusion about lunch:** nothing that carries a fasting discrimination into the lunch meal survives here.

## C. Native levels (μU/ml over 3 h; fasting arms)

| Approach | TRE | GLUC | IMU | SUC |
|---|---:|---:|---:|---:|
| Donor levels as given (same units, same protocol) | −0.661 | −0.496 | −0.599 | −0.438 |
| Measured-target-control calibration (benchmark) | −0.165 | — | −0.160 | — |
| Equality within pair | +0.479 | — | +0.237 | — |
| Yoshizane 25 g → 75 g, proportional (conditional) | −1.672 | −1.088 | | |
| Yoshizane, frozen exponent 0.778 (conditional) | −1.916 | −1.332 | | |

Values are signed log errors.

- **Donor levels** under-predict every arm by 0.44–0.66 log. That fits the hyperinsulinaemic IGT cohort (fasting insulin 18 vs 14 μU/ml), but this is a between-cohort observation, not a dose or population law.
- **The Yoshizane transfer** is not a fair test: it crosses a 2 h → 3 h window, serum CLEIA → plasma RIA, and lean healthy → IGT. It is shown only to expose that absolute levels don't transport.

## Critique and a better discriminator

1. **Pair attribution in the frozen forecast is confounded.** Yoshizane T/G (25 g, 2 h, positive, lean Japanese) and Holub I/S (50 g, signed group curve) differ in dose, window, operator and cohort. Their ratio D = 0.527 mixes chemistry with those design differences. The matched-protocol donors remove most of that, and the fasting result shows it.
2. **D compares fractional reductions on very different controls.** In this cohort SUC/GLUC was 0.48 at fasting and 0.85 at lunch (development diagnostic). The absolute reductions also rank in opposite orders at the two meals: GLUC–TRE 5,791 vs SUC–IMU 1,547 at fasting; 2,941 vs 5,932 at lunch. A ratio-of-ratios can favour one pair while the absolute effects rank the other way.
3. **The "independent donor" premise is doubtful.** The two 2009 donor papers print identical cohorts, and identical afternoon insulin means. They may share participants, or contain a transcription error. Either way, a "common geometric mean from independent donors" is not established.
4. **Better discriminator.** Use a fasting-only D from same-lab, same-dose, same-window donors as the primary forecast, and score it with participant-level paired data. Neither study reports a paired SE or covariance for D, so no win can currently be called significant. Lunch contrasts should be dropped from discrimination tests unless the lunch dose and the prior-drink carryover are resolved.

## Execution (`EXECUTION.json`)

| UTC | Command | Result |
|---|---|---|
| ~10:51 | `pair.py run` | crashed (TypeError: a `locator` string inside the meal dict); fixed, not logged |
| 10:51:22 | `pair.py run` | RESULTS.json written; plan freeze matched on raw bytes |
| 10:51:45 | `pair.py --check --sources _view_local --record` | **FAIL**: 4 target images were saved under short names and reported MISSING (not skipped) |
| 10:51:52 | same, after renaming the temporary copies to canonical names | **PASS**; all 6 original images MATCH |
| — | temporary `_view_local/` deleted | no copyrighted asset remains |
| 10:52:10 | `portable_test.py --record` | **PASS**: default `--check` in a temp tree with only 5 files, as stored and with CRLF; files unchanged |
| after | `pair.py --check` | PASS, read-only |

**Source access.** I read the public Cambridge Core reader pages into memory, and the table images through temporary copies that are now deleted. Nothing copyrighted is stored. `inputs.json` holds the transcribed aggregate facts and the SHA-256 of every image, for audit with `--check --sources DIR`.
