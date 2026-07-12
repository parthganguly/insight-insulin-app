# FII Dataset & Scientific-Validation Workplan

**Date:** 2026-07-12
**Author:** Fable 5 primary agent (issue #93, workstream H)
**Status:** Research and execution plan only. **No dataset was imported or
changed.** `backend/fii_foods.csv` is byte-identical to the audited commit,
and no measured FII value was copied into any live path by this document.

**Verification note.** An earlier draft of this file was written immediately
before a model-safeguard switch away from Fable. It was then re-verified
end-to-end in a fresh Fable session before being committed: the dataset table,
alias groups, and decomposition weights were re-read directly from
`backend/fii_foods.csv` and `backend/food_normalizer.py`, and every scientific
statement was re-checked against the certified audit. Three unsourced
biological claims in that draft (that rice varieties, milk fat variants, and
yogurt variants have materially different measured insulin responses) were
**removed** and replaced with the provenance argument that actually holds —
one unmeasured placeholder cannot support an alias group — with the empirical
question explicitly marked EXTERNAL VALIDATION REQUIRED. No claim in this file
rests on a source that was not verified by the audit.

This plan is the bridge between the certified audit's finding that INSIGHT's
scoring rests on ten placeholder rows and the point at which the scoring
model could be called *validated* rather than merely *implemented*. It
defines what a real dataset must contain, how to extract it defensibly, which
foods to do first, how to validate the model in phases, what may be claimed
at each phase, and when to stop.

Nothing here authorizes a dataset change, a formula change, a calibration, or
a stronger product claim. Each of those remains a separately approved change
with its own before/after evidence and independent review.

---

## 1. Current dataset truth

`backend/fii_foods.csv` — **10 rows, every one `source = starter_placeholder`.**
Columns: `food_name, fii, aliases, source, confidence`.

| food_name | fii | confidence | aliases (as shipped) |
|---|---:|---:|---|
| white bread | 100 | 0.70 | bread loaf, sandwich bread, white loaf |
| rice | 79 | 0.70 | white rice, basmati rice, brown rice, jasmine rice, cooked rice |
| banana | 59 | 0.75 | ripe banana |
| yogurt | 60 | 0.70 | greek yogurt, plain yogurt, curd |
| milk | 24 | 0.70 | whole milk, skim milk, low fat milk |
| egg | 31 | 0.70 | eggs, boiled egg, fried egg |
| beef | 51 | 0.65 | steak, ground beef, beef steak, red meat |
| potato | 121 | 0.65 | boiled potato, baked potato |
| lentils | 58 | 0.65 | dal, cooked lentils |
| oats | 60 | 0.70 | oatmeal, rolled oats |

**Placeholder-source status.** Every `fii` number is hand-entered with a
`starter_placeholder` provenance tag and a hand-set `confidence` that is not
tied to any measurement variance. None traces to a cited study. The values
are plausible relative to the literature's white-bread=100 convention, but
plausibility is not measurement — no downstream calibration or comparison can
be meaningful until these are replaced with provenanced values.

**Alias overreach.** The problem here is **provenance, not a claim about
biology**: each alias group inherits a *single, unmeasured placeholder
number*, so the alias asserts equivalence that no measurement in this
repository supports. That is true regardless of whether the foods turn out to
differ. Concretely, one placeholder number is currently shared across:
- `rice` (79) → `brown rice`, `basmati rice`, `jasmine rice`, `white rice`,
  `cooked rice` — distinct foods folded into one placeholder.
- `milk` (24) → `whole milk`, `skim milk`, `low fat milk` — variants that
  differ in fat content, folded into one placeholder.
- `yogurt` (60) → `greek yogurt`, `plain yogurt`, `curd` — variants that
  differ in composition, folded into one placeholder.
- `beef` (51) → `steak`, `ground beef`, `beef steak`, `red meat` — a whole
  category folded into one placeholder.

**Whether any of these variants actually differ in measured FII is an open
empirical question this repository cannot answer, and this plan does not
assert an answer: EXTERNAL VALIDATION REQUIRED.** It is worth checking during
extraction (§3) because the FII literature holds that insulin response is not
determined by carbohydrate alone and that fat and protein contribute — and
Bao 2009 reports fat was *inversely* related to insulin response in composite
meals (audit-confirmed from the abstract; the primary PDF was not read) — but
that is a reason to *measure* the variants, not a finding that they differ.

These aliases are therefore defensible only as UX conveniences, never as
evidence. The token-subset matcher can also map unmeasured phrases onto them,
so a `mapped_fii` label on such a match is a naming convenience, not a
measurement.

**Components referenced by decomposition but absent from the dataset.**
`backend/food_normalizer.py` decomposes dishes into components the CSV does
not contain, so those components silently contribute **zero** and the dish is
scored on its covered fraction only (audit §10, verified):
- `chicken` — referenced by chicken biryani (0.25) and rice-and-chicken
  (0.35); **no row.**
- `oil` — referenced by chicken biryani (0.15); **no row.**
- `fish` — in the generic token map; **no row.**
- `beans` — in the generic token map (maps to `beans`); **no row.**
So chicken biryani scores as ~60% rice and nothing else, rice-and-chicken as
~65% rice, each still labelled `mapped_fii` with no disclosure of the dropped
mass. **Rule of the workplan: never ship a decomposition target that is not
in the dataset** (see §4).

---

## 2. Provenance schema for a future live dataset

A replacement dataset must carry, per food, at least the following fields.
This is a schema proposal for a future approved dataset-versioning change —
**not** a change to the current CSV shape.

| Field | Meaning |
|---|---|
| `canonical_food_name` | Single canonical name; aliases are separate and never inherit evidence. |
| `measured_fii` | The measured Food Insulin Index value. |
| `reference_food` | The study's reference (usually white bread = 100) and its protocol. |
| `energy_portion` | Iso-energetic portion used (e.g. 1000 kJ / ~240 kcal). |
| `insulin_measurement_window` | iAUC window (e.g. 0–120 min) and assay. |
| `population` | Cohort (healthy / T2D / lean / mixed), age, region. |
| `sample_size` | n subjects for that food. |
| `variance` / `uncertainty` | SD or SEM of the measured FII, or CI. |
| `source_id` | DOI / PMID / full citation. |
| `evidence_class` | `measured` \| `mapped` \| `inferred` — never blend these. |
| `dataset_version` | Version of the dataset this row belongs to. |
| `reviewer` | The second person who verified the transcription (§3). |

`evidence_class` is load-bearing: a `mapped` or `inferred` row must never be
presented to a user (or a validation comparison) as if it were `measured`.

---

## 3. Extraction protocol

1. **Two-person verification.** Every transcribed value is entered by one
   person and independently checked against the primary source by a second.
   The `reviewer` field records the checker. No single-person entries.
2. **Primary sources only.** Values come from the original peer-reviewed
   human study's table, cited to page/table. **No blogs, no commercial
   nutrition databases, no aggregator "FII lists".**
3. **Unit normalization.** Confirm the reference food and portion basis
   (white bread = 100, iso-energetic ~1000 kJ) and normalize before entry;
   record the original units in the source note.
4. **Duplicate and alias resolution.** One canonical row per measured food;
   aliases are explicit and evidence-free. If two studies measure the same
   food, record both and reconcile with documented rationale, not averaging
   by default.
5. **Uncertainty flags.** Record the study's variance; where a food is only
   `mapped` or `inferred`, flag it and keep it off any "measured" claim.

---

## 4. Priority-food strategy

Replace placeholders for **5–15 foods** selected by (a) product relevance —
foods that actually dominate logged meals and the demo set — and (b)
availability of measured human FII evidence.

**No food named below is asserted to have measured FII evidence.** This is a
*search list*, not an evidence list: each candidate enters the dataset only if
a primary human study measuring it is found and passes §3. Any candidate for
which no primary measurement is found stays out — it is not back-filled with
an estimate. **EXTERNAL VALIDATION REQUIRED for every row.**

Candidate first tranche (search order, product-relevance ranked):

- The staples the demo meals already lean on: white bread (the reference food
  in the FII protocol), rice, egg, plain yogurt, milk, oats, potato, banana,
  lentils, beef.
- The decomposition-referenced gaps that currently contribute zero load:
  **chicken, oil, fish, beans** — for each, either add a measured row **or
  remove the decomposition rule that references it**, so no dish is ever
  scored on a partial component set. Removing the rule is the default if no
  measurement is found; it is always preferable to a fabricated value.

**Indian / GCC relevance.** Include region-relevant foods only where measured
human FII evidence exists. **Do not invent FII values for cuisine coverage.**
If a culturally important dish has no measured components, it stays out of the
dataset (and its decomposition rule is removed) rather than being faked.

Exit for this step: every food on any live scoring path is either `measured`
with provenance or explicitly surfaced as an estimate; no `starter_placeholder`
row remains; no decomposition target lacks a dataset row.

---

## 5. Validation phases

Each phase gates the next; a green result in one does not imply the others.
Implementation parity (the existing Rust golden fixtures) is **not** in this
ladder — it proves Rust reproduces Python, never that the model is correct.

1. **Internal sensitivity analysis.** With a provenanced dataset, quantify
   how acute and trend outputs move under plausible portion error and under
   each food's measured FII uncertainty (§2 variance). Output: sensitivity
   ranges per output, so a score can be reported with an honest band.
2. **Portion-error analysis.** Because energy scaling drives item load,
   characterize how mis-estimated portions (the AI/manual entry's largest
   error source) propagate to the score.
3. **Fallback ablation.** Turn each fallback (mapped, macro, decomposition,
   terminal unknown) off in turn and measure how outputs and estimate-quality
   labels shift — to know how much of a typical score rests on heuristics
   versus measured data.
4. **Held-out food comparison.** Withhold measured foods, predict them via
   mapping/decomposition, and compare against their measured values; report
   rank correlation and calibration error on the held-out set.
5. **Mixed-meal retrospective comparison.** Compare INSIGHT's mixed-meal
   *rankings* against independent published composite-meal insulin data
   (e.g. Bao 2009-style datasets) on held-out meals; report rank correlation
   and expected shrinkage — the direction reported in that literature is that
   FII over-predicts the *spread* of mixed-meal responses, though the exact
   predicted-spread multiple is **EXTERNAL VALIDATION REQUIRED** (§8).
6. **Prospective human validation — only after 1–5 pass.** Standardized
   mixed-meal protocol, insulin iAUC endpoints, repeatability, relevant
   populations including the target market and impaired-glucose subjects,
   IRB/ethics oversight, pre-registration, and a pre-specified statistical
   analysis plan. **Do not name a sample size without a power analysis
   derived from the effect size and variance observed in phase 5.**

---

## 6. Claim ladder

Wording is gated to the evidence actually in hand.

- **Now (placeholder data, uncalibrated reference):** "a descriptive,
  relative meal-insulin-demand estimator; the score uses an internal,
  not-yet-calibrated reference of 100; not validated; not a personal or
  medical prediction." (This is what the app now says after workstream A.)
- **After retrospective comparison (phase 5):** "ranks meals by expected
  population-level insulin demand, consistent with published FII data, with
  known over-prediction of mixed-meal spread" — only if the pre-registered
  ranking target is met on held-out data.
- **After prospective validation (phase 6):** "population-level meal
  insulin-demand estimate validated against measured insulin responses in
  [named population]" — bounded to that population.
- **Never without much stronger, personalized, regulated evidence:** personal
  insulin/glucose prediction, insulin-resistance assessment, diagnosis,
  dosing, or any clinical/treatment use.

---

## 7. Stop criteria

Pause, pivot, or discontinue the insulin-demand product if:

- measured human FII evidence for the priority foods cannot be sourced from
  primary studies (the dataset cannot be made real);
- held-out or retrospective comparison (phases 4–5) shows the model does not
  rank meals better than a simple carbohydrate/energy baseline;
- prospective validation (phase 6) fails to show the predicted population-level
  relationship, or shows it only in a population INSIGHT does not target;
- the effort required to reach a defensible claim exceeds the product's
  purpose, in which case reposition as an explicitly descriptive
  dietary-awareness tool (drop score-like framing) or discontinue.

Do **not** respond to a weak result by adding personalization, CGM inference,
or clinical features on the unvalidated foundation.

---

## 8. External-source rules

- Prefer original peer-reviewed **human** studies; distinguish the primary
  FII measurement studies from later observational dietary-index work.
- **Never invent a citation.** A value without a locatable primary source
  does not enter the dataset.
- Mark any paper not yet read in full, or not accessible, as
  **EXTERNAL VALIDATION REQUIRED**; do not treat its figures as confirmed.
- **Do not copy any measured value into the live application as part of this
  mission.** Dataset population is a separate, approved, independently
  reviewed change with a before/after scoring report.

### Anchor references

**Verification provenance:** the two anchors below were confirmed by the
certified audit against journal records / abstracts, **not by reading the
primary PDFs in full** (AJCN full text returned HTTP 403 to automated fetch).
Every figure quoted here therefore carries the audit's confidence level, and
each must be re-checked against the primary PDF before it is used to justify
a dataset value or a product claim. **EXTERNAL VALIDATION REQUIRED.**

- Holt SHA, Brand-Miller JC, Petocz P. *An insulin index of foods.* Am J Clin
  Nutr **1997;66:1264–1276.** Original FII; 38 foods, ~11–13 healthy subjects,
  1000 kJ (~239 kcal) portions, insulin iAUC over 120 min, white bread = 100.
  *Audit status: title, journal, volume, pages, and design independently
  confirmed; full text not read.*
- Bao J, de Jong V, Atkinson F, Petocz P, Brand-Miller JC. *Food insulin
  index: physiologic basis for predicting insulin demand evoked by composite
  meals.* Am J Clin Nutr **2009;90:986–992.** 13 isoenergetic (2000 kJ) mixed
  meals, n ≈ 10–11 per meal, healthy subjects. FII-predicted meal insulin
  correlated with observed (**r = 0.78, P = 0.0016**) and observed responses
  varied over a **~3-fold range (35 → 116)**; fat content was inversely
  related to insulin response. *Audit status: year/volume/pages, r, P, and
  the observed 3-fold range confirmed from the abstract; full text not read.*
  - The **"predicted 5-fold spread"** figure sometimes quoted alongside this
    paper was **not** confirmable from the primary source and is flagged
    **EXTERNAL VALIDATION REQUIRED**. Only the *direction* (FII over-predicts
    the spread of mixed-meal responses) is the paper's stated conclusion.
  - Note this is a *different* paper from Bao et al. 2011 (*Dietary insulin
    index and insulin load…*, PMID 21543531), an observational study that must
    not be cited as the composite-meal validation.

---

**Confirmation:** This document creates a plan only. `backend/fii_foods.csv`,
all formulas, thresholds, coefficients, and confidence semantics are
unchanged by it.
