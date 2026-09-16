# R2 reference integration local review handoff

STATUS: R2 REFERENCE INTEGRATION IMPLEMENTED — NOT ACTIVATED — REVIEW PENDING

BASE / HEAD: `cb6083f8386bb0464b1f94ca0a2f7d49c3e55c16`
BRANCH: `codex/r2-reference-meal-integration`
Separate worktree: `insight-r2-reference-meal-integration`.
No commit, push, PR, merge, activation, deployment or release.

## Implementation

Three existing files changed: db.py (one additive nullable TEXT migration),
db_models.py (one nullable field), and test_reference_catalog.py (follow imports
reachable from main.py instead of banning dormant modules). The new contract,
service and unmounted router are in backend/experimental_reference. New HTTP
integration tests, separate synthetic goldens/Decimal checker, focused decision
and integration docs, and this evidence directory complete the staged patch.
The ZIP snapshot enumerates every staged path, mode, Git blob and SHA-256.

Assessment identities: `reference_meal_result_v1`, `experimental_reference_load_v1`,
`insight_reference_catalog_v1`, `experimental_fii_input_v1`, `explicit_source_id_v1`.
Catalog: `r2_sha256_6db5357ae368981b1e2781a2a2402d60d63850e7b59c63e757b654a39bdc51d9`.
Envelope: `reference_assessment_envelope_v1`.

Pinned catalog remains 147 records: 138 experimental candidates, 6 reference-only,
3 requiring review. Exact eligible selection and positive eaten energy yield
the separately named experimental load. Any consumed unavailable item makes
the whole total null; item evidence/reasons remain. Zero quantity is not_consumed;
empty/all-zero meals are unavailable. Synthetic FII 0 gives a genuine zero;
synthetic FII 150 remains legal. Source data were not edited.

Server constructs ordered immutable source/input/result snapshots. One captured
catalog supplies an evaluation. Stored reads/replays do not reload it. Caller
cannot supply authoritative source, FII, eligibility, result or confidence.
New request hashes cover all normalized material fields/order/catalog expectation;
title/time remain non-material. Legacy and new keys cannot borrow responses.

The actual preview/save/read/replay path passes through isolated FastAPI apps and
temporary synthetic SQLite. Compatibility meal and assessment commit together.
Injected post-flush failure leaves neither rows nor evidence. Real competing
saves return the entire winning stored assessment, including differing status,
items and catalog identity. Schema creation/repeated upgrade preserve old values;
old rows are not_evaluated; corrupt/unsupported evidence returns evidence_error
without recalculation or replacing bytes. Targeted deletion preserves other meals.

Actual base code also read/created/deleted legacy meals after the new code upgraded
a synthetic database. Its reads matched compatibility outputs and it preserved
all attached evidence. `capture_comparison.py` and `before-after.json` retain that
check and three exact legacy preview comparisons (rice, unknown food, composite).
The deliberate new rice assessment is 138 versus unchanged legacy compatibility
load 158; absent selection yields null assessment total with legacy 158 retained
only in the separately named compatibility object.

## Executed verification

| Check | Result |
| --- | --- |
| Full backend discovery, same command as CI | 145 passed, including 17 catalog and 16 integration tests |
| Legacy characterization | 8 passed |
| Existing validation runner | 6 passed |
| Existing Python/Rust golden export | Current; unchanged |
| Deterministic catalog --check | Pass; input hashes/CSV-JSON equality, 147 rows |
| Independent Decimal synthetic goldens | 10 passed; same cases also traverse HTTP preview/save/read |
| Python compileall | Pass |
| Rust fmt / clippy -D warnings | Pass / pass |
| Rust workspace tests | 168 unit + 44 integration passed; 0 doc tests |
| Actual-base legacy comparison/coexistence | Pass |
| Staged diff whitespace check | Pass |
| Independent staged-diff review | No remaining concrete blockers; 16 tests independently rerun |

Logs retain commands, exit codes, output and runtime versions. User/worktree path
prefixes are redacted and trailing whitespace normalized, without removing
outcomes. Existing deprecation warnings remain. `SECRET-MARKER` messages in the
backend log are deliberate synthetic error-shape fixtures, not credentials.
No configured Python formatter/linter exists in this repository; compilation and
tests ran. Rust configured checks ran. Frontend/browser checks deferred because
their code and existing contracts are unchanged. Publication and CI are separate
authorization; no new remote CI is claimed.

Independent review found and verified fixes for GI storage overflow and nonfinite
HTTP validation serialization. Its scope/limitations and reviewed blobs are in
INDEPENDENT_REVIEW.md. This is internal review, not owner acceptance. Arithmetic
tests are software verification, not physiological validation.

## Handoff and boundaries

The review ZIP contains exact staged blobs, base copies of modified files, a full
binary-capable patch, snapshot/input identities, task document, logs, goldens,
before/after evidence and SHA-256 manifest. Package-level verification records
application with `git apply --index` in a separate scratch checkout of the actual
base, matching the staged result tree. No commit is needed for that check.

PRODUCTION ACTIVATION: NONE. New router is unmounted; legacy production routes,
response schemas, formula, fallback, CSV, Rust contract/goldens and frontend are
unchanged. The future migration is implemented but only synthetic databases were
opened or migrated. R3 presentation/unavailable-result handling, activation,
native integration and R4–R5 remain outside this task. A content hash is not
authentication. No personal insulin/dosing/health-benefit claim is made.

OWNER DATA / J9 / COMPLETED WORKTREES / RESEARCH / PROVIDER MODIFICATIONS: NONE.
Remote main remained at the expected base; protected input hashes and preserved
worktree heads/status are retained. Existing J9 untracked reports remain in place.
The detached scratch worktree is preserved; no branch/worktree cleanup occurred.
