# Independent review ledger

Reviewer: independent Sol verification. Research artifacts only; no application changes.

| Item | Status | Actual verification |
|---|---|---|
| Original O2 form comparison | RED — preserved | Mixed anchored and reciprocal estimands. Original failure is not overwritten or retroactively passed. |
| O2 repair | REPAIR | Supplemental corrected calculation uses the actual O1 level formulas and separates reciprocal, intact-anchored, and hydro-anchored ratios. Original artifacts retained. |
| Corrected O2 | PASS | 438 independent numeric checks, both anchors and all five models; predicted levels, all three ratio estimands and errors, anchored identities to original O1, and aggregate mean errors. No author prediction function imported. |
| Original O1 | PASS | 80 independent per-cell error checks; both anchors, all five models. |
| External preparation-ratio test | PASS | 67 independent arithmetic and coordinate-conversion checks. This does not certify every source-marker selection. |
| Positive empirical-area bounds | PASS with scope | Proof checked and 16 finite-n numeric checks. Sample linear-interpolation functionals only; no population interval. Stressed bounds preserve ordering but do not guarantee bridge beats tie. |
| SEM denominator sensitivity | PASS | Eight independent checks using sqrt(8) times widened SEM: pea/soy outer ratio [1.0624482834745541, 1.7252957559669608]; conservative lower difference201.33849326394466. |
| Main README spot-check | PASS with limits | Primary ratio, errors, native levels and timing numerics agree with actual outputs. sqrt(8) sensitivity merits adjacent mention. No full prose or archival-integrity certification claimed. |

The corrected reciprocal bridge is distinct from proportional dose. The anchored comparison errors exactly duplicate the corresponding O1 level errors; they are not independent validation evidence. The original failure is resolved by supplemental corrected output, not by changing the frozen result.

Replay independent corrected checks with Python standard library: check_o2_correction.py and sem_convention_check.py. Receipts o2-correction-receipt.json and sem-convention-receipt.json. These scripts expect the surrounding research packet's relative folder structure.
