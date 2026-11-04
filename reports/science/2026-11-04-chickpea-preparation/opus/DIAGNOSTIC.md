# Opus diagnostic v2: what the Cai, Bajka and Kanata aggregates can and cannot discriminate

**Author:** Opus 5.5 (`claude-opus-5-5`).

**Run:** `python -I -X utf8 opus/diagnostic.py` (from the study directory), which writes `opus/DIAGNOSTIC.json`; add `--check` to verify (passes). Standard library only, on public cohort aggregates. The original v1 diagnostic is retained in the local research workspace.

**Status:** post-result diagnostic. No coefficient is selected and nothing here is validation.

## Endpoint

- **Cai 2025 participant-positive area:** the ratio of arm arithmetic means of participant-positive insulin area, from the **published time-zero sample** to 120 min. The actual first-bite offset is not established. n = 10 complete crossover triplets.
- **Paired delta-method log-SEs:** 0.186 (C/B), 0.152 (S/B), 0.167 (C/S).
- **Normal-theory Fieller 95% intervals:** C/B 0.174–0.427, S/B 0.498–1.025, C/S 0.254–0.572.
- These are **clinical sampling intervals for the response ratio, not assay-precision intervals.**

## Observed (central readings)

| Rule | Primary error (mean absolute log-ratio error over C/B, S/B) | C/S error |
|---|---:|---:|
| Hummus shared factor (no served-meal assay) | 0.470 | 0.940 |
| D20 standalone (frozen) | **0.233** | 0.456 |
| D20 anchored (S/B = hummus 0.706; C/B = 0.706 × D20 C/S) | **0.228** | 0.456 |
| Post hoc 50/80 anchored | 0.235 | 0.470 |

- **C/S compatibility.** No scored rule's C/S lies inside the clinical C/S interval: D20 0.616, 50/80 0.625, D20 at 60/90/120 min 0.88/0.82/0.79, shared factors 1.
- **What anchoring changes.** Anchoring replaces S/B and therefore changes **both S/B and C/B**; C/S is unchanged.
  - Anchored D20 vs anchored 50/80: identical S/B, with C/B and C/S differing by 0.07–0.08 *observed* paired SE.
  - Conditional on these SEs the predictions are close. Their point rankings on an observed outcome can still differ: the original v1 wording said "no outcome could discriminate", which overstated it.

## Illustrative assay perturbation (not an error model)

**Source.** Cai Fig. 1d plots point **means of n = 3** with a nonlinear fit and SEM bands, and no Figure 1 source file is listed. The two downward 60→90 min mean deviations (1.34 and 3.48 points) are used **only as illustrative sensitivity magnitudes**. They do not estimate the 20-min assay error, a minimum uncertainty for each marker, or any probability distribution.

**Method.** Each D20 reading (B, S, C) is perturbed independently within ±d. In log coordinates the box stays a box and each error is a sum of |affine| terms, so it is convex. The **maxima are therefore exactly at the 8 vertices**, and the minima are computed exactly by a piecewise-linear 1-D minimisation. A 41³ grid confirms both.

| Box | D20 standalone primary [min, max] | D20 anchored primary [min, max] | C/S error [min, max] | Anchored − 50/80 primary |
|---|---|---|---|---|
| ±1.34 points | 0.176–0.325 | 0.167–0.287 | 0.334–0.574 | −0.068 to +0.052 |
| ±3.48 points | 0.082–**0.4685** | 0.065–0.379 | 0.130–0.758 | −0.170 to +0.144 |

- **Is the advantage over hummus robust within these boxes?** At these readings the hummus primary error is fixed at 0.470.
  - **Anchored D20** stays below it throughout both boxes. Its box maximum reaches 0.470 only at ±5.62 points.
  - **Standalone D20** stays below throughout ±1.34. At ±3.48 its worst vertex (0.4685) is only **0.0013** below hummus, and the box maximum reaches it at **±3.50 points**.
  - So the standalone improvement holds for every joint perturbation up to about ±3.5 points, but **only marginally at the larger illustrative magnitude**.
- **D20 vs 50/80.** Within either box the sign of anchored D20 − 50/80 changes. Their ranking is not determined at these magnitudes.
- **Shift to the C/S limit.** A 1.30-point decrease in the Intact-C D20 reading alone would put D20 C/S at the clinical C/S upper limit. This is an illustrative distance, not a probability.

## Bread checks (unchanged)

- **Bajka rolls** (development, outcomes known): the H20 assay on the actual rolls had mean error 0.111, against 0.327 for equality and 0.166 for the hummus reference. The marker-extreme span is 0.025–0.265, which is not a CI.
- **Kanata:** no assay on the served breads; nominal coarse-label transfers 0.11–0.43 against equality 0.025.
- **Reading.** Kanata tests label transfer without a served-food measurement. It does not test measured-digestion transfer.

## Interpretation and unresolved uncertainty

**Supported (central plus illustrative boxes):** a served-meal D20 measurement supplies the preparation ordering and part of the magnitude that a shared category factor cannot.

- The anchored variant's primary advantage over hummus survives these boxes comfortably.
- The standalone variant's survives only up to about ±3.5 points.

**Unresolved:**

- the true 20-min assay precision on the served meals (no source data; n = 3 means);
- whether the C/S magnitude gap is real;
- the D20 vs post hoc 50/80 ranking;
- the first-bite offset;
- population accuracy.

The post hoc 50/80 rule remains post hoc. Duration, physical disruption and cellular retention co-vary; all three meals cooked at 95 °C.
