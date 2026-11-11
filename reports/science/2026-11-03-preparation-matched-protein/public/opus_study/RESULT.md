# Same-source intact ↔ hydrolysate dose-shape bridge: works for soy, fails for whey, loses to proportional dose overall

Owner and implementer: Opus 5.5 (`claude-opus-5-5`).

**Source:** Claessens, Saris and van Baak, [Br J Nutr 2007, doi 10.1017/S0007114507886314](https://doi.org/10.1017/S0007114507886314). It is used here as thesis chapter 3, Figure 3.1A/B.

**Order of work:**
1. `SPEC.md` and `bridge.py` were frozen (`FREEZE_RECEIPT.json`) before the figure or Results text was viewed. The qualitative abstract findings were exposed: SPI > SPH, WPI ≈ WPH, insulin rising with dose.
2. Readings come from **vector digitization of the PDF bar rectangles** (`digitize.py`, run on a locally held PDF that is not redistributed). The scale comes from the printed 0–2000 ticks and gridlines. Gridline fit residual is ≤ 5.2 units, and fitted vs height-based values differ by ≤ 3.4. The declared reading half-width of 10 units was fixed before scoring.
3. `bridge.py --check` passes, and receipts are in `EXECUTION.json`.

The published journal figure was **not** independently compared, because no access was available offline. Thesis-to-article agreement is an open check.

## Design that matters

- **Cohorts:** two independent cohorts of 12 men. The soy cohort got SPI and SPH, the whey cohort WPI and WPH. Each took 0.3, 0.4 and 0.6 g/kg BW in Latin-square order.
- **Drinks:** **protein only** (no carbohydrate), with **no control arm**.
- **Endpoint:** insulin "total AUC (AUC above – AUC below baseline)", the signed net area over 0–120 min, means ± SEM.
- **Axis label as printed:** "mU*2h*mL-1". The magnitude suggests a µU·min/mL-type scale; this is flagged and nothing is converted.
- **Composition:** Table 3.2 gives one amino-acid profile per source, so composition cannot distinguish the forms. Any composition rule equals "no form adjustment".

## Readings (native units, mean / SEM whisker)

| | 0.3 | 0.4 | 0.6 |
|---|---|---|---|
| SPI | 937 / 183 | 1023 / 181 | 1447 / 292 |
| SPH | 731 / 121 | 756 / 121 | 1289 / 230 |
| WPI | 575 / 219 | 928 / 231 | 1575 / 207 |
| WPH | 782 / 207 | 745 / 147 | 1453 / 256 |

**Source symbols:**

- Soy: * on both forms at 0.3 and 0.4 (differ from 0.6), and $ for intact vs hydrolysate.
- Whey: * and # on WPI 0.3 (differs from 0.6 and from 0.4), and no $.

All bars are > 0, so nothing abstained.

## Primary result (calibrate each target at 0.3; predict 0.4 and 0.6; 8 cells), mean |ln(pred/obs)|

| Rule | All | Soy | Whey | Reading-box range (all) |
|---|---:|---:|---:|---|
| **no form adjustment** (copy other form's level) | **0.180** | 0.209 | **0.151** | 0.161–0.199 |
| proportional dose | 0.219 | 0.210 | 0.229 | 0.196–0.242 |
| cross-source bridge (same form, other cohort) | 0.275 | 0.275 | 0.275 | 0.242–0.307 |
| **same-source bridge** | 0.275 | **0.093** | 0.457 | 0.242–0.309 |
| no change | 0.410 | 0.281 | 0.539 | 0.390–0.429 |

Bridge minus competitor, over the 3¹² reading scenarios:

- vs no change: −0.167 to −0.101 (the bridge is better);
- vs proportional dose: **+0.029 to +0.084** (worse);
- vs no form adjustment: **+0.073 to +0.118** (worse);
- vs cross-source bridge: −0.030 to +0.031 (**unsettled**).

**Reverse calibration (S1: calibrate at 0.6, predict 0.3 and 0.4):**

| Rule | Mean error |
|---|---:|
| proportional dose | **0.168** |
| bridge | 0.212 |
| cross-source bridge | 0.236 |
| no form adjustment | 0.270 |
| no change | 0.588 |

Here the bridge is worse than proportional dose (+0.017 to +0.069) but better than level-borrowing (−0.065 to −0.051).

## Interpretation

1. **The bridge adds dose shape, not form information.** By algebra, the bridge and proportional dose give the *same* intact/hydrolysate contrast at every dose (frozen O2 note). The reciprocal transfers (intact→hydro and hydro→intact) have **identical** errors by construction, since each is |ln shape_target − ln shape_other|. Effectively there are 2 sources × 2 doses of shape-agreement evidence, not 8 independent cells.
2. **Soy shapes agree, whey shapes do not.**
   - Soy: 0.6/0.3 = 1.54 for SPI and 1.76 for SPH.
   - Whey: 2.74 for WPI and 1.86 for WPH, and WPH 0.4 < 0.3.
   - The low WPI 0.3 bar (575, SEM 219, about 38%) drives the whey failure. A single noisy calibration cell propagates into every bridge prediction.
3. **"Same source" is not shown to matter.** The same-source bridge did not beat the cross-cohort same-form bridge in this reading box.
4. **For levels, borrowing the other form's measured level** (calibrating at 0.3) or **proportional dose** (calibrating at 0.6) beat the bridge. Which wins depends on the calibration dose, so neither is a general rule. With SEMs of 15–38% of the means, n = 12 and no paired covariance, error differences of about 0.05–0.1 are within plausible sampling variation. All ranges above are graph-reading ranges, not confidence intervals.

## Boundaries

- Protein-only drinks with a signed net area: not positive 0–120 min area with carbohydrate, and not INSIGHT native-level validation.
- Measured benchmarks use same-cohort bars, as declared. No evaluation cell was fitted.
- No mechanism (peptide size, absorption rate) is inferred from the soy-specific form effect.
- **Next discriminator:** a dose series with ≥ 3 doses per form *and* a carbohydrate-matched control, with paired form differences. That would make shape agreement testable beyond one noisy calibration bar.
