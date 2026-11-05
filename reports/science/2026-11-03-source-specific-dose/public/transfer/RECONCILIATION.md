# Reconciliation on the Astra/Sol reading, and what can actually be predicted

Author: Opus 5.5 (`claude-opus-5-5`).

- **Code:** `reconcile.py` builds `target_data_reconciled.json` from `../figure_facts/*.csv` and scores the **frozen** M1–M6 with the frozen `score.py`, producing `SCORES_reconciled.json`. The checks are in `RECONCILE.json`.
- **Replay:** `python -I -X utf8 reproduce_v2.py` (stdlib).
- **Preserved:** my own readings and scores (`target_data_opus*.json`, `SCORES_opus*.json`) and every frozen file are unchanged, and their hashes are re-verified.

## Readings agree; the frozen verdict is unchanged

The reconciled course differs from mine by at most about 7 pmol/L. The largest difference is plain-high (drink 3) at 30 min: 169 vs 176. They also confirm my marker assignment: the 225 point at 30 min is the filled blend-high circle, and plain-high sits below the open square at 120.

| Window | C_low (4/2) | C_high (5/3) | Ratio of ratios Δ (±6 px bounds) | Difference of differences (native) |
|---|---:|---:|---|---:|
| W1, 0–120 signed group | 1.474 | 1.909 | 1.295 [1.013, 1.658] | 9475 [2599, 16351] |
| W2, 60–120 | 1.548 | 2.040 | 1.318 [1.067, 1.629] | 7367 |
| W3c, 0–180 curves | 1.437 | 1.911 | 1.330 [1.083, 1.634] | 20873 |
| W3, Fig. 3 bars | 1.451 | 1.959 | 1.350 [1.248, 1.461] | 21.3 (bar units) |

- **Size and sign.** Blend exceeds wheat at both doses by 45–104%. The contrast grows with dose by about 30% (ratio of ratios).
- **Reading robustness.** Under the reconciled ±6 px stress, Δ > 1 and the difference of differences > 0 hold throughout the reading box in every window. Under my ±10 reading, Δ in W1 was not robust (0.95–1.72). These are graph-reading bounds only; there is no paired covariance or sampling CI.
- **Level gain = contrast gain.** Exactly Δ = D_mix / D_wheat, and wheat's dose gain is about 1 (0.985 in W1, 1.00 for the bars). The change in contrast is therefore *entirely* the blend's own dose response (1.27–1.37); the plain hydrolysate is dose-flat at control level.
  - On this data the difference-of-differences and ratio-of-ratios agree in sign.
  - They answer different questions: additive vs multiplicative interaction scale. They could disagree if the low-dose arms differed from control in opposite directions; here they do not.

**Frozen rules on the reconciled reading** (mean level error / mean contrast error):

| Window and reference | M1 | M2 | M3 | M4 | M5 | M6 |
|---|---|---|---|---|---|---|
| W1, primary 0–120 text references | 0.291 / 0.485 | 0.283 / 0.472 | 0.299 / 0.485 | **0.259** / **0.431** | 0.294 / **0.431** | **0.259** / **0.431** |
| W2, second-hour references | **0.240** / 0.399 | 0.251 / 0.415 | 0.369 / **0.398** | 0.288 / 0.476 | 0.291 / 0.475 | 0.288 / 0.476 |

- **Contrast signs.** In W1 every preparation-specific contrast and Δ sign is wrong. In W2 all are right.
- **W2 levels.** The blend levels transfer closely (M1 1.513 and 2.026 vs reconciled 1.533 and 2.055, errors 0.013 and 0.014). The wheat levels do not (1.40 and 1.81 vs 0.99 and 1.01).
- **M7** (literal Claessens model) has no blend lookup, so its coverage is absent. A transplanted β would be a new optional sensitivity; it is not run.

## Fig. 3 bars vs the text's +52% / +107%

- **Bars (plotted group means):** 4/1 = 1.439, 5/1 = 1.943, 5/4 = 1.350.
- **Text, same 3-h window and same Fig. 3:** +52 ± 10%, +107 ± 17%, and +36 ± 6% for 5 vs 4.
- **Provenance only.** Both come from the same source and window. The text values are reported with ± SEM, which indicates they were summarized across participants. The paper does not say how they were computed. I do not assert which statistic they are. The plotted bars are the only source of ratio-of-plotted-means values, and the gap (about 0.05–0.07 log for 4/1 and 5/1, but only 0.007 for 5/4) is recorded, not explained.

## Review of `challenge_facts.md`

### 1. Oxford 2026 source-specific empirical curves (Lund 2013 whey; Oxford 2021 pea)

- **Strongest part.** Level MAE improves (0.068 vs 0.147), and neither curve was trained on Oxford 2026.
- **Weakest part.** The change in contrast is still under-predicted: 1.121 vs 1.432, i.e. about 32% of the observed log change.
- **Confounding:**
  - The native MAE of 335 relies on the Oxford 2021 glucose response (3369.6, nearly identical to 2026's 3373.4). That is a same-lab reference transport, not a food-input-only native forecast. Straight lines (318) did as well, so the piecewise detail adds nothing natively.
  - **Trial selection:** the choice of Lund 2013 among whey dose series needs a pre-declared eligibility rule.
- **Most important caution.** Switching from grams to P/CHO *reverses* the predicted direction of the dose change (0.850). The sign of a change-in-contrast forecast is set by the dose convention, so the convention must be frozen before any target is seen. In van Loon, M1 (grams) and M2 (P/CHO) happen to agree in direction because both formulations scale identically. The fragility shows up elsewhere: the repeated-bolus convention, below.

### 2. Dutch frozen leucine substitution slope (post hoc application, coefficient not from targets)

| Convention | C_low | C_high | Δ | Errors (C_low / C_high / Δ) |
|---|---:|---:|---:|---|
| Per bolus, 0.245 L at 70 kg | 1.171 | 1.371 | 1.171 | 0.230 / 0.331 / 0.100 |
| Per 50 g carbohydrate (my earlier van Loon primary basis) | 1.207 | 1.457 | 1.207 | 0.200 / 0.270 / 0.070 |
| Cumulative, 4 boluses | 1.880 | 3.535 | 1.881 | 0.243 / 0.616 / 0.373 |
| Cumulative, 6 boluses | 2.577 | 6.645 | 2.579 | 0.558 / 1.248 / 0.689 |
| Tie | 1 | 1 | 1 | 0.388 / 0.646 / 0.258 |

- **Strongest part.** The per-dose conventions get both contrast signs and the Δ sign right and beat the tie on all three. That is better than any frozen M rule on W1.
- **Weakest parts:**
  - **Repeated-bolus dose convention.** Per bolus vs cumulative changes the forecast by up to 5×. The cumulative versions overshoot badly. The convention was chosen after exposure. The per-50 g-carbohydrate basis has prior declaration in my earlier van Loon work, which partly mitigates this.
  - **Structural tie.** With the leucine difference exactly doubled, the log-linear slope forces Δ = C_low. Observed Δ/C_low = 0.88, so the model's own internal relation is off by 12%, even as it beats the tie.
  - **Confounding.** The blend also adds Phe, halves the bound wheat, and changes form (free vs peptide). A leucine slope fitted on Gunnerud half-replacements (Leu/Ile/Val/Lys/Thr) cannot attribute the effect to leucine.

### 3. Positive-120 empirical bounds

- **Logic checks out.**
  - Lower bound: positive part of interpolated group differences, each later mean lowered and its baseline raised, by Jensen.
  - Upper bound: E(X_t − X_0)⁺ ≤ E X_t.
  - Tie-beating thresholds are √q: 1.082 (low) and 1.171 (high), both below the interval floors (1.213 and 1.577). So the per-bolus point forecasts beat the tie throughout.
  - The quotient interval [0.892, 1.850] contains 1, so there is **no** certificate for the change in contrast. This is correctly stated in the challenge.
- **Assumptions to keep visible:**
  - complete n = 8 at every draw, which is not explicitly reported;
  - a **participant-matched t0 baseline** (each subject's own fasting value);
  - linear interpolation between 30-min draws, which is coarse: peaks between draws are missed;
  - the upper bound drops the baseline entirely, so it is loose;
  - "beats the tie" concerns this sample's empirical mean under those assumptions, not population accuracy or superiority to every model.

## Decision: what can be predicted here

1. **The formulation contrast sign at matched dose** in this post-exercise, high-carbohydrate protocol (blend > plain hydrolysate) was predicted:
   - by the resting **second-hour** reference;
   - by leucine-based per-dose rules.

   It was *not* predicted by the resting 0–120 reference. Sign prediction is therefore reference- and window-dependent. It was not robust in advance.
2. **The blend's own dose-scaled level transferred** (W2, about 1–2% error on the reconciled reading). That is the one positive transfer result.
3. **The change in contrast was not predicted** by any frozen rule. Its existence (Δ ≈ 1.3, reading-robust) depends on the plain hydrolysate showing **no** response after exercise. No input-only rule anticipated that null: resting wheat was +54–83%. A preparation-specific reference therefore cannot be trusted to predict *contrast change* unless the stability of *each* preparation's level across protocols is established first.
4. **No further competitor is added.**
   - A constant enrichment multiplier at a separately identified shared protocol is already present as M3 under the second-hour reference (Δ = 1 by construction, contrast error 0.398).
   - The only external shared-protocol source that could identify a post-exercise blend multiplier without target exposure is the same laboratory's earlier post-exercise study of this blend with 0.8 vs 1.2 g/kg/h carbohydrate (van Loon et al., AJCN 2000;72:106). Its aggregates were not supplied. It is the most informative next competitor if the coordinator admits them, scored for **both** blend and wheat levels before any contrast.
