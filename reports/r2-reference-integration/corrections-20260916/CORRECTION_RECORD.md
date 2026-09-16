# 2026-09-16 saved-evidence correction record

STATUS: R2 READ-BOUNDARY CORRECTIONS COMPLETE — REVIEW PENDING

This dated addendum supersedes the initial handoff's clean-review conclusion for
the two saved-evidence findings only. Earlier reports, logs and handoff ZIP remain
unchanged historical evidence; they did not test or establish these boundaries.

Base/HEAD: `cb6083f8386bb0464b1f94ca0a2f7d49c3e55c16`.
Existing branch: `codex/r2-reference-meal-integration`.
Submitted staged tree: `f93e0c51431bb312fc0d1a4b018fcbda055f8681`.
The revised tree and all final file/index identities are in the ZIP's
REVIEWED_SNAPSHOT.json (outside this staged record to avoid a circular tree hash).

## Starting verification and bounded repair

Before editing, verified the review packet manifest and exact submitted 32-file
staged snapshot: path set, status, modes, Git blobs, sizes, SHA-256, binary patch
hash, result tree, branch and HEAD. Remote main matched the same base. No reset,
rebase, commit or prior-worktree modification occurred.

The current decoder first built defaulted models and hashed their normalized
payload. It also assumed SQLite TEXT values were always strings. The correction
plan was limited to the experimental migration component's stored decoder,
normal-discovery regressions and evidence. Preserve new-result defaults and
serializer, all identities/calculation/catalog values, NULL behavior and the
existing narrow sanitized adapter. No schema, privacy or scientific change.

R2-R01 baseline: all 12 external read/list/replay deletion cases incorrectly
returned evaluated after removing result/formula/envelope identities. The fix
requires explicit supported persisted identities and checks the actual parsed
assessment digest before model normalization, then retains typed/arithmetic
checks. Missing identities fail even if a raw-payload digest is recomputed.
Optional-default deletion with the old digest also fails; formatting/key order
alone remains valid. Duplicate-key and nonfinite rejection remain intact.

R2-R02 baseline: invalid binary and valid JSON bound as SQLite BLOB each caused
read/list/replay HTTP 500 (six cases). The decoder now rejects non-string values
with ValueError; the unchanged adapter returns sanitized evidence_error.
No decoding, str coercion, broad exception handler, rescore or byte rewrite.
Legacy NULL stays not_evaluated. Tests preserve healthy neighbors and legacy
responses, listing contents, row counts, corrupt bytes and SQLite storage types.

Only two existing submitted files changed: contract.py (decoder only) and
test_reference_integration.py (three discovery regressions plus shared HTTP
assertions). The other 30 submitted file blobs remain unchanged. All additional
files are this correction's evidence. Service/router/serializer/schema/catalog/
formula/legacy/production entrypoint/frontend/Rust remain unchanged.

## Execution and preservation evidence

| Check | Result |
| --- | --- |
| Exact external reviewer code before correction | 13 run: 11 pass, exactly R2-R01/R2-R02 fail, 0 errors |
| External reviewer code after correction | 13 pass, including all 147 catalog selections |
| Full backend normal discovery | 148 pass, including 19 integration and 17 catalog tests |
| Legacy characterization | 8 pass |
| Existing validation | 6 pass |
| Existing golden export | Pass, unchanged |
| Independent Decimal synthetic goldens | 10 pass |
| Deterministic catalog --check | Pass, unchanged 147 rows and reviewed identity |
| Backend compilation / staged whitespace hygiene | Pass / pass |
| Captured original valid v1 envelopes | All 147 exact byte/identity round trips and new construction match |

valid-v1-before.json was captured with the submitted implementation before the
decoder edit. check_valid_v1.py verifies its hashes, corrected deserialization/
serialization and fresh construction against every original envelope. The
before/after digests and executed command are retained. These are synthetic
evidence records, not owner data or proof of physiological validity.

Normal-discovery regressions exercise real HTTP read/list/replay with synthetic
SQLite, blocked catalog/evaluation/legacy-model calls, preserved healthy rows,
unchanged malformed storage, all identity deletion combinations, both BLOB cases,
raw-digest-before-default handling, canonical formatting equivalence and NULL.
Existing full-suite tests continue to cover atomic save/rollback/concurrent winner
replay and actual production route/import dormancy.

Exact commands, exits, baseline failures, after-results and runtime versions are
retained here. Log path prefixes/trailing whitespace and copied review-input text
formatting are normalized; original review input bytes are separately included in
the revised ZIP. No outcomes were removed. Prior Rust 212-test/fmt/clippy results
remain prior results, not rerun for these Python-only fixes. Frontend/browser were
not rerun. No configured Python formatter/linter exists in the repository.

## Independent correction review

Separate read-only agent `/root/integration_diff_review` reviewed the actual
correction delta and external decision/audit. No remaining concrete findings.
Independently executed 19 integration tests (15.417s) and all 13 external reviewer
tests (4.698s); both passed. Staged whitespace check passed. Confirmed raw digest
and explicit identities precede normalization, and non-text handling uses the
existing narrow error adapter.

Reviewed contract blob: `16dd42b38b65ffc8fd23b0f70b1c1c5aa3852f22`.
Reviewed integration-test blob: `efb5a9bed6b50b1228452b1866699c7241fbb03c`.
The reviewer inspected retained 147-envelope preservation evidence; did not
independently regenerate it, rerun the full backend suite or review final packaging.
This is implementation review, not owner acceptance or activation approval.

## Handoff

The revised ZIP includes exact staged files, available base copies, complete
binary patch against the same base, old-to-new correction delta with changed
prior copies, snapshot identities, original independent review inputs, tests,
logs, preservation evidence and SHA-256 manifest. Package-level receipts verify
full patch application in a fresh detached checkout of the actual base, exact
result tree, and delta application from the submitted tree using an isolated
index. No commit is created; prior scratch/worktrees remain preserved.

OWNER DATA / J9 / COMPLETED WORKTREES / RESEARCH / REMOTE MODIFICATIONS: NONE.
No owner database, provider call, production startup/activation, R3 UI work,
new research, commit/push/PR/merge or release. Catalog and formula identities
and values remain unchanged. Stop for independent owner review.
