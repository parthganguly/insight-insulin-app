# Addendum to RECONCILIATION_v2.md

Author: Opus 5.5 (`claude-opus-5-5`). This addendum corrects statements in v2. Nothing is refitted and no study is added. Frozen forecasts, outcomes and `CONTRAST_CHECK.json` are unchanged, and the v2 text is kept as written.

## Corrections to v2

1. **Doses were near-matched, not identical.** Thondre gives 8.1 and 16.2 g whey against 8 and 16 g pea per 50 g glucose.
   - Under the frozen common slope plus source offset, the high/low whey-vs-pea ratio-of-ratios is **1.0001636734** (ln ≈ 0.00016), not exactly 1. "Dose-invariant" and "Δ = 0" hold exactly only at exactly matched doses.
   - The printed ratio-of-ratios is **1.432182718** (ln ≈ 0.359).
2. **A source × dose interaction can have either sign.** My table row "source-specific slope → Δ > 0" is withdrawn; it is Δ ≠ 0 of either sign.
3. **The v2 reversal rule was wrong.** I had written that "|Δ| ≲ 0.1 would make Thondre's gap look like noise and favour dropping source". A new small or nonsignificant contrast alone shows neither that the earlier estimate was noise nor that all source information should be dropped. Both estimates would need to be weighed with their uncertainties.
4. **Gunnerud.** The team's support check found 3 whey doses in Gunnerud. The limit there is the **absence of a second source with a dose range**, not a lack of whey doses. I did not verify that support check independently.
5. **Pea support and identifiability.** Excluding Thondre, pea support is only Fahmi's split-pea-flour breads at about 0.06 g/g. There is no clean within-cohort pea-isolate gradient.
   - My statements that the source slope is "formally unidentified" and that the corpus gives "no information about a pea slope" overstated this. Absolute algebraic nonidentifiability of cross-study coefficients does not follow.
   - The correct statement: cross-study pea information exists, but it is between-study and confounded with bread matrix and carbohydrate form, so it is weak.

## Nilsson 2007: what the recovered tables change

The team recovered final Nilsson Tables 1–4. My failed intake was not universal inaccessibility. Their arithmetic at the 90 min window, as printed, which I have not independently verified:

- AA3 + AA2 − glucose = 14.8 + 9.4 − 10.6 = **13.6**;
- observed AA5 = **13.9**;
- difference +0.3, ln(obs/pred) ≈ +0.022;
- no paired residual CI.

**What changes.** For a free-amino-acid combination, a **measured-component additive forecast** (components minus the shared glucose background) came close at this window. In Oberoi's glucose + intact whey test, the corrected sum underestimated the co-ingested response. The next experiment should therefore treat the component sum as the primary reference, ahead of any food-input rule. Where they exist, it should test, in the **same cohort and on one window**:

- whether intact whey ≈ glucose + its matched free-AA component arms − glucose;
- whether free-AA subsets add.

That compares *form* against measured components without leucine-gram proxies. When this is defined, the forecast must be frozen from the component arms before the mixture cell is opened. The window and operator must be the source's own (the 90 min window is not the 120 min target), and they must not be pooled with Oberoi's net time-weighted windows.

**Still uncertain:**

- one point at one window;
- no paired residual CI or covariance;
- subtracting glucose once assumes a common background, which arm recipes do not guarantee;
- exact arm definitions and units are as printed in Nilsson's tables, which I have not verified;
- the outcomes were exposed before this forecast was framed;
- close agreement on one mixture does not establish general additivity or a mechanism.

No new field, assay or consumer rule follows.
