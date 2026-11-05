# Outside-lab transfer: Claessens whey form ratio → Power 2009 (45 g WPI vs WPH) — frozen spec v1

Owner and implementer: Opus 5.5 (`claude-opus-5-5`). Written before opening any Power 2009 text, abstract or figure in this session.

## Exposure (declared)

- **Task brief:** the abstract reportedly says WPH gave the higher insulin response, and route search results reportedly gave "7.6/10.8" (meaning unverified here).
- **My background:** I have a vague recollection of a WPH > WPI insulin result in this paper and no numeric recollection.
- **Status:** this is an exposed external transfer, not blind validation.

## Training reference (frozen, unchanged)

`../readings.json`: Claessens et al. 2007 (thesis chapter 3, Figure 3.1B).

- **Whey cohort:** n = 12 men, 79.8 kg mean BW. Protein-only drinks of about 250 mL, single-blind.
- **Endpoint:** signed net insulin area from the pre-drink sample to 120 min after finishing.
- **Hydro/intact (WPH/WPI) training ratios:**

| Dose (g/kg) | WPH/WPI |
|---|---:|
| 0.3 | 781.82/575.33 = 1.35890 |
| 0.4 | 744.65/928.44 = 0.80205 |
| 0.6 | 1452.94/1574.77 = 0.92264 |

- **Training statistics:** the authors' WPI vs WPH form effect was not significant ("no $"), and the WPH dose test alone gave p = 0.064.

## Target mapping (computed only from Power methods: dose and mean body weight)

The target dose is x = 45 g / mean BW (g/kg), using the mean BW of the actual target group as printed. If BW is not printed, the dose-mapped rules ABSTAIN; nothing is imputed.

Frozen rules, all predicting the WPH/WPI ratio:

| Rule | Definition | Status |
|---|---|---|
| R1 `nearest_dose` | Training ratio at the training dose nearest x | Labelled `extrapolation_hold` if x > 0.6 or x < 0.3 |
| R2 `log_interpolation` | Linear in dose, on ln ratio, between bracketing training doses | Only if 0.3 ≤ x ≤ 0.6; otherwise ABSTAIN |
| R2x `boundary_hold` | ln ratio at 0.6 (or 0.3) held | Separately labelled extrapolation sensitivity; equals R1 outside range |
| R3 `flat` | 1 | Equal response for equal nominal whey protein: the no-form-effect / no-change baseline |
| R4 `log_mean_three` | exp(mean of the three ln ratios) = 0.99803 | Dose-free family reference |
| S1 `soy_family_sensitivity` | Same as R1/R2, using the soy cohort SPH/SPI ratios (0.78053, 0.73876, 0.89056) | Cross-source sensitivity only; not a WPH family reference |

## Target endpoints (kept separate; never pooled)

- **T1 (primary):** 2-h signed area of group mean insulin curves, baseline-subtracted at the group level (mean − mean at t0), trapezoid over 0–120 min. Read from the original published or repository figure using source geometry (vector if available, otherwise raster with a declared reading half-width). This is the area of the group mean curve, *not* the mean of individual areas. If no 2-h curve with source geometry is accessible, T1 is UNAVAILABLE, not failed.
- **T2 (secondary):** the paper's own 3-h insulin area or ratio from table or prose, recording whether it is total or incremental, the window, the operator and whether it is paired. The WPH/WPI ratio is computed from the printed values.
- **T3 (secondary, if printed):** peak insulin ratio, recorded only and not scored as an area.

## Scoring

- **Error:** |ln(pred/obs)| per endpoint per rule. No averaging across T1 and T2.
- **Recorded per endpoint:** the source-reported significance of WPH vs WPI and its direction.
- **Coverage:** count of available predictions per rule. Abstentions are reported, not scored as failures.
- **Uncertainty:**
  - training ratios inherit Claessens' graph-reading range (±10 units per bar), and the min/max is reported;
  - target figure-reading bounds are reported as declared;
  - there is no paired covariance in either study, so no CI on error differences.

## Transfer caveats fixed now

The two studies differ in:

- laboratory, assay, population, BW and sex mix;
- drink volume and vehicle, and the WPI/WPH products themselves (degree of hydrolysis);
- windows: 2 h vs 3 h;
- sampling grid;
- operator: signed vs incremental/total.

The claim is limited to whether a whey form ratio learned in one laboratory transports as a *relative* reference. No mechanism and no consumer rule.
