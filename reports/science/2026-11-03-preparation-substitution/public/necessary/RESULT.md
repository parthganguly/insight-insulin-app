# Necessary-condition check: equal-AC rice vs potato (Lan-Pidhainy 2011 thesis ch. 5; target found by Sol)

Author: Opus 5.5 (`claude-opus-5-5`). Code: `lan2011.py` → `RESULTS.json` (`--check`, offline).

**Logic.** At identical full replacement, a shared lentil arm cancels:

- rice/potato = r_potato/r_rice = **0.698** under the fixed rule;
- rice/potato = (r_potato/r_rice)² = **0.487** under the scaled rule.

This tests only that implied rice/potato ratio. **It does not test either lentil arm individually.**

**Target:** healthy n = 9, equal available carbohydrate. Operators are kept separate:

- ratio of **medians** of individual positive 0–120 areas, 9/20 nmol·min/L = **0.450**;
- ratio of **mean individual normalized insulin indices**, 60/128 = **0.469**.

Neither is a GM ratio, and nothing is converted.

| Rule (rice/potato) | Pred | |ln| vs medians (0.450) | |ln| vs mean II (0.469) |
|---|---:|---:|---:|
| Tie (equal AC) = pooled chain (cancels) | 1 | 0.799 | 0.758 |
| Direct donor controls (Moravek GM 10.9/19.9) | 0.548 | 0.197 | 0.156 |
| Lentil chain, fixed | 0.698 | 0.439 | 0.398 |
| Lentil chain, scaled | 0.487 | **0.079** | **0.038** |

- **Result.** On both operators the scaled implication is closest, then the direct donor controls, then fixed, then the tie. The scaled chain's potato/rice ≈ 2.05 is consistent with this equal-AC comparison of plain staples.
- **Contrast with Wei.** In Wei 2026, *prepared* potato in a mixed lunch reversed the direction. That supports preparation-conditional rather than identity-only references.
- **Limits:**
  - n = 9; dispersion and paired uncertainty not admitted;
  - medians and mean indices are not geometric means;
  - exposed target;
  - potato preparation differs from Moravek's instant potato.
