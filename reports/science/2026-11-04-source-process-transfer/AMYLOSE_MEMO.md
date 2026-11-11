# Amylose transfer audit v2: claim-specific memo (outcome-exposed; no target fit)

Opus 5.5 (`claude-opus-5-5`) developed the model and returned the correction. This published memo incorporates the coordinator’s source and wording corrections following Sol’s independent audit.

**Run:** `python -I -X utf8 amylose_transfer.py`, which writes `amylose_transfer_results.json` (`--check` passes; stdlib, deterministic). v1 outputs were saved separately by the coordinator.

**Precedence:** wording here supersedes v1 where they differ.

## C1. Model and constants (corrected)

- **Model status.** The **empirical** barley partial-contribution model is fitted only on the two Granfeldt 1994 covered-barley pairs: 42 vs 33% amylose at equal 50 g potentially available starch; kernels n = 10, flour n = 9. Score = dose × [(1 − A) + θA].
- **Fitted θ** (fit domain [0, 1]): joint **0.2594**; kernel donor 0.1667; flour donor 0.3620. Empirical power alternative: b = 0.6402.
- **Identification** (separate sensitivity range θ ≥ 0, unbounded above): the 1.96-SE band includes θ = 0 and θ = 1 for the kernel pair at all correlations and for flour at ρ ≤ 0.
- **Bornet heated exponent:** recomputed exactly as **b = 1.7282696920791498**, matching `model.py`. v1's shortened 1.728 is replaced; the conclusions are unchanged (primary error 1.657).

## C2. Which differences this trial distinguishes

- **High vs low pairs.** Amylose (0.24 vs 0.743), total starch, RS, fibre, protein, moisture and sugars all co-vary, with the same amylose contrast in both milling strata. The trial **cannot** separate amylose from RS or from dose.
- **Milling pairs.** These hold amylose fixed, so every amylose term cancels.
- **Two dose bases, neither preferred:**
  - **Total basis.** Amylose is the only accessibility descriptor and measured RS is ignored.
  - **Subtracted basis** (starch − RS). Equivalence to the barley potentially available starch definition has not been established. Applying the amylose fraction of total starch to this smaller pool can count the same accessibility difference twice.

## C3. Signed group-curve point errors (0–120; mean over the two high/low strata)

| Rule | Error |
|---|---:|
| Starch − RS dose | **0.070** |
| Total starch | 0.217 |
| Empirical θ flour donor × total | 0.259 |
| Empirical θ joint × total | 0.386 |
| Equality | 0.474 |
| Empirical θ joint × available | 0.553 |
| Bornet exact × total | 1.657 |

- **Success preserved:** the starch − RS dose alone (declared comparator).
- **Failure:** on the two signed wheat contrasts, each empirical adjustment increases mean error relative to the corresponding unadjusted dose. The flour-only coefficient times starch less RS still beats equality (0.425 versus 0.474).
- **Table 3 marginal** (author 0–180, ignoring below-baseline area; a distinct operator): starch − RS 0.002.

## C4. Conditional participant-positive admissibility (not population inference)

The bounds come from `positive_results.json`: lower = signed group area, upper = gross area, under its stated grid, baseline and complete-sample assumptions. They are not sampling intervals.

| Forecast | Refined (bounds: envelope 0.4167, coordinator reading 0.3821, Sol 0.3736559) | Wholemeal (0.4162, 0.3780, Sol 0.3803384) |
|---|---|---|
| θ joint × available | **0.3741**: below the envelope and the coordinator reading lower; **above Sol's lower by +0.0011 log (boundary case)** | 0.3434: below all three |
| θ joint × total | 0.4428: inside all | 0.4046: inside the reading bounds and above Sol, but **below the no-reading envelope (−0.028 log)** |
| θ flour × total | 0.5029: inside all | 0.4595: inside all |
| θ kernel × total | 0.3854: inside both readers’ bounds, just above the coordinator’s lower limit (+0.009 log), below the no-reading lower limit | 0.3522: below all |
| Power × total | 0.4044: inside both readers’ bounds, below the no-reading lower limit | 0.3695: below all |
| Dose rules (equality, total, available) | inside all | inside all |
| Bornet exact | below all | below all |

- **Boundary cases.** Results within 0.02 log of a lower limit are flagged *near*. They depend on the reading convention, which differs by reader. The admissibility verdict for θ joint × available in the refined stratum is therefore **reader-dependent**.
- **Target-implied θ (diagnostic, exposed; not a coefficient):**
  - total basis: 0.49–0.76;
  - available basis: 0.70–1.05.
- **θ admissibility thresholds** in [0, 1] are recorded in the JSON as diagnostics only.

## C5. Coverage beyond wheat

- **Hoebler.**
  - HAWB amylose is not established: **abstain**.
  - SP vs WWB is durum vs bread wheat, and neither amylose fraction is established. A **strict amylose model is unavailable**; a cancelled factor is only a conditional equal-fraction sensitivity.
  - Dose-only rules (signed 0–120 group curve):
    - available starch: errors 0.331 (HAWB/WWB) and 0.549 (SP/WWB);
    - total starch: 0.505 and 0.496, but 0.009 on HAWB/SP.
  - **Counterexample preserved:** in Hoebler the high-amylose bread falls well below its available-starch ratio (0.578 vs 0.804). The reported available-starch ratio from this study and its separately calculated (total starch − RS) ratio of 0.791 both exceed the signed insulin ratio. The contrast does not isolate a mechanism.
- **Costabile 2023 first breakfast.** Only the available-carbohydrate dose (= 1) supplies predictions. Its signed-120 errors are 0.064, 0.043 and 0.020. **Starch − RS and amylose models abstain:** the study reports resistant starch per serving (1, 7 and 8 g) but omits total starch per serving, and molecular amylose is not verified.

## C6. Decision for INSIGHT

The cooked-isolated-starch model correctly predicted lower high-amylose wheat responses. Its predicted reductions were too large even under conservative participant-positive bounds with the displayed-grid assumptions. The barley-trained coefficient was weakly constrained. It improved on the isolated-starch forecast but worsened each wheat dose baseline on the signed two-hour comparison. These results concern the tested model families and preparations.

Keep starch less resistant starch as a comparator. It came close in the 2019 wheat trial and predicted higher high-amylose/white bread and spaghetti/white bread response ratios than observed in Hoebler’s study. The published inputs also overlap across amylose, RS and starch dose. The tested empirical multiplication does not justify adding an amylose adjustment for consumers. Another feasible discriminator would be a prepared-food comparison with independently varying starch amounts and composition, linked serving measurements and a compatible first-meal insulin endpoint.
