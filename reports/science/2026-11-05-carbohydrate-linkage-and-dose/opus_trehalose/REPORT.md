# Trehalose vs glucose: two-hour insulin-area transfer test (corrected)

Author: Opus 5.5 (`claude-opus-5-5`), 2026-11-05. Implements `../TREHALOSE_PLAN.md`, which still matches its freeze receipt. Stdlib Python, nothing fitted. This version supersedes the earlier draft, which the coordinator keeps locally.

**Verdict.** For both central ratio estimators and the stated mass and rounding sensitivities, the order by error is the same: Johansen (0.420) < Holub scalar < Holub-120 < equality < complete hydrolysis. Every forecast predicts a smaller reduction than observed, including both trehalose estimands. Johansen beats equality across the whole conditional interval. Johansen versus the Holub scalar is **not resolved**.

## Corrections from the draft

1. **Two estimands, scored separately.** The Discussion reports the *mean of individual* insulin IAUC ratios as **36%**. This is distinct from Table 1's ratio of means, 590/1709 = 0.3452. The draft wrongly called it unavailable.
2. **Exclusions.** Two participants were withdrawn with osmotic diarrhoea after trehalose, and the outcomes of all four excluded participants are unreported. Their effect on either ratio has **unknown direction**; I withdraw the draft's "plausibly upward".
3. **The 0–180 group-curve figure** is a descriptive sensitivity only, not an outcome.
4. **Levels.** A literal hour unit is incompatible with the data. Reading the area in minutes (μIU·min/mL) is still **conditional**, because it is not printed.
5. **Serving mass.** The sensitivity now uses the actual serving, 28 g of >98% trehalose dihydrate, instead of a "25 g dihydrate" arm.
6. **Portable, read-only replay.** The default `--check` needs only `trehalose.py`, `inputs.json`, `RESULTS.json`, the plan and its receipt. It writes nothing. It compares numbers within a tight tolerance and strings modulo CRLF, and it accepts the plan hash on raw or LF-normalised bytes. Original assets are audited only with `--sources DIRECTORY`; a missing or altered file there is a FAIL, never a skip.

## Source facts

All from [Yoshizane et al., *Nutr J* 2017;16:9](https://doi.org/10.1186/s12937-017-0233-x) ([PMC5292800](https://pmc.ncbi.nlm.nih.gov/articles/PMC5292800/)):

- **Design:** crossover. 24 recruited, 20 analysed. Exclusions: 1 anaemic, 2 osmotic diarrhoea after trehalose, 1 high fasting insulin.
- **Doses:** "25 g of trehalose (i.e., 28 g of TREHA)" against 25 g anhydrous glucose, each in 100 mL water.
- **Measurement:** venous serum insulin by chemiluminescent enzyme immunoassay (CLEIA), sampled 0–180 min. IAUC ignores area below each person's fasting value.
- **Table 1 IAUC 0–2 h:** glucose **1709 ± 142**, trehalose **590 ± 101** (mean ± SE, n = 20). Paired t-test, p < 0.01.

## Scores (|ln(pred/obs)|)

| Frozen forecast | Ratio | vs ratio of means 0.3452 | vs mean individual ratio 0.36 (rounding 0.355–0.365) |
|---|---:|---:|---:|
| Johansen 33 g polymer | 0.420 | **0.196** | **0.154** (0.140–0.168) |
| Holub whole-trajectory scalar | 0.521 | 0.411 | 0.369 (0.355–0.383) |
| Holub whole-120 ratio | 0.655 | 0.640 | 0.598 |
| Equality (nominal grams) | 1 | 1.064 | 1.022 |
| Complete hydrolysis, stated 25 g anhydrous → 26.32 g glucose | 1.053 | 1.115 | 1.073 |

**Serving-mass sensitivity.** 28 g TREHA at 98–100% dihydrate contains 24.83–25.33 g anhydrous trehalose. Under complete hydrolysis that would yield 26.13–26.67 g glucose, a hydrolysis ratio of 1.045–1.067. Errors become 1.108–1.128 against the ratio of means and 1.066–1.086 against the mean of individual ratios. The ranking is unchanged. These glucose yields are conditional on complete hydrolysis and absorption.

## Uncertainty and decision boundaries (ratio of means only)

The paired covariance is not reported. The table below gives Fieller 95% intervals using t₁₉ = 2.093, conditional on the printed SEMs:

| Assumed ρ | Interval | Forecasts inside |
|---|---|---|
| +1 | 0.268–0.400 | **none** |
| 0 | 0.216–0.496 | Johansen |
| −1 (widest; contains the others) | **0.1887–0.5676** | Johansen, Holub scalar |

- **Johansen vs equality.** They tie at an observed ratio of 0.648, which is above every interval. Johansen is closer than equality throughout.
- **Johansen vs Holub scalar.** They tie at 0.468, which is inside the ρ = 0 and ρ = −1 intervals. Their order is therefore not established. It would be only if the arms were strongly positively correlated; the paired correlation is unreported.
- **The paired test says nothing about ρ.** Even at ρ = −1 the SE of the difference (243) stays below the 391 limit for p < 0.01, so the reported test is compatible with any correlation.
- **The mean of individual ratios has no reported dispersion,** so it gets no interval; only its rounding range is shown.
- **What the win means.** Any reference between 0.284 and 0.420 would have scored at least as well as Johansen. Johansen wins because it is the most extreme frozen reference, not because it has been shown to be the right one.

## Challenges

- **Lee level anchor: a partly cancelling miss.** Lee's 25 g glucose area is 8.1 nmol·min/L, from plasma in a different cohort.
  - At 6.0 pmol per μIU this becomes 1,350, against the observed 1,709 (−0.236 log).
  - Johansen's ratio over-predicts by +0.196 log.
  - The two misses largely cancel: 0.42 × 1,350 = 567 against 590 (−0.040 log).
  - At 6.945 the anchor miss grows to −0.382. Johansen's level miss becomes −0.186, and the **Holub scalar now lands closest (+0.029)**.
  - Which forecast "hits" the level is set by an unstated conversion convention. Level agreement cannot discriminate between the hypotheses, and no absolute-level claim follows.
- **Figure check (descriptive).** My approximate visual reading of Fig. 1 group means gives positive 0–120 areas of 1,680 / 559 (ratio 0.333), matching Table 1 within reading error. The 0–180 sensitivity gives 0.342.
- **Not scored:** Cmax ratio 0.407; incremental Cmax ratio 0.328; Tmax 36 vs 39 min.
- **Insulin index.** This is not a Holt insulin index, which uses isoenergetic portions and a reference food. The 36% mean of individual ratios is the closest analogue, but it compares equal stated masses.
- **Scope.** One matched 25 g portion, so no dose response is inferred. Healthy lean Japanese adults. Substrates differ across all references, so no mechanism or trehalose coefficient is claimed.

## Prior interpretations (unchanged from the draft)

- **"Johansen 0.420 → 0.450":** correct, but it is a within-cohort comparison of author-adjusted values, and the BMI subgroups show opposite dose directions.
- **"c = 0.521 succeeds in type 2 diabetes":** correct for one cell (error 0.0024). The same scalar misses elsewhere, including here.
- **The two other claims** were not verified.

## Commands and verdicts (`EXECUTION.json`)

| UTC | Command | Result |
|---|---|---|
| 09:49:39, 09:49:47 | draft `run` (earlier) | superseded |
| 09:49:39, 09:49:48 | draft `--check` | PASS; that draft check wrote to the log, which the fix removes |
| 09:54:11 | `trehalose.py run` | corrected run; output text edited afterwards |
| 09:54:49 | `trehalose.py run` | **final RESULTS.json** |
| 09:54:50 | `trehalose.py --check --sources source_download --record` | **PASS**; PMC5292800.xml MATCH, Fig1.png MATCH |
| 09:54:50 | `portable_test.py --record` | **PASS**: default `--check` in a temp tree without sources, both as stored and with CRLF line endings; files unchanged |
| 09:55:00 | `trehalose.py --check --sources nonexistent_dir_negative_test --record` | **FAIL as intended** (both files MISSING; exit 1) |

**Open item for the coordinator.** The original XML and figure still sit in `source_download/` inside this folder, because I can write only here. They are not needed for the default replay, but they must be removed or excluded before publication. Audit them from wherever they end up with `--check --sources DIR`.
