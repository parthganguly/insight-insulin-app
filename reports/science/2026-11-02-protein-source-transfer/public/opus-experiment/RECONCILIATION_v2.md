# Reconciliation v2 — Gunnerud 2012 form challenge

**Coordinator's reading note.** The leucine advantage is an average across two contrasts. Its error for whey at the printed two-hour central values is 0.00005 larger than predicting a tie. The ranking can change within printed precision. Read the subsequent corrections on dose matching and interpretation in [Opus's addendum](ADDENDUM.md).

Author: Opus 5.5 (`claude-opus-5-5`).

The following v1 files are kept unchanged as historical records: `PLAN.md`, `inputs.json`, `analysis.py`, `PREDICTIONS.json`, `outcomes.json`, `RESULTS.json` and `RESULT.md`. The four frozen files still match `FREEZE_RECEIPT.json`. Both `analysis.py --check` and `contrast_check.py --check` pass. No forecast, outcome or rule was changed, and nothing was fitted. Sol and the coordinator checked the original PMC3446992 tables.

## Corrected title and interpretation (supersedes RESULT.md headline)

**On printed group-mean and normalized-index point summaries, the half-free-amino-acid arms were not lower than their intact-protein arms. The two predeclared half-replacement contrasts are not statistically resolved. The leucine proxy forecast those two point contrasts better than the tie and intact-only rules.**

- W+5AA vs W and S+5AA vs S share significance letters in both tables. The authors report no significant II differences among any meals. Pair-level CIs and covariance are unavailable, so "form did not lower insulin" is withdrawn as a population statement.
- The free-AA treatment also changes the amino-acid profile: Ile/Leu/Lys/Thr/Val are added and intact residues removed. Form is not isolated.
- The limits of each rule establish neither a form requirement nor leucine causality.

## Other corrections

1. **Plan history.** Amendment A was appended to `PLAN.md` before any outcome was seen, and the freeze hash covers v1 plus Amendment A. The pre-amendment text exists only within that file; it was never hashed separately. `PLAN.md` has not been edited since the freeze, and later changes go only into versioned files.
2. **Nilsson 2007** was unavailable *to my attempted intake* (two 403s and one 404). That is not universal inaccessibility.
3. **Naming.** The v1 plan's `total_nitrogen_grams` rule, never admitted (Amendment A used `total_protein`), would have counted protein-plus-amino-acid **mass**, not elemental nitrogen. The name was wrong; no number depends on it.

## Contrast check (`contrast_check.py` → `CONTRAST_CHECK.json`; post-result, descriptive)

The tie rule (total protein, which here equals no change and energy) predicts 1 for both pairs. Leucine predicts 1.0866 for W+5AA/W and 1.0997 for S+5AA/S; intact-only predicts 0.9363 for both. Errors are |ln(pred/obs)| on each pair, and endpoints are kept separate.

| Endpoint | Pair | Observed (rounding range) | Tie | Leucine | Intact-only | Leucine − tie (rounding range) |
|---|---|---|---:|---:|---:|---|
| II 0–120 | W+5AA/W | 1.0424 (1.0338–1.0511) | 0.04150 | 0.04155 | 0.1074 | **+0.00005** (−0.0166 to +0.0167): **near tie, sign set by rounding** |
| II 0–120 | S+5AA/S | 1.1333 (1.1232–1.1435) | 0.1252 | 0.0302 | 0.1910 | −0.0950 (robust) |
| 0–30 iAUC | W+5AA/W | 1.0833 (1.0619–1.1053) | 0.0800 | 0.0030 | 0.1459 | −0.077 (−0.083 to −0.037) |
| 0–30 iAUC | S+5AA/S | 1.3750 (1.3385–1.4127) | 0.3185 | 0.2235 | 0.3843 | −0.0950 (robust) |

Rounding ranges assume printed II to ±0.5 index points and iAUC to ±0.05. Each numerator and denominator is varied independently.

Pair means:

| Endpoint | Tie | Leucine | Intact-only | Leucine − tie |
|---|---:|---:|---:|---|
| II 0–120 | 0.0833 | 0.0359 | 0.1492 | −0.047 (rounding −0.056 to −0.039) |
| 0–30 iAUC | 0.1992 | 0.1132 | 0.2651 | −0.086 (rounding −0.089 to −0.066) |

Intact-only is worse than the tie by exactly 0.0659 in every cell, because both pairs have obs > 1 > 0.936.

**Sign vs practical contrast forecasting.**

- Leucine's 2/2 correct signs per endpoint do not by themselves make it a better contrast forecaster. At the primary endpoint, the whey pair is a near tie with the no-difference rule: the observed 1.042 lies at almost the geometric midpoint of 1 and 1.087, and integer rounding of II can reverse which is closer.
- Leucine's average primary advantage comes from the soy pair alone. In the early window it is better on both pairs.
- These are differences between point errors on two dependent contrasts. They have no CI, and the 0.005 near-tie flag is descriptive.

## Wolever 2024 study-grouped transfer: comment

The figures are means of held-out-author mean absolute log errors:

- reported 120 min (26 rows, 11 first authors): null .2222, constant .1276, dose .1358, dose+source .1410;
- calculated 120 min (31 rows, 9 authors): .4860, .2507, .2058, .2625.

1. **What transfers is "protein addition raises the ratio".** The constant beats null by about 0.09 to 0.24.
   - Dose helps only in the calculated set (−0.045). In the reported set it is slightly worse than the constant (+0.008).
   - Dose+source is worse than dose in **both** sets (+0.005 and +0.057).
   - With 11 and 9 author groups, equal author weighting and no paired uncertainty, the reported-set differences of about 0.01 are not decision evidence. The 0.057 source penalty in the calculated set is the one consistent signal, and it argues **against** adding a source term in this representation.
   - The reported and calculated endpoint sets must stay unpooled.
2. **A common dose slope plus an additive source term makes the whey/pea ratio dose-invariant** (≈1.175 at both Thondre doses). Thondre printed 1.028 and 1.472, so ln-ratios of 0.028 and 0.386 with a difference of 0.359. A source *offset* cannot express that. The frozen leucine proxy is no better: it predicted 1.034 and 1.064, which grows with dose but by far too little.
   - This is one exposed, unpaired, two-dose study.
   - The dose-dependence of the gap is a point observation, not an established source × dose interaction.
3. **The pea term is weakly supported.** After withholding the same first author, the only pea support is three fixed-dose split-pea-flour breads (Fahmi). That is a whole-food matrix with no within-study pea gradient. The transported pea offset therefore mixes pea protein with bread matrix and carbohydrate form, and gives no information about a pea **slope**. A source effect that is dose-invariant, slope-modifying or absent cannot be identified from this corpus.

## Most informative next discriminator (no new field endorsed)

The single quantity that separates the live representations is the **change across dose in the log ratio between sources within one study**, Δ = ln(W/X)_high − ln(W/X)_low. It needs ≥ 2 doses of whey and of a non-dairy isolate X at a fixed carbohydrate vehicle, with paired differences or participant data.

| Representation | Predicted Δ |
|---|---|
| Common slope + source offset (dose+source) | 0 |
| Leucine proxy on the Lan curve | ≈ +0.03 (Thondre inputs) |
| No source term (dose only) | 0, with ratio ≈ 1 |
| Source-specific slope | > 0 |

Thondre's exposed Δ is +0.36.

- **The first check needs no new data.** Before acquiring anything, test whether any held-out author in the Wolever corpus already has ≥ 2 doses of one non-whey isolate. If none does, the source-slope question is formally unidentified there, and dose+source should not be read as testing it.
- **Reversal.** An independent paired study with |Δ| ≲ 0.1 would make Thondre's gap look like noise and favour dropping source. A Δ near +0.3 with paired support would make dose × source the target, still as a label-level descriptor, not a new assay field.
- The Gunnerud check above cannot supply Δ because it has one dose per arm.
