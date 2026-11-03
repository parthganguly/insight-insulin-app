# Same-source dose-shape bridge between intact and hydrolysed protein — frozen spec v1

Owner and implementer: Opus 5.5 (`claude-opus-5-5`). Written before viewing any chapter 3 figure or Results text.

## Source

Claessens M, Saris WHM, van Baak MA. "Glucagon and insulin responses after ingestion of different amounts of intact and hydrolysed proteins." Br J Nutr 2007, DOI 10.1017/S0007114507886314. Used here as thesis chapter 3 (author's thesis, Maastricht). The published article is not verified here; agreement between the thesis and journal versions is an open check.

## What was read before freezing

The chapter 3 title, abstract, introduction and Subjects and Methods (Table 3.1 molecular weight, Table 3.2 amino acids), plus the Figure 3.1 caption.

**Abstract exposure:**

- "SPI induced a higher total AUC for insulin … than SPH while no difference between WPI and WPH was found";
- insulin "increased with increasing protein load" for all four products.

The qualitative soy form difference, the whey null and the dose direction are therefore known. No numeric outcome had been seen.

## Design facts

- **Cohorts:** two separate cohorts of 12 healthy non-obese men.
  - Soy cohort: 72.2 ± 2.8 kg; received SPI and SPH.
  - Whey cohort: 79.8 ± 2.6 kg; received WPI and WPH.
  - Each cohort took all 6 drinks (2 forms × 0.3/0.4/0.6 g/kg BW) in Latin-square order, single-blind, ≥ 2 d apart.
- **Shared participants:** forms and doses within a source share participants. **Sources do not.**
- **Drinks:** protein only, about 250 mL, aspartame and citric acid to pH 3.3–3.5, flavoured (soy vanilla, whey chocolate). **No carbohydrate and no control or water arm.** Consumed within 5 min after a ≥ 10 h fast.
- **Sampling:** t = 0 before drinking, then 15, 30, 60, 90 and 120 min *after finishing*.
- **Endpoint:** insulin "total AUC (AUC above – AUC below baseline)", the signed net area over 0–120 min. Insulin RIA (LINCO human-specific). Means ± SEM, n = 12.
  - This is **not** positive area, and the protocol is protein alone, not a meal with carbohydrate.
  - Figure 3.1A (soy) and 3.1B (whey) show the bars.
- **Composition:** Table 3.2 gives **one** amino-acid profile per source (% of dry product), not separate intact/hydrolysate profiles. Table 3.1 gives hydrolysate molecular-weight fractions.
  - Any composition rule therefore predicts **form ratio = 1** within a source, identical to "no form adjustment".

## Question

A same-source **dose-shape bridge** calibrates the target form at its lowest dose and transfers the *other form's* dimensionless dose ratios. Does it predict the target form's larger-dose responses better than:

- assuming no change with dose;
- proportional dose;
- copying the other form's level (no form adjustment)?

## Notation

R[s,f,d] is the group-mean total insulin AUC for source s ∈ {soy, whey}, form f ∈ {intact, hydro}, dose d ∈ {0.3, 0.4, 0.6}, read in the figure's native units. f' is the other form and s' the other source.

## Frozen rules (primary: calibrate at d0 = 0.3; predict d = 0.4 and 0.6)

| Rule | Prediction for R[s,f,d] | Uses measured |
|---|---|---|
| `bridge_same_source` | R[s,f,0.3] · R[s,f',d]/R[s,f',0.3] | target at 0.3, other form at 0.3 and d |
| `no_change` | R[s,f,0.3] | target at 0.3 |
| `proportional_dose` | R[s,f,0.3] · d/0.3 | target at 0.3 |
| `no_form_adjustment` | R[s,f',d] | other form at d (level borrowing) |
| `bridge_cross_source` (sensitivity: is "same source" needed?) | R[s,f,0.3] · R[s',f,d]/R[s',f,0.3] | target at 0.3, same form in the *other cohort* |

There are 4 target arms × 2 doses = 8 cells. Each bridge reciprocal (intact→hydro and hydro→intact) is included.

**Sensitivity S1 (reverse calibration):** calibrate at 0.6 and predict 0.3 and 0.4. The rules are analogous; proportional dose uses d/0.6.

## Objectives (kept separate)

- **O1, levels:** |ln(pred/obs)| per cell; mean over 8 cells, and per source (4 cells each).
- **O2, form contrast at 0.4 and 0.6:** R[s,intact,d]/R[s,hydro,d], 2 sources × 2 doses.
  - **Algebraic note, frozen now:** bridge and proportional dose both predict this ratio = the 0.3 ratio. No-form-adjustment predicts 1, and no-change predicts R[s,intact,0.3]/R[s,hydro,0.3].
  - O2 therefore cannot separate the bridge from proportional dose. The bridge's information lies in dose shape (O1).
- **O3, dimensionless shape:** R[s,f,d]/R[s,f,0.3] predicted by the other form's shape, the other source's shape, 1 (no change) and d/0.3. This is equivalent to O1 except for no-form-adjustment.
- **Abstention:** any cell whose required bars are ≤ 0 is UNAVAILABLE for log scoring (net area can be negative). It is reported with signed values, not dropped silently.

## Reading and uncertainty

- **One reading:** single human visual reading of bar tops (not SEM tips) from the thesis PDF page images, with axis ticks as printed. A declared reading half-width h is chosen from axis resolution **before** errors are computed.
- **Reading-scenario set:** every bar at {−h, 0, +h} independently (3¹² scenarios). Ranges of O1 means and of mean-error differences (bridge − each competitor) are reported. These are graph-reading ranges only.
- **Statistics:** SEMs, where legible, and the source's significance symbols are transcribed. There is no paired covariance, so no CI on error differences.
- **Cross-source shape transfer** crosses independent cohorts (different participants, body mass and absolute grams: soy about 21.7/28.9/43.3 g, whey about 23.9/31.9/47.9 g at mean BW).

## Boundaries

Development evidence on exposed qualitative findings; no fitting to evaluation cells. No mechanism (peptide absorption, gastric emptying) is inferred. Not native positive 0–120 min with carbohydrate. No consumer rule.
