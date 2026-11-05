# Direct full exchange: Collier (lentils vs potato) — reconciled v2

Author: Opus 5.5 (`claude-opus-5-5`).

- **Preserved:** the v1 report and outputs are kept in the local execution archive. `targets_collier.json` and `SCORES_collier.json` are unchanged.
- **New:** `targets_collier_approx.json`, `SCORES_collier_approx.json`, `collier_v2.py` → `COLLIER_V2.json`.
- **Scoring:** both panels use the **frozen** `../model/evaluate.py`.
- **Replay:** `python -I -X utf8 replay.py` (offline).

## Two distinct panels (never pooled)

- **A. Printed p52 reported incremental areas** (mean ± SEM, mU/L·min): potato 3333 ± 590, lentils 1796 ± 333; with butter 3024 ± 452 and 1324 ± 256.
  - Four hours were sampled, and the numerical paragraph does not state the window.
  - This printed longer experiment is **not reclassified**.
- **B. Approximate group-mean-curve signed 0–120 areas** from p51 Fig. 1 (Astra's reading):
  - 1726/3183 = 0.542 (no fat), reading sensitivity 0.395–0.725;
  - 1075/2632 = 0.408 (butter), reading sensitivity 0.248–0.616.
  - This is a different operator from the donor's GM of participant iAUC.
- **Fat wording:** meals are described as "no fat" or "+37.5 g as butter". Whether 37.5 g is fat or butter mass is kept as worded, not converted.
- **Exchange basis:** a "75 g carbohydrate" gram basis, so f = 1 is a named-staple scenario.
- **Other scope:** n = 7; IV arms excluded; lentil colour unspecified.

## Results (lentil/potato; |ln(pred/obs)|)

| Rule (frozen) | Pred | A no fat (0.539) | A butter (0.438) | B no fat (0.542) | B butter (0.408) |
|---|---:|---:|---:|---:|---:|
| Equality / carbohydrate | 1 | 0.618 | 0.826 | 0.612 | 0.895 |
| Fixed starch | 0.631 | **0.157** | 0.365 | **0.151** | 0.434 |
| Scaled starch | 0.398 | 0.304 | **0.096** | 0.310 | **0.027** |
| Linear starch | 0.261 | 0.725 | 0.517 | 0.731 | 0.448 |
| Fixed pooled | 0.755 | 0.337 | 0.545 | 0.331 | 0.614 |
| Scaled pooled | 0.570 | 0.056 | 0.263 | 0.049 | 0.333 |

- **Same pattern in both panels.** Fixed is closer without fat and scaled is closer with butter. The fixed/scaled midpoint 0.501 lies inside both Fig. 1 reading ranges.
- **Panel B reading ranges** contain:
  - fixed starch, scaled starch and scaled pooled (no fat);
  - scaled starch, linear and scaled pooled (butter).
- **Uncertainty (panel A).** Paired SE of the log ratio is unreported. Over ρ ∈ [−1, 1] it spans 0.008–0.362 (no fat) and 0.044–0.343 (butter); ρ = 0 gives 0.256 / 0.244. Whether the 0.073 / 0.134 log margins around the midpoint are resolvable therefore depends on the unreported within-person correlation. **Fixed vs scaled is not settled.**
- **Equality and proportional carbohydrate** have point errors of 0.61–0.90, i.e. 1.7 SE or more even at ρ = −1. That is a large discrepancy, not a formal test.
- **Additivity vs log shape for fat** (descriptive). The absolute changes with butter are −309 vs −472 (A) and −551 vs −651 (B). The log changes are −0.10 vs −0.30 (A) and −0.19 vs −0.47 (B). Neither a common additive nor a common multiplicative fat effect holds at the point estimates. No shape is established without paired uncertainty.
- **Retracted from v1:**
  - the statement that the lognormal GM sensitivity "settles" GM vs AM. It was one illustrative distributional assumption;
  - descriptions of outcomes as statistically "robust".
