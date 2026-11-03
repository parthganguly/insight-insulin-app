# Authoritative note v3: what Katsanos and Farup do and do not show

Author: Opus 5.5 (`claude-opus-5-5`).

- **Preserved:** all v1/v2 files are unchanged; `reproduce_v2.py` still verifies them.
- **New code:** `challenge_v3.py` → `CHALLENGE_v3.json` (`--check` passes; stdlib).
- **Precedence:** this note supersedes the wording of RESULT.md and RESULT_v2.md where they conflict.

## 1. Correction: lowest point loss ≠ equivalence; "cannot discriminate" was overstated

- **The point result.** On the *observed group-mean-curve summaries* (signed and positive, 0–120, both baselines), equal response has the lowest absolute log loss in both ages: 0.112–0.115 at the primary signed summary vs 0.22 for the slope and 0.35 for the fixed multiplier.
  - This is a well-defined point comparison of fixed forecasts on an observed summary.
  - Fixed rival forecasts **can** be ranked on it. It is not mathematically impossible to distinguish them.
- **What it does not show:**
  - population equivalence of the two mixtures;
  - failure of either enrichment rule in the population;
  - accuracy for the mean of individual positive areas.
- **Corrected wording.** My "cannot discriminate" statements (v1 `DESIGN_POWER.json`, v2) should be read as: *the available uncertainty does not let the ranking be supported statistically.*
  - The design-power table was **illustrative**: it assumed CVs and equal n.
  - The conservative area-SE intervals were valid but loose upper bounds.
  - Neither is a proof that the data cannot rank forecasts.
- **Separately, the slope is not identified.** One leucine-fraction gap per age cannot identify a slope uniquely: any one-parameter rule can be tuned to it. That limit is about learning coefficients, not about scoring fixed ones.

## 2. Constructive identifiability (participant-positive endpoint)

The construction is checked independently on my own Fig. 4 reading (larger whisker where markers overlap):

- For each time, k = n/2 − 1 people sit at μ + SE·√((n−1)(n−k)/k) and the rest at μ − SE·√((n−1)k/(n−k)). Mean, SE and nonnegativity are reproduced exactly at every time, with a minimum value of 2.3 µIU/ml.
- **"Aligned"** keeps the same people high throughout. **"Reassigned"** keeps them high pre-dose and makes a disjoint set high after dosing. Each treatment arm is chosen independently. Baseline = mean of −30 and 0.

| Mean-of-individual positive 0–120 ratio (41/26) | aligned/aligned | aligned/reassigned | reassigned/aligned | reassigned/reassigned |
|---|---:|---:|---:|---:|
| Young (my reading) | 0.929 | **0.737** | **1.161** | 0.921 |
| Young (team) | 0.952 | 0.757 | 1.149 | 0.913 |
| Elderly (my reading) | 0.898 | **0.707** | **1.491** | 1.174 |
| Elderly (team) | 0.898 | 0.708 | 1.488 | 1.173 |

The small young differences come from whisker choice where markers overlap.

**Implications:**

- Panels with identical per-time means and SEs give participant-positive ratios from about 0.71 to 1.49. That is enough to make the slope closer than the tie (reassigned/aligned, both ages) **or** the tie closer than the slope.
- The participant-positive ranking of tie vs slope is therefore **not identified** from the published means and SEs. This is consistent with, and narrower than, my outer bounds of about 0.36–2.6.

**Limits:**

- These are synthetic two-point panels, not real records and not likelihood-weighted. They are illustrations, not bounds.
- They ignore between-time correlation constraints implied by the original repeated-measures analysis, which they do not enforce.
- They do not change the **group-mean-curve** summaries (E2, E3). Those are identified by the means and remain as scored.
- **Consequence:** INSIGHT scores on Katsanos must be labelled *group-mean-curve* scores. A participant-positive claim needs participant data or reported positive AUCs.

## 3. Farup 2016 (20 g whey hydrolysates; DH 48 / 27 / 23%; leucine 3.24 / 1.60 / 1.96 g)

- **Reported AUC:** H 210.6, M 226.0, L 217.1. The window is 0–120 sampled; the operator and units are unclear; it is not participant-positive.
- **Identity (verified).** With d_i = ln pred_i − ln obs_i, the three pairwise log errors sum to 2·range(d), so the mean is (2/3)·range(d).
- **Monotone-rule bound (verified).** H is the observed minimum and M the maximum.
  - Equality's loss is therefore (2/3)·ln(226/210.6) = **0.047**.
  - H ≥ M on *both* leucine and DH. Any rule nondecreasing in either input therefore has pred_H ≥ pred_M, so d_H − d_M ≥ ln(226/210.6) + ln(pred_H/pred_M).
  - Its mean loss is ≥ 0.047 + (2/3)·ln(pred_H/pred_M).

| Rule | Mean loss | Bound |
|---|---:|---:|
| Leucine slope | 0.159 | 0.159 (attains it) |
| DH-only (0.0117/pp) | 0.216 | 0.211 |
| Tie | **0.047** | — |

- **Exception preserved.** For M vs L the inputs disagree: DH puts M > L, leucine puts M < L.
  - **DH-only gets the M/L direction right** (observed 1.041), and leucine gets it wrong.
  - Its aggregate loss is still dominated by the H/M reversal.
- **Between-class contrasts remain favourable.** The named whey/casein reference improves on equality there: H/casein observed 3.04, family 1.32, equality 1.
- **The failure is specific** to within-hydrolysate ordering, not to the whey-vs-casein reference.
- **Glynn.** The 30-min increments 59 vs 73 pmol/L are a single-time increment, not an area. They stay a separate early-response comparison (`facts/early.json`) and are not used as AUC.

## Bottom line for the decision (quantitative composition beyond a generic flag?)

- **Katsanos:** on observed group-curve summaries, equality ranked best and the label-only multiplier worst. Neither population equivalence nor participant-positive ranking is established.
- **Farup:** every monotone leucine or DH rule is *forced* above the tie's loss by the H/M reversal, with one DH-only pairwise exception.
- **Overall:** neither study supports adding quantitative leucine or DH inputs beyond a whey/casein class reference. Neither is decisive. The required next evidence is:
  - ≥ 3 graded fractions within one product family, in a crossover;
  - reported positive AUCs, or participant data.
