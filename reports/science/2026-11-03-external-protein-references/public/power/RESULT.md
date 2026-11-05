# Outside-lab transfer of the Claessens whey form ratio to Power 2009: limited by access, and the family reference carries little

Owner and implementer: Opus 5.5 (`claude-opus-5-5`).

**Order of work:**
1. `SPEC.md` and `transfer.py` were frozen (`FREEZE_RECEIPT.json`, 06:22 UTC) before any Power 2009 text was opened in this session.
2. The frozen `PREDICTIONS.json`/`RESULTS.json` are kept unchanged. Their `--check` passes, and the frozen hashes still match.
3. `addendum.py` → `ADDENDUM.json` is a labelled, post-exposure, spec-faithful completion.

## Source access (what was actually available)

- **Power O, Hallihan A, Jakeman P.** [Amino Acids 2009;37:333–339](https://doi.org/10.1007/s00726-008-0156-0), [PubMed 18679613](https://pubmed.ncbi.nlm.nih.gov/18679613/), [Limerick record](https://pure.ul.ie/en/publications/human-insulinotropic-response-to-oral-ingestion-of-native-and-hyd/).
- **Full text: closed.**
  - OpenAlex reports `oa_status: closed` with no repository full text.
  - The Limerick research-repository search did not find it. One search-result "bitstream" was a different paper (Nongonierma et al., in vitro); it was downloaded by mistake and deleted.
  - The Springer PDF route returned an HTML page, not the article.
- **Unavailable:** participant body mass, the 2-h curves, the 3-h table, product and hydrolysis details, AUC operator and window, dispersion label, and crossover vs parallel design.
- **What was read:** only the PubMed abstract.
- **Exposure, before any scoring:** WPH > WPI for peak insulin (+28%, P = 0.018) and for insulin AUC (10.8 (2.6) vs 7.6 (0.9), printed unit "nM", +43%, P = 0.21). Gastric emptying did not differ.

## Training reference (unchanged)

Claessens whey cohort (n = 12, 79.8 kg, protein only, signed 2-h area), WPH/WPI ratios:

| Dose (g/kg) | WPH/WPI |
|---|---:|
| 0.3 | 1.359 |
| 0.4 | 0.802 |
| 0.6 | 0.923 |

- The form effect was not significant in the source.
- **Correction to SPEC:** the stated log-mean of the three, 0.99803, was a hand-arithmetic error. The code, which governs, gives **1.00186**.

## What was scored

| Endpoint | Status |
|---|---|
| T1, 2-h signed area of group curves (primary) | **UNAVAILABLE.** No accessible original figure. Not a failure. |
| T2, abstract insulin AUC ratio, 10.8/7.6 = **1.421** (rounding range 1.405–1.437) | Window, operator (total vs incremental), dispersion label and pairing unknown. The task brief's 3-h window is not confirmed from the accessible text. |
| T3, Cmax ratio 299/234 = 1.278 | Recorded only, not scored. |

**Frozen code result:** `transfer.py` abstained on *every* rule because body mass is missing. SPEC abstains only the dose-mapped R1/R2. This code–spec mismatch is recorded, and the frozen output is kept.

**Addendum (spec-faithful, post-exposure):**

| Rule | Prediction | |ln(pred/obs)| vs 1.421 |
|---|---:|---:|
| R3 flat (equal response) | 1.000 | 0.351 |
| R4 log-mean of three whey doses | 1.002 | 0.350 |
| R1 nearest dose, **conditional** on body mass < 90 kg (x > 0.5 → 0.6 g/kg) | 0.923 | 0.432 |
| R2 interpolation, conditional on 75–112.5 kg | 0.80–0.92 | 0.43–0.57 |
| S1 soy-family sensitivity (R1, < 90 kg) | 0.891 | 0.467 |

- The body-mass table is **conditional, not imputed**. Below 75 kg the 0.6 g/kg value is an extrapolation hold.
- At equidistance (90 kg) the code picks 0.4 g/kg by its tie-break.
- 45 g in men of about 80 kg is close to Claessens' 0.6 g/kg cell (about 47.9 g at 79.8 kg), so R1 = 0.923 is the best-matched cell *if* body mass is similar.

## What a WPH family reference can actually transfer

1. **No reliable form direction.** In training, the WPH/WPI ratio reverses across adjacent doses (1.36 → 0.80 → 0.92), and the source found no form effect. At the external target the abstract's AUC ratio is 1.42, also non-significant (P = 0.21). On the only scorable endpoint, every dose-mapped whey reference is *further* from the target point than equal response. The dose-free references tie with equal response.
2. **The defensible transferable content** is "no established form effect on insulin area". That is the flat baseline, which equal response already encodes. A dose-specific form multiplier is not supported. Within-study training instability argues against using any single dose cell as a form multiplier.
3. **Peak vs area.** The external peak difference *was* reported significant (Cmax +28%). Area and peak are different estimands. A form effect on peak timing and height may not appear in area, so the training's area-based reference cannot speak to Cmax.

## Challenge and uncertainty

- **One abstract-level ratio** with unknown window, operator and pairing cannot discriminate references differing by about 0.08 log.
  - If the parentheses are SEM (n = 16), an unpaired log scale for the ratio is about 0.27. If they are SD, it is about 0.07.
  - WPH dispersion is about 3× WPI's, so the ratio of means is fragile.
- **Different populations and protocols:** different lab, assay, volume (500 vs about 250 mL), products, window (2 h vs probably 3 h) and probably operator (signed vs unknown).
- **Not tested:** the primary comparison (T1). Coverage of every dose-mapped rule depends on body mass, which is unavailable.

## Next step (access, not modelling)

T1 and a confirmed T2 definition require the full text through legitimate access, which is a coordinator or owner-side library route. No contact was made. With the full text:

1. admit body mass, the window and operator, and the figure geometry;
2. rerun `transfer.py predict` on a new target file and score T1;
3. keep this abstract-level result as a separate exposed record.

**More informative still:** an external study with ≥ 2 whey doses per form would test whether *any* dose-specific form ratio transfers, beyond the flat reference.
