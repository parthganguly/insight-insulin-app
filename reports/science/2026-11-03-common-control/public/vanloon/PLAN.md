# van Loon 2000 common-control mixture test — protocol v1 (frozen before results pages were read)

Owner and implementer: Opus 5.5 (`claude-opus-5-5`).

Source: van Loon LJC, Saris WHM, Verhagen H, Wagenmakers AJM. Am J Clin Nutr 2000;72:96–105, DOI 10.1093/ajcn/72.1.96. This is the publisher version of record, from the Maastricht University repository (scanned PDF, read visually, kept local and not redistributed). This is **not** the separate post-exercise paper.

## What was read before freezing

PDF pages 1–3 only: the repository cover, the abstract and introduction, Table 1, Table 2, Subjects, Experimental trials, Protocol and the start of Beverages.

**Abstract-level exposure:** "the drinks containing free leucine, phenylalanine, and arginine and the drinks with free leucine, phenylalanine, and wheat protein hydrolysate" had insulin responses 101% and 103% greater than carbohydrate alone (second-hour AUC, P < 0.05). Under Table 1 numbering these are drinks 3 and 9. Two of the nine drink-to-control ratios are therefore exposed: about 2.01 and 2.03.

No other outcome, figure or table value had been seen.

## Design facts (source locators)

- **Subjects** (p. 97, Subjects): 8 healthy nonobese men, age 21 ± 0.4 y, weight 73.9 ± 2.2 kg (mean ± SE). Diet kept constant the day before and 12 h fast.
- **Trials** (Experimental trials): 10 trials, ≥ 3 d apart, 2 h seated. **Drinks 1–8 were randomized double-blind first. Drinks 9 and 10 were composed and tested within 3 wk *after analysis of drinks 1–8*.** Drinks 9 and 10 are author-selected mixtures, not prespecified arms. The source does not state that the order of drinks 9 and 10 was randomized relative to 1–8; it does state randomized and double-blind "in both parts".
- **Dosing** (Protocol and Beverages):
  - 3.5 mL/kg bolus at 0, 30, 60 and 90 min, so 0.8 g carbohydrate·kg⁻¹·h⁻¹ and 0.4 g amino acid/protein·kg⁻¹·h⁻¹;
  - blood every 15 min to 120 min;
  - plasma amino acids at 0, 60 and 120 min.
- **Table 1 (g/L):** every drink has glucose 57.1 + maltodextrin 57.1, plus 0.20 saccharinate, 1.80 citric acid and 5.00 flavor. The added nitrogen source in each drink totals 57.1 g/L (57.2 g/L for drink 9):
  - 1: none (common control);
  - 2: Arg 57.1;
  - 3: Arg/Leu/Phe 19.0 each;
  - 4: Arg/Gln/Leu/Phe 14.3 each;
  - 5: whey hydrolysate 57.1;
  - 6: pea hydrolysate 57.1;
  - 7: wheat hydrolysate 57.1;
  - 8: intact casein 57.1;
  - 9: Leu 14.3 + Phe 14.3 + wheat hydrolysate 28.6;
  - 10: Arg/Leu/Phe 9.50 each + wheat hydrolysate 28.6.
- **Table 2:** amino-acid composition, % by weight of hydrolysates and casein. Dashes are **not reported**, not zero: wheat Lys and Trp, pea Trp.
- **Structural fact:** in nitrogen-source composition, drink 10 = 0.5 × drink 3 + 0.5 × drink 7 exactly (9.5 = 19.0/2; 28.6 ≈ 57.1/2), with identical carbohydrate. Drink 9 has no clean decomposition into tested drinks.

## Endpoint (rules fixed now; definition confirmed from methods after the freeze)

- **Primary:** the source's printed second-hour insulin AUC (60–120 min, repeated dosing), drink k / drink 1, ratio of group means. Its baseline handling and units are recorded from methods/tables as printed.
- **Secondary, separate:** any other numerically printed insulin window (e.g. 0–60, 0–120).
- **Graph-only values** are UNAVAILABLE in v1. They are not digitized here.
- **Not the INSIGHT target.** This is neither single-bolus native positive 0–120 area nor a concentration at a single time.
- **Repeated dosing:** the second hour reflects four cumulative boluses near a quasi-steady state. Every single-bolus transfer below is an explicit assumption.

## Frozen forecasts (ratio vs drink 1; no van Loon insulin used)

Food-input rules. **Basis:** nitrogen-source grams per 50 g carbohydrate, which is 25 g in every drink because the protein:carbohydrate ratio is fixed at 0.5. Sensitivity basis: absolute grams per bolus at 73.9 kg (14.78 g nitrogen source with 29.56 g carbohydrate).

| Rule | Definition | Behaviour |
|---|---|---|
| F0 `no_change` | 1 | |
| F1 `energy` | (4·carb + 4·nitrogen-source)/(4·carb) = 1.5 | All drinks tie; free-AA energy approximated at 4 kcal/g |
| F2 `lan_mass` | Lan whey curve (0/5/30 g → 1, 1.16667, 1.55185; linear; cap at 30 g) at 25 g | All drinks tie |
| F2b `lan_aa_sum` | Lan curve at Table 2 summed **reported** amino-acid grams (free AA 100%) | Hydrolysate sums with dashes are lower bounds and flagged |
| F3 `lan_leucine_whey_eq` | Lan curve at leucine g ÷ 0.087 (in-source whey hydrolysate leucine fraction); capped at 30 g | Linear-tail sensitivity recorded |
| F4 `substitution_slope` | exp(0.1022204575597254 × Δleucine g per 50 g carbohydrate) | Prior frozen Gunnerud fit. **Within drinks 5–8 only**, contrasts vs drink 7 (wheat), where |Δ| ≤ 1.125 g lies near its 0.79–0.89 g training range. All other drinks ABSTAIN: Δ of 3–8 g would be blind extrapolation. **Not used vs drink 1**, because drink 1 has no nitrogen source (addition, not substitution). |

The external 1.66 leucine **addition** multiplier is **not used**. Every drink adds the same nitrogen-source mass, so drink-vs-drink contrasts are substitutions, and leucine is never added alone.

Measured-component benchmark, within the same cohort; it uses observed drinks 1, 3 and 7, which are outcomes used as inputs:

- B1 `blend_linear`: R10 = 0.5·R3 + 0.5·R7 (additive increments over the common control).
- B2 `blend_log`: R10 = √(R3·R7).
- The benchmark predicts both a native second-hour level and a ratio. A concave dose-response would place the observation above B1.
- Drink 3 is abstract-exposed. Drink 7 and drink 10 are not exposed.

## Panels (scored separately, never pooled)

- **A. Common-control levels:** drinks 2–10 vs drink 1 for F0–F3, by |ln(pred/obs)| per drink and mean over 9. Drinks 3 and 9 are exposed, so means are also reported over the 7 unexposed drinks.
- **B. Protein-source substitution:** drinks 5, 6 and 8 vs 7 (and all 6 pairs among 5–8) for F2, F2b, F3, F4 and the tie.
- **C. Blend:** drink 10 for B1, B2 and F0–F3, both as a native level and as a ratio.
- **D. Free-AA drinks 2, 3, 4, 9 and 10:** relative ordering. All food rules except F3 tie here.

## Uncertainty and limits

- Printed SE/SD and significance letters are recorded. There is no paired covariance, so no CI on forecast-error differences.
- n = 8.
- The drink 9/10 selection depended on the drink 1–8 data.
- Hydrolysate "% by wt" includes non-amino-acid mass.
- There is no consumer or field claim.
