# Does a preparation-specific resting reference predict the change in formulation contrast across dose after exercise?

**Primary answer: no.** On the frozen primary pairing (0–120 min), every preparation-specific rule gets both formulation contrasts and the change in contrast in the **wrong direction**, and none beats the tie.

**A pre-declared sensitivity pairing tells a sharper story** (second-hour training reference ↔ target 60–120 min). The **mixture** levels transfer almost exactly, while the **wheat-hydrolysate** levels do not transfer at all. The contrast and change-in-contrast misses come from the wheat arms.

Owner and implementer: Opus 5.5 (`claude-opus-5-5`). Stages are in `EXPOSURE.md`. To replay: `python -I -X utf8 reproduce.py` (stdlib).

## Design and linkage

**Target** (J Nutr 2000;130:2508–13):

- 8 trained cyclists after glycogen depletion; 3 h of drinks every 30 min; carbohydrate 1.2 g/kg/h.
- Drinks:
  1. carbohydrate only;
  2. wheat hydrolysate 0.2 g/kg/h;
  3. wheat hydrolysate 0.4;
  4. wheat 0.1 + Leu 0.05 + Phe 0.05;
  5. twice drink 4.
- Insulin RIA; area above t0; means ± SEM.

**Training** (AJCN 2000, resting, carbohydrate 0.8 g/kg/h, nitrogen source 0.4 g/kg/h):

- **Target 3 = training drink 7** (wheat 57.1 g/L, same hydrolysate profile).
- **Target 5 = training drink 9** (wheat 28.6 + Leu/Phe 14.2 vs 14.3 g/L; nominal match), *not* drink 10.
- Targets 2 and 4 have no resting analog, so a dose rule is required.
- Per bolus, target 5 and training 9 deliver identical nitrogen-source g/kg; target carbohydrate per bolus is 1.5× higher.

**Target readings** (Fig. 2 curves and Fig. 3 bars; single-reader pixel digitization):

- Drink 1's 0–180 curve area (43.8) agrees with its Fig. 3 bar (42.5).
- Bars: 42.53, 42.02, 42.02, 60.86, 82.10 (axis printed "pmol L⁻¹ 3h"; the magnitudes behave like a nmol·min/L-type scale; not converted).
- The text's +52%/+107% are mean ± SEM of percentages (likely means of individual ratios). The bars give ratios of means of 1.43 and 1.93.

## Observed (ratio to drink 1)

| Window | L2 wheat 0.2 | L3 wheat 0.4 | L4 mix 0.2 | L5 mix 0.4 | C_low (4/2) | C_high (5/3) | Δ = C_high/C_low |
|---|---:|---:|---:|---:|---:|---:|---:|
| W1, 0–120 signed group area (primary) | 1.05 | 1.04 | 1.54 | 1.96 | 1.47 [1.26–1.72] | 1.88 [1.64–2.17] | 1.28 **[0.95–1.72]** |
| W2, 60–120 | 0.99 | 1.00 | 1.52 | 2.03 | 1.54 [1.35–1.76] | 2.02 [1.80–2.29] | 1.32 [1.02–1.70] |
| W3, published 3-h bars | 0.99 | 0.99 | 1.43 | 1.93 | 1.45 | 1.95 | 1.35 [1.30–1.40] |

- Brackets are reading bounds at ±10 pmol/L (curves) or ±0.5 (bars). At ±15, Δ in W1 spans 0.82–2.00 and in W2 0.90–1.93.
- **Both formulation contrasts exceed 1 robustly.** The **change in contrast is reading-robust only on the published 3-h bars.** In the primary 0–120 window it is not resolved by the curve readings.
- The source letters (c, c, c, b, a) separate 4 from 1–3, and 5 from 4.

## Frozen forecasts vs W1 (primary, training 0–120 text anchors R7 = 1.54, R9 = 1.42)

| Rule | L2 | L3 | L4 | L5 | C_low | C_high | Δ | Mean level error | Mean contrast error |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| M1 absolute-dose increment (preparation-specific) | 1.27 | 1.54 | 1.21 | 1.42 | 0.95 | 0.92 | 0.97 | 0.286 | 0.475 |
| M2 P/CHO increment | 1.18 | 1.36 | 1.14 | 1.21 | 0.97 | 0.89 | 0.92 | 0.277 | 0.461 |
| M3 dose-flat | 1.54 | 1.54 | 1.42 | 1.42 | 0.92 | 0.92 | 1 | 0.294 | 0.474 |
| M4 pooled dose (formulation-blind) | 1.24 | 1.48 | 1.24 | 1.48 | ≈1 | ≈1 | ≈1 | **0.254** | 0.421 |
| M5 no change | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 0.298 | **0.420** |
| M6 energy | 1.17 | 1.33 | 1.17 | 1.33 | ≈1 | ≈1 | ≈1 | **0.254** | 0.421 |
| M7 calibrated prior source gain | UNAVAILABLE (no β supplied) | | | | | | | | |

- The resting 0–120 reference ranks wheat **above** the mixture (1.54 vs 1.42). After exercise the mixture dominates, so all preparation-specific contrast and Δ signs are wrong.
- The formulation-blind rules tie only up to ingredient rounding (28.5 vs 28.6 and 57.0 vs 57.1 g/L). Their recorded Δ "sign agreement" is a rounding artifact.
- The sensitivity-A bar readings and the W3 windows give the same picture (`SCORES_opus.json`).

## Pre-declared sensitivity B vs W2 (training second hour: R7 = 1.81, R9 = 2.03)

| | L2 | L3 | L4 | L5 | C_low | C_high | Δ |
|---|---:|---:|---:|---:|---:|---:|---:|
| M1 forecast | 1.40 | 1.81 | **1.513** | **2.026** | 1.08 | 1.12 | 1.04 |
| Observed | 0.99 | 1.00 | **1.520** | **2.032** | 1.54 | 2.02 | 1.32 |
| |log error| | 0.35 | 0.59 | 0.004 | 0.003 | 0.36 | 0.59 | 0.23 |

- All three contrast signs are right. The mean level error is 0.236, the best in that window (no change 0.286, energy 0.284).
- The mixture's matched-dose and half-dose levels transfer to within 0.5%. The wheat hydrolysate shows **no** increment after exercise at either dose, against 1.81 at rest. That alone shrinks the predicted contrast and its change.
- **Caveat:** this is one pairing of four declared reference/window combinations, with one reader and n = 8. The near-exact mixture match should be treated as a striking point agreement, not a validated law.

## Structural check (pre-declared)

With any common increment scaling and R9 > R7, log Δ ≤ log C_low. The observed values satisfy that bound: W1 0.25 ≤ 0.38, W2 0.27 ≤ 0.43. So, unlike the Thondre whey case, **the miss is not a functional-form impossibility.** It is the failure of the wheat preparation's resting level to transfer to this protocol.

## What this decides

1. A preparation-specific reference **did not** predict the cross-dose change in formulation contrast on the primary window. Keep the tie and no-change references.
2. Where a preparation's own response is preserved across protocols (the mixture), dose scaling by absolute nitrogen-source dose transferred levels well. Where it is not (wheat after exercise with higher carbohydrate), every preparation-specific contrast fails.
   - The source authors attribute the difference to carbohydrate rate and exercise. **Neither is identified here.**
3. The usable discriminator is the **per-preparation level stability across protocols**, not the dose rule.
   - A next test would need the same preparations measured under ≥ 2 carbohydrate rates (or rest vs post-exercise) in one cohort.
   - It would score preparation-level stability before any contrast forecast.

## Limits

- **Readings:** single-reader digitization. The drink-3 points at 60 and 150 min are hidden behind opaque markers (flagged; ±15 sensitivity). t0 markers overlap (common 23.4). Astra's independent extraction can be scored with the same harness.
- **Inference:** no paired covariance, so no CI on errors or Δ. Same laboratory; participant overlap unresolved.
- **Endpoints:** repeated dosing; not a single-meal 0–120 native target; no absolute calibration (units as printed).
- **Training values:** the text anchors are of uncertain summary type.
