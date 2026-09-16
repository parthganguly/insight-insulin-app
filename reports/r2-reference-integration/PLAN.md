# R2 reference integration pre-edit plan

Base/HEAD: cb6083f8386bb0464b1f94ca0a2f7d49c3e55c16; branch codex/r2-reference-meal-integration.

Current behavior: api.meals model_meal captures current_backend_v2 and loaded legacy CSV identity, computes compatibility values, and build_meal_db constructs rows. create_meal commits once and replays the unique request-ID winner. The new unmounted experimental migration component reuses modeling/row construction without selected FII inputs and attaches an independent immutable assessment before that one commit.

Files: new experimental_reference contract/service/router modules, db.py and db_models.py (nullable TEXT only), focused HTTP/persistence/migration tests, production import-reachability test, separate synthetic goldens/checker, integration decision/docs and retained evidence. Existing catalog/source/scorer/request/response/Rust/frontend files remain numerically unchanged.

Request assumptions: flat ordered rows; explicit per-unit kcal denominator equals quantity unit; optional macro/GI context retained with missingness; declared nutrition origin is unverified user input. Meal title/time retain legacy non-material replay semantics (first accepted values win). Request fingerprint domain includes all normalized item fields/order and expected catalog version. Numeric strings and booleans are rejected.

Result: experimental/unavailable; item calculated/unavailable/not_consumed. Null total on any unavailable consumed row; zero only for nonconsumption or genuine zero FII with positive energy. Old rows: not_evaluated. Corrupt/unsupported stored evidence: evidence_error, no current-catalog read/recalculation/raw-content exposure.

Tests: isolated FastAPI app with actual new router, synthetic temporary SQLite, atomic rollback and real concurrent uniqueness races; strict boundary/quantity/missingness/pinning/snapshot/read/replay/delete/migration, legacy characterization/response invariance; independent Decimal expected-value checker and synthetic goldens. Full backend/validation/golden-export/build check/compile; Rust fmt/clippy/test. Frontend/browser deferred because unchanged.

Risks: experimental arithmetic is newly authorized and separately versioned, not physiological validation. Prevent snapshot spoofing, partial totals, two-version mixing, late catalog reads and partial persistence. Additive schema only; no owner DB. Obtain independent staged-diff review before packaging exact changed files/base copies/binary patch/logs and verified scratch-base application.
