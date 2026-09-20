# R3A experimental reference presentation

> **Status update — 2026-09-19 (R3B):** This component is no longer unmounted. The backend router is mounted only when `INSIGHT_REFERENCE_PREVIEW=1` exactly, and the frontend branch is built only when `VITE_REFERENCE_PREVIEW=1` at build time. Both default to OFF, neither has a runtime or settings toggle, and neither is activated on a normal installation. This is a configured test status under `decisions/2026-09-19-reference-private-preview.md` — not a release, not an activation, and not a claim of scientific validation.

Status: implemented in isolated components; not activated. This is a compatibility/migration component. The current Ionic client and FastAPI legacy meal flow remain the current implementation. Rust/native remains target/deferred under the validation gate.

The dormant router adds `GET /reference-meals/catalog`. It returns the pinned catalog identity and a fixed safe projection of all 147 source records, including exact IDs, source wording, FII mean/SEM, study/DOI, actual test dose, and experimental-input eligibility. It excludes source files, hashes, complete research metadata, and private paths. Browsing never scores or saves. Search in the unmounted picker filters these records only; a user must press Select for an eligible candidate. Similar names remain separate rows, each with expandable study, DOI, reference scale and eligibility reasons. Clearing sends `null`. A positive-quantity unselected item remains unavailable under the existing R2 evaluator; a zero-quantity item needs no reference.

The separate typed frontend request sends reviewed inputs, exact `source_record_id`, and the catalog identity. It never copies published FII into legacy `fii` or `fii_value`. A typed 409 stale identity is rendered by the dormant `ReferenceCatalogStaleNotice`, which prompts the user to browse again and review every selection before retrying. Its button invokes a caller-provided browse action; it never silently adopts the server version or changes a selection.

`ReferenceAssessment` renders four states from the saved assessment contract:

| State | Primary presentation |
|---|---|
| evaluated / experimental | Experimental meal insulin-demand estimate; raw reference load, including genuine zero; population/model boundary |
| evaluated / unavailable | No total or zero substitute; consumed blocking items and safe reason text |
| not_evaluated | No experimental assessment saved; no current-catalog recomputation |
| evidence_error | Saved evidence cannot be verified; no recalculation or legacy replacement |

Source details preserve original user wording separately from selected source wording, published FII mean and SEM (group-mean uncertainty), reference scale, test dose, population, study/DOI, and technical reasons. An explicit notice says selection is not a claim that the exact user food was measured. There is no food-match confidence or health category.

## R3B activation contract

The current production UI is unchanged. Before mounting these components in the normal private-preview meal flow, R3B must use `experimentalPresentationGate` at the meal result and Dashboard boundaries. A meal with any experimental `assessment_state` must not show the legacy acute score as its primary result. Experimental-preview mode must hide the existing 7-day legacy trend, because that trend does not measure reference loads. R3A does not define a replacement trend, recompute history, or alter chronic math. The gate is preparation only; it is not currently wired into production navigation.

No formula, catalog value, migration, owner data, J9 navigation, research flow, or provider routing changes are included.
