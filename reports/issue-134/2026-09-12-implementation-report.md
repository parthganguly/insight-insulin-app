# Issue 134 — per-unit fallback quantity correction

Date: 2026-09-12
Status: implementation complete; all required local checks pass.

## Exact source and authorization

- Exact base: `f1db1b7798927bb75a5378f08543e23a4e34385a`.
- Branch: `codex/issue-134-fallback-quantity-scaling`.
- Exact implementation/tested-source HEAD: `896c94662a2f2008a0621c652c49d758e67a5f44`.
- Existing task worktree: `../insight-issue-134-fallback-quantity-scaling`.
- This report is committed separately after that implementation commit; no
  application change is included in the report-only commit.
- Owner approval: https://github.com/parthganguly/insight-insulin-app/issues/134#issuecomment-5644332385,
  plus the explicit task instruction to use `current_backend_v2`.
- The canonical J9 worktree was not used for edits, checks, dependency installation,
  or commits during this resumed implementation. All work used the existing
  separate worktree. The canonical branch and its two untracked reports were not changed.
- Preserved blocker report: `2026-09-12-negative-quantity-stop.md`, unchanged
  SHA-256 `B8584DAACEDE3AE5DA04AED5FDDE0C131C4B883D8797820F34AB357D866520C3`.
  It records the earlier stop, not the final implementation status.

## Approved contract and implementation

The Python/FastAPI scorer is the **current implementation**. Rust insight-core
is the **compatibility/migration component**; the preview endpoint does not call
Rust. No target-native or deferred architecture work was introduced.

All request/scoring nutrition fields remain **per-unit**. In both the GI branch
(with or without protein) and the rough-macro branch:

```text
existing per-unit fallback calculation × consumed quantity exactly once
= item insulin load
```

The authoritative Python scorer adds only an early negative-quantity guard and
the final multiplication in its two fallback branches. Rust adds the corresponding
final multiplication. Neither layer multiplies the nutrient values first.
Provided/exact/mapped FII and decomposition continue to use their already-scaled
energy paths.

Negative quantity is invalid. The shared `MealItemCreate` request field uses
`Field(ge=0)`, so preview and save return HTTP 422 with error location
`body.items.0.quantity`. The raw Python scorer raises
`ValueError("Quantity must be non-negative")` before any branch selection.
There is no clamp. Zero remains allowed, retains branch/source/confidence/quality/
completeness semantics, and produces zero fallback load. Rust's existing negative
and non-finite quantity rejection is unchanged.

Because the response model inherits the request model, `MealItemResponse.quantity`
explicitly remains unconstrained. This preserves reading synthetic pre-v2 negative
quantities without rescoring or mutating historical data. A regression test covers
that compatibility boundary. No table, migration, stored fingerprint, or idempotency
code changed.

## Formula and dataset version

`current_backend_v1 → current_backend_v2` is the explicitly approved formula
behavior change required by AGENTS.md. Python golden metadata, golden index/cases,
Rust `CURRENT_FORMULA_VERSION`, runtime result metadata, and version expectations
now consistently identify v2.

Rust retains the V1 enum variant and its deserialization for historical metadata;
this does not select an old scoring algorithm. No other scoring change is included.

Dataset version is unchanged:
`fii_foods_csv_fnv1a64_250e9dfc91988b6b`. Its pinned Rust test passes and the CSV
has no diff. No dataset import, coefficient calibration, or scientific revalidation
is claimed.

## BEFORE → AFTER: frozen HTTP preview evidence

Replayed the exact 59 frozen requests from the earlier reproduction at the exact
base commit. The checked-in `preview-before-after.json` contains every request,
the original and corrected load/acute values as serialized JSON floats, unchanged
nutrition/status/quality fields, sources/confidences, original evidence SHA-256,
and corrected-source SHA-256 values.

**59/59 replay checks passed.** Every HTTP response was 200 with
`persisted: false`. Per-item comparison verified that only fallback load changes
by quantity; FII/unknown controls and all other returned fields remained unchanged,
apart from the resulting meal load and acute score.

Synthetic ordinary serving: name `synthetic zqxv134`, kcal 200, carbohydrate 30 g,
protein 10 g, fat 5 g, saturated fat 2 g, all per unit. GI is omitted for rough
fallback and 60 for the GI branches; protein is omitted for GI-without-protein.
Provided FII is omitted. A double serving doubles per-unit energy and nutrients.
The equivalent 200 g/ml representation uses quantity 200 with per-unit values
divided by 100 (2 kcal, .3 g carbohydrate, .1 g protein, .05 g fat, .02 g saturated
fat, with the same omissions/GI). Both represent the same intake as 2 servings.

Values below are insulin loads, displayed with six significant digits. Exact
serialized binary-floating-point values are retained in the JSON evidence.

| Branch | Representation | BEFORE | AFTER |
|---|---|---:|---:|
| Rough macro | 2 ordinary servings | 21.21 | 42.42 |
| Rough macro | 1 double serving | 42.42 | 42.42 |
| Rough macro | 1 whole serving | 21.21 | 21.21 |
| Rough macro | 2 half-serving rows | 42.42 | 21.21 |
| Rough macro | quantity 0 | 21.21 | 0 |
| Rough macro | quantity 0.5 | 21.21 | 10.605 |
| Rough macro | quantity 3 | 21.21 | 63.63 |
| Rough macro | equivalent 200 g | 0.2121 | 42.42 |
| Rough macro | equivalent 200 ml | 0.2121 | 42.42 |
| GI + carbohydrate + protein | 2 ordinary servings | 13.8 | 27.6 |
| GI + carbohydrate + protein | 1 double serving | 27.6 | 27.6 |
| GI + carbohydrate + protein | 1 whole serving | 13.8 | 13.8 |
| GI + carbohydrate + protein | 2 half-serving rows | 27.6 | 13.8 |
| GI + carbohydrate + protein | quantity 0 | 13.8 | 0 |
| GI + carbohydrate + protein | quantity 0.5 | 13.8 | 6.9 |
| GI + carbohydrate + protein | quantity 3 | 13.8 | 41.4 |
| GI + carbohydrate + protein | equivalent 200 g | 0.138 | 27.6 |
| GI + carbohydrate + protein | equivalent 200 ml | 0.138 | 27.6 |
| GI + carbohydrate, protein omitted | 2 ordinary servings | 10.8 | 21.6 |
| GI + carbohydrate, protein omitted | 1 double serving | 21.6 | 21.6 |
| GI + carbohydrate, protein omitted | 1 whole serving | 10.8 | 10.8 |
| GI + carbohydrate, protein omitted | 2 half-serving rows | 21.6 | 10.8 |
| GI + carbohydrate, protein omitted | quantity 0 | 10.8 | 0 |
| GI + carbohydrate, protein omitted | quantity 0.5 | 10.8 | 5.4 |
| GI + carbohydrate, protein omitted | quantity 3 | 10.8 | 32.4 |
| GI + carbohydrate, protein omitted | equivalent 200 g | 0.108 | 21.6 |
| GI + carbohydrate, protein omitted | equivalent 200 ml | 0.108 | 21.6 |

Examples of floating-point representation: rough 200 g/ml returns
`42.419999999999995` vs `42.42` for 2 servings; GI-only 200 g/ml returns `21.6`
vs `21.599999999999998`. Invariants compare within 1e-9; no rounding was added
to the scorer.

The corrected rough A/B acute scores both equal 141.4; GI+protein both 92.0;
GI-only both 72.0. Zero fallback acute scores are 0.

Unchanged frozen A/B controls:
- Provided FII 50: load 200 / 200.
- Exact white bread: load 400 / 400.
- Unknown with omitted nutrients: load 0 / 0.
- Non-positive/blank provided FII still selects fallback.
Additional HTTP regressions cover mapped chicken biryani (quantity 2: load 189.6),
both FII request aliases, and confidence/source preservation.

Negative requests are covered separately: 7 source/branch profiles × preview/save
produce 14 HTTP 422 results before the scorer is called; 7 direct raw-scorer
calls raise the specified ValueError. No invalid meal is saved.

## Regression and golden changes

Backend regression additions reuse the isolated preview test infrastructure:
- Three fallback branches × whole, two units, double unit, two half rows,
  equivalent g, equivalent ml, and zero.
- Invariant comparisons across load, acute score, and all returned nutrition totals.
- 21 preview/save HTTP pairs compare the entire modeled response after excluding
  only save identity/time and preview's persistence marker.
- Negative requests/raw callers across fallback/provided/exact/mapped/unknown paths.
- Provided/exact/mapped/unknown controls; non-positive/blank canonical and legacy FII fields.
- Synthetic historical negative-quantity read without rescoring.

Rust adds matching whole/double/split/density/zero tests through unified meal
aggregation for all three fallback branches, checking kinds, confidence, source,
and v2 metadata. Existing invalid-quantity tests remain active.

Golden export was generated into a temporary candidate directory and structurally
compared before writing the tracked files:
- All 7 golden JSON files change formula metadata to v2.
- The 5 non-driver case files and index have no other semantic changes.
- Existing driver inputs and expected outputs are unchanged.
- The driver case adds `driver_fallback_quantity`: rough q=2, GI+protein q=2,
  GI-only q=2, rough q=0. Independently derived loads are
  `42.42 + 27.6 + 21.6 + 0 = 91.62`, acute 305.4. Its exact top-three drivers
  and four macro source labels are added.
- Cross-language golden tests consume this added meal through Rust `score_meal`;
  an independent numeric assertion pins the 91.62 total.
- The only changed pre-existing Rust numeric expectation is the GI+protein
  q=1.5 test: `16.8 → 25.2`. Other changed expectations only identify v2.
- No fixtures were regenerated to conceal unrelated numerical failures.

## Verification: exact final results

All commands below ran against the separate task worktree.

| Check | Command / method | Final result |
|---|---|---|
| Backend full unit suite | `python -m unittest discover -s tests -v` via isolated discovery runner | PASS: 102 tests, 0 failures/errors |
| Backend validation | `python -m validation.run_validation` | PASS: 6/6 cases |
| Golden export | `python -m validation.export_golden_fixtures` | PASS: 7 files, reviewed diff |
| Golden check | `python -m validation.export_golden_fixtures --check` | PASS: fixtures current |
| Rust format | `cargo fmt --all -- --check` | PASS, exit 0 |
| Rust lint | `cargo clippy --workspace --all-targets -- -D warnings` | PASS, exit 0 |
| Rust full tests | `cargo test --workspace` | PASS: 168 unit + 44 golden; 0 doc tests; 0 failures |
| Frontend typecheck | `npx tsc --noEmit` | PASS, exit 0 |
| Frontend full unit suite | `npm run test.unit -- --run` with documented Node flags below | PASS: 703 tests, 60 files |
| Frontend production build | `npm run build` | PASS, exit 0 |
| Frontend lint (additional CI check) | `npm run lint` | PASS, exit 0 |
| Frozen preview replay | HTTPX ASGITransport, original router | PASS: 59/59 |
| Diff hygiene | `git diff --cached --check` | PASS |

Runtime: Python 3.13.12, FastAPI 0.138.0, HTTPX 0.28.1, SQLAlchemy 2.0.51,
Pydantic 2.13.4; Rust/cargo 1.96.0; Node 26.5.0, npm 11.17.0, Vitest 0.34.6.
The original frozen run used FastAPI 0.139.0; all original payloads were replayed
unchanged against the task source and runtime above.

Backend checks used a temporary cwd and synthetic test databases under the system
temp directory. The runner disabled dotenv loading, supplied a dummy synthetic
API key for mocked tests, rejected database paths outside temp and non-loopback
socket connections. Existing provider-related unit tests use mocks; no live
recognition/provider call was made. Frozen preview replay was stricter: no DB
connections or socket connections at all, no main/services imports, zero attempts.

Frontend dependencies were installed only in the separate worktree from its
unchanged lockfile (`CYPRESS_INSTALL_BINARY=0 npm ci --no-audit --no-fund`).
Final full-unit environment:
`NODE_OPTIONS=--no-experimental-webstorage`,
`VITEST_MAX_THREADS=2`, `VITEST_MIN_THREADS=1`.
These are existing J9-documented host accommodations. They preserve normal
Vitest isolation and every test/assertion/timeout; no frontend source/config changed.

Earlier check results, retained honestly:
- First Rust run before golden export: unit tests passed; 3 golden tests failed
  because tracked files still had v1 metadata and lacked the new input meal.
  Reviewed export resolved them; final 212 Rust tests pass.
- First frontend unit run without the documented host flag: 202 failed / 501
  passed, 23 failed / 37 passed files, due to Node 26's global Web Storage conflict
  with jsdom. Final documented-environment run passed all 703.
- Build retains the existing >500 kB chunk advisory; it exits 0. Dependency
  deprecation/install-script notices were not addressed in this scoring task.
- No Python formatter/linter is configured in the backend CI; Rust formatting
  and lint plus frontend lint were executed as listed.

## Downstream effects and non-claims

Newly modeled fallback item loads now reflect consumed quantity, and therefore
new meal totals and acute scores may change. Nutrition totals already scaled by
quantity and are unchanged. Driver ordering may change when different items have
different quantities; the ranking algorithm is unchanged. Preview and save use
the same scorer and remain equal for identical valid inputs; idempotency tests pass.

Existing stored loads/scores/quantities are read as stored. No migration, backfill,
automatic rescore, or per-row version-schema change occurs. New saved results may
therefore coexist with historical v1 results; DIL/DII and logged trends consume
stored values under their unchanged aggregation rules. This is an acknowledged
historical comparability limitation, not permission to rewrite history.

K_EST, every coefficient, branch precedence, macro sources/confidence, estimate
quality/completeness semantics, FII dataset/mappings, decomposition rules,
recognition, frontend payloads/UI, protected copy, and historical rows were unchanged.
No real meal data, owner database, photographs, live providers, research exports,
or telemetry changes were involved.

This corrects implementation/unit consistency. It does not validate coefficients,
dataset, calibration, confidence probabilities, or personal physiological response.
No diagnosis, insulin dosing, stronger scientific claim, native migration, or
recognition change is introduced.

## Independent review

A different agent reviewed the staged scientific diff and frozen evidence:
no actionable correctness or scope findings. The reviewer independently checked
the 59 evidence records and six corrected-source hashes, historical response
compatibility, version consistency, and golden delta. Test-suite execution was
performed by the implementing agent; the reviewer did not rerun suites.

Committed-diff confirmation: **PASS, no actionable findings** for
`896c94662a2f2008a0621c652c49d758e67a5f44` against the exact base.
The reviewer confirmed all 25 originally reviewed staged paths have identical
committed blob IDs. The only additional committed file was the preserved blocker
report, whose SHA-256 was independently rechecked. Committed diff hygiene passes.
This final report is a documentation-only follow-up; the reviewed application
diff is unchanged. No implementation review finding remains unresolved.
No push, merge, or issue closure was performed.

## Files changed

- `backend/models.py`
- `backend/scoring_service.py`
- `backend/tests/test_meal_preview.py`
- `backend/validation/export_golden_fixtures.py`
- `backend/validation/fixtures.py`
- `crates/insight-core/README.md`
- `crates/insight-core/fixtures/golden/cases/chronic_low_then_high_01.json`
- `crates/insight-core/fixtures/golden/cases/driver_ranking_adversarial_01.json`
- `crates/insight-core/fixtures/golden/cases/monotonicity_biryani_portion_01.json`
- `crates/insight-core/fixtures/golden/cases/ranking_relative_01.json`
- `crates/insight-core/fixtures/golden/cases/source_quality_hierarchy_01.json`
- `crates/insight-core/fixtures/golden/cases/uncertainty_degradation_01.json`
- `crates/insight-core/fixtures/golden/index.json`
- `crates/insight-core/src/direct_fii.rs`
- `crates/insight-core/src/domain.rs`
- `crates/insight-core/src/exact_fii.rs`
- `crates/insight-core/src/fii_lookup.rs`
- `crates/insight-core/src/macro_fallback.rs`
- `crates/insight-core/src/mapped_fii.rs`
- `crates/insight-core/src/metadata.rs`
- `crates/insight-core/src/scoring.rs`
- `crates/insight-core/src/unified_fii.rs`
- `crates/insight-core/tests/golden_fixtures.rs`
- `docs/engineering-model.md`
- `reports/issue-134/2026-09-12-negative-quantity-stop.md`
- `reports/issue-134/preview-before-after.json`
- `reports/issue-134/2026-09-12-implementation-report.md`
