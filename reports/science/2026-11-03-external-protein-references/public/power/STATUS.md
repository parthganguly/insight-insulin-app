# STATUS — power/ (read this first)

Author: Opus 5.5 (`claude-opus-5-5`). No prior artifact was overwritten.

## Authoritative (current)

| File | Role |
|---|---|
| `V2_RESULT.md` | Current Power 2009 result, with design admitted from the credited Sol/coordinator source reading |
| `VERIFIED_v2_corrected.json` (`jsonsafe.py --check`) | Strict-JSON numbers for v2. **null** = range unavailable (rule abstains at this dose). All finite values are identical to the historical file. |
| `verify_v2.py`, `target_inputs_v2.json` | v2 computation and admitted inputs. Run via `jsonsafe.py`, which writes strict JSON. |
| `CHALLENGE.md`, `challenge.py`, `CHALLENGE.json` | Mixed-food learning challenge |
| `bound.py`, `BOUND.json` | Structural dose-family bound (below) |
| `JSON_SCAN.json` | Strict-JSON scan of every JSON file here |
| `SPEC.md`, `transfer.py`, `FREEZE_RECEIPT.json` | Sealed protocol and code; the frozen hashes still match |

## Historical (keep in an appendix; do not cite as current)

| File | Why historical |
|---|---|
| `RESULT.md` | v1, written when only the abstract was accessible. Its abstentions and the "BW unavailable" status are superseded by `V2_RESULT.md`. |
| `PREDICTIONS.json`, `RESULTS.json` | Frozen v1 outputs: all rules abstained because of a code–spec mismatch |
| `ADDENDUM.json`, `addendum.py` | v1 body-mass-conditional table, superseded by the admitted BW |
| `VERIFIED_v2.json` | Contains `[Infinity, -Infinity]` (non-strict JSON) for `R2x_boundary_hold`. Superseded by `VERIFIED_v2_corrected.json`; preserved as raw evidence. |
| `EXECUTION.json`, `EXECUTION_v2.json` | Receipts for those runs |
| `target_inputs.json`, `target_outcomes.json` | v1 abstract-only inputs |

**Known latent issue:** `transfer.py` (sealed) writes with `allow_nan=True`. Its current outputs are finite only because it abstained. Any future run must be strict-checked with `jsonsafe.py`'s scan.

Corrections already recorded:

- SPEC's log-mean of 0.99803 should be 1.001864.
- The `raw/Power-Fig2.*` files are HTML, not images, so the 2-h endpoint is UNAVAILABLE.

## Assessment of the broader completed result: are the source-specific level and contrast claims justified?

**No, not as source-specific claims.**

1. **The reported set (17 rows / 9 authors) does not separate a source effect from a constant.** The gain-calibrated reference scores 0.1402 against a constant of 0.1472, a 0.007 difference. That is over 9 author groups, with equal author weighting and no paired uncertainty. The constant already captures "protein addition raises the response". The cheap (0.1673) and transformed-blind (0.1618) comparators lose to the constant too.
2. **The calculated set (20 rows / 3 authors) is all whey.** It has zero source variation, so it can inform whey dose or level at most. It cannot support any source-specific level or contrast.
3. **Thondre 2026 is an informative counterexample for the dose family, not support.**
   - The low-dose match (1.026 vs 1.028) is not discriminating: equal response errs by only 0.028.
   - At the high dose the model (1.043) barely moves from flat: error 0.345 vs 0.387 for flat. The observed contrast is 1.472.
   - **Structural flaw:** for Q(d) = [(1+ad)/(1+bd)]^β with a > b ≥ 0 and β ≥ 0, log Q is concave with log Q(0) = 0. So log Q(2d) ≤ 2·log Q(d), and Q is nondecreasing.
   - Thondre's doses double exactly (whey 8.1 → 16.2 g, pea 8 → 16 g). The **whey** point means give log Q(2d)/log Q(d) = **2.71** (0.2152 → 0.5830), violating the bound for *every* parameter value. Pea gives 1.05.
   - Consequently: if a family member reproduced both low-dose levels exactly, the highest attainable high-dose whey/pea contrast is 1.240²/1.206 = **1.275** < 1.472.
   - Generally, log C(2d) ≤ log C(d) + log Q_whey(d). Reaching 1.472 from a 1.026 low-dose contrast would require a predicted 10 g whey level of ≥ **1.435** vs glucose, against 1.240 observed.
   - So the family cannot be right on both whey level and dose-dependent contrast here. **The high-dose miss is a property of the functional form, not of fitted parameters**, and no reparameterization within the family repairs it.
4. **Scope.** This is a statement about published *point means* in one study (n = 30 crossover, large SDs; whey 20 g SD about half its mean). It does **not** establish a population source × dose interaction or a superadditive whey dose response; the high whey mean could be sampling variation. It does show the claimed source-specific dose-contrast representation has no capacity for the pattern actually observed. Its apparent low-dose success is indistinguishable from equal response.

**Justified claims:**

- protein addition raises the response (constant ≫ null);
- whey dose or level information within whey-only data;
- the equal-response tie as the default source contrast.

**Not justified:**

- source-specific response levels beyond the constant;
- a transferable source × dose contrast.
