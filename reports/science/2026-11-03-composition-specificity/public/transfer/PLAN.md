# Leucine proportion at matched EAA dose (Katsanos 2006): quantitative slope vs fixed enrichment flag — frozen plan v1

Owner and implementer: Opus 5.5 (`claude-opus-5-5`). Written **before opening the source**. The only design facts used are from the task brief: 6.7 g oral EAA with about 26% vs about 41% leucine, young and older groups separately, four independent groups, matched total and free form.

## Decision question

Does a quantitative composition rule (frozen leucine-substitution slope) predict the insulin response ratio between the 41%- and 26%-leucine EAA drinks better than:

- equal response;
- a label-only fixed enrichment multiplier?

## Exposure

- The coordinator reports seeing only timing, no outcomes.
- I have a vague background recollection that the paper's main finding concerned muscle protein synthesis in the elderly, with a high-leucine benefit. I have no recollection of insulin numbers. The qualitative title and abstract may be exposed when the source is opened.
- The source was selected for its design.

## Rules (frozen; predicted ratio R = response(high leucine) / response(low leucine), the same in each age group)

| Rule | Definition |
|---|---|
| P0 `equal_response` | R = 1 (same EAA amount and form) |
| P1 `generic_AA_flag` | R = 1. Both drinks are "free EAA" and the flag ties them. **Identical to P0 in this design**, so the design cannot separate a generic AA flag from equal response. |
| P2 `fixed_enrichment_multiplier` | R = **1.2670685255785012**, the label-only multiplier from the last checkpoint: high-leucine = "enriched", 26% = "not enriched". The coefficient is pre-existing and not chosen from these data. |
| P3 `quantitative_slope` | R = exp(β·ΔLeu), β = 0.1022204575597254 log/g (prior frozen pooled substitution slope). ΔLeu = leucine g(high) − leucine g(low) per serving, **from the source's own composition table** if printed, otherwise from the stated percentages × 6.7 g (labelled). Single bolus: per-serving grams = per-bolus grams. |
| P3w / P3s (sensitivity) | Same, with the frozen whey-trained (0.05273155134276091) and soy-trained (0.14126765570429567) slopes |

**Abstentions (declared):**

- No per-50 g-carbohydrate basis: the drinks contain no carbohydrate, so the original slope context (mixed meal with carbohydrate) is extrapolated.
- No native absolute forecast: there is no reference arm with an external native calibration.

**Pre-computed thresholds** (absolute log loss; using ΔLeu ≈ 1.005 g *if* it is confirmed; final values come from the admitted ΔLeu):

- P3 beats P0 iff obs > √(P3).
- P3 beats P2 iff obs < √(P2·P3).
- P2 beats P0 iff obs > √1.267 = 1.126.

## Target quantities (scored separately)

1. **R_young, R_old.** Ratio of group summaries, high/low leucine, within each age, from the source's insulin endpoint:
   - E1: reported insulin AUC (incremental or as defined) if printed numerically;
   - E2: signed area of the group-mean insulin curve (mean − mean baseline) if a curve with source geometry exists;
   - E3: positive-clipped group-mean curve area, which is **not** the participant-positive area.
   - E1–E3 are never pooled.
2. **Age interaction** R_old / R_young. Every rule predicts 1, so this is scored only as coverage and reported descriptively.
3. **Native differences** (high − low) in source units, with no absolute forecast.

**Abstention.** If either arm's signed summary is ≤ 0, or its SEM ≥ its mean, the log ratio for that age is UNAVAILABLE. The signed native difference is reported instead. Protein-only drinks may produce small insulin increments.

## Uncertainty (pre-declared; groups are independent, so zero covariance is the design, not a scenario)

- log SE ≈ √((SEM_h/m_h)² + (SEM_l/m_l)²), with n per group as printed. An approximate normal interval for ln R is reported.
- **Discrimination statistic:** Gaussian log-likelihood ratio of P3 vs P2 and P3 vs P0, LR = exp(−(z₃² − z₂²)/2), where z = (ln obs − ln pred)/SE.
- **Prespecified power check:** if 2·SE exceeds |ln P2 − ln P3| (the separation, about 0.134 at ΔLeu ≈ 1 g), the design is declared *unable to discriminate* the fixed vs quantitative hypotheses, whatever the point errors.
- Graph-reading bounds are added if values are read from a figure.

## Identification limits (stated before results)

- The 41% mixture also *lowers* the other EAAs at equal total, so leucine is confounded with the reduction of the others.
- Independent groups mean between-person baseline differences enter the ratio.
- There is no carbohydrate, so the transfer from the slope's training context (carbohydrate meals) is extrapolation.
- With two leucine levels, no rule with a free coefficient can be distinguished from a fixed multiplier tuned to these data. Only pre-existing coefficients are used here.
