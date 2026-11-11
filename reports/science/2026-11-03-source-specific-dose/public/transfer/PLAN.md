# Preparation-specific reference → change in formulation contrast across dose (van Loon J Nutr 2000) — frozen plan v1

Owner and implementer: Opus 5.5 (`claude-opus-5-5`). Written before reading any target Results text, figure, table or curve.

## Sources

- **Target:** van Loon, Kruijshoop, Verhagen, Saris, Wagenmakers. J Nutr 2000;130:2508–2513 (PMID 11015482), `raw/postexercise.pdf`.
  - Read before freezing: abstract, introduction, Subjects and Methods (pp. 1–3 of the article text, up to the "RESULTS" heading).
- **Training:** van Loon, Saris, Verhagen, Wagenmakers. Am J Clin Nutr 2000;72:96–105 (PMID 10871567). `training/` contains my earlier frozen inputs and readings, used unchanged.
- **Relationship:** same laboratory, separate studies. Participant overlap is unresolved: training was 8 nonobese men, 21 y, 73.9 kg; target was 8 trained cyclists, 24 y, 70.0 kg.

## Exposure

- **Target abstract:** only the beverages containing wheat hydrolysate + Leu + Phe gave "a marked increase", +52% (0.2 g/kg/h) and +107% (0.4) vs carbohydrate only (P < 0.05). Doubling that mixture raised the response further (P < 0.05). The window is presumably the whole area; it is not stated in the abstract.
- **Training:** all resting outcomes were exposed earlier, including my own bar readings and text anchors.
- **Status:** this is an exposed, same-lab, cross-study transfer, not blind validation.

## Recipe linkage (verified from text, per ingredient, g/L)

| Target beverage | Nitrogen source (g/L) | Training analog | Training recipe (g/L) | Match |
|---|---|---|---|---|
| 1 | none | drink 1 | none | carbohydrate differs (below) |
| 2 | wheat hydrolysate 28.6 | — | — | **no resting analog** (half dose) |
| 3 | wheat hydrolysate 57.1 | **drink 7** | wheat hydrolysate 57.1 | exact at printed precision; same Table amino-acid profile (Hyprol, Quest) |
| 4 | wheat 14.3 + Leu 7.1 + Phe 7.1 | — | — | **no resting analog** |
| 5 | "twice" beverage 4 → wheat 28.6, Leu 14.2, Phe 14.2 | **drink 9** | wheat 28.6, Leu 14.3, Phe 14.3 | nominal only (14.2 vs 14.3, from "twice"); **not drink 10** (drink 10 also has Arg) |

**Carbohydrate is not matched:**

| | Training | Target |
|---|---|---|
| Carbohydrate (g/L) | 114.2 (glucose 57.1 + maltodextrin 57.1) | 171.3 (glucose 68.5 + maltodextrin 102.8) |
| Per bolus at 3.5 mL/kg | 0.4 g/kg | 0.6 g/kg |
| Rate | 0.8 g/kg/h | 1.2 g/kg/h |

**Nitrogen source per bolus:**

- training: 0.2 g/kg;
- target: 0.1 (low) or 0.2 (high).

So the target high dose equals the training dose in absolute g/kg, while P/CHO is 0.333 (high) and 0.167 (low) vs 0.5 in training.

**Protocols:**

| | Training (rest) | Target (after glycogen depletion) |
|---|---|---|
| Boluses (min) | 0, 30, 60, 90 | 0–150, every 30 min |
| Sampling | every 15 min to 120 | every 30 min to 180 |
| Endpoint | area above t0 | area above t0 baseline, insulin RIA (same kit) |

## Training references (ratio vs drink 1; no target data)

- **Primary, 0–120 total (Fig. 5) text anchors:** R7 = 1.54, R9 = 1.42 (Results text; whether ratio of means or mean of ratios is unstated).
- **Sensitivity A, 0–120 bar readings:** R7 = 52.5/33.0, R9 = 51.0/33.0. The drink 9 reading is already flagged as inconsistent with its text.
- **Sensitivity B, second hour (Fig. 6) readings:** R7 = 32.5/18.0, R9 = 36.5/18.0 (text anchor for 9: 2.03). Paired with the target 60–120 window.

## Frozen forecast rules (ratio of target arm k to target beverage 1)

Notation: s = nitrogen-source scale.

| Rule | Definition | Formulation contrast? |
|---|---|---|
| M1 `abs_dose_increment` | R = 1 + s(R_src − 1), with s = target N per bolus ÷ training N per bolus (high 1, low 0.5) | yes |
| M2 `pc_increment` | same, with s = target P/CHO ÷ training P/CHO (high 0.667, low 0.333) | yes |
| M3 `dose_flat` | R = R_src at both doses (no dose scaling) | yes |
| M4 `pooled_dose` | formulation-blind: R_pool = geometric mean(R7, R9); R = 1 + s_abs(R_pool − 1) | ties formulations |
| M5 `no_change` | 1 | ties |
| M6 `energy` | (1.2 + N)/1.2 in kcal terms at 4 kcal/g, i.e. low 1.1667, high 1.3333 | ties formulations |
| M7 calibrated prior common source gain | **UNAVAILABLE**: no β value in the supplied material; abstain rather than guess | — |

R_src is training drink 7 for wheat (beverages 2, 3) and drink 9 for the mixture (beverages 4, 5).

**Matched-dose reference anchors:** M1 at the high dose (beverages 3 and 5) is the preparation-specific *prediction* at matched N dose. Every other cell requires the declared dose rule. No target outcome is used as an anchor (target-calibrated variants are excluded).

**Structural note (frozen now):**

- For M1/M2 with a common s, contrast C(s) = (1 + s·a)/(1 + s·b), where a = R9 − 1 and b = R7 − 1. When a > b ≥ 0, log C is concave in s, so log C(2s) ≤ 2·log C(s). If a < b, the inequality reverses in sign.
- The change in contrast Δ = C_high/C_low is therefore restricted:
  - in log, it cannot exceed log C_low when the mixture's increment is larger;
  - its sign is fixed by sign(a − b).

## Target quantities (scored separately; never pooled)

- **Levels:** arms 2–5 / arm 1.
- **Formulation contrasts:** C_low = 4/2, C_high = 5/3.
- **Change in contrast:** Δ = C_high / C_low.
- **Dose contrasts:** 3/2 and 5/4.

Windows:

- **W1 (primary):** 0–120 min signed group area. This is the trapezoid of (group mean − group mean at t0) on the target's 30-min grid, 0–120, from the target insulin curves.
- **W2:** 60–120 min of the same (paired with training second-hour references).
- **W3:** the source's whole-protocol AUC above baseline (presumably 0–180) as published or plotted. Separate, never mixed with W1.

If curve geometry is not legible, W1/W2 are UNAVAILABLE and the harness waits for coordinator/Astra data.

- **Error:** |ln(pred/obs)| per quantity, with sign agreement recorded for contrasts and Δ. Means over the 4 level cells are reported separately from the contrast panel.
- **Uncertainty:** target and training SEMs as printed or plotted; graph-reading bounds as declared at reading time. There is no paired covariance, so no CI on error differences or on Δ.

## Boundaries

No target fits. No population interaction claim. No consumer rule. Post-exercise, trained cyclists, higher carbohydrate and a 3-h repeated-dosing protocol all limit transport.
