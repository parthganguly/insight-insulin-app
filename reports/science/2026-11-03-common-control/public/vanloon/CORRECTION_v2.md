# Correction v2 (supersedes overstated statements in RESULT.md; frozen files unchanged)

Author: Opus 5.5 (`claude-opus-5-5`).

`PLAN.md`, `inputs.json`, `analysis.py` and `PREDICTIONS.json` still match `FREEZE_RECEIPT.json`. Readings (`outcomes.json`) and `RESULTS.json`/`BOUNDS.json` are unchanged.

New code is `correction_v2.py`, producing `CORRECTION_v2.json`; run `python -I -X utf8 correction_v2.py --check`. During development, a variable-scope bug in the ties summary was caught before publication and fixed. It affected no comparison.

The publisher JPEGs (gr5/gr6) were viewed at about 430 px width. They confirm the printed axis labels and are consistent with the v1 readings, but they are not an independent reading. All scoring here is **retrospective**: drinks 3 and 9 were named in the abstract, and the other seven are "not named in the abstract" (replacing "unexposed").

## Endpoint, operator and units (corrected)

- **Fig. 5 (total area):** native 0–120 min insulin area above the time-0 value, under **declared repeated feeding** (3.5 mL/kg at 0/30/60/90 min). It is relevant to the INSIGHT target *under that protocol*.
  - Operator qualification: "area above baseline" is stated, and whether below-baseline segments are excluded is not. It is not ordinary single-meal validation.
- **Fig. 6 (second hour):** 60–120 min area of the same curves.
- **Printed axis labels:** Fig. 6 "nmol·h/L", Fig. 5 "nmol·2 h/L".
- **Possible scale ambiguity.** The control bars (~18 and ~33) match an increment of about 0.3 nmol/L (Fig. 4) integrated over 60 and 120 **minutes**, not hours. Nothing is converted, and the ratios are unaffected.

## (1) Blend vs the convex interval of its parents

- **Recipe:** drink 10 is a half blend at *nominal* proportions. Wheat is printed as 28.6 g/L, against 57.1/2 = 28.55; Arg/Leu/Phe at 9.50 = 19.0/2.
- **Benchmark assumption:** a 50:50 combination of measured full-dose responses assumes linear mixing. No half-dose human arms exist.

Test: does the drink 10 reading interval lie entirely outside the parents' interval, [min(R3,R7) − h, max(R3,R7) + h]?

| Window | Drink 10 interval | Parent interval | Entirely below? |
|---|---|---|---|
| Second hour (h = 1.5) | 28.5–31.5 | 31.0–38.0 | **No** (overlap 31.0–31.5) |
| Total 0–120 (h = 2.0) | 45.0–49.0 | 50.0–54.5 | **Yes** |

- **Graph-reading statement only.** Being below the parents centrally (both windows) is not a confidence result. The source marks no difference between drink 10 and either parent. The linear-blend benchmark's overprediction (`BOUNDS.json`) is likewise reading-conditional.

## (2) Capped leucine vs energy/mass on the same admissible readings

All 10 bars, including the common control, take one shared admissible reading. The ranges below are the exact min/max of the mean-error difference: separable per drink, with a 4001-point grid on the control reading plus every kink point.

| Window, basis | Comparison | All 9: central (range) | Excluding drink 2: central (range) |
|---|---|---|---|
| 2nd h, per 50 g carb (primary) | leucine − energy | −0.057 (−0.061, −0.040) settled | −0.014 (−0.018, +0.006) **not settled** |
| 2nd h, per 50 g carb | leucine − mass | −0.063 (−0.065, −0.045) settled | −0.022 (−0.024, −0.003) settled |
| 2nd h, per bolus (alternate) | leucine − energy | −0.058 (−0.080, −0.004) settled | −0.015 (−0.040, +0.046) not settled |
| 2nd h, per bolus | leucine − mass | −0.102 (−0.108, −0.085) settled | −0.080 (−0.087, −0.061) settled |
| 0–120, per 50 g carb | leucine − energy | −0.053 (−0.061, −0.030) settled | −0.009 (−0.018, +0.017) not settled |
| 0–120, per 50 g carb | leucine − mass | −0.051 (−0.063, −0.018) settled | −0.009 (−0.022, +0.029) not settled |
| 0–120, per bolus | leucine − energy | −0.059 (−0.082, −0.031) settled | −0.016 (−0.042, +0.016) not settled |
| 0–120, per bolus | leucine − mass | −0.082 (−0.102, −0.003) settled | −0.057 (−0.080, +0.031) not settled |

"Settled" means a constant sign over the **reading box**. That is not sampling uncertainty, which is unavailable.

**Correction of "only".** Without the arginine drink, leucine keeps small central gains of 0.009–0.080, the largest being vs mass on the per-bolus basis. Vs mass in the second hour these remain negative across the reading box on both bases. Vs energy, no window or basis settles once drink 2 is excluded. Drink 2's response being below control is a point estimate that the source does not mark as different from drink 1. No physiological cause is claimed.

**Ties up to ingredient rounding:**

- energy 1.4991–1.5009 (both bases);
- mass 1.4741–1.4755 (per 50 g carb) and 1.3168–1.3176 (per bolus).

**Strict Lan domain** (leucine whey-equivalent ≤ 30 g, both bases): covers drinks 2, 5, 6, 7 and 8, and abstains on 3, 4, 9 and 10.

| Basis | Leucine | Energy | Mass | No change | Leucine − energy shared-reading range |
|---|---:|---:|---:|---:|---|
| 2nd h, per 50 g carb | 0.173 | 0.249 | 0.245 | 0.346 | (−0.083, −0.044) |
| 2nd h, per bolus | 0.171 | 0.249 | 0.223 | 0.346 | (−0.117, +0.020) |
| 0–120, per 50 g carb | 0.211 | 0.294 | 0.284 | 0.271 | (−0.099, −0.076) |

- Within that domain, the advantage again rests on drink 2. On the four in-domain protein drinks the second-hour errors are leucine 0.153 vs energy 0.147, from the per-drink errors in `RESULTS.json`.
- The capped (primary in v1) and linear-tail values for drinks 3, 4, 9 and 10 are **declared sensitivities beyond Lan support**.
- `lan_aa_sum` for hydrolysates omits Table 2 dashes (wheat Lys/Trp, pea Trp), so it is a **lower-bound-input scenario**.

## Other wording corrections

- "Wheat outperformed" and "a blend fell below its parents" are descriptive point observations, not causal or significant findings.
- The decision stands without new strength. Energy/mass ties and no-change are kept. Capped leucine has a reading-robust advantage that depends on including a zero-leucine drink, and loses on within-protein substitutions. The linear measured-component blend overpredicts drink 10. No leucine field and no consumer rule follow.

## Challenge to the full-profile transport into Claessens 2009 (six-source, 2-h net area)

Transfer assumptions that need explicit treatment:

1. **Kinetics.** van Loon is repeated dosing with second-hour accumulation; Claessens is a single bolus. Profile effects learned on accumulation need not hold for first-pass responses.
2. **Products.** The same source label is not the same product: degree of hydrolysis and peptide size differ.
3. **Learning sample.** van Loon offers only four protein drinks and three independent within-protein contrasts at n = 8. Any full-profile weighting is badly underdetermined there.
4. **Operator.** Net (signed) area vs above-baseline area.
5. **Dose.** The protein:carbohydrate dose ratio differs.

**Efficient falsifier, needing no new data.** Before scoring, freeze the full-profile forecasts for the six Claessens sources. Then score the actual profile-to-source assignment against **all 720 permutations** of the six profiles across sources, holding everything else fixed.

- If the true assignment is not clearly better than most permutations (e.g. not in the best 5%, a declared tolerance), the amino-acid profile is not doing predictive work, whatever the absolute error.
- Also report two cheap competitors: the tie, and a van Loon rank-copy (sources shared with van Loon inherit its rank order).
- Keep levels vs a shared control separate from within-source contrasts.
- A pre-declared directional check is the wheat vs whey order (van Loon: whey/wheat 0.86).
