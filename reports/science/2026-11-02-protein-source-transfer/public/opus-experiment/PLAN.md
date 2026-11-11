# Form challenge: intact whey vs composition-matched free amino-acid mixtures — protocol v1

Owner and implementer: Opus 5.5 (`claude-opus-5-5`). Written before any source for this experiment was opened.

## Question

Two drinks can carry identical leucine grams, or identical grams of a named amino-acid subset, while differing in form: intact whey protein vs free amino acids. Can **food-input** descriptors forecast the insulin-area ratios of glucose plus protein/amino-acid drinks? Where they cannot separate the arms, we report that and do not count it as a failure of the data.

This is the case the prior Thondre result could not resolve, because there leucine covaried with product identity. Here the formulations are constructed so that leucine (and some other AA grams) are matched. A difference between whey and a matched mixture is therefore something these descriptors **cannot** express, whatever its size.

## Primary source (to be confirmed on opening)

Nilsson M, Holst JJ, Björck IME. Metabolic effects of amino acid mixtures and whey protein in healthy subjects: studies using glucose-equivalent drinks. Am J Clin Nutr 2007;85:996–1004, DOI 10.1093/ajcn/85.4.996.

- Expected: glucose-only reference, whey, and free-AA mixtures designed to match whey's content of selected amino acids, all with the same glucose.
- Exact arms, AA grams, glucose dose, windows and area operator are admitted from the methods and composition only. A literal table/section locator is recorded for each.

## Exposure (declared before opening)

- I recall qualitatively, from background knowledge rather than from this session, that the paper concluded a mixture of five amino acids (leucine, isoleucine, valine, lysine, threonine) gave insulin responses close to whey. I do **not** recall numeric arm means. This is not a blind test.
- Acquisition: a summarising fetch tool reads the page. I ask it **only for methods/composition** before the freeze, then separately for results. The tool, not I, sees the full page first. That firewall is procedural, not cryptographic.
- If the source is inaccessible or composition is not reported per arm, the experiment is UNAVAILABLE; no inputs are invented.

## Frozen candidate rules (food inputs only; no Nilsson insulin used)

Every rule predicts arm/glucose-reference ratios. The Lan whey-addition curve is the retained central marginal, protein 0/5/30 g → 1, 1.1666666666666667, 1.5518518518518518, piecewise-linear; beyond 30 g it is unavailable.

1. `no_change`: 1. This is the shared-glucose reference.
2. `printed_energy`: energy ratio, only if per-arm energy is printed; otherwise 4 kcal/g × (glucose + protein/AA grams), labelled as macro-derived.
3. `total_nitrogen_grams`: Lan curve at total protein/AA grams added.
4. `leucine_whey_equivalent`: Lan curve at leucine grams × (whey protein g / whey leucine g), using the study's own whey arm composition. Whey and any leucine-matched mixture tie by construction.
5. `matched_subset_whey_equivalent`: same as 4, but using the summed grams of the amino acids the authors matched to whey. A matched mixture ties with whey by construction.

Rules 4 and 5 are **proxies** (biological hypotheses), not known potencies. The Lan curve came from whey in 50 g glucose under an unresolved summary convention. If the Nilsson glucose dose differs, transporting a *ratio* across glucose dose is a declared assumption.

## Endpoint and scoring

- **Primary:** the source's reported insulin incremental area for the earliest complete window it prints that is ≤ 120 min (expected 0–45/0–60 or 0–120). Every printed window is scored separately and never pooled. The operator (positive-clipped vs net) is recorded as stated. Means are used as printed, and SD vs SEM is recorded as printed.
- **Score:** |ln(pred/obs)| per arm, with the mean over arms only for rules covering all arms.
- **Discrimination panel (central):** observed whey/mixture ratios against what each rule can express. For tied rules the prediction is exactly 1. Each mixture-vs-mixture ratio is scored separately.
- **Source statistics:** source-reported significance for each whey vs mixture and mixture vs reference comparison, quoted with its direction. No model-error CI is constructed from marginal SD/SEM, and no paired covariance is invented.
- **Separate:** glucose responses, incretins, plasma AA, and outcome-used-as-input diagnostics (e.g. "what single potency per gram would fit") are post hoc and labelled as such.
- **Not claimed:** no mechanism attribution, no claim that leucine or form is causal, no consumer rule.

## Amendment A: source pivot, written before any outcome value was seen

**Nilsson 2007 is UNAVAILABLE.** DOI/ScienceDirect and ajcn.nutrition.org returned HTTP 403, OUP returned 404, and the Lund record has no full text. A web-search summary did expose its abstract conclusions: the 5-AA mixture "closely mimicking" whey, BCAA insulin above glucose, and whey but not the free-AA drinks raising GIP. No Nilsson cells are used.

**Admitted instead:** Gunnerud UJ, Heinzle C, Holst JJ, Östman EM, Björck IME. PLoS ONE 2012;7:e44731, DOI 10.1371/journal.pone.0044731, PMC3446992 (Europe PMC fullTextXML). Methods, Table 1 and Table 2 were read through a methods-only extraction request.

- **Design:** randomized, single-blind, within-subject; 14 healthy adults (n = 13 for S and S+6AA, 12 for W+6AA). A 100 mL pre-meal drink is taken immediately before a ham sandwich (50.3 g available carbohydrate from white bread, 13.3 g protein, 11.5 g fat, 358 kcal). The reference is the sandwich with no drink. Arms (Table 1):
  - W: 9 g whey;
  - W+5AA: 4.5 g whey + Ile 0.7, Leu 1.3, Lys 0.9, Thr 0.9, Val 0.7;
  - W+6AA: W+5AA + Arg 0.7;
  - S, S+5AA, S+6AA: the same with soy isolate.
  - Total protein 22.3 g (23.0 g for +6AA); printed energy 394 kcal (397 for +6AA).
- **Table 2 (g AA/100 g protein):** whey Leu 11.4, Ile 7.6, Lys 10.4, Thr 8.1, Val 6.6, Arg 2.1; soy Leu 9.2, Lys 6.3, Thr 3.6, Val 5.0, Arg 8.1. **Soy Ile is printed as "―"**, so soy subset sums are UNAVAILABLE; nothing is imputed.
- **Why this is a form challenge:** the six drinks carry 9 g (9.7 g) of protein-equivalent. Total grams **tie** W, W+5AA, S and S+5AA, while leucine grams differ: the free-AA arms carry about 1.7–1.8 g leucine vs 0.83–1.03 g for intact. Leucine and form therefore make opposite or distinct predictions.
- **Exposure:**
  - The search summary claimed Gunnerud 2012 found the 5-AA mixture "mimics whey's insulinogenic effect". I have only a vague background recollection of this paper and no numbers.
  - The extraction tool read the full article; I received only design, composition and table headings.
  - The outcome tables are Table 3 (II from 120 min iAUC; letters from ANCOVA/Tukey; mean ± SEM) and Table 4 (early insulin iAUC, window to be confirmed).
  - Below-baseline handling is **not stated** (only "trapezoid model").

**Frozen rules for Gunnerud** (added protein relative to the reference meal; Lan whey curve as above; base-meal protein ignored, a declared assumption):

1. `no_change` = 1.
2. `printed_energy` = kcal/358.
3. `total_protein`: added grams 9.0 or 9.7.
4. `leucine_whey_equivalent`: leucine g × 100/11.4 (whey Table 2).
5. `matched_subset_whey_equivalent`: (Ile + Leu + Lys + Thr + Val) g × 100/44.1. Whey arms only; soy UNAVAILABLE.
6. `intact_protein_only`: free AA grams count zero. This is a declared form hypothesis, the opposite of rule 4.

Arginine counts only in rule 3.

**Endpoints:**

- **Primary:** Table 3 II/100 (120 min). This is a *mean of individual indices*, normalized to the reference meal. It is not a ratio of native means and is kept separate from that estimand.
- **Secondary:** Table 4 early insulin iAUC, test/reference ratio of group means. Arm n values differ, so the comparison is not of identical participant sets.
- Transporting a 120 min glucose-drink addition curve to a pre-meal drink before a mixed meal, and to an early window, are declared assumptions.

**Scores and contrasts:**

- **Scores:** |ln(pred/obs)| per arm. Means are taken over equal coverage only: all 6 arms for complete rules, and a separate whey-arm (3) mean comparing rule 5 with every other rule.
- **Form contrasts:** W+5AA/W, S+5AA/S, W+6AA/W+5AA, S+6AA/S+5AA, S/W and S+5AA/W+5AA, as ratios of the arm summaries.
- **Pre-declared key discriminator:** the sign of W+5AA/W and S+5AA/S. Rule 4 predicts > 1, rule 3 predicts = 1 and rule 6 predicts < 1.
- **Uncertainty and coverage:** the source letters are quoted. No paired CI and no pass gate. The +5AA free amino acids are Ile/Leu/Lys/Thr/Val only, so "form" is confounded with altered AA pattern. That is not separable here.

## Decision relevance

- **Whey ≈ matched mixture** (point ratio near 1, source not distinguishing): leucine/subset grams remain an admissible descriptor, with no evidence of an additional form effect in this design.
- **Whey and matched mixture clearly differ** (source-reported difference): ingredient grams, including leucine, cannot be sufficient, and a form/matrix descriptor would be needed.
- Either way, scored errors are reported for all rules without a pass gate.
