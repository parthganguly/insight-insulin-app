# Codex — repair R2 saved-evidence validation only

This is a bounded continuation of the local, staged R2 integration task. Sending
this prompt authorizes only the two fixes below, their tests and a revised review
handoff. It does NOT authorize commit, publication, merge or activation.

## Starting snapshot

Base/HEAD: `cb6083f8386bb0464b1f94ca0a2f7d49c3e55c16`
Branch: `codex/r2-reference-meal-integration`
Submitted staged tree: `f93e0c51431bb312fc0d1a4b018fcbda055f8681`
Input ZIP SHA-256: `970292fb991bfac6e7a8e9226379212ecee0a3c927691980abc4cbcde258bd81`

Read AGENTS.md and the relevant existing task/decision/contract. Read this independent
review's REVIEW_DECISION.md, INDEPENDENT_AUDIT.json and reviewer tests. Verify the
existing local staged 32-file snapshot against SUBMITTED_SNAPSHOT.json before editing.
Recheck remote main. Stop on unexplained drift; do not reset/rebase or discard work.
Use the EXISTING task worktree, not J9 or an already completed worktree.

## R2-R01 — strict persisted identity and digest validation

Reproduce the missing-version regression against the submitted code first.
The independent test deletes stored result/formula/envelope version fields while
retaining the original assessment hash. GET-by-id, listing and same-key replay
currently succeed because defaults are inserted before the digest is checked.

Require explicit supported versions when reading persisted evidence, especially
`envelope_version`, `result_schema_version` and `formula_version`. A missing persisted
version must yield the existing sanitized `evidence_error` state, not a current default.
Defaults for newly constructed server results may remain only if the stored-read
boundary cannot use them to complete damaged evidence.

Verify the stored digest against the actual parsed assessment content BEFORE model
normalization/default insertion can restore omitted fields. Then apply the typed and
arithmetic consistency checks. Keep strict duplicate-key/nonfinite handling.
Formatting or key order alone may remain canonically equivalent. Do not silently
coerce, repair, rewrite or recompute stored values to pass the digest.

Preserve the exact serialization/output identities of all previously valid v1
assessments. This is validation repair, not a new physiological formula or dataset.
Do not rescore historical meals or migrate any data as a remedy.

## R2-R02 — non-text stored values fail safely

Reproduce both BLOB cases using synthetic SQLite: invalid bytes and valid JSON bytes
bound as BLOB to the TEXT column. Current `.encode` raises an uncaught AttributeError.

Require a string at the stored-deserialization boundary. Keep SQL NULL as
`not_evaluated`; classify non-null non-string content as invalid evidence. Do not
coerce bytes through `str`, decode them opportunistically or modify stored bytes.

Individual read and identical replay must return the documented `evidence_error`
state safely. Listing must retain valid rows and mark only the malformed assessment,
not fail the entire list. No catalog load, recalculation, new row or altered response
from a healthy row is permitted. Use narrow validation/error handling, not a broad
catch-all for unrelated bugs or DB failures.

## Test and compatibility requirements

Run reviewer_code/test_r2_boundary_review.py against the unchanged snapshot first
and preserve the baseline two failures. The reviewer executed this in a partial source
tree; you have the full task checkout, so use the real repository environment.
Add the two regressions to normal backend discovery, not only the external runner.
Verify missing versions individually and together, intact original hashes, both BLOB
cases, single GET/list/replay, healthy-neighbor preservation, unchanged corrupt bytes,
no re-evaluation, valid old v1 round trips and legacy NULL handling.

The intended repair should be confined to the stored contract/decoder, its adapter
if needed, focused tests and evidence/docs. Do not redesign serialization, modify
normal scoring, change catalog eligibility or expand R2 scope.

Run the full backend suite, existing characterization, validation/export checks,
new Decimal goldens, deterministic catalog --check, compilation and configured
relevant hygiene checks. Preserve prior Rust results as prior results unless rerun;
no Rust or frontend changes are requested. Check the actual production dormancy
boundaries in your complete checkout. Fix only concrete in-scope regressions.

Have a different agent review the correction diff. Distinguish its checks from yours.
Update the implementation evidence by appending a dated correction record; do not
rewrite old reports into claims that the initial snapshot passed these new checks.

## Handoff and stop

Return one revised ZIP with the complete staged diff against the SAME base, changed
file/index identities, prior-to-corrected delta, normal regression tests, exact
commands/logs, reviewer results, before/after valid-assessment byte checks and manifest.
Verify patch application and resulting tree in an independent scratch checkout as
before. Do not send only a summary or only a patch without the needed context.

No commit/push/PR/merge, catalog/formula/data changes, owner database access, production
startup/activation, provider calls, branch deletion, R3 UI work or new research.

Return:
STATUS: R2 READ-BOUNDARY CORRECTIONS COMPLETE — REVIEW PENDING, or BLOCKED
BASE / HEAD / BRANCH:
OLD AND NEW STAGED TREE:
R2-R01 BASELINE / FIX / REGRESSION:
R2-R02 BASELINE / FIX / REGRESSION:
VALID STORED V1 BYTES / IDENTITIES UNCHANGED:
LEGACY AND PRODUCTION DORMANCY CHECKS:
TESTS AND INDEPENDENT REVIEW:
REVISED ZIP / HASH:
OWNER DATA / J9 / RESEARCH / REMOTE MODIFICATIONS: NONE

Stop after local corrected handoff.
