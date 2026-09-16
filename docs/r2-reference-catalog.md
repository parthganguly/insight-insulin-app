# R2 inactive reference catalog

This is a compatibility/migration component preparing a later reviewed integration.
The current implementation remains Python/FastAPI scoring with the ten-row legacy
CSV and Ionic/Capacitor UI. The maintained Rust core is a compatibility component;
Rust/UniFFI, Kotlin/Compose and encrypted native storage are target components.
Further native expansion and SwiftUI remain deferred under the July gate.

## Build and inspect

From the repository root, using the existing Python 3.13 toolchain:

```powershell
python backend/build_reference_catalog.py
python backend/build_reference_catalog.py --check
```

The builder verifies five pinned input hashes, all 147 unique IDs, and CSV/JSON
field equality in source order before writing `candidate_catalog.json` and
`eligibility.csv` under `backend/reference_data/r2/`. `--out-dir` permits an
isolated regeneration; `--check` is read-only. Nothing loads this catalog at
application startup. There is no route, feature flag, scoring call or DB write.

```python
# From backend/, offline only:
from reference_catalog import ReferenceCatalog, SelectionStatus

catalog = ReferenceCatalog.load("reference_data/r2/candidate_catalog.json")
# A consumer must retain the version it actually reviewed, not substitute a new one.
reviewed_version = catalog.version
result = catalog.select("BAO2011-002", expected_catalog_version=reviewed_version)
assert result.status == SelectionStatus.SELECTED
assert result.record["fii_mean"] == 69.0
```

`select` accepts only a source ID and expected version. Typed statuses are
`selected`, `version_mismatch`, `unknown_id`, `reference_only`, `requires_review`.
Only `selected` carries a usable record; every result carries reasons and the
actual catalog identity. All 147 records remain inspectable through the immutable
`records` mapping, including reference-only and disputed records. No search or
name-based selection is implemented. A selected source is not a measured match
for a user's food; no matching confidence or new `fii_source` token is created.

## Versions and immutable identity

Schema: `insight_reference_catalog_v1`. Eligibility: `experimental_fii_input_v1`.
Selection: `explicit_source_id_v1`. Policy descriptions, issue rules, study
metadata, historical issues, input identifiers and every raw/mapped record are
embedded in the artifact. Canonical serialization is Python standard-library
JSON: UTF-8, literal Unicode (`ensure_ascii=False`), keys sorted, compact comma
and colon separators, `allow_nan=False`, one final LF. List order is significant.
Identity is `r2_sha256_` followed by SHA-256 of that serialization, excluding no
fields. JSON whitespace/key order alone therefore does not change identity.

The loader reads once, rejects duplicate JSON keys, unsupported versions, invalid
source IDs/types, nonfinite or negative measurements, and duplicate IDs. It
recomputes mapped fields and decisions from the loaded raw records and embedded
policy and rejects disagreement before publication. Recursive read-only mappings,
tuples and frozen result objects prevent caller mutation. There is no hot reload
or later disk read to relabel an earlier result. Unknown optional values remain
null; zero and FII above 100 are legal. FII is an index, not a probability.

The hash is content identity, not publisher authentication or a digital signature.
Load only a reviewed artifact and pin its reviewed identity. Input hashes record
source lineage; builder hash checks establish raw invariance for this artifact.
A deliberately rebuilt/altered artifact gets a new identity; its source lineage
and policy require review. Policy edits must bump the policy version when semantics
change, and the loader/evaluator must explicitly support that version. Even a
reason-only policy edit changes catalog identity. Runtime R1's FNV identity and
`current_backend_v2` remain unchanged and are not assigned to this catalog.

## Use-specific eligibility v1

`eligibility_policy.json` is the inspectable issue/use policy. Generic rules live
in `map_records`, governed by the eligibility version. Decisions are not a public
release gate, a consumer-food match or proof of arbitrary meal-size prediction.

| Use | Rule |
|---|---|
| `experimental_fii_input` | Attributed usable FII, glucose reference, 1000-kJ actual test dose can be candidates. Missing FII/reference/dose/attribution requires review. All six 300-kJ Bell rows are reference-only. |
| `composition_energy` | Complete weight/protein/fat/available carbohydrate at 1000-kJ composition basis can be candidates for later use. Missing/unsupported composition or P03 requires review. No energy is recomputed here. |
| `gi_gl_calculation` | Missing GI or GL is reference-only for this use. P02/P03 requires review; no derived GL replaces the original. |
| `fibre_context` | Missing fibre is reference-only for this use, with no effect on FII eligibility. |

Candidate means eligible for the specified future experimental input/context use,
not independently validated nutrient accuracy. `requires_review` takes precedence
over `reference_only`; all applicable exclusion/review reasons are retained.

| Issue | Anchors | Treatment |
|---|---|---|
| P01 | 121 Bao rows | Corrected metadata supplied by owner; numeric values already glucose-reference; no conversion. Historical status retained literally. |
| P02 | Bell S1-002 carrots | Keep GI 33, carbohydrate 32, GL 14; review GI/GL calculations. FII remains reference-only because of dose, not because GL is missing/disputed. |
| P03 | Bell S1-017 sausage | Keep carbohydrate 35 and FII 7. Review composition/energy and GI/GL uses. FII-input use also requires review because the anomaly's effect on physiological dose comparability is unresolved; this is not an assertion that FII 7 is wrong. |
| P04 | Bell S1-001 through -006 | 300-kJ actual dose separate from 1000-kJ composition basis; reference-only for FII use. |
| P05 | Missing Bell GI/GL/fibre | Field-specific null/reasons only. Never apply historical 19/17/10-food masks. |
| P06 | Bell S1-014 lamb and -024 noodles | Source FII/item-linkage conflict blocks FII selection pending review. Preserve table 41 +/- 19 and 22 +/- 9; no text-table repair. |
| P07-P10 | Historical source/evaluation limitations | Retained in full ledger and artifact; no participant reconstruction, appended Holt foods, duplicate mixed meals, refitting or new validation claim. |

Result: **138 candidates, six reference-only, three requires-review** for
`experimental_fii_input`. `eligibility.csv` lists all 147 records across all four
uses (588 decisions), each bound to the catalog identity. Counts are outputs,
not eligibility targets.

## Field dictionary and exact source map

Every original field is retained unchanged in `records[].raw`. No cleaned name is
used as identity. Brand/preparation context remains in original wording and the
footnote; no guessed brand parsing or food-equivalence rules are added.

| Source field(s) | Mapped field / interpretation |
|---|---|
| `canonical_id` | `source_record_id`; exact stable source row ID |
| `food_name_source` | `original_food_wording`; source wording including brand/preparation/star |
| `food_name_clean`, `food_category`, `dataset_component` | Preserved in `raw`; descriptive only, no alias authority |
| `FII_pct` | `fii_mean`; same number, glucose=100 index despite historical `_pct` suffix |
| `FII_sem` | `fii_uncertainty.value`, type `SEM`; uncertainty of reported food mean, not a personal prediction interval |
| `response_reference` | Exact text in `raw`; `reference_scale` is `glucose=100` only for the two recognized source strings, otherwise null and review |
| `actual_test_energy_kJ` | Same field; physiological test portion, no multiplication by 1000/300 |
| `composition_basis_kJ` | Same field; composition denominator, distinct from actual dose |
| `weight_g_per_MJ` | Source food weight in grams per 1000-kJ composition portion |
| `protein_g_per_MJ`, `fat_g_per_MJ`, `avcho_g_per_MJ`, `sugar_g_per_MJ`, `fibre_g_per_MJ` | Source grams per MJ; no normalization, imputation or energy repair |
| `GI_pct` | Source glycemic index; null remains null |
| `GL_g_per_MJ` | Source glycemic load per MJ; no recomputation |
| `GS_pct`, `GS_sem` | Source glucose score and SEM; distinct from GI and FII |
| `test_year` | Source year; retained in `raw`, not publication year |
| `source_study`, `source_doi` | Exact attribution in `raw`; `study_id` links to study metadata by source ID prefix and DOI validation |
| `source_table`, `source_printed_page`, `source_row` | Exact location retained; integer row must match ID suffix. Supplement pagination may reflow. |
| `source_footnote`, `harmonization_note` | Verbatim context, including protocol and corrected metadata; no numeric conversion performed |
| No per-row source count | `record_sample_size: null`, with explicit status and link to study-level counts |
| Issue/use findings | `issue_ids` for explicit row rules; complete `source_issues` retains P01-P10; `eligibility` contains every use/status/reason |

Study metadata comes from authenticated existing Bao/Bell source files, with file
names, hashes and page/section locations in `study_metadata.json`. Bao Subjects
reports groups of 10-13; Study 1 states 10 per food. Bell describes means in ten
subjects but 254 observations across 26 added foods. Neither statement is copied
into a per-row count. Missing row-level demographics/counts block participant-level
or precision-weighted inference, not this source-index catalog. The six specific
supplement dose exceptions override the general 1000-kJ method description.

Evidence limitations: targeted text inspection of methods, existing authenticated
transcription checks, no new cell-by-cell visual certification, no participant
records, author resolution, or certification of public redistribution rights.
Publisher PDFs/DOCX, historical archive ZIPs and private filesystem paths are not
included in application files. Existing accepted research remains untouched.

## Later integration seam (deferred, not implemented)

A future server-owned per-item selected-record snapshot must persist the reviewed
catalog identity, schema/eligibility/selection policy identities, source-record ID,
reference scale, published/actual value used, actual test dose, selection/matching
policy and relevant use decisions/reasons. Preserve original user wording in a
separate field. A selected analogy is not a measured consumer-food match. The
server must resolve the pinned record; request values cannot override it.

That task must define per-item persistence and API validation, missing/ineligible
result semantics, versioned scientific computation, immutable replay/history, and
R3 presentation before activation. No use of `current_backend_v2` for a new active
interpretation, history migration, score change, frontend copy or Rust contract is
authorized here. Older documents describing legacy lookup/fallbacks govern current
compatibility behavior; they do not authorize activating this glucose-reference
catalog in those paths. The September plan does not lift the native-expansion gate.
