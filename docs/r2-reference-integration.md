# Dormant selected-reference integration

The new `backend/experimental_reference` package is an experimental migration
component. Only isolated tests register its router. `main.py` has no import,
route registration or enable switch for it. No production application was started.

## HTTP contract in the isolated app

- `POST /reference-meals/preview`: strict reviewed draft; no database write.
- `POST /reference-meals`: same draft plus required UUID `client_request_id`.
- `GET /reference-meals` and `GET /reference-meals/{id}`: stored evidence only.
- `DELETE /reference-meals/{id}`: existing deletion removes meal, its attached
  assessment and item rows together.

A draft contains `meal_name`, `expected_catalog_version`, and ordered `items`.
Save optionally accepts `created_at`. Items contain name, quantity, existing
unit, optional `kcal_per_unit`, matching `kcal_per_unit_unit`, optional exact
`source_record_id`, declared `nutrition_origin` (manual/label/ai_reviewed/other),
and optional carb_g/protein_g/fat_g/sat_fat_g/gi context. Nutrition origin is a
claim, not certified evidence. No energy is inferred from macros, source
composition, test dose or serving names. Missing and zero remain distinct.
GI uses a nonnegative SQLite signed-integer storage bound, not a scientific cap.

Extra fields are forbidden, including authoritative FII, eligibility, source
snapshots, confidence and results. Numeric strings, booleans, negative,
nonfinite and overflowing inputs are rejected. Router-local validation returns
sanitized 422 `invalid_reference_request`, including for JSON `1e999`.
Legacy validation and aliases are unchanged. Unrepresentable calculated or
compatibility values fail with 422 before writing.

Only the server-pinned reviewed catalog is loaded, once per new evaluation:
`r2_sha256_6db5357ae368981b1e2781a2a2402d60d63850e7b59c63e757b654a39bdc51d9`.
Client version is a guard, not an artifact locator. Stale selections yield 409
`stale_catalog_version`; absent/corrupt/unreviewed server catalog yields 503
`catalog_unavailable`. No remote retrieval or automatic matching occurs.

## Separate results and identities

`assessment` uses `reference_meal_result_v1`, `experimental_reference_load_v1`,
`insight_reference_catalog_v1`, `experimental_fii_input_v1` and
`explicit_source_id_v1`. `legacy_compatibility` retains `current_backend_v2`
and the active CSV's existing fingerprint. The latter's numeric defaults,
quality, source resolution and provenance never enter the assessment. Selected
catalog FII is never passed through legacy `fii`/`fii_value` fields.

Assessment is experimental only when every positive-quantity row has an
eligible reference and positive eaten energy. Otherwise total is null, with
structured item and meal reasons. Missing selection, unknown ID, reduced-dose,
reference-only and disputed records stay visible and unavailable. Eligible
components can retain individual loads, never a partial whole-meal total or
complete driver ranking. A zero-quantity row is retained as not_consumed with
zero arithmetic; empty/all-zero meals are unavailable (`no_consumed_items`).
A genuine source FII zero with positive energy is a valid experimental zero;
FII above 100 is legal. Historical source data are not changed to test either.

Each row retains its position, original reviewed inputs, user wording separately
from source wording, explicit-reference/not-verified-equivalence label, eaten
energy, FII mean/SEM and uncertainty meaning, reference scale, actual test dose,
composition basis, attribution/location/footnote, optional metadata nulls,
issue IDs and eligibility decisions. Composites remain one selected row;
duplicate IDs can represent distinct portions. There is no decomposition,
deduplication, new fallback, personal interval or confidence merging.

## Persistence and retry

One nullable `meals.reference_result_json TEXT` column has no default/backfill.
Envelope `reference_assessment_envelope_v1` contains the ordered typed result
and canonical SHA-256. Models and their nested sequences are immutable. Hashes
detect accidental changes; they are not authentication or tamper-proof security.
Schema and arithmetic consistency are checked on read, without catalog access.

The new request hash domain is `reference_meal_request_v1`. Every normalized
item field, order and expected catalog identity participates. Explicit null and
omitted optional values both mean missing; missing and numeric zero differ.
Title/time remain non-material, as in legacy: first accepted values win. No
current server version label participates. Cross-contract reuse conflicts.

Replay checks the stored key/fingerprint before loading a catalog. Identical
retry returns the stored full winner; different material inputs yield 409
`request_id_conflict`. Compatibility rows and assessment are inserted in the
same transaction. Unique-key races roll back and reread the entire winner.
Other persistence failure rolls back with sanitized `save_failed`.

Null old assessment yields `assessment_state: not_evaluated`. Corrupt or
unsupported evidence yields `evidence_error`, null assessment and a generic
`invalid_stored_assessment` reason; stored bytes remain unchanged. It is never
recomputed from today's catalog. New evaluation requires a new draft/key.
Previous code can ignore the added column for legacy operations but cannot
interpret the new assessment. R1 legacy routes/responses remain unchanged.

## Review evidence

See `reports/r2-reference-integration` for the plan, executed checks, independent
review, before/after comparison and handoff report. Backend CI's existing
unittest discovery includes the new tests. Frontend/browser execution is
deferred: their files and current response contracts are unchanged. No publication
or CI run was requested for this local patch.
