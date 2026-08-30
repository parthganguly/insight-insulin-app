# Issue #97 — estimate completeness status implementation report

## Scope

This change updates the current FastAPI/Ionic compatibility implementation and
the maintained Rust parity component. It does not add a native client, change
the target architecture, or alter any scoring formula.

The new meal-level `estimate_status` is separate from `estimate_quality`:

- `estimate_quality` continues to describe source/evidence-match quality.
- `estimate_status` is `insufficient_data` when any positive-portion item
  resolves through `exact_fii`, `mapped_fii`, or `user_confirmed` and its raw
  per-unit energy is not finite and greater than zero. Otherwise it is
  `estimated`.

No food-name heuristic, derived item energy, meal total, score, confidence, or
quality field participates in the completeness predicate.

## Before and after

### Issue #97 case

| | Positive portion | Resolved source | kcal per unit | Acute score | Estimate quality | Estimate status | Presentation |
|---|---:|---|---:|---:|---|---|---|
| Before | yes | `exact_fii` | 0 | 0 | `high` | absent | Normal score presentation was possible |
| After | yes | `exact_fii` | 0 | 0 | `high` | `insufficient_data` | “Hard to estimate from this meal”; score 0 is disclosure-only partial model output |

The arithmetic and source-quality result are intentionally unchanged.

### Controls

- A positive-portion white-bread exact-FII control at 200 kcal per unit remains
  `estimated`, `high`, with insulin load 200 and acute score
  666.6666666666667.
- A macro-fallback item with zero per-unit energy but otherwise valid fallback
  inputs remains governed by the existing macro formula: insulin load 16.8,
  acute score 56.00000000000001, `low` quality, and `estimated` status. Issue
  #97 does not newly mark it insufficient.
- Empty and unknown-source meals are `estimated` under the narrow completeness
  predicate; their existing `unknown` quality still forces the hard-to-estimate
  presentation.

## Persistence and compatibility

There is no database migration and no `estimate_status` column. Fresh preview
and save responses use the shared `model_meal` result. GET hydration and
idempotent replay derive the same status from persisted `quantity`,
`kcal_per_unit`, and standardized `fii_source`.

Missing persisted sources standardize to `unknown`; no source is inferred from
food name, stored FII, or meal quality. Existing frontend cache entries may omit
the optional status and keep their legacy presentation until canonical backend
hydration refreshes them.

## Frontend presentation

`insufficient_data` forces the existing hard-to-estimate result even when the
finite score is 0 and source quality is high. Saved detail keeps a finite value
only in Advanced details as partial model output. Journal metadata retains the
meal time but omits both the numeric estimate token and the compact “Data
quality” label, which could otherwise be read as overall completeness.

## Versioning decision

- Scoring formula version remains `current_backend_v1` because no arithmetic,
  coefficient, hierarchy, threshold, or confidence changed.
- Golden fixture schema changes from 1 to 2 because serialized result objects
  now include `estimate_status`.
- The pre-1.0 Rust crate version changes from `0.1.0` to `0.2.0` because adding
  `estimate_status` changes the serialized/public result contract. This is a
  contract version change, not a formula version change.

## Protected-boundary statement

Unchanged: FII data and mappings, decomposition, source hierarchy,
`REFERENCE_MEAL_INSULIN_LOAD`, `K_EST`, acute/chronic arithmetic, confidence,
`estimate_quality`, score thresholds, idempotency fingerprinting, persistence
schema, image retention, consent/privacy behavior, and the B2-2 estimate-state
machine.

## Verification

| Gate | Result |
|---|---|
| Backend full suite | PASS — 98 tests |
| Scientific validation | PASS — 6/6 synthetic consistency cases; this is not clinical validation |
| Golden export check | PASS — schema-v2 fixtures current |
| Frontend typecheck | PASS |
| Frontend source and Cypress lint | PASS |
| Frontend full lint | BLOCKED outside tracked source — ignored generated Android `build/.../native-bridge.js` references an unavailable ESLint rule; a clean checkout/CI does not contain this ignored build artifact |
| Frontend unit suite | PASS — 598 tests |
| Frontend production build | PASS — existing bundle-size advisory only |
| Journal Cypress | PASS — 15/15 in Electron, including the #97 metadata assertion |
| J7 Cypress | PASS — 15/15 in Chrome, including the #97 disclosure-only assertion; an Electron run passed 12/15 but hit three pre-existing Windows harness failures in focus/screenshot-only checks |
| Rust format | PASS |
| Rust clippy | PASS with warnings denied |
| Rust workspace tests | PASS — 167 unit + 44 golden tests |
| `git diff --check` | PASS |

## Independent review and residual risks

A different model completed a read-only review of the complete uncommitted
diff, including the untracked helper, focused backend tests, and this report.
Verdict: **no actionable findings**. The reviewer made no changes.

Residual risks are limited to the approved compatibility boundaries:

- No realistic historical `estimate_quality=high` plus NULL/unknown item-source
  row was found. If one is found later, it is the documented stop-condition
  inconsistency and must be reported rather than “fixed” by inferred provenance.
- Locally cached frontend meals without `estimate_status` intentionally keep
  legacy behavior until canonical backend hydration.
- Full local frontend lint remains obstructed by the ignored generated Android
  build asset described above; source+Cypress lint passes, and clean CI should
  confirm the repository-wide lint gate without that local artifact.

No commit, push, or pull request is part of this handoff.
