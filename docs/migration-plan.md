# Native Rust Migration Plan

Last updated: 2026-06-16

## Scope

This plan documents an incremental migration from the current Ionic React, Capacitor, FastAPI, Python, and SQLite prototype toward the already-approved native Android plus Rust architecture. It does not select frameworks, reopen the architecture decision, create Rust or Kotlin projects, change application code, or remove legacy code.

The plan is based on the current repository contents, not only on the architecture documents. Where the current code differs from older audit notes, the current code is treated as the actual behavior to preserve or replace.

GitHub issue #2 is a mandatory guardrail for this revision. This plan must preserve the current FII-based acute model, DIL/DII chronic model, source-quality fields, uncertainty handling, validation fixtures, and backend-owned scoring during migration unless a separate evidence-backed scientific-change issue approves a change. Implementation parity, scientific validation, AI recognition accuracy, and FII dataset coverage are separate tracks. Matching Rust to Python proves a faithful port; it does not by itself prove that formulas, coefficients, thresholds, mappings, or confidence rules are scientifically validated.

## Component Labels

Every component below uses one of these labels:

- PRESERVE - keep as-is or as the behavioral/product reference.
- PORT - move behavior into the Rust core or native client.
- REPLACE - implement a target-architecture replacement after parity is defined.
- DEFER - do later after prerequisites are met.
- RETIRE AFTER PARITY - keep during migration, then remove only after explicit exit criteria are met.

## Files Inspected

Documentation:

- GitHub issue #2, "Revise migration plan while preserving the evidence-grounded scientific core"
- `AGENTS.md`
- `docs/target-architecture.md`
- `docs/scientific-model.md`
- `docs/engineering-model.md`
- `docs/code-audit.md`
- `docs/scientific-validation-plan.md`
- `README.md`

Backend:

- `backend/main.py`
- `backend/api/meals.py`
- `backend/models.py`
- `backend/db_models.py`
- `backend/db.py`
- `backend/scoring_service.py`
- `backend/chronic_service.py`
- `backend/estimate_quality.py`
- `backend/fii_lookup.py`
- `backend/fii_foods.csv`
- `backend/food_normalizer.py`
- `backend/services.py`
- `backend/utils.py`
- `backend/validation/run_validation.py`
- `backend/validation/fixtures.py`
- `backend/validation/evaluators.py`
- `backend/validation/schemas.py`
- `backend/requirements.txt`
- `backend/test.py`

Frontend:

- `frontend/src/App.tsx`
- `frontend/src/api/api.ts`
- `frontend/src/types/Meal.ts`
- `frontend/src/types/MealItem.ts`
- `frontend/src/utils.ts`
- `frontend/src/stores/currentMealStore.ts`
- `frontend/src/stores/persistentMealStore.ts`
- `frontend/src/stores/extractAiMealDataStore.ts`
- `frontend/src/stores/settingsStore.ts`
- `frontend/src/pages/meal/AiMealAdd.tsx`
- `frontend/src/pages/meal/PreviewMeal.tsx`
- `frontend/src/pages/meal/Meals.tsx`
- `frontend/src/pages/dashboard/Dashboard.tsx`
- `frontend/src/pages/settings/Settings.tsx`
- `frontend/src/components/AcuteScoreProgressbar.tsx`
- `frontend/src/components/NutrimentComponent.tsx`
- `frontend/src/App.test.tsx`
- `frontend/cypress/e2e/test.cy.ts`
- `frontend/package.json`
- `frontend/config.json`
- `frontend/capacitor.config.ts`
- `frontend/android/app/src/main/AndroidManifest.xml`

Repository inventory and search:

- `rg --files`
- `rg -n "barcode|app\.db|localStorage|persist|calculate|acute_score|chronic|fii_source|why|SQLCipher|Keystore|Keychain|research|consent|image|OPENAI_API_KEY|allow_origins|save_base64" .`

## Commands Inspected

Successful commands:

```powershell
Get-Content -Raw AGENTS.md
gh issue view 2 --repo parthganguly/insight-insulin-app --json number,title,state,author,body,comments,labels,url
Get-Content -Raw docs\target-architecture.md
Get-Content -Raw docs\scientific-model.md
Get-Content -Raw docs\engineering-model.md
Get-Content -Raw docs\code-audit.md
Get-Content -Raw docs\scientific-validation-plan.md
Get-Content -Raw README.md
Get-Content -Raw backend\main.py
Get-Content -Raw backend\api\meals.py
Get-Content -Raw backend\models.py
Get-Content -Raw backend\db_models.py
Get-Content -Raw backend\db.py
Get-Content -Raw backend\scoring_service.py
Get-Content -Raw backend\chronic_service.py
Get-Content -Raw backend\estimate_quality.py
Get-Content -Raw backend\fii_lookup.py
Get-Content -Raw backend\food_normalizer.py
Get-Content -Raw backend\services.py
Get-Content -Raw backend\utils.py
Get-Content -Raw backend\validation\run_validation.py
Get-Content -Raw backend\validation\fixtures.py
Get-Content -Raw backend\validation\evaluators.py
Get-Content -Raw backend\validation\schemas.py
Get-Content -Raw backend\requirements.txt
Get-Content -Raw backend\test.py
Get-Content -Raw frontend\src\App.tsx
Get-Content -Raw frontend\src\api\api.ts
Get-Content -Raw frontend\src\types\Meal.ts
Get-Content -Raw frontend\src\types\MealItem.ts
Get-Content -Raw frontend\src\utils.ts
Get-Content -Raw frontend\src\stores\currentMealStore.ts
Get-Content -Raw frontend\src\stores\persistentMealStore.ts
Get-Content -Raw frontend\src\stores\extractAiMealDataStore.ts
Get-Content -Raw frontend\src\stores\settingsStore.ts
Get-Content -Raw frontend\src\pages\meal\AiMealAdd.tsx
Get-Content -Raw frontend\src\pages\meal\PreviewMeal.tsx
Get-Content -Raw frontend\src\pages\meal\Meals.tsx
Get-Content -Raw frontend\src\pages\dashboard\Dashboard.tsx
Get-Content -Raw frontend\src\pages\settings\Settings.tsx
Get-Content -Raw frontend\src\components\AcuteScoreProgressbar.tsx
Get-Content -Raw frontend\src\components\NutrimentComponent.tsx
Get-Content -Raw frontend\src\App.test.tsx
Get-Content -Raw frontend\cypress\e2e\test.cy.ts
Get-Content -Raw frontend\package.json
Get-Content -Raw frontend\config.json
Get-Content -Raw frontend\capacitor.config.ts
Get-Content -Raw frontend\android\app\src\main\AndroidManifest.xml
Import-Csv backend\fii_foods.csv | Select-Object -First 12 | Format-Table -AutoSize | Out-String -Width 200
(Import-Csv backend\fii_foods.csv | Measure-Object).Count
rg --files
rg --files -g '*test*' -g '*spec*' -g '*.cy.ts'
rg -n "barcode|app\.db|localStorage|persist|calculate|acute_score|chronic|fii_source|why|SQLCipher|Keystore|Keychain|research|consent|image|OPENAI_API_KEY|allow_origins|save_base64" .
```

Failed command:

```powershell
@'
from db_models import Base
for table in Base.metadata.sorted_tables:
    print(table.name)
    for col in table.columns:
        print(f"  {col.name}: {col.type} nullable={col.nullable} primary_key={col.primary_key}")
'@ | python -
```

This failed because `sqlalchemy` is not installed in the current shell environment. The SQLite schema below is therefore taken directly from `backend/db_models.py` and the lightweight migration helper in `backend/db.py`.

## 1. Current Repository Map

### Documentation

- PRESERVE: `docs/scientific-model.md` defines the scientific basis and non-claims.
- PRESERVE: `docs/engineering-model.md` defines current scoring contract requirements.
- PRESERVE: `docs/scientific-validation-plan.md` defines scientific validation goals.
- PRESERVE: `docs/target-architecture.md` defines the approved target architecture.
- PRESERVE: `AGENTS.md` defines repository-specific agent boundaries.
- RETIRE AFTER PARITY: `docs/code-audit.md` is useful historical context, but some findings are stale because current code already added DIL/DII chronic aggregation, `why`, standardized source labels, meal totals, `estimate_quality`, and `main_insulin_drivers`.
- PRESERVE: `README.md` describes current setup and validation commands.

### Backend

- PRESERVE: `backend/main.py` is the FastAPI application shell and hosts the `/ai-meal-extract` AI-gateway endpoint. The AI gateway remains in Python/FastAPI per the target architecture and is not retired at scoring parity.
- PORT: the chronic DIL/DII computation currently reached through `backend/main.py` `/metrics/chronic` moves to Rust; the HTTP endpoint remains as a compatibility shim until the Ionic client retires.
- PORT: deterministic scoring orchestration inside `backend/api/meals.py` moves to Rust, including item scoring, acute score, estimate quality, and main drivers.
- RETIRE AFTER PARITY: the `backend/api/meals.py` `POST /meals` and `GET /meals` HTTP/DB mapping surface retires only with the Ionic compatibility timeline, not merely when Rust scoring matches Python.
- PORT: `backend/scoring_service.py` contains the deterministic acute scoring logic to move into Rust.
- PORT: `backend/chronic_service.py` contains DIL/DII daily and rolling aggregation logic to move into Rust.
- PORT: `backend/fii_lookup.py` contains FII lookup, alias lookup, normalization, and conservative token matching to move into Rust without changing mappings or confidence behavior.
- PORT: `backend/food_normalizer.py` contains mixed-meal decomposition mechanics to move into Rust; the dish-to-component rule table should become versioned data rather than hardcoded compiled logic.
- PORT: `backend/estimate_quality.py` contains estimate-quality classification to move into Rust.
- PRESERVE: `backend/fii_foods.csv` is the current starter FII dataset and should become a versioned dataset input.
- RETIRE AFTER PARITY: `backend/models.py` currently defines Python/Pydantic DTOs and remains the API compatibility reference.
- RETIRE AFTER PARITY: `backend/db_models.py` currently defines the SQLite schema and remains the migration source.
- REPLACE: `backend/db.py` uses SQLAlchemy `create_all` plus ad hoc `ALTER TABLE` migration. Replace with versioned migrations before sensitive local data migration.
- PRESERVE: `backend/services.py` is the current OpenAI-backed AI extraction gateway; Python remains appropriate here during migration.
- REPLACE: `backend/utils.py` saves raw submitted images to `images/` with no retention policy. Replace with explicit temporary image handling before native parity.
- PRESERVE: `backend/validation/` contains current scientific validation fixtures and evaluators.
- RETIRE AFTER PARITY: `backend/test.py` is an ad hoc OpenAI parsing script and should not become target test infrastructure.

### Frontend

- RETIRE AFTER PARITY: `frontend/` is the current Ionic React + Capacitor app and must remain runnable during migration.
- RETIRE AFTER PARITY: `frontend/src/App.tsx` maps current tabs and routes: dashboard, meals, new meal, AI add, settings.
- PRESERVE: `frontend/src/pages/meal/AiMealAdd.tsx` is the current AI meal capture and draft creation flow reference.
- PRESERVE: `frontend/src/pages/meal/PreviewMeal.tsx` is the current review, edit, accept, save, and post-save explanation flow reference.
- PRESERVE: `frontend/src/pages/meal/Meals.tsx` is the current saved-meal reuse flow reference.
- PRESERVE: `frontend/src/pages/dashboard/Dashboard.tsx` is the current dashboard and chronic-metric display reference.
- PRESERVE: `frontend/src/pages/settings/Settings.tsx` is the current profile/settings reference.
- RETIRE AFTER PARITY: `frontend/src/api/api.ts` currently maps between frontend DTOs and FastAPI responses.
- RETIRE AFTER PARITY: `frontend/src/stores/persistentMealStore.ts` persists meals to browser localStorage through Zustand.
- RETIRE AFTER PARITY: `frontend/src/stores/settingsStore.ts` persists settings to browser localStorage through Zustand.
- PRESERVE: `frontend/src/stores/currentMealStore.ts` expresses the draft meal workflow.
- DEFER: `frontend/src/stores/extractAiMealDataStore.ts` appears unused by the inspected AI page; confirm before porting.
- PRESERVE: `frontend/src/types/Meal.ts` and `frontend/src/types/MealItem.ts` are current compatibility DTO references.
- PRESERVE: `frontend/src/components/AcuteScoreProgressbar.tsx` and `frontend/src/components/NutrimentComponent.tsx` are UI behavior references.
- RETIRE AFTER PARITY: `frontend/android/` is the current generated Capacitor Android project.
- REPLACE: `frontend/capacitor.config.ts` uses placeholder app id/name values and belongs to the legacy wrapper, not the native app.

### Tests And Validation

- PRESERVE: `backend/validation/fixtures.py` covers ranking, source quality, monotonicity, chronic trend, and uncertainty degradation.
- PRESERVE: `backend/validation/evaluators.py` computes fixture outcomes against current deterministic Python logic.
- REPLACE: `frontend/cypress/e2e/test.cy.ts` still expects "Tab 1 page" and does not reflect the current app.
- PRESERVE: `frontend/src/App.test.tsx` is a minimal smoke test only.

## 2. Components Worth Preserving

- PRESERVE: The draft to review to authoritative score boundary in `AiMealAdd.tsx`, `PreviewMeal.tsx`, and `api/meals.py`.
- PRESERVE: Backend-derived acute score display through `acute_score`, not frontend recomputation.
- PRESERVE: Backend-derived chronic metrics through `/metrics/chronic`.
- PRESERVE: User correction of meal name, components, portions, nutrition values, FII, and GI before save.
- PRESERVE: Post-save display of `why`, `estimate_quality`, `main_insulin_drivers`, and impact copy.
- PRESERVE: Existing validation case categories: ranking, source quality, monotonicity, chronic trend, uncertainty.
- PRESERVE: Current data contract semantics: client submits raw meal inputs; scoring layer returns derived fields.
- PRESERVE: Current FII source taxonomy: `exact_fii`, `mapped_fii`, `macro_fallback`, `user_confirmed`, `unknown`.
- PRESERVE: Current API compatibility for the Ionic app until the native app and Rust core prove parity.

## 3. Current Scientific Logic That Must Be Protected

- PORT: `compute_kcal_item(quantity, kcal_per_unit)` clamps missing kcal to 0 and negative effective energy to 0.
- PORT: Explicit FII path: user/client-provided FII produces `insulin_load = fii / 100 * kcal_item`, confidence `1.0`, source `user_confirmed`.
- PORT: Mixed-meal detection in `is_likely_mixed_meal` uses phrase connectors, mixed meal markers, and major food tokens.
- PORT: Weighted decomposition first for likely mixed meals via `decompose_food_name_weighted`.
- PORT: FII lookup order: exact normalized food name, exact alias, conservative token subset phrase for non-mixed single foods.
- PORT: Weighted component scoring uses component kcal share and FII lookup for matched components.
- PORT: Mixed decomposition confidence currently uses `0.2 + 0.6 * matched_share + 0.2 * component_confidence`, clamped to `0.25..0.90`.
- PORT: GI/carb/protein macro fallback uses `gl = carb_g * gi / 100`, optional protein term `protein_g * 0.5`, then `K_EST = 0.6`.
- PORT: Rough macro fallback uses carbs, protein, saturated fat, and unsaturated fat with current coefficients, then `K_EST = 0.6`.
- PORT: Unknown fallback returns zero insulin load, confidence `0.2`, source `unknown`.
- PORT: Acute score uses `REFERENCE_MEAL_INSULIN_LOAD = 30.0` and `acute_score = insulin_load_total / reference * 100`.
- PORT: Estimate quality maps all exact/user-confirmed to `high`, exact/mapped/user-confirmed to `medium`, all unknown to `unknown`, and other mixes to `low`.
- PORT: Chronic metrics compute `daily_dil`, `total_daily_energy`, `daily_dii = daily_dil / total_daily_energy`, `rolling_7d_dil`, and `rolling_7d_dii`.
- PRESERVE: No formula, FII mapping, coefficient, threshold, confidence rule, or fallback rule changes during migration. Any such change requires a separate evidence-backed scientific-change issue and a before/after report.
- PRESERVE: `REFERENCE_MEAL_INSULIN_LOAD = 30.0`, macro fallback coefficients, mixed-decomposition weights, and source-quality rules are current implemented behavior. They may be uncalibrated or heuristic, but migration work ports and labels them; it does not silently discard or "fix" them.
- PRESERVE: Scientific validation, calibration, AI recognition accuracy, and FII dataset coverage are not implied by implementation parity.
- PRESERVE: Reference values, traffic-light bands, fallback coefficients, dish priors, and numeric confidence remain calibration and validation work, not migration changes.
- PRESERVE: Scientific non-claims: no exact glucose spikes, no exact insulin levels, no diagnosis, no dosing, no replacement for CGM or clinical testing.
- PRESERVE: Interpretation copy must stay estimate-oriented and quality-aware.

## 4. Current Technical Debt That Must Not Be Copied

- REPLACE: Raw base64 meal images are saved by `save_base64_images` to `images/` without user consent, retention policy, or cleanup.
- REPLACE: FastAPI CORS allows all origins.
- REPLACE: SQLite migrations are ad hoc `ALTER TABLE` checks instead of versioned migration scripts.
- REPLACE: Local persistence in the current frontend uses browser localStorage for meal and settings data.
- PRESERVE: `backend/fii_foods.csv` has only 10 starter placeholder rows with `starter_placeholder` source values. Treat this as a coverage limitation and dataset-versioning input, not a reason to discard the current FII/DIL/DII core.
- REPLACE: The frontend has a client call for `/barcode-meal-item-extract`, but no matching backend route was found in inspected backend files.
- REPLACE: `backend/test.py` is an ad hoc script that calls OpenAI with a public image URL; do not copy this pattern into automated tests.
- REPLACE: Cypress test expects stale content and does not validate current screens.
- REPLACE: Capacitor Android app id/name are placeholders: `io.ionic.starter` and `Insulin Spike Tracker`.
- REPLACE: Current code logs backend responses and errors to console in some UI paths; future telemetry must be purpose-limited and avoid meal data leakage.
- RETIRE AFTER PARITY: Current WebView/CAP wrapper remains only as a compatibility client during migration.
- DEFER: iOS implementation remains deferred until Android foundations and Rust core are stable.

## 5. Logic That Should Move Into Rust

- PORT: Domain value types for meal draft, confirmed meal, meal item, units, kcal, macros, FII, GI, source labels, confidence, and estimate quality.
- PORT: Food name normalization and tokenization from `fii_lookup.py` and `food_normalizer.py`.
- PORT: FII dataset loading, alias indexing, exact lookup, mapped lookup, and dataset provenance.
- PORT: Mixed-meal decomposition rules and weighted component scoring.
- PORT: Item insulin-load computation.
- PORT: Meal insulin-load aggregation.
- PORT: Acute score calculation and formula versioning.
- PORT: Estimate-quality resolution.
- PORT: Source explanation generation, or at minimum stable explanation keys that native UI can localize.
- PORT: DIL/DII daily aggregation and rolling trend computation.
- PORT: Deterministic validation fixtures, expected outputs, and parity reporters.
- PORT: Export-safe domain serialization with formula version and dataset version.
- PORT: Input validation for numeric ranges and required scientific fields.

## 6. Python Services That Should Remain In Python

- PRESERVE: AI meal extraction gateway in `backend/services.py`, initially OpenAI-backed but target-provider-neutral.
- PRESERVE: FastAPI compatibility endpoints for the current Ionic app during migration.
- PRESERVE: Research/evaluation tooling and fixture report generation.
- PRESERVE: Administrative scripts and data-processing experiments that do not belong in the deterministic client core.
- PRESERVE: Optional future sync APIs until the product milestone requires cloud sync.
- DEFER: Python-to-Rust bindings for backend scoring comparison can be added after the Rust core exists.
- RETIRE AFTER PARITY: Python-owned scoring should remain until Rust outputs match or deliberately documented differences are accepted.

## 7. Proposed Rust Workspace And Crate Boundaries

This section proposes boundaries inside the already-approved Rust core. It does not create the workspace.

```text
rust/
  Cargo.toml
  crates/
    insight_core/
      src/
        domain.rs
        foods.rs
        scoring.rs
        chronic.rs
        quality.rs
        lib.rs
      tests/
      fixtures/
      data/
    insight_ffi/
```

- PORT: `insight_core` owns the deterministic Rust implementation as modules, not separate crates: domain types, FII lookup, food normalization, decomposition mechanics, scoring, estimate quality, chronic DIL/DII, formula versions, dataset versions, provenance, fixtures, and golden parity tests.
- PORT: `insight_core/data/` owns versioned data inputs such as the FII dataset and decomposition rule table. The decomposition mechanism is code; the dish-to-component weights are data.
- PORT: `insight_ffi` exposes stable UniFFI DTOs and functions to Kotlin and Swift later.
- DEFER: Python comparison uses a CLI/JSON parity harness by default. Add PyO3/maturin only if live FastAPI scoring with Rust is explicitly required.
- REPLACE: do not create `insight_persistence`, `insight_validation`, or separate `domain`/`foods`/`scoring`/`chronic` crates initially. The current deterministic logic is small enough that modules inside `insight_core` are safer and cheaper to maintain.

Boundary rule: only `insight_ffi` should know about UniFFI transfer types. `insight_core` stays Rust-native. Persistence is not a Rust crate in this plan.

## 8. Initial UniFFI Boundary

Initial UniFFI should be deliberately small.

- PORT: `score_meal(ConfirmedMeal) -> ScoredMeal`
- PORT: `validate_meal_draft(MealDraft) -> ValidationReport`
- PORT: `compute_chronic_series(Vec<ChronicDayInput>) -> ChronicSeries`
- PORT: `core_metadata() -> CoreMetadata`

`CoreMetadata` includes formula version, dataset version, and core version. `ScoredMeal` may contain nested per-item results, provenance, estimate quality, and explanation keys.

The `score_meal` operation runs FII resolution, decomposition, item scoring, meal aggregation, acute scoring, estimate-quality resolution, and per-item source/why generation internally. This prevents Kotlin or Swift clients from rebuilding partial scoring pipelines and recreating frontend/backend divergence.

Initial UniFFI DTOs:

- PORT: `MealDraft`
- PORT: `ConfirmedMeal`
- PORT: `MealItemInput`
- PORT: `ScoredMeal`
- PORT: `ScoredMealItem`
- PORT: `EstimateQuality`
- PORT: `FiiSource`
- PORT: `ChronicDayInput`
- PORT: `ChronicMetricPoint`
- PORT: `ValidationIssue`

Do not expose:

- DEFER: SQL connection objects.
- DEFER: Platform key material.
- DEFER: Provider-specific AI responses.
- DEFER: UI presentation strings beyond stable explanation keys unless localization is intentionally Rust-owned.
- DEFER: `score_item`, `resolve_fii`, `decompose_food`, `FiiResolution`, and `FoodComponent` as public FFI. Keep them internal until a concrete client need exists and the heuristic/data contract is stable enough to version.

## 9. Proposed Kotlin/Compose Project Structure

This structure is for planning only and must not be created yet.

```text
android-native/
  app/
    src/main/java/.../MainActivity.kt
  core/
    model/
    data/
    rust/
  feature-meal/
    capture/
    review/
    history/
  feature-dashboard/
  feature-settings/
  design-system/
  testing/
```

- REPLACE: `android-native/app` replaces the Capacitor shell after parity.
- PORT: `core/model` mirrors Rust/UniFFI DTOs as Kotlin UI models.
- PORT: `core/rust` wraps UniFFI generated bindings behind app-friendly interfaces.
- DEFER: `core/data` owns the storage interface during early UI work and later owns encrypted SQLite, migration, backup/export, and rollback support after Rust parity.
- PORT: `feature-meal/capture` ports camera capture and AI/manual entry flows from `AiMealAdd.tsx`.
- PORT: `feature-meal/review` ports meal review, item editing, accept/save, source labels, and impact explanation from `PreviewMeal.tsx`.
- PORT: `feature-meal/history` ports saved meal reuse from `Meals.tsx`.
- PORT: `feature-dashboard` ports chronic trend display from `Dashboard.tsx`.
- PORT: `feature-settings` ports current profile/settings behavior from `Settings.tsx`.
- REPLACE: `design-system` replaces Ionic components with native UI components while preserving behavior.
- PRESERVE: `testing` should include parity fixtures imported from the Rust validation crate and compatibility UI tests based on current flows.

## 10. Current SQLite Schema And Migration Implications

Current database URL:

- RETIRE AFTER PARITY: `sqlite:///./app.db` in `backend/db.py`.

Current `meals` table from `backend/db_models.py`:

| Column | Type | Nullable | Notes |
|---|---|---:|---|
| `id` | `String(36)` | no | primary key |
| `created_at` | `DateTime` | no | indexed |
| `meal_name` | `String(255)` | no | user-facing name |
| `total_kcal` | `Float` | yes | meal total |
| `total_carb` | `Float` | yes | meal total |
| `total_protein` | `Float` | yes | meal total |
| `total_fat` | `Float` | yes | meal total |
| `total_sat_fat` | `Float` | yes | meal total |
| `insulin_load_total` | `Float` | yes | derived |
| `acute_score` | `Float` | no | derived |
| `chronic_score` | `Float` | yes | currently unused/legacy field |
| `estimate_quality` | `String(32)` | yes | derived |
| `main_insulin_drivers` | `Text` | yes | JSON string list |

Current `meal_items` table from `backend/db_models.py`:

| Column | Type | Nullable | Notes |
|---|---|---:|---|
| `id` | `String(36)` | no | primary key |
| `meal_id` | `String(36)` | no | FK to `meals.id`, indexed |
| `name` | `String(255)` | no | current item name |
| `quantity` | `Float` | no | consumed amount |
| `unit` | `String(32)` | no | current unit enum string |
| `kcal_per_unit` | `Float` | no | input |
| `carb_g` | `Float` | no | input |
| `protein_g` | `Float` | yes | input |
| `fat_g` | `Float` | yes | input |
| `gi` | `Integer` | no | input/fallback |
| `sat_fat_g` | `Float` | no | input |
| `fii` | `Integer` | no | input if known, `0` otherwise |
| `kcal_item` | `Float` | yes | derived |
| `insulin_load` | `Float` | yes | derived |
| `confidence` | `Float` | yes | scoring confidence |
| `fii_source` | `String(64)` | yes | source label |
| `why` | `String(255)` | yes | explanation |

Migration implications:

- PRESERVE: Existing backend SQLite data must remain readable until native import/export is proven.
- REPLACE: Ad hoc column migration in `backend/db.py` must be replaced by versioned migrations before native local data becomes authoritative.
- PORT: Formula version and dataset version should be stored for each scored meal before removing legacy scoring.
- PORT: Normalized/scored components are not stored today; adding them requires a deliberate schema change and backfill strategy.
- REPLACE: `main_insulin_drivers` should not remain an opaque JSON text field in the target schema unless a versioned serialization contract is defined.
- REPLACE: `fii` should become a nullable/typed FII value or resolution result rather than `0` as sentinel.
- DEFER: SQLCipher and platform key wrapping must be designed before native production data migration.
- REPLACE: encrypted local persistence is Kotlin/Android-native, not Rust-owned. Android `core/data` owns Room/SQLite, SQLCipher integration, migration tests, backup/restore policy, and Android Keystore-wrapped key material. The Rust core receives decrypted domain inputs and returns scored outputs; it never receives SQL handles or key material.
- DEFER: Cloud sync schema is out of scope until the product milestone requires it.

## 11. Compatibility Strategy For The Current Ionic App

- PRESERVE: Keep the current FastAPI endpoints stable while Rust scoring is introduced.
- RETIRE AFTER PARITY: Continue returning current `MealModelingResponse` fields used by `frontend/src/api/api.ts`.
- RETIRE AFTER PARITY: Keep `/ai-meal-extract`, `/meals`, `GET /meals`, and `/metrics/chronic` compatible for the Ionic app.
- PORT: Add an offline CLI/JSON comparison path after Rust exists. Python computes legacy outputs, Rust computes candidate outputs, and synthetic reports compare them. Add live FastAPI-to-Rust scoring only if explicitly required.
- DEFER: Do not use the mobile UniFFI API as the server integration boundary. Add PyO3/maturin only if a later FastAPI milestone justifies in-process Rust.
- PRESERVE: Ionic remains the UX reference for meal capture, review, edit, save, recent meals, dashboard, and settings.
- REPLACE: Do not add new product-critical behavior only to Ionic once the native app migration begins; add it first to shared Rust/domain or both clients behind compatibility checks.
- RETIRE AFTER PARITY: Remove Ionic only after native Android passes behavioral, scientific, data migration, export, privacy, and rollback exit criteria.

## 12. Behavioural Parity Test Plan

- PRESERVE: Capture current user flows as black-box test cases before implementation begins.
- PORT: AI image capture creates a draft meal with name, image preview, items, top-down estimate, and editable fields.
- PORT: Manual entry creates editable meal items and blocks save when item name or quantity is invalid.
- PORT: Changing meal title does not silently alter scoring inputs.
- PORT: Changing item quantity changes submitted quantity and recalculated score after save.
- PORT: Accept and save posts raw meal inputs, receives backend/Rust-derived fields, and stores/display those derived fields.
- PORT: Saved meals can be reused as new drafts with backend-derived fields cleared before re-save.
- PORT: Dashboard requests backend chronic metrics and displays unavailable state on failure.
- PORT: Source labels and `why` explanations appear after save.
- PORT: Low/unknown quality saved meals use uncertainty-aware impact copy.
- REPLACE: Cypress stale root-content test with current app flow tests before using it as a migration gate.
- PRESERVE: React smoke test remains useful but insufficient.

Minimum behavioral parity fixtures:

- PRESERVE: AI draft with meal-level estimate and item-sum mismatch.
- PRESERVE: Manual one-item meal.
- PRESERVE: Mixed meal with decomposition.
- PRESERVE: Saved meal reuse and re-save.
- PRESERVE: Chronic dashboard with 0, 1, 7, and 14 days of saved meals.

## 13. Parity, Validation, Accuracy, And Coverage Test Plan

These tracks are intentionally separate. A green result in one track does not imply a green result in the others.

### Track A - Implementation parity

- PRESERVE: Existing backend validation case kinds: ranking, source quality, monotonicity, chronic trend, uncertainty.
- PORT: Convert fixtures in `backend/validation/fixtures.py` into language-neutral JSON fixtures.
- PORT: Generate current Python golden outputs before Rust implementation begins.
- PORT: Rust must reproduce golden outputs within documented tolerances or produce an explicit difference report.
- PORT: Include exact FII, alias exact FII, mapped FII, weighted mixed decomposition, GI/carb/protein macro fallback, rough macro fallback, and unknown fallback cases.
- PORT: Include acute-score tests around `REFERENCE_MEAL_INSULIN_LOAD = 30.0`.
- PORT: Include DIL/DII tests for empty energy, low-to-high transition, and rolling 7-day windows.
- PORT: Include source-quality degradation tests for high, medium, low, and unknown.
- PRESERVE: Track A proves the Rust port is faithful to Python. It does not prove the formulas are scientifically validated.

### Track B - Scientific validation and calibration

- PRESERVE: Run the checks described in `docs/scientific-validation-plan.md`: ranking consistency, portion monotonicity, chronic DIL/DII sanity, uncertainty propagation, non-claim compliance, and calibration status.
- PRESERVE: Report `REFERENCE_MEAL_INSULIN_LOAD = 30.0` as the current product normalization constant and calibration gap, not as a biological constant.
- PRESERVE: Report macro fallback coefficients, mixed-decomposition weights, and the starter dataset as current implemented heuristics requiring evidence tracking and versioning.
- PRESERVE: No scientific formula changes may be hidden inside migration work.

### Track C - AI recognition accuracy

- DEFER: Evaluate AI recognition after the native AI gateway flow exists, using synthetic or explicitly consented examples only.
- PRESERVE: Measure dish identification, component identification, portion estimation, nutrition estimation, FII mapping, and downstream score error separately.
- PRESERVE: Recognition confidence is not nutrition confidence, FII/source quality, or insulin-impact estimate quality.

### Track D - FII dataset coverage

- PRESERVE: Run a source distribution report over synthetic and later consented meals: `exact_fii`, `mapped_fii`, `macro_fallback`, and `unknown`. Track `user_confirmed` separately where applicable.
- PRESERVE: The current 10-row `backend/fii_foods.csv` is fixture-grade starter coverage. Production coverage expansion is a data/versioning track, not a reason to discard FII-based scoring.
- PORT: Include dataset provenance tests for the current starter CSV and future dataset versions.

## 14. Data Migration And Rollback Plan

- PRESERVE: Keep legacy backend SQLite data untouched during early Rust/domain milestones.
- PRESERVE: Export legacy `meals` and `meal_items` rows to a versioned, synthetic-testable interchange format before native import.
- PORT: Add migration code only after target schema, SQLCipher design, and key-management design are approved.
- PORT: Native import should preserve raw input fields, derived fields, formula version, dataset version, source labels, confidence, and `why`.
- REPLACE: Convert sentinel `fii = 0` into nullable or explicit unknown resolution.
- REPLACE: Convert `main_insulin_drivers` text JSON into typed rows or versioned JSON.
- DEFER: Image migration until image retention consent and temporary image lifecycle are defined.
- PRESERVE: Rollback path must keep legacy SQLite backup and exported interchange file until native verification passes.
- PRESERVE: User-visible export must work before legacy data is migrated destructively.
- RETIRE AFTER PARITY: Delete or stop using legacy DB only after native import, export, score parity, and rollback restore tests pass.

## 15. Security And Privacy Risks By Milestone

### Milestone 0 - Baseline

- PRESERVE: Risk is mainly documentation and fixture handling.
- REPLACE: Do not use real health data or real meal photos in fixtures.
- PRESERVE: Do not expose `.env` contents or API keys.

### Milestone 1 - Rust Core

- PORT: Scientific correctness risk from formula drift.
- PORT: FFI serialization risk from lossy numeric or enum conversion.
- PRESERVE: Use synthetic fixtures only.
- PRESERVE: Track A implementation parity and Track B scientific-validity reporting remain separate.

### Milestone 2 - Offline Compatibility

- PRESERVE: API response compatibility risk for Ionic.
- REPLACE: Avoid logging meal data or images during comparison.
- REPLACE: Keep CORS and image-retention risks visible; do not expand exposure.
- DEFER: Live Python-to-Rust binding is optional; default to CLI/JSON parity comparison.

### Milestone 3 - Native Android Shell

- REPLACE: Platform permission, camera, local storage, and backup behavior must be explicit.
- DEFER: Health Connect and cloud sync remain off unless a specific feature requires them.
- PORT: UniFFI boundary must be reviewed for crashes, panics, and invalid input handling.
- PRESERVE: No real user health data may be entered or stored before encrypted persistence exits review.

### Milestone 4 - Manual Meal Flow

- PRESERVE: Manual and synthetic-only flows reduce early privacy risk.
- PRESERVE: No production persistence, real health data, real meal photos, or cloud AI are allowed in this milestone.
- PORT: Rust scoring is exercised only on user-confirmed synthetic drafts.

### Milestone 5 - Encrypted Android Persistence

- REPLACE: SQLCipher/key-management mistakes can lose data or weaken privacy.
- REPLACE: Android Keystore wrapping and backup/restore behavior need independent review.
- PRESERVE: This is the first milestone allowed to persist real product data, and only after key management, migrations, export, backup, and rollback tests pass.

### Milestone 6 - AI Provider And Image Lifecycle

- PRESERVE: AI is an input layer only.
- REPLACE: Raw image retention must default to temporary deletion unless separately consented.
- DEFER: Research retention and model-training consent remain separate from product use.
- PRESERVE: Track C AI recognition accuracy is separate from Track A implementation parity and Track B scientific validation.

### Milestone 8 - Legacy Retirement

- RETIRE AFTER PARITY: Risk is premature removal of compatibility paths.
- PRESERVE: Require feature parity, implementation parity, scientific-validity reporting, AI recognition reporting, FII coverage reporting, data migration success, export success, and rollback proof.
- PRESERVE: FastAPI is not retired merely because Rust scoring reaches parity.

## 16. Exact Incremental Milestones

### Milestone 0 - Verified Baseline

Component labels:

- PRESERVE: Current docs and source.
- PRESERVE: Current FastAPI and Ionic behavior.
- PRESERVE: Current validation fixtures.

Work:

1. Freeze a baseline branch or tag for current behavior.
2. Export current API examples for `/ai-meal-extract`, `/meals`, `GET /meals`, and `/metrics/chronic` using synthetic data.
3. Convert existing validation fixtures into a golden-output report.
4. Record current UI flows as screenshots or test descriptions.
5. Document stale versus current findings from `docs/code-audit.md`.
6. Establish Tracks A-D as separate reporting tracks: implementation parity, scientific validation/calibration, AI recognition accuracy, and FII dataset coverage.
7. Lock formulas, provenance, source labels, confidence behavior, and current non-claims without formula redesign.

### Milestone 1 - Rust Domain And Scoring Core

Component labels:

- PORT: Domain types, FII lookup, food normalization, scoring, chronic metrics, estimate quality.
- PRESERVE: Python scoring as comparison reference.

Work:

1. Create the two-crate Rust workspace with `insight_core` and `insight_ffi` only.
2. Port deterministic logic from the Python scoring modules.
3. Externalize and version FII, alias, and decomposition data without changing scientific behavior.
4. Add formula, dataset, and core version identifiers.
5. Add Rust fixture tests from the baseline golden outputs.
6. Produce a Track A parity report comparing Python and Rust outputs.
7. Produce a separate Track B scientific-validation report for calibration and evidence gaps.

### Milestone 2 - Offline Compatibility With Rust

Component labels:

- PORT: Rust scoring into offline Python-vs-Rust comparison path.
- RETIRE AFTER PARITY: Python scoring remains available.
- PRESERVE: Existing FastAPI response shape.

Work:

1. Add a CLI/JSON Python-to-Rust parity harness by default.
2. Run scoring comparisons on synthetic requests and fixture outputs.
3. Keep API output compatible with `frontend/src/api/api.ts`.
4. Document all output differences.
5. Do not remove Python scoring yet.
6. Add live FastAPI-to-Rust scoring only if a concrete compatibility need requires it.
7. Do not use mobile UniFFI as the server integration boundary.

### Milestone 3 - Native Android Skeleton

Component labels:

- REPLACE: New native Android app shell replaces future Capacitor shell.
- PRESERVE: Ionic remains runnable.
- PORT: Route-level user flows to native screens.

Work:

1. Create native Android project structure.
2. Add bottom navigation equivalents for dashboard, meal capture/history, and settings.
3. Add UI models that mirror current meal DTOs.
4. Integrate the narrow UniFFI API: `score_meal`, `validate_meal_draft`, `compute_chronic_series`, and `core_metadata`.
5. Define a Kotlin storage interface with an in-memory implementation.
6. Use in-memory synthetic local data only.

### Milestone 4 - Native Meal Capture And Review

Component labels:

- PORT: Manual draft and review flows; AI draft compatibility is deferred to Milestone 6.
- PRESERVE: Current review UX semantics.
- DEFER: Production image retention.

Work:

1. Implement manual meal entry.
2. Implement draft editing and validation.
3. Implement scoring through Rust after user confirmation.
4. Implement source label and explanation display.
5. Compare against Ionic behavior test cases.
6. Use synthetic manual data only.
7. Keep cloud AI deferred and do not persist production data.

### Milestone 5 - Encrypted Android Persistence

Component labels:

- REPLACE: Browser localStorage and backend-only SQLite for native local product data.
- PORT: Meal and item schema into Kotlin-owned versioned encrypted SQLite.
- DEFER: Cloud sync.

Work:

1. Define target local schema and migrations.
2. Add SQLCipher or equivalent encrypted SQLite through the Android data layer.
3. Add Android Keystore-backed key wrapping.
4. Add import/export for synthetic legacy data.
5. Add rollback restore test.
6. Permit real product data only after encrypted persistence, key review, migrations, export, backup, and rollback pass.

### Milestone 6 - AI Gateway Compatibility

Component labels:

- PRESERVE: Python AI gateway initially.
- PORT: Native client sends reviewed draft inputs to Rust.
- REPLACE: Raw image saving without retention policy.

Work:

1. Keep AI extraction provider calls in Python/FastAPI.
2. Native Android sends temporary images to the gateway only when user chooses cloud assistance.
3. Gateway returns structured `MealDraft`.
4. Native UI requires review before Rust scoring.
5. Add temporary image deletion and no-retention verification.
6. Add Track C recognition-accuracy reporting across the six dimensions.

### Milestone 7 - Data Migration From Legacy

Component labels:

- PORT: Legacy meal/item records into encrypted native DB.
- PRESERVE: Legacy backup and export.
- RETIRE AFTER PARITY: Legacy DB after verified migration.

Work:

1. Export legacy SQLite rows to versioned interchange.
2. Import into encrypted native DB.
3. Re-score or preserve historical derived fields according to documented policy.
4. Compare record counts, user-visible fields, scores, source labels, and chronic metrics.
5. Validate rollback restore.

### Milestone 8 - Legacy Retirement

Component labels:

- RETIRE AFTER PARITY: Ionic/Capacitor client.
- RETIRE AFTER PARITY: Python-owned deterministic scoring functions only.
- PRESERVE: Python/FastAPI AI gateway and any still-active compatibility endpoints.

Work:

1. Confirm native Android feature parity.
2. Confirm implementation parity and accepted difference report.
3. Confirm scientific-validity/calibration reporting is current and does not overclaim validation.
4. Confirm data migration and rollback.
5. Confirm export, deletion, privacy, and security checks.
6. Remove legacy code only through a separate explicit cleanup change.

## 17. Exit Criteria For Every Milestone

### Milestone 0 Exit Criteria

- PRESERVE: All baseline docs and source files are unchanged except new planning docs.
- PRESERVE: Golden scientific outputs exist for current validation fixtures.
- PRESERVE: API contract examples exist for synthetic data.
- PRESERVE: Current stale audit findings are identified as stale or still-current.
- PRESERVE: No real user data or real images are in fixtures.
- PRESERVE: Tracks A-D are documented separately.
- PRESERVE: Formulas, provenance, confidence behavior, and non-claims are locked without redesign.

### Milestone 1 Exit Criteria

- PORT: Rust unit tests pass for every golden fixture.
- PORT: Only the initial `insight_core` and `insight_ffi` crates exist.
- PORT: Formula version, dataset version, and core version are returned by Rust.
- PORT: Python and Rust parity report has zero unexplained differences.
- PRESERVE: Scientific-validity/calibration report is separate from the parity report and does not claim validation from parity alone.
- PRESERVE: Python scoring still runs.
- PRESERVE: No native UI or persistence changes are required.

### Milestone 2 Exit Criteria

- PORT: CLI/JSON parity harness can compare Python and Rust scoring on synthetic inputs.
- PRESERVE: Existing Ionic API response normalization still works.
- PRESERVE: Dual-run output comparison is available.
- RETIRE AFTER PARITY: Python scoring remains the fallback.
- PRESERVE: No compatibility endpoint is removed.
- DEFER: Mobile UniFFI is not used as the server integration boundary.

### Milestone 3 Exit Criteria

- REPLACE: Native Android shell launches and navigates through empty dashboard, meal, and settings screens.
- PORT: Narrow UniFFI binding calls succeed with synthetic scoring input.
- PRESERVE: Ionic app still builds/runs independently.
- PRESERVE: No production data storage is introduced.
- PRESERVE: Storage interface exists, backed only by in-memory synthetic data.
- PRESERVE: No real health data or real meal photos are entered.

### Milestone 4 Exit Criteria

- PORT: Native app supports manual draft, review, edit, save-to-memory, and Rust scoring.
- PORT: Native behavior matches current Ionic flow tests for synthetic meals.
- PORT: Source labels, estimate quality, and explanations display.
- PRESERVE: AI remains deferred and non-authoritative.
- PRESERVE: No real user health data or real meal photos are entered or stored.
- PRESERVE: Cloud AI remains deferred.

### Milestone 5 Exit Criteria

- REPLACE: Native encrypted SQLite stores synthetic meals and is approved before real product data.
- REPLACE: Migrations are versioned and reversible in test.
- REPLACE: Key management has independent review.
- PRESERVE: Export and rollback restore pass before any real data migration.
- PRESERVE: Kotlin owns persistence, migrations, backup/restore, import/export, and key wrapping; Rust receives no DB handles, SQL connections, or encryption keys.

### Milestone 6 Exit Criteria

- PRESERVE: Python AI gateway returns structured drafts to native Android.
- REPLACE: Raw image lifecycle defaults to deletion.
- PRESERVE: User review is required before Rust scoring.
- PRESERVE: Provider-specific fields do not enter Rust scientific core.
- PRESERVE: Logs do not contain meal images, API keys, or private meal data.
- PRESERVE: Track C recognition-accuracy report separates dish, component, portion, nutrition, FII mapping, and downstream score error.

### Milestone 7 Exit Criteria

- PORT: Legacy synthetic data imports into native encrypted DB.
- PRESERVE: Record counts and user-visible fields match.
- PORT: Recomputed scores match or differences are documented.
- PORT: Chronic metrics match or differences are documented.
- PRESERVE: Rollback restore recreates the legacy-compatible dataset.

### Milestone 8 Exit Criteria

- RETIRE AFTER PARITY: Native Android has feature parity for current product flows.
- RETIRE AFTER PARITY: Implementation parity is approved.
- RETIRE AFTER PARITY: Scientific-validity/calibration report is current and explicitly separate from parity.
- RETIRE AFTER PARITY: Data migration and rollback are approved.
- RETIRE AFTER PARITY: Security and privacy review is complete.
- RETIRE AFTER PARITY: User export and deletion paths are verified.
- RETIRE AFTER PARITY: Legacy removal is requested explicitly in a separate task.
- PRESERVE: FastAPI AI gateway, research/evaluation tooling, optional sync APIs, and still-active compatibility endpoints remain while needed.

## 18. Conditions Required Before Legacy Code Can Be Removed

The following must all be true before removing the current Ionic/Capacitor client or Python-owned deterministic scoring functions:

- RETIRE AFTER PARITY: Native Android supports meal capture, manual entry, AI draft review, item editing, save, history, dashboard, settings, and source explanations.
- RETIRE AFTER PARITY: Rust owns deterministic scoring, FII lookup, normalization, estimate quality, and chronic DIL/DII.
- RETIRE AFTER PARITY: Rust and Python parity reports pass on locked golden fixtures, or every difference is approved as an intentional scientific change.
- RETIRE AFTER PARITY: Scientific validation, AI recognition accuracy, and FII dataset coverage have current reports and are not represented as solved by parity alone.
- RETIRE AFTER PARITY: Current API compatibility remains available until all active clients have migrated.
- PRESERVE: FastAPI shell, AI-provider gateway, research/evaluation tooling, and optional future sync APIs are preserved while product responsibilities remain.
- RETIRE AFTER PARITY: Encrypted native SQLite migration succeeds on synthetic and representative exported legacy datasets.
- RETIRE AFTER PARITY: Rollback can restore the pre-migration dataset.
- RETIRE AFTER PARITY: User export and deletion are verified.
- RETIRE AFTER PARITY: Image retention defaults to temporary deletion unless separate consent exists.
- RETIRE AFTER PARITY: Research contribution and product use remain separate.
- RETIRE AFTER PARITY: No real user data is used in tests or logs.
- RETIRE AFTER PARITY: Independent review signs off on scientific, FFI, migration, encryption, and privacy-sensitive diffs.
- RETIRE AFTER PARITY: The user explicitly approves the cleanup/removal task.
