# Fixed vs fraction-scaled starch-specific lentil substitution: f = 1 transfer test — frozen plan v1

Owner and implementer: Opus 5.5 (`claude-opus-5-5`; identity per coordinator receipts). Written before inspecting any new target insulin outcome.

The only inputs read before freezing are `previous.md` and `donor.json` (Moravek 2018, doi 10.1093/jn/nxy018, Tables 3–4). Astra is acquiring targets independently; none had been seen.

## Donor (frozen; no new fitting)

- **Data:** Moravek 2018 geometric-mean capillary plasma insulin iAUC, 0–120 min, nmol·min/L.
  - Rice: control 10.9; large green 10.4; small green 9.7; split red 10.0.
  - Potato: control 19.9; large green 13.1; small green 12.8; split red 12.3.
- **Exchange:** 25 g available carbohydrate from lentils within 50 g total, so donor exchange fraction f₀ = 0.5.
- **Starch-specific reference** (as in the accepted prior work: small green and split red only):
  - r_rice = √(9.7·10.0)/10.9 = 0.90357;
  - r_potato = √(12.8·12.3)/19.9 = 0.63054.
- **Colour-matched sensitivity:**

| | Small green | Split red | Large green |
|---|---:|---:|---:|
| Rice | 9.7/10.9 | 10.0/10.9 | 10.4/10.9 (an extra lentil type, not in the primary) |
| Potato | 12.8/19.9 | 12.3/19.9 | 13.1/19.9 |

- **Pooled reference:** geometric mean of the four primary donor ratios, r_pool = √(r_rice·r_potato) = 0.75481.

## Exchange fraction of a target

f = (available carbohydrate supplied by the pulse in the test meal) / (available carbohydrate of the control meal), computed from the target's own printed composition.

- **Primary:** f = 1 is a full exchange (pulse supplies all of the control's available carbohydrate).
- **Other values:** any other printed f is admitted and scored separately.
- **Extrapolation:** f > 1 is outside support and labelled as such.

## Frozen forecast rules (ratio test/control)

| Rule | Formula | f = 1, rice | f = 1, potato |
|---|---|---:|---:|
| `equality` | 1 | 1 | 1 |
| `carbohydrate` | test available CHO / control available CHO (printed) | target-specific (≈ 1 when matched) | — |
| `fixed_starch` | r_s (independent of f) | 0.90357 | 0.63054 |
| `scaled_starch` | r_s^(2f) (log-linear in exchange share) | 0.81644 | 0.39758 |
| `fixed_pooled` | r_pool | 0.75481 | 0.75481 |
| `scaled_pooled` | r_pool^(2f) | 0.56974 | 0.56974 |
| `linear_starch` (**new distinct candidate**) | max(0, 1 − 2f(1 − r_s)), i.e. linear rather than log-linear in exchange share | 0.80714 | 0.26108 |
| `fixed_colour` / `scaled_colour` (sensitivity) | colour-matched ratio, fixed or ^(2f) | when the target lentil colour is small green, split red or large green | |

**Pairwise thresholds** at f = 1 (scaled beats fixed iff obs < geometric midpoint):

| | Rice | Potato |
|---|---:|---:|
| Geometric midpoint, fixed vs scaled | 0.85889 | 0.50068 |
| Log separation, fixed vs scaled | 0.101 | **0.461** |
| Geometric midpoint, scaled vs linear | 0.81178 | 0.32218 |

The **strongest discriminator is a potato-displacing full exchange**. Rice targets separate the rules only weakly.

## Coverage (declared before targets)

| Target | Starch-specific rules | Pooled, equality, carbohydrate |
|---|---|---|
| Displaced starch rice or potato, pulse = lentil (any colour) | **covered** | covered |
| Other displaced starch (bread, pasta, glucose drink, …) | **abstain** (no donor for that starch) | covered |
| Pulse not a lentil (beans, chickpea, pea) | **abstain from primary**; scored only in a labelled "pulse extension" panel | — |

Mixed dishes count only if f is computable from printed available carbohydrate. Otherwise all exchange-scaled rules abstain, and only equality and the fixed rules are scored.

## Endpoint admission and operator compatibility

- **Primary panel (compatible):** target lentil/control ratio of **geometric-mean** insulin iAUC over 0–120 min, on the donor's operator.
- **Secondary panels** (scored separately and never pooled with primary):
  - (b) ratio of arithmetic mean iAUCs;
  - (c) mean of within-participant ratios or insulin index;
  - (d) other windows (e.g. 0–180).
- **No conversion.** No geometric mean or within-participant ratio is inferred from incompatible arm summaries, so a target reporting only arithmetic means is never converted to GM.
- **Sensitivity statement only.** Under equal arm log-SDs, AM and GM ratios coincide. Unequal dispersion shifts the AM ratio by exp((σ_t² − σ_c²)/2), unknown. Operator-mismatch panels carry this as an unquantified caveat and are not adjusted.
- **Clipping.** Positive clipping of iAUC is recorded as stated or "unspecified". The donor's clipping is unspecified.
- **Assay and population** differences are recorded.

## Metrics

- |ln(pred/obs)| per target and rule; the mean per panel only over rules with complete coverage of that panel. Coverage counts are reported per rule.
- **Discrimination:** for the fixed vs scaled starch pair, record whether obs lies beyond the geometric midpoint and the margin in log units.
- **Uncertainty:**
  - If target CIs or SEMs for each arm are printed, report the zero-correlation log-SE scenario (labelled, not a paired CI).
  - If a paired CI of the ratio is printed, use it to report whether each rule's prediction lies inside it.
  - Donor uncertainty is unavailable (only GM point values are supplied), and that is stated.
- **Native areas:** no native forecast. The donor's native scale is a different assay, ALPCO vs others.

## Why this might fail (stated in advance)

- **Recipe, matrix and preparation.** Lentil type, cooking, mixed-dish composition and the absence of other control ingredients differ from Moravek's plain meals. f = 1 meals often remove all starch.
- **Shape of the response to exchange share.** The log-linear assumption is unvalidated. Insulin reductions may saturate, so the response is not log-linear at full exchange. The linear candidate tests one alternative direction.
- **Shared origin.** Most candidate targets come from the same research unit or pulse programme (shared authors and assays), so transfer is not independent.
- **Operator heterogeneity.** GM vs AM vs index summaries; clipping unspecified.
- **Donor centrality.** The rice donor already overpredicted later ratios, so a central-estimate bias may dominate any shape test.
