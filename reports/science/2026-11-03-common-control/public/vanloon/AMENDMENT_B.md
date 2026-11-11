# Amendment B (after freeze; forecasts unchanged)

Written after reading PDF pp. 4–6 (Figures 1–6, Analysis, Statistics, Results, Table 3). `PREDICTIONS.json`, `analysis.py` and `PLAN.md` are unchanged and still match `FREEZE_RECEIPT.json`.

## What the source reports

- Insulin AUC is "area under the curve above baseline value (at 0 min)" (Statistics). Means ± SEM, n = 8. Two-factor repeated-measures ANOVA with Tukey post hoc.
- Insulin is radioimmunoassay (Pharmacia Insulin RIA 100). Concentrations are in pmol/L; the Fig. 4 caption converts to mU/L by dividing by 7.25, as printed.
- Insulin AUC exists **only as bar charts**:
  - Fig. 6: second-hour AUC, nmol·h/L, primary endpoint. Markers: # differs from drink 1 (drinks 3 and 9); * differs from drink 2 (drinks 3, 4, 7 and 9).
  - Fig. 5: total 2-h AUC, nmol·2h/L, secondary. * differs from drink 2 (drinks 3, 4, 7 and 9).
- No numeric insulin AUC table exists. Tables 3–5 are plasma amino acids.
- Text anchors (Results, p. 99):
  - second hour: drinks 3 and 9 are 101% and 103% greater than drink 1;
  - total 2 h: drinks 3, 4, 7 and 9 are 126/124/122/105% greater than drink 2, and 57/55/54/42% greater than drink 1 (NS);
  - insulin at 120 min: drinks 3 and 9 are 122% and 106% greater than drink 1.
  - Whether these percentages are ratios of means or means of individual ratios is not stated.

## Admission rule (declared before scoring)

The plan said graph-only values were UNAVAILABLE in v1. Because the endpoint exists only graphically, I admit **one human visual reading** of bar tops (not whisker tips) from the scanned figure. The resolution is about 3.7 px per unit (Fig. 6) and 2.6 px per unit (Fig. 5).

- Every bar gets a reading bound of ±1.5 nmol·h/L (Fig. 6) or ±2.0 nmol·2h/L (Fig. 5), applied independently per bar.
- These are graph-reading bounds, not sampling uncertainty.
- Text anchors are cross-checks, not replacements.
- Scoring uses central readings, and `bounds.py` reports ranges over the reading box.
- The bars were seen before this rule was written. The readings are therefore an exposed transcription, with no independent second reader. Sol may re-read them.
- Reading discrepancy noted **before scoring**: my Fig. 5 drink 9 bar (about 51) is above the text-implied 1.42 × drink 1 (about 47). The Fig. 5 drink 9 reading is therefore flagged as unreliable.
- The measured-component blend benchmarks (B1/B2) use the same readings.
