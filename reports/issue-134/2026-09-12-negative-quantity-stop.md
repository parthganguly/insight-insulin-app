# Issue 134 — implementation stopped at negative-quantity contract gate

Date: 2026-09-12
Status: BLOCKED before implementation, following the owner's explicit stop condition.

## Source and preservation

- Exact base: f1db1b7798927bb75a5378f08543e23a4e34385a.
- Task branch: codex/issue-134-fallback-quantity-scaling.
- Task worktree: ../insight-issue-134-fallback-quantity-scaling.
- Canonical worktree remains on codex/j9-hardening-final at the exact base.
- No application, scoring, test, fixture, dataset, or version identifier was changed.
- Only this report was created in the separate task worktree.
- No commit, push, merge, issue closure, provider call, or owner-database access.

Canonical untracked J9 reports, SHA-256:
- j9-baseline-1-device-recheck.md:
  57828287E154A17534FD31C79CA27449169BA20A21257ADF9437708D4CAA83A5
- j9-post-stay-navigation.md:
  FFBB30C0177C025F2774042394B7AA794596120B663955285C3192EC9A5F6F3D

## Approved contract

Nutrition fields remain per-unit. Both fallback branches must calculate the
existing per-unit load with the existing coefficients and then multiply the
result by consumed quantity exactly once. Quantity zero must produce load zero.
All other source, confidence, quality, precedence, FII, payload, persistence,
historical-data, and claim semantics must be preserved.

The current FastAPI/Python scorer is the current implementation. insight-core
is a compatibility/migration parity component; it is not called by this endpoint.

## Blocking contract finding

The owner instructed: "If fixing #134 would expose a separate negative-quantity
problem, STOP and report it rather than silently inventing new validation semantics."

That condition is met:

- backend/models.py:90 declares MealItemCreate.quantity as an unconstrained float.
  Preview and save both use this model. There is no negative-quantity validator.
- backend/scoring_service.py:60-63 clamps negative effective energy to zero for
  energy-based scoring. Its fallback branches at lines 146-170 ignore quantity.
- backend/api/meals.py:228-283 forwards quantity and nutrients to the scorer, but
  calculates response/storage nutrition totals directly with quantity.
- Therefore negative quantity currently passes POST /meals/preview. Multiplying
  the fallback result by that negative quantity would introduce negative loads
  and acute scores, while FII loads continue to use clamped energy.
- Rust macro_fallback.rs:212-220 explicitly rejects negative/non-finite quantity.
  Its contract is different from the permissive Python request boundary.

Neither clamping quantity, rejecting it, nor special-casing negative inputs is
authorized by the approved multiplication contract. No such change was made.

## Isolated executed evidence

Source tested: the separate worktree at the exact base above.
Used canonical backend/.venv Python 3.13.12 for installed dependencies, with
Python -B and sys.path pointing to the NEW worktree's backend source.
Original api.meals.router mounted on a minimal FastAPI app; HTTPX ASGITransport
sent real HTTP-method/path/JSON requests through request validation and response
serialization. No deployed server, full main startup, or save endpoint was used.

A fresh temporary cwd isolated the relative SQLite path. SQLAlchemy connection
attempts, outbound socket connections, and opens of .env/database files were
guarded to raise. No guard was triggered. No database was created; main and
services were not imported. Windows asyncio's local wakeup pair was initialized
before enabling the outbound guard.

Every request was POST /meals/preview with:
- meal_name: "Synthetic negative quantity probe"
- item name: "synthetic zqxv134"
- quantity: -1
- unit: "serving"
- kcalPerUnit: 200
- carb_g: 30
- protein_g: 10, except omitted in GI-without-protein case
- fat_g: 5
- satFat_g: 2
- FII fields omitted
- GI omitted for rough; gi: 60 for the other two cases.

| Branch | HTTP | Current load | Current acute score | Load after literal multiplication (arithmetic ONLY, NOT executed) |
|---|---:|---:|---:|---:|
| Rough macro | 200 | 21.21 | 70.7 | -21.21 |
| GI + carbohydrate + protein | 200 | 13.799999999999999 | 46.0 | approximately -13.8 |
| GI + carbohydrate, protein omitted | 200 | 10.799999999999999 | 36.0 | approximately -10.8 |

All three returned kcal_total=-200, item kcal_item=-200, persisted=false,
source=macro_fallback, estimate_quality=low, estimate_status=estimated.
Confidence was respectively 0.5, 0.8, 0.7. Assertions verified all HTTP statuses,
loads, confidence/source, negative calorie totals, persistence markers, and
isolation. Final rerun: 3/3 passed, process exit 0.

Initial probe completed all three request assertions but exited 1 during
TemporaryDirectory cleanup because Windows could not remove the process's cwd.
The isolated rerun avoided that harness cleanup issue and exited 0.
No application failure was suppressed.

## Frozen equivalent-intake BEFORE → AFTER

The earlier frozen reproduction at the same base used 59 isolated preview
requests. These BEFORE values are prior recorded evidence, not new corrected
endpoint results. All figures below are insulin loads.

| Case | BEFORE | AFTER |
|---|---|---|
| Rough: 2 ordinary / 1 double serving | 21.21 / 42.42 | Not executed: stopped before correction |
| GI + protein: 2 ordinary / 1 double | 13.8 / 27.6 | Not executed |
| GI without protein: 2 ordinary / 1 double | 10.8 / 21.6 | Not executed |
| Quantity zero: rough / GI+protein / GI-only | 21.21 / 13.8 / 10.8 | Not executed |
| Rough: 1 whole / 2 half-serving rows | 21.21 / 42.42 | Not executed |
| Rough: 2 servings / equivalent 200 g / equivalent 200 ml | 21.21 / 0.2121 / 0.2121 | Not executed |
| Provided FII 50: 2 ordinary / 1 double | 200 / 200 | Not executed |
| Exact white bread: 2 ordinary / 1 double | 400 / 400 | Not executed |
| Unknown: 2 ordinary / 1 double | 0 / 0 | Not executed |

No corrected-endpoint or preview/save parity success is claimed.

## Versioning ruling

AGENTS.md:116-120 explicitly requires a formula-version change for every
approved scientific change. Issue 134 changes scientific outputs for quantity
other than one and is approved under those protected-scoring rules.
Therefore implementation requires a formula-version change even though the
coefficients remain fixed. Retaining current_backend_v1 for corrected behavior
would not satisfy that rule. This is not ambiguous under the current instructions.

Current identifiers:
- backend/validation/export_golden_fixtures.py: FORMULA_VERSION = current_backend_v1
- crates/insight-core/src/domain.rs: FormulaVersion::CurrentBackendV1 and
  CURRENT_FORMULA_VERSION.

No identifiers were changed because implementation stopped earlier. This is
temporary preservation of the unmodified base, not a ruling to retain the old
version for the correction. No dataset version change is needed for an unchanged
dataset. No golden files were regenerated or updated.

## Verification status

- Negative-quantity POST /meals/preview characterization: PASS, 3/3, exit 0.
- Source/worktree preservation: verified before and after the investigation.
- Full backend unit suite: NOT RUN — stopped before implementation.
- Backend validation: NOT RUN.
- Golden export/check: NOT RUN; no golden changes.
- cargo fmt --all -- --check: NOT RUN.
- cargo clippy --workspace --all-targets -- -D warnings: NOT RUN.
- cargo test --workspace: NOT RUN.
- Frontend typecheck/unit suite/production build: NOT RUN.
- Corrected frozen cases and preview/save parity regression tests: NOT RUN.

The implementation is incomplete. Required checks have not passed, so the
requested condition for a local implementation commit has not been met.

## Downstream effects and decision needed

A literal correction with currently accepted negative quantities would generate
negative fallback loads and acute scores. Save shares model_meal and could persist
those results. Driver ordering and chronic DIL/DII would then consume them.
These save/chronic effects are source-derived, not executed against a database.

Before resumption, explicitly decide the Python negative-quantity contract,
including HTTP preview/save validation and direct raw-scorer callers. Rejecting
negative quantities rather than treating them as consumed intake is an option
for approval, not an implemented decision. It changes currently accepted input
behavior and therefore cannot be silently included.

After that decision, the original bounded implementation, version change,
regression coverage, all required checks, before/after evidence, and independent
review of the actual scoring diff remain outstanding. No scoring diff exists
yet for independent review.

Coefficients, K_EST, quality/confidence semantics, dataset/mappings,
decomposition, recognition, frontend payloads/UI, claims, and historical rows
were unchanged. No migration or backfill occurred.
