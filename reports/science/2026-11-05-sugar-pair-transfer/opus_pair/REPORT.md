# Can a reference tell two sugar substitutions apart? Van Can 2012 IGT test (version 2)

Author: Opus 5.5 (`claude-opus-5-5`), 2026-11-05; see `MODEL_RECEIPT.json`. Implements `../PLAN.md`, whose hash matches `../FREEZE.json`. Stdlib Python, nothing fitted. Version 1 is preserved verbatim in `history/v1_reported3h/`, and its 3 h analysis is recomputed unchanged as an archive block.

Notation: T/G = trehalose/glucose and I/S = isomaltulose/sucrose insulin-area ratios. D = (T/G)/(I/S); any common fractional reduction predicts D = 1. Errors are |ln(pred/obs)|.

## What changed from version 1

- **Primary endpoint.** The plan's primary endpoint is now the **signed group-curve 0–120 area**. Version 1 wrongly treated it as unevaluable. Investigator readings of the target's Fig. 1c,d (`../figure.json`) and the donors' Fig. 1b (`../matched/coordinates.csv`) make it evaluable. My integration reproduces every coordinator area in `../results.json` (24 target values) and `../matched/areas.csv` (all donor operators).
- **3 h results are now an archive.** The author-reported 3 h iAUC analysis is kept, failures included. Its favourable matched-donor result (fasting D error 0.004) **does not carry over to the primary endpoint**.
- **Withdrawn wording.** I withdraw the version-1 statements that the p-value-derived SE "understates" uncertainty, and any implication that a paired p supplies an interval. Paired p-values fix only the SE of each paired difference. Arm variances, covariances and the cross-pair correlation are unknown, so no exact interval for a ratio or for D follows. The direction of the heuristic's error is not determined.
- **The 25 g → 75 g Yoshizane level scaling** is now diagnostic only. Matched signed 2 h donor levels are the stronger comparison.

## Primary: signed 0–120 group-curve area

Values are in μU·min/ml, with nominal timing (the pre-dose −5 min value placed at t = 0).

| | Target T/G | Target I/S | Target D | Matched donor D (same lab, 75 g) |
|---|---:|---:|---:|---:|
| Fasting | 0.586 | 0.601 | **0.974** | 0.864 |
| Lunch (conditional) | 0.847 | 0.659 | **1.285** | 0.862 |

| D error | Fasting | Lunch |
|---|---:|---:|
| Any common factor, D = 1 | **0.026** | **0.251** |
| Matched donor pair | 0.120 | 0.400 |
| Frozen pair (Yoshizane 590/1709 ÷ Holub 0.655 = 0.527) | **0.614 (failed)** | **0.891 (failed)** |

- **Frozen primary forecast fails at both meals.** At fasting it gets the direction right but is 0.29 log past the decision midpoint. At lunch the direction reverses.
- **The matched donor also loses to D = 1 on the primary endpoint at both meals.** At fasting this ordering is **not robust to reading**. The target D's reading bounds already include the donor-versus-common midpoint (0.930) at an independent 0.25-pt error per plotted mean (D range 0.927–1.024). At lunch, D = 1 wins at every reading error tested.
- **Zero-time handling barely matters.** Target fasting D is 0.974, 0.980 or 0.979, and donor D 0.864, 0.881 or 0.879, under the nominal, from −5 min, and interpolated-zero conventions.
- **Magnitude, the second objective.** Mean |log error| on the two pair ratios:
  - Fasting: matched donor pair = matched donor common geometric mean = **0.096**, then Holub 0.655 for both pairs at 0.098.
  - Lunch: matched donor common geometric mean 0.126 is best.
  - The donor pair and donor geometric mean tie exactly at fasting: every forecast falls on one side of both observations, and the code verifies the identity.
- **Lunch interpretation stays conditional.** The same sugar was drunk at breakfast, and the lunch dose is described as 25 En% of an individualised meal. The jury stays open on how to read lunch D.

## Secondary (post-hoc, chosen after inspecting the curves): D across 60/120/180 min windows

The objective is the mean |log error| on D over the three cumulative windows within each protocol. "Best constant" is the best single D chosen *with* the outcomes; its minimum error is (max log D − min log D)/3.

| | Target D (60/120/180) | Donor D (60/120/180) | Donor time-specific | Best constant (oracle) | D = 1 | Frozen pair |
|---|---|---|---:|---:|---:|---:|
| Fasting | 1.240 / 0.974 / 0.765 | 1.160 / 0.864 / 0.762 | **0.064** | 0.161 | 0.170 | 0.614 |
| Lunch | 1.345 / 1.285 / 1.241 | 0.990 / 0.862 / 0.861 | 0.358 | **0.027** | 0.255 | 0.895 |

- **Fasting.** The donor's time profile beats every possible constant, including the oracle. This holds under all zero-time conventions (0.056, 0.056) and with the donor figure's stated 08:40 clock (0.043).
- **It does not hold at larger reading errors.** At 0.25 pt per point the donor's worst case (0.119) still beats the oracle's best case (0.123). At 0.5 pt it no longer does (0.174 vs 0.084).
- **Lunch.** Target D is nearly flat while the donor's is too low at every window, so the donor loses even to D = 1.
- **Descriptive only.** In both fasting cohorts, sucrose falls below isomaltulose after about 1.5 h. The crossing is at about 106 min in the target and 85 min in the donor. Glucose and trehalose cross near 175 min in both. That shared sequence is what makes fasting D fall with the window. The target's group-mean peaks are later (60–90 min vs 30 min). These are group means, not participant-level crossings, and support no population inference.

## A different question: T/I directly

Since T/I = D × G/S, this rewards getting the control ratio right, which D deliberately cancels. Its values were already exposed in coordinator results.

| T/I | Observed | Equality | 1/w = 1.742 | Donor G/S only | Donor T/I levels |
|---|---:|---:|---:|---:|---:|
| Fasting 120 | 1.631 | 0.489 | **0.066** | 0.078 | 0.068 |
| Lunch 120 | 1.495 | 0.402 | 0.153 | 0.075 | **0.073** |

w = (1 + R)/2 with Lee's R = 1.2/8.1. The cheap constituent rule and donor G/S alone are both strong, and equality is far worst. Across all six windows, the donor-based rules win five times and 1/w wins fasting 120.

## Native levels (signed 0–120)

- **Donor levels as given** under-predict every target arm. Signed log errors: fasting −0.35 to −0.51, lunch −0.28 to −0.60. Mean |log error| is 0.43 (fasting) and 0.44 (lunch). The IGT cohort runs higher, but this is a between-cohort observation.
- **Donor ratio × measured target control**, a separate benchmark: fasting T −0.156, I −0.037.
- **Yoshizane 25 g → 75 g**, diagnostic only: G −0.78 and T −1.31 proportional; −1.02 and −1.55 with the frozen exponent.

## Archive: version-1 author-reported 3 h iAUC

These numbers are unchanged. Fasting D = 0.785: matched donor error 0.004, D = 1 0.242, frozen pair 0.398. Lunch D = 1.294: frozen pair 0.898; the donor's face value is inadmissible.

The p-value-derived SEs are retained only as a **heuristic scale, not an interval**. For example, the fasting TRE–GLUC paired SE is 1,746 from p = 0.009. A lunch TRE p reported only as "not significant" bounds that SE from below only.

## Source integrity

- **Duplicated table cells, unresolved.** The two 2009 donor papers print identical afternoon table cells (10,693 and 14,634) for different pairs, yet their figure trajectories for those arms are distinguishable. Signed 0–180 figure areas run at 0.95–0.98 of the table values for all fasting arms and for afternoon T and G. For afternoon I and S they run at only about 0.70 and 0.62. That pattern is *consistent with* the shared cells belonging to the T/G pair. It is an inference from group curves, and the table discrepancy stays **unresolved**.
- **Shared donor cohort.** The coordinator reports that the 2008 investigators' meeting report (Int J Obes suppl., p. S134, T3:PS.12) links both companion papers to one 10-person, four-drink donor. I could not verify this: the PDF redirected to a publisher sign-in. It is consistent with the identical subject descriptions. A single donor cohort makes donor D a within-cohort quantity, like the target's.
- **Overlap between the donor and the 2012 IGT cohort** remains open. The printed characteristics differ (age 31 vs 56, healthy vs IGT), but no participant lists exist.
- **Paired uncertainty for the signed group-curve endpoints** is not available. Only deterministic reading bounds are given.

## Assessment

On the plan's primary endpoint, neither product-specific reference beats "no discrimination". The frozen Yoshizane/Holub forecast fails clearly. The matched-protocol donor loses narrowly at fasting, a margin within graph-reading sensitivity, and clearly at lunch.

The one place the matched donor shows something a constant cannot is the **fasting time profile of D**, which it tracks better than any constant. That objective was chosen after seeing the curves, rests on one cohort of ten, and loses robustness at a 0.5-pt reading error. It is a hypothesis for prospective testing, not a result. The time profile itself means a single-window D answers a window-specific question: here D crosses 1 near 2 h, so 0–120 happens to sit close to D = 1.

## Execution (`EXECUTION.json`)

| UTC | Command | Result |
|---|---|---|
| 10:51:22–10:52:10 | version 1 (`run`; audit FAIL then PASS; portable PASS) | preserved |
| 10:58:xx | `pair.py import-lab` | lab readings copied into `inputs.json` with file SHA-256 (figure.json 0d9b19be…, coordinates.csv 6e1d1477…) |
| 10:59:02 | `pair.py run` (version 2) | RESULTS.json written; plan freeze matched on raw bytes |
| 10:59:52 | `portable_test.py --record` | **PASS**: default `--check` from five files only, as stored and CRLF; files unchanged |
| 10:59:52 | `pair.py --check --lab --record` | **PASS**: imported readings unchanged; areas reproduce `../results.json` and `../matched/areas.csv` |

**Not re-run:** a `--sources` image audit. The original images were deliberately not retained after the version-1 audit (PASS, 10:51:52), so the coordinator would need to supply them for any repeat.
