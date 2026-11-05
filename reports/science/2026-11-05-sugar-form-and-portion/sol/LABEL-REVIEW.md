# Label identifiability: independent final checkpoint

Read public/LABEL_PLAN.md. Post-result model audit; no new model selection, coefficient fitting, or holdout claim. Script label_verify.py uses stdlib only and passes endpoint, monotonicity and common-coefficient grid assertions; label-results.json retains all outputs.

Let modified/control available carbohydrate be Da/Db, total sugarsTa/Tb, and k=1−R. Score D−kf. With0≤fa≤Ta,0≤fb≤Tb, the sharp ratio range is [(Da−kTa)/Db,Da/(Db−kTb)]. Numerator decreases withfa and denominator decreases withfb; opposite endpoint allocations attain both extremes and continuity fills the interval. For a common but unknownR∈[0,1], both most extreme endpoints occur atR0; union is [(Da−Ta)/Db,Da/(Db−Tb)]. This does not permit differentR in the two arms. Total sugars alone do not identify their fructose content. Compatible allocations cannot be chosen after seeing insulin and called predictions.

| modified/control | fixedR=.148148 | any commonR[0,1] |
|---|---|---|
| potato cookie | .075146–.480072 | .027288–.513121 |
| maize scone | .417717–1.103365 | .360825–1.204167 |
| F muffin/S muffin | .543729–1.713038 | .478992–2.018519 |
| sucralose muffin/S muffin | .672269–1.257276 | .672269–1.481481 |

Cookie inputs modifiedD12.71,T11.72; controlD36.28,T11.51. Scone modifiedD28.9,T14.9; controlD38.8,T14.8. Accepted preceding source inputs supplied by parent; no renewed historical audit. Muffin inputs as preceding review. Envelopes are algebraic restrictions, not participant confidence intervals. No cookie/scone response means were supplied in this subtask; do not infer compatibility from interval width alone.

External exponenta=.7781175447 multiplies each bound by(Da/Db)^(a−1), because the portion factor uses totalD. FixedR/commonR intervals respectively: cookie.094837–.605869 /.034438–.647578; scone.445931–1.177892 /.385197–1.285502. MuffinF/S.554422–1.746728 /.488412–2.058216; U/S.734190–1.373080 /.734190–1.617936. Thus linear exclusions are not universal for alternate portion functions.

## Does the numerical coefficient matter for muffins?

Exact recipe fixedR forecasts F/S.708578,U/S.876090; zeroR forecasts.658960,.924855; D-only.915966,.672269. At independent early signed centers(.757752,.899548), absolute log errors full(.067095,.026423),zero(.139694,.027745). Full wins both centers, but U/S coefficient difference is effectively unresolved at graph precision. At operational240min centers(.638889,.881944), full errors(.103530,.006660),zero(.030932,.047508): ZERO winsF/S while full winsU/S. The exact nonzero coefficient is not uniformly preferred.

For all commonR0–1 with actual recipes, F/S=(57+52R)/(86.5+32.5R) increases monotonically; its sharp range is.658960–.915966. U/S=80/(86.5+32.5R) decreases; range.672269–.924855. Four-hourF/S center.638889 lies below the coefficient-independent floor. However conservative independent visual boundsF89–94,S141–146 yieldF/S.609589–.666667, overlapping that floor. Therefore this is a central-estimate incompatibility, not a graph-error-robust falsification. The stronger boundary test must disclose this overlap.

D+protein forecasts F/S126/136=.926471,U/S99/136=.727941, worse than full at both centers/windows. The script additionally labels an APPROXIMATE4/4/9 energy comparator (from accepted macro totals, not independently reported kcal), F/S1107/1138=.972759,U/S999/1138=.877856. It is slightly closer than full on U/S at both centers (ALE.024410 vs.026423 early;.004647 vs.006660 four-hour), worse onF/S. Do not silently relabel these calculated4/4/9 energies as reported Table1 energy or claim superiority over every comparator.

Both windows remain separate. Source graphs, uncertain central-estimate conventions, marginal error bars and paired uncertainty limits carry forward from MIXTURE-REVIEW.md. Recipe verification supports useful identity information, but label-only intervals show the missing information cannot be recovered from carbohydrate and sugar grams alone. This ends model exploration for this checkpoint.
