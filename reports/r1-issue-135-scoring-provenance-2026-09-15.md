# R1 / issue #135 — durable scoring provenance

Date: 2026-09-15
STATUS: LOCAL IMPLEMENTATION COMPLETE — INDEPENDENT REVIEW PENDING

Independent source review completed below; owner/independent acceptance is pending.

## Scope and source

Base: `504b58707955f2cca16c32b6f12f8e36a846b2cb`, verified against remote
`refs/heads/main` with `git ls-remote`. Local `main` was older (`56e218b`);
it was not moved. Task branch: `codex/issue-135-scoring-provenance` in the
separate `insight-issue-135-scoring-provenance` worktree. HEAD remains the base;
the implementation is staged for review. Canonical J9 remains at `f1db1b7`
on `codex/j9-hardening-final`, including its two untracked J9 reports.

The owner's request authorizes only the `CODEX_FIRST_TASK.md` R1 contract in
`INSIGHT_PRIVATE_RELEASE_PLAN_20260915.zip`. `FINAL_PLAN.md` describes proposed
subsequent scope; it does not authorize R2–R5 implementation or release.
Issue #135 was read; its suggestion that older records were v1 is not sufficient
proof to label individual rows. The fixed contract requires unknown provenance.
The July audit is historical evidence, not permission to reapply its old fixes.

Current implementation: Python/FastAPI scoring, unencrypted SQLite, and the
Ionic/React/Capacitor client. Compatibility/migration component: maintained Rust
parity core, which is not used by the current API. Target components: Rust with
UniFFI, Kotlin/Compose and encrypted native storage. Deferred components: iOS
SwiftUI and further native expansion under the July validation gate.

## Decision and implementation

Persist provenance before any separately approved dataset introduction. Accepted
research is preserved; published-study reconstruction does not validate runtime
meal estimates or qualify the ten `starter_placeholder` rows as measured data.
No scientific, provider, research, presentation or trend arithmetic change is
included. This record does not approve a private preview or any stronger claim.

Previously, saved results had no formula/dataset identifiers. The additive schema
adds nullable `meals.formula_version VARCHAR(64)` and
`meals.dataset_version VARCHAR(96)` with no application or SQL defaults. Existing
rows and item values remain untouched. API unknown values are JSON null;
older responses/caches may omit them. Neither timestamps nor current code are
used to infer historical versions.

`model_meal` captures both identifiers before its scoring loop; `ModeledMeal`
carries them into `build_meal_db`. The API request models do not accept provenance
as authoritative input (extra fields are ignored under existing Pydantic policy).
POST and GET return the stored identifiers. Replay, including the unique-index
race recovery path, returns the winning stored row's provenance. Changing the
runtime identity cannot relabel existing saves. Stateless preview retains its
existing response contract; save computes and records its own current provenance.

Python's one formula authority is now `scoring_service.FORMULA_VERSION`, still
`current_backend_v2`; the golden exporter imports it instead of defining another
literal. Rust retains its existing typed `CurrentBackendV2` authority and frozen
parity checks. No Rust scientific output or fixture was rewritten.

The CSV loader reuses the verified Rust `metadata.rs` identifier:
`fii_foods_csv_fnv1a64_250e9dfc91988b6b` for the unchanged current table.
It reads one byte snapshot, decodes UTF-8, and parses that same text with the same
CSV rules as before. Fingerprinting uses Rust's existing FNV-1a 64-bit algorithm:
normalize CRLF to LF, split at LF, ignore the final empty segment caused by a
terminal LF, and absorb each remaining line's UTF-8 bytes followed by LF. Start
at `0xcbf29ce484222325`; XOR each byte, multiply by `0x100000001b3` modulo 2^64;
format 16 lowercase hex digits after the prefix. Empty content absorbs no bytes.
Headers, aliases, source/confidence fields, whitespace and even ignored CSV rows
are included; LF/CRLF and a single final newline difference are neutralized.

This is a non-cryptographic content identifier, not a security/integrity guarantee,
collision-proof archive, measured-data label, or complete per-item evidence record.
It identifies the loaded table even for paths using provided FII or fallback.
It excludes code-defined rules/coefficients, which remain under formula identity
and source control. It does not retain the CSV snapshot itself. Reproducibility
still requires retaining the corresponding source/dataset artifact.

First-load publication is serialized. Loaded lookup indexes and their identifier
remain fixed for the process lifetime. Editing the file does not change either;
a restart loads a new snapshot. There is no hot-reload API. Future hot reload must
pass an immutable scoring snapshot through the whole operation; it cannot replace
these globals during scoring. Failed loads publish no new identity.

Frontend response normalization and saved-meal mapping preserve the identifiers.
Zustand's existing full-meal persistence/hydration needs no new schema migration:
backend fields win for matching IDs, local-only history stays intact, and missing
or null server provenance cannot inherit a stale cached version. Copying a saved
meal to a new draft clears its score provenance along with the old score.
No application meal export endpoint exists; JSON API serialization and local cache
round trips are covered. This patch does not introduce an export feature.

## Numeric invariance

Eight frozen POST-modeling characterization tests passed before editing and pass
afterward; only the two additive metadata fields are excluded from the existing
value comparisons. All prior numeric, source, quality and item expectations are
unchanged. Representative frozen outputs below apply equally before and after:

| Synthetic fixture | Load before = after | Acute before = after |
|---|---:|---:|
| Exact FII | 200.0 | 666.6666666666667 |
| Mapped decomposition | 94.80000000000001 | 316.00000000000006 |
| Provided FII | 84.0 | 280.0 |
| GI/protein fallback | 16.8 | 56.00000000000001 |
| Unknown | 0.0 | 0.0 |
| Mixed sources | 259.0 | 863.3333333333333 |
| Zero kcal | 0.0 | 0.0 |

Golden fixture export was checked before and after, without fixture regeneration.
The #134 HTTP quantity/split-row checks still run. Passing these tests establishes
implementation invariance only, not physiological validation.

## Migration, backup and rollback limits

Only temporary synthetic databases were migrated. The existing startup migration
adds missing columns and is repeatable; it does not rescore/backfill rows. Tests
compare every preexisting synthetic meal/item column before/after and retain
unknown history beside new versioned rows. New saves without request IDs remain
legal duplicates; request-ID conflicts remain 409.

Before any separately authorized real deployment, stop writers and take a verified
SQLite-consistent backup plus any separately managed browser cache backup. Never
copy an active database file without accounting for its journal/WAL. Test restore
on a separate copy. No owner backup or migration was performed here.

Application rollback can leave the additive nullable columns in place: the prior
code ignores them and inserts NULL for new rows. Those rollback-era rows must stay
unknown on re-upgrade. No destructive downgrade/drop-column script is provided.
Restoring an older backup loses subsequent writes unless separately reconciled.
The inherited startup migration has no migration ledger or multi-process DDL
coordination; run schema upgrades with a single writer. Concurrent application
startup migration is not newly guaranteed by this patch.

## Required follow-on preview gate

Old, unknown and mixed formula/dataset versions are not automatically comparable.
History is preserved and the existing chronic computation is unchanged, including
its current ability to aggregate these rows. **R1 does not approve that trend for
release.** Before private-preview acceptance, R3 must withhold the default
insulin DIL/DII-style trend until a separately reviewed version-and-coverage rule
exists. It must not present unknown/incompatible results as one homogeneous metric
or silently drop meals to make a chart appear comparable. Retain meal history and
logging coverage; any future segmented/compatible descriptive aggregation must
identify included/excluded versions, missing/unsupported coverage and units, and
must not imply metabolic improvement. Matching identifiers alone are insufficient
proof of scientific comparability.

Remaining proposed dependencies: R2 reviewed eligible dataset/matching and per-item
source identity; R3 unavailable-result and consistent evidence/presentation contract
(including the trend gate); R4 identified Android artifact, topology/privacy and
physical-device acceptance; R5 owner-only usability evaluation. None implemented
or approved by this patch. Native expansion remains paused.

## Checks and independent review

Checks run on Windows, Python 3.13, Node 26.5.0 (CI specifies Node 22), and Rust:

| Check | Result |
|---|---|
| `python -m compileall -q .` (backend) | PASS |
| `python -m unittest discover -s tests -v` | PASS, 112 tests, final corrected diff |
| `python -m validation.run_validation` | PASS, 6/6 cases |
| `python -m validation.export_golden_fixtures --check --out ../crates/insight-core/fixtures/golden` | PASS, before and after |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run test.unit -- --run` | PASS, 705 tests / 60 files with environment adjustment below |
| `npm run build` | PASS; existing large-chunk and old Browserslist warnings |
| `cargo fmt --all -- --check` | PASS |
| `cargo clippy --workspace --all-targets -- -D warnings` | PASS |
| `cargo test --workspace` | PASS, 168 unit + 44 golden tests |
| `git diff --cached --check` | PASS |
| `npx cypress run --config baseUrl=http://127.0.0.1:5185` | PASS, 165 tests / 18 specs, no skips |

Backend commands set `PYTHON_DOTENV_DISABLED=1`; tests use temporary synthetic
databases or fake database objects and provider mocks. Existing hardening tests
log explicitly synthetic secret-marker strings; no actual secrets were loaded.
The initial backend test run failed because another preview/save equality assertion
did not yet exclude the added metadata; its numeric assertions are unchanged and
the final full run passes. The initial Node 26 unit run failed because experimental
Node `localStorage` shadowed JSDOM storage. Rerun with
`NODE_OPTIONS=--no-experimental-webstorage` passed all tests. No application code
or tests were weakened to work around that environment difference. Python/TS have
no repository formatter command; changed formatting follows adjacent code.
Browser tests used the built frontend in a temporary test session with synthetic
API intercepts, without starting the production backend or making provider calls.
The isolated preview server was stopped afterward. Device acceptance was not run
(R4 scope). Local synthetic check logs are retained at
`C:/Users/Parth Ganguly/AppData/Local/Temp/insight-r1-135-verification-20260915/`.

Independent source review: agent `/root/r1_diff_review` reviewed the staged diff.
It found that the unique-index race handler used the losing computation's
`estimate_status`. R1 now derives that status from the stored winner, just like
ordinary replay; the race regression uses differing sources/statuses as well as
versions and compares both full responses to the stored winner. The corrected
20-test replay suite and final 112-test backend suite pass. The reviewer rechecked
the correction and report and reported no remaining concrete findings. Its review
was source-only, without independently rerunning tests; final independent/owner
acceptance remains pending. This is not release approval.

## Files changed

- `backend/api/meals.py`: capture/carry/store/read provenance and canonical race replay.
- `backend/db.py`, `backend/db_models.py`: nullable additive schema.
- `backend/fii_lookup.py`: same-snapshot fingerprint and serialized first load.
- `backend/models.py`: optional saved-response identifiers.
- `backend/scoring_service.py`, `backend/validation/export_golden_fixtures.py`:
  consolidate Python formula identity; numeric code unchanged.
- `backend/tests/test_b2_migration_compatibility.py`,
  `backend/tests/test_meal_idempotency.py`, `backend/tests/test_meal_modeling_golden.py`,
  `backend/tests/test_meal_preview.py`, `backend/tests/test_scoring_provenance.py`:
  migration, spoofing, HTTP, loaded-data identity, replay/race and unchanged values.
- `frontend/src/api/api.ts`, `frontend/src/types/Meal.ts`: saved version fields.
- `frontend/src/utils/fiiTrustBoundary.ts`: clear provenance on reuse as a new draft.
- `frontend/src/stores/persistentMealStore.hydration.test.ts`: save/read/cache/legacy checks.
- This report.

OWNER DATABASE / CANONICAL WORKTREE / RESEARCH / PROVIDER MODIFICATIONS: NONE
PUSH / PR / MERGE / ISSUE CLOSURE / RELEASE: NONE
SCORING VALUES CHANGED?: NO
