# Independent Migration Review — Native + Rust Architecture

> **Historical review:** This document records an independent review of an
> earlier version of `docs/migration-plan.md`. The current authoritative
> migration plan is `docs/migration-plan.md` on this branch. Where this review
> and the revised plan differ, the revised migration plan governs.

Reviewer: Claude (independent architecture and migration review)
Date: 2026-06-17
Subject under review: `docs/migration-plan.md`
Governing documents: `AGENTS.md`, `docs/target-architecture.md`, `docs/scientific-model.md`, `docs/engineering-model.md`, `docs/scientific-validation-plan.md`, `docs/code-audit.md`
Source verified: `backend/scoring_service.py`, `backend/chronic_service.py`, `backend/fii_lookup.py`, `backend/food_normalizer.py`, `backend/estimate_quality.py`, `backend/db.py`, `backend/db_models.py`, `backend/main.py`, `backend/api/meals.py`, `backend/models.py`, `backend/services.py`, `backend/utils.py`, `backend/fii_foods.csv`, `backend/validation/fixtures.py`

This review modifies nothing. It evaluates whether the plan is correct, proportionate, and realistic for a budget-constrained solo developer using AI coding agents.

---

## Scope note and bias check

The plan is, on the whole, unusually disciplined: it honours the approved architecture, refuses to reopen framework decisions, labels every component, front-loads the deterministic Rust core, and ships golden-fixture parity gates before any data migration. The findings below are not an argument against the plan's direction. They target **proportionality** (a solo developer with AI agents pays a real per-crate, per-binding, per-FFI-symbol maintenance tax) and a small number of **labels that contradict the governing architecture** and could mislead a future agent into deleting components the architecture mandates keeping.

The single most important measured fact for proportionality: the entire body of deterministic logic to be ported is small. Verified line counts of the modules the plan marks `PORT`:

| Module | Role | Approx. lines |
|---|---|---:|
| `scoring_service.py` | item/meal insulin load, acute score | ~180 (incl. self-check) |
| `fii_lookup.py` | FII dataset load + exact/alias/token lookup | ~190 |
| `food_normalizer.py` | mixed-meal decomposition heuristics | ~110 |
| `chronic_service.py` | DIL/DII rolling series | ~35 |
| `estimate_quality.py` | quality bucket mapping | ~11 |
| `fii_foods.csv` | FII dataset | 10 data rows |

That is roughly **500–600 lines of genuinely deterministic logic and a 10-row dataset.** Every structural proposal in the plan should be sized against that reality.

---

## Findings (classified)

| # | Investigation area | Class |
|---|---|---|
| 5 | `RETIRE AFTER PARITY` on `main.py` / `api/meals.py` implies retiring FastAPI + AI gateway | **BLOCKER** |
| 1 | Seven-crate workspace is over-fragmented | **HIGH** |
| 2 | Encrypted persistence ownership is duplicated/ambiguous (Rust crate *and* Kotlin layer) | **HIGH** |
| 3 | UniFFI surface exposes internal heuristics as a stable contract | **HIGH** |
| 4 | Plan conflates implementation parity with scientific validation; under-specifies recognition accuracy and FII coverage | **HIGH** |
| 6 | Decomposition/normalization determinism boundary is mislabeled as "protected science" | MEDIUM |
| 9 | Python↔Rust integration mechanism is unspecified and defaults to more than needed | MEDIUM |
| 10 | Several components add complexity without improving the five goals | MEDIUM |
| 7 | Milestone order (core → compat → UI → persistence) | ACCEPT |
| 8 | Native skeleton before encrypted persistence | ACCEPT (with one guardrail) |

---

## BLOCKER

### B-1 (Investigation #5) — File-level `RETIRE AFTER PARITY` on `main.py` and `api/meals.py` reads as "retire FastAPI and the AI gateway"

**Exact migration-plan section:** §1 *Current Repository Map → Backend*:

> - RETIRE AFTER PARITY: `backend/main.py` currently hosts FastAPI startup, permissive CORS, AI extraction, image saving, root route, and chronic metrics.
> - RETIRE AFTER PARITY: `backend/api/meals.py` currently owns meal creation, item scoring orchestration, DB writes, and API mapping.

and §16 *Milestone 8*:

> - RETIRE AFTER PARITY: Python-owned deterministic scoring.

**Why it is risky.** The label is attached to the **whole file**, but each file holds responsibilities on *different* retirement timelines, and one of them must never be retired under the approved architecture:

- `backend/main.py:48` is the `/ai-meal-extract` endpoint — the **AI provider gateway**. `docs/target-architecture.md` ("Backend during migration") mandates that Python/FastAPI **retain** the AI-provider gateway. The plan itself agrees elsewhere: §6 marks `services.py` `PRESERVE`, and Milestone 8 says "PRESERVE: Python AI gateway if still needed." But `main.py` *is* the FastAPI app that hosts that gateway, and it is stamped `RETIRE AFTER PARITY`. The two statements contradict each other.
- `api/meals.py` interleaves (a) deterministic scoring orchestration — legitimately `PORT` to Rust — with (b) the FastAPI HTTP/DB compatibility surface (`POST/GET /meals`) the Ionic client needs until *the Ionic client* retires, which is a different, later event than "scoring parity proven."
- `AGENTS.md` is explicit: "Do not rewrite functioning Python services in Rust merely for language uniformity," "do not interpret a migration plan as permission for a big-bang rewrite," and on document conflict, "Do not silently choose one interpretation. Report the conflict." A future AI agent reading "`RETIRE AFTER PARITY: backend/main.py`" after a green parity report could delete the file that contains the mandated AI gateway. That is an architecture-violating, hard-to-reverse action driven purely by an imprecise label.

This is classified BLOCKER because the defect is in a *directive document whose purpose is to steer agents*, and the literal directive contradicts the one architectural document `AGENTS.md` says governs ("`docs/target-architecture.md` governs the approved technical direction").

**Concrete replacement language.** Replace the two backend bullets with responsibility-scoped labels:

> - PRESERVE: `backend/main.py` → the FastAPI application shell and the `/ai-meal-extract` AI-gateway endpoint. The AI gateway is retained per `target-architecture.md` and is **not** retired at scoring parity.
> - RETIRE AFTER PARITY: the *chronic-metrics computation* currently inlined in `main.py` `/metrics/chronic` — its DIL/DII math is `PORT` to Rust; the HTTP endpoint stays as a compatibility shim until the Ionic client retires.
> - PORT: the deterministic scoring orchestration inside `backend/api/meals.py` (`compute_insulin_load_item`, `compute_acute_score`, estimate-quality, drivers) → Rust core.
> - RETIRE WITH IONIC CLIENT: the `POST/GET /meals` HTTP + DB-mapping surface in `api/meals.py` — a compatibility endpoint retired on the Ionic timeline, not the scoring-parity timeline.

And in Milestone 8, change "RETIRE AFTER PARITY: Python-owned deterministic scoring" to make the survivor explicit:

> - RETIRE AFTER PARITY: Python-owned **deterministic scoring functions only** (`scoring_service`, `chronic_service`, `fii_lookup`, `food_normalizer`, `estimate_quality`). The FastAPI app, the AI-extraction gateway, and any still-active compatibility endpoints are explicitly **out of scope** for this retirement.

**Corrected milestone placement.** No new milestone is needed; this is a labeling correction in §1 and §16. It should be fixed **before Milestone 0 exit**, because Milestone 0's exit criteria assert the audit/label set is the trustworthy baseline that later agents act on. The distinct retirement timelines are already correctly modeled by the milestones (scoring retires at M8 after parity; the AI gateway is preserved through M8; compatibility endpoints retire with the Ionic client) — only the §1 labels are wrong.

---

## HIGH

### H-1 (Investigation #1) — The seven-crate workspace is over-fragmented for ~600 lines of logic

**Exact migration-plan section:** §7 *Proposed Rust Workspace And Crate Boundaries* (`insight_domain`, `insight_scoring`, `insight_foods`, `insight_chronic`, `insight_validation`, `insight_persistence`, `insight_uniffi`).

**Why it is risky.** Seven crates is the right *conceptual* decomposition but the wrong *physical* one for a solo developer driving AI agents over 500–600 lines of logic:

- Each crate is a `Cargo.toml`, a published-API boundary, and a version to coordinate. Any change to a shared domain type (and `insight_domain` is shared by every other crate) ripples through up to six manifests and six public interfaces. AI agents amplify this cost: they re-derive cross-crate boundaries on every edit and are prone to introducing accidental cross-crate cycles.
- The conceptual separation the plan wants is fully achievable with **Rust modules inside one crate** (`mod domain; mod foods; mod scoring; mod chronic; mod quality;`), which gives namespacing and visibility control with *zero* manifest or versioning overhead.
- `insight_validation` as a crate is unjustified: golden-fixture parity is `#[cfg(test)]` code plus a `tests/` directory plus JSON fixtures, not a shippable library.
- `insight_persistence` should not exist as a planned crate at all (see H-2).

**Concrete replacement language.** Replace the §7 tree with a two-crate workspace:

> ```text
> rust/
>   Cargo.toml                # workspace
>   crates/
>     insight_core/           # lib: all deterministic logic
>       src/
>         domain.rs           # value types, units, FII value, source labels, provenance
>         foods.rs            # dataset load, normalization, lookup, decomposition mechanics
>         scoring.rs          # item/meal insulin load, acute score, estimate quality
>         chronic.rs          # DIL/DII daily + rolling series
>         lib.rs
>       tests/                # golden-fixture parity tests
>       fixtures/             # language-neutral JSON fixtures + expected outputs
>       data/                 # versioned FII dataset + decomposition table (see M-1)
>     insight_ffi/            # cdylib: the ONLY crate that knows UniFFI types
> ```
>
> Boundary rule unchanged: only `insight_ffi` references UniFFI transfer types; `insight_core` stays Rust-native. Split a module out into its own crate **only** when a concrete need appears (e.g. `insight_core` compile times become painful, or a second non-FFI consumer emerges).

This is the standard, well-trodden Rust-on-mobile shape (one logic crate + one UniFFI wrapper) and is far cheaper to maintain solo.

**Corrected milestone placement.** Milestone 1 ("Create Rust workspace"). The milestone *text* needs no reordering; only the workspace it instructs the developer to create changes from seven crates to two.

---

### H-2 (Investigation #2) — Encrypted persistence ownership is duplicated and ambiguous; it should be Kotlin-native, not a Rust crate

**Exact migration-plan section:** §7 (`insight_persistence` "should own encrypted SQLite schema and migrations"), §9 (`core/data` "owns encrypted SQLite, migration, backup/export, and rollback support"), §10 (`DEFER: SQLCipher and platform key wrapping`), and §16 *Milestone 5*.

**Why it is risky.** The plan assigns encrypted persistence to **both** a Rust crate (`insight_persistence`) **and** a Kotlin layer (`core/data`) without resolving who owns it. Ambiguous ownership of the database, schema, migrations, and key material is precisely the high-risk surface `AGENTS.md` singles out ("SQLCipher," "key management," "database migrations," "Rust FFI" — all high risk). Worse, a Rust persistence crate **contradicts the plan's own FFI boundary rule** in §8 ("Do not expose: SQL connection objects … Platform key material"). You cannot have Rust own the encrypted database while forbidding DB handles and key material from crossing the FFI — the key *must* come from Android Keystore, which is reachable only from the platform side.

Weighing the specific factors the review was asked to consider:

- **SQLCipher:** most mature path on Android is the SQLCipher `SupportFactory` behind Room (Kotlin). A Rust path (`rusqlite` + bundled SQLCipher) works but duplicates what Room already gives.
- **Android Keystore / Apple Keychain:** both are platform-only. Key wrap/unwrap lives in Kotlin/Swift regardless of where SQL executes. Putting SQL in Rust still forces the key across the boundary the plan forbids.
- **Backup/restore:** `allowBackup`, Auto Backup key exclusion, restore-on-new-device — all platform concerns, naturally Kotlin.
- **Migrations:** Room ships a first-class, test-supported migration framework. Rust would hand-roll one.
- **Future Swift:** the only real argument *for* Rust persistence — write once for iOS. But iOS is explicitly deferred (no Apple hardware), Keychain is platform-side anyway, and GRDB/SQLCipher or SwiftData are strong native options. The shared code saved is a few hundred lines of schema/DAO; the cost is a much harder FFI (transactions, encrypted blobs, key handles) the plan itself rules out.

**Concrete replacement language.**

> - Persistence ownership: **Kotlin/Android-native.** `core/data` owns the encrypted database (Room + SQLCipher `SupportFactory`), schema, versioned migrations, backup/restore policy, and Keystore-wrapped key material. iOS later owns its equivalent (GRDB/SQLCipher or SwiftData + Keychain).
> - **Remove `insight_persistence` from the Rust workspace** (not merely defer it). The Rust core is a pure function of already-decrypted domain inputs → domain outputs; it never sees a DB handle or a key. Revisit a shared Rust persistence layer only if/when a funded iOS effort demonstrates concrete duplication pain.
> - §8 boundary rule stands and is now consistent: no SQL connections, no key material across the FFI.

**Corrected milestone placement.** Milestone 5 stays where it is (after the UI is proven on synthetic data) but is re-scoped to a **Kotlin** deliverable: Room + SQLCipher schema, versioned migrations, Keystore key-wrapping, import/export, and a rollback-restore test — with independent review of key management, as `AGENTS.md` requires. Delete the `insight_persistence` row from §7 and the "Rust owns encrypted SQLite" phrasing from §10.

---

### H-3 (Investigation #3) — The first UniFFI surface exposes internal, explicitly-unstable heuristics as a stable contract

**Exact migration-plan section:** §8 *Initial UniFFI Boundary* — functions `score_item`, `resolve_fii`, `decompose_food` (alongside `validate_meal_draft`, `score_meal`, `calculate_chronic_series`, `formula_version`, `dataset_version`) and DTOs `FiiResolution`, `FoodComponent`.

**Why it is risky.** A UniFFI symbol is a **stable cross-language contract**. Three of the six proposed functions expose internals that should not be contractual:

- `score_item` is redundant with `score_meal` (which already scores each item internally — see `api/meals.py:102-152`) and is **chatty**: a client that scores items one-by-one then assembles meal totals in Kotlin re-creates exactly the frontend/backend scoring divergence documented as HIGH in `code-audit.md` findings #1, #3, and #7 (`utils.ts` recomputing scores). The architecture's whole point is one authoritative scorer; per-item FFI invites a second one on the client.
- `resolve_fii` and `decompose_food` expose `fii_lookup` and `food_normalizer` internals. `food_normalizer.py:10` documents these as heuristics that "future versions can [replace with] cuisine-specific learned weights." Publishing them as FFI freezes admittedly-provisional heuristics into a stable API. This directly violates `target-architecture.md`: "The FFI boundary should use stable domain-transfer objects rather than exposing internal Rust implementation details."

**Concrete replacement language.** Reduce the first boundary to the authoritative operations only:

> Initial UniFFI functions:
> - `score_meal(ConfirmedMeal) -> ScoredMeal` — runs FII resolution, decomposition, aggregation, acute score, estimate quality, per-item `fii_source`/`why` **internally**, and returns them inside `ScoredMeal`/`ScoredMealItem`.
> - `validate_meal_draft(MealDraft) -> ValidationReport` — pre-scoring input validation.
> - `compute_chronic_series(Vec<ChronicDayInput>) -> ChronicSeries`
> - `formula_version() -> String`
> - `dataset_version() -> String`
>
> Internal, **not** exposed in the first boundary: `score_item`, `resolve_fii`, `decompose_food`. They remain `pub(crate)` functions of `insight_core`. Promote any of them to FFI only when a concrete client feature needs it *and* the heuristic behind it is stable enough to version.
>
> DTOs drop to: `MealDraft`, `ConfirmedMeal`, `MealItemInput`, `ScoredMeal`, `ScoredMealItem` (nested), `EstimateQuality`, `FiiSource`, `ChronicDayInput`, `ChronicMetricPoint`, `ValidationIssue`. Drop `FiiResolution` and `FoodComponent` from the public surface until a confirmed UI need exists.

This keeps the contract small, keeps the client a thin renderer of authoritative results, and prevents the divergence bug class the audit already found.

**Corrected milestone placement.** Milestone 1 (defines the Rust core API) and Milestone 3 ("Integrate UniFFI generated bindings for scoring only"). Milestone 3's "scoring only" intent is correct and is *reinforced* by this narrowing — fix §8 before M1 freezes the surface.

---

### H-4 (Investigation #4) — The plan conflates implementation parity with scientific validation, and under-specifies recognition accuracy and FII coverage as separate tracks

**Exact migration-plan section:** §13 *Scientific Parity Test Plan* (title and contents), §12 *Behavioural Parity Test Plan*, and the absence of a recognition-accuracy track in Milestone 6.

**Why it is risky.** The four things the review asks to be separated are governed by separate documents and `AGENTS.md` insists they not be merged ("AI confidence is not equivalent to scientific confidence"; `target-architecture.md` "Accuracy architecture" requires six *separate* accuracy dimensions). The plan currently collapses them:

1. **Implementation parity** (does Rust reproduce Python?) — well covered: §13, golden fixtures, parity report, "no formula changes hidden in migration." Good.
2. **Scientific validation** (is the model itself correct/calibrated?) — *blurred into parity.* §13 is titled "Scientific Parity" but its content is implementation parity ("Rust must reproduce golden outputs"). `scientific-validation-plan.md` defines validation as ranking consistency, monotonicity, chronic sanity, and calibration of `REFERENCE_MEAL_INSULIN_LOAD` (which `scoring_service.py:9-10` flags as an un-calibrated `TODO`). A reader who sees "parity report: zero differences" can wrongly conclude the science is validated. That is exactly the overclaiming `AGENTS.md` and `scientific-validation-plan.md` forbid.
3. **AI recognition accuracy** — barely present. Milestone 6 wires the AI gateway but defines no evaluation of the six dimensions (dish, component, portion, nutrition, FII mapping, downstream score error) that `target-architecture.md` mandates be measured separately.
4. **FII dataset coverage** — under-specified. `fii_foods.csv` is 10 `starter_placeholder` rows; almost every real meal resolves via `mapped_fii`/`macro_fallback`. The plan correctly says "preserve as fixture, not production coverage" (§4) but schedules no coverage track and no FII-coverage audit (which `scientific-validation-plan.md` defines: maximize `exact_fii`, minimize fallback).

**Concrete replacement language.** Split §13 into four explicitly named tracks and state their independence:

> **Track A — Implementation parity (migration gate).** Rust reproduces Python golden outputs within documented tolerance, or emits an explicit difference report. This proves *the port is faithful*. It does **not** prove the model is correct.
>
> **Track B — Scientific validation (model gate, independent of A).** Runs `scientific-validation-plan.md`'s checks against Rust outputs: ranking consistency, portion monotonicity, chronic DIL/DII sanity, uncertainty degradation, and calibration status of `REFERENCE_MEAL_INSULIN_LOAD`. A passing Track A with an un-calibrated reference constant must be reported as "implementation faithful, calibration pending," never as "validated."
>
> **Track C — AI recognition accuracy (provider gate, Milestone 6+).** Evaluates the six dimensions from `target-architecture.md` separately on a held-out, synthetic/consented set. No single confidence percentage may stand in for the six. Recognition accuracy is reported separately from scoring confidence.
>
> **Track D — FII dataset coverage (scientific data track).** Runs the FII Coverage Audit (`exact_fii` vs `mapped_fii` vs `macro_fallback` vs `unknown` distribution). The 10-row starter CSV is fixture-grade; production coverage expansion and dataset versioning are tracked here, decoupled from parity.

Add to Milestone 6 exit criteria a Track-C deliverable, and add a standing Track-D coverage report not gated by parity.

**Corrected milestone placement.** Track A → Milestones 1–2 (unchanged). Track B → add to Milestone 1 exit as a distinct, named gate (it currently hides inside the parity report). Track C → Milestone 6 exit. Track D → a continuous scientific-data track, explicitly *not* a migration gate, surfaced from Milestone 0 onward.

---

## MEDIUM

### M-1 (Investigation #6) — The decomposition/normalization determinism boundary is right in spirit but mislabels hardcoded heuristics as "protected science"

**Section:** §3 *Current Scientific Logic That Must Be Protected* ("PORT: Mixed-meal detection…", "PORT: Weighted decomposition…") and §5 ("PORT: Mixed-meal decomposition rules and weighted component scoring").

What is genuinely deterministic and belongs in Rust (verified):

- `normalize_food_name` / `normalize_text` — pure regex normalization. → Rust.
- `lookup_fii` exact + alias match; `_is_token_subset_phrase` conservative token matching — deterministic given the dataset. → Rust.
- `is_likely_mixed_meal` — deterministic string rules. → Rust.
- The decomposition **mechanics** — apply component weights, look up each component's FII, aggregate by kcal share (`compute_weighted_decomposed_insulin_load`) — deterministic. → Rust.
- Insulin-load math, acute score, estimate-quality mapping, DIL/DII — deterministic. → Rust.

What should **not** be frozen as compiled Rust:

- The decomposition **content** — the dish→component tables and weights in `food_normalizer.py:23-52` (e.g. `chicken biryani → rice 0.60 / chicken 0.25 / oil 0.15`). These are arbitrary heuristics the code itself calls provisional. Compiling them into `match` arms makes every food-knowledge update a code change to a module the plan labels "protected scientific behaviour," which both raises the review burden and risks silent scientific drift. They belong in a **versioned data file** (like `fii_foods.csv`), read by the Rust core, with a dataset version — and, for the AI path, the recognition provider should increasingly supply confirmed components so hardcoded decomposition is only a manual-entry fallback.

**Why MEDIUM not HIGH:** the *destination* (Rust) is correct; the defect is treating mutable heuristic data as immutable protected science, which harms maintainability and muddies the "protected scientific behaviour" boundary in `AGENTS.md`.

**Suggested language:** "PORT the decomposition *mechanism* to Rust. Externalize the decomposition *table and weights* to a versioned data file with a `dataset_version`; do not hardcode dish→component maps in compiled code. Prefer AI/provider-supplied, user-confirmed components on the recognition path." Placement: Milestone 1.

### M-2 (Investigation #9) — Python↔Rust integration mechanism is unspecified and defaults to more than a solo dev needs

**Section:** §11 / Milestone 2 ("Python-to-Rust scoring integration behind a feature flag"), §6 ("DEFER: Python-to-Rust bindings"), referencing `target-architecture.md` Phase 2 ("expose the Rust core through Python or WebAssembly").

The near-term need is narrow: **prove Rust matches Python on synthetic fixtures.** That need is fully served by the language-neutral JSON fixtures the plan already mandates (§13) plus a small Rust CLI that reads fixtures and emits JSON, with a Python test diffing the two — i.e. a **subprocess/CLI boundary**. Zero binding technology, trivially disposable when Python scoring retires.

A live in-process binding is only needed if the *running* FastAPI backend must serve Rust-computed scores to the Ionic app during transition. If that becomes a real requirement, the right tool is **PyO3/maturin** (idiomatic Rust-from-Python, clean wheel), kept in a separate crate from the mobile `insight_ffi`. **UniFFI's Python backend should not be used for the server** — it couples server concerns to the mobile FFI contract.

Recommendation: default Milestone 2 to the CLI/JSON parity harness; introduce PyO3/maturin only if live backend scoring is explicitly required; never route the server through the mobile UniFFI surface. (See also M-3.)

### M-3 (Investigation #10) — Components that add complexity without improving correctness, privacy, accuracy, maintainability, or portability

- **`insight_persistence` crate** (§7) — adds a crate and the FFI-key/handle problem the plan forbids; portability gain is hypothetical (iOS deferred). → remove (H-2).
- **Five of seven crates** (§7) — manifest/version tax over ~600 lines. → modules (H-1).
- **`insight_validation` as a published crate** (§7) — validation is tests + fixtures. → fold into `insight_core/tests`.
- **Milestone 2 live dual-scoring behind a feature flag** (§16) — the parity proof it delivers is already delivered offline by Track A golden-fixture diffing in Milestone 1. A feature flag + in-process binding + dual-run harness is complexity whose benefit is duplicated. → descope to the CLI parity harness (M-2); keep a live binding only if backend-served Rust scoring is genuinely required.
- **`score_item` / `resolve_fii` / `decompose_food` as FFI** (§8) — broaden the stable surface and invite client-side divergence. → internalize (H-3).

None of these improve the five goals enough to justify their cost for a solo developer; each has a lower-cost equivalent above.

---

## ACCEPT

### A-1 (Investigation #7) — Milestone order is appropriate for a solo developer

M0 baseline → M1 Rust core → M2 compat → M3 skeleton → M4 capture/review → M5 encrypted persistence → M6 AI gateway → M7 data migration → M8 retire. Front-loading the deterministic core is correct: it is the highest-reuse, most-testable, platform-independent piece, and it is the only component with locked golden fixtures. The order matches `target-architecture.md`'s phases. The only adjustments are descoping M2 (M-2/M-3) and the label fixes above — not reordering. One minor note: M4's component label "PORT: AI/manual draft and review flows" overstates M4, which delivers manual entry on synthetic data; real AI arrives at M6. Tighten the label to "manual draft + review; AI draft deferred to M6."

### A-2 (Investigation #8) — Building the native skeleton before encrypted persistence is the safest order, with one guardrail

Deferring persistence until M5 is actively *safer*: it keeps all sensitive-data-at-rest risk (SQLCipher, Keystore, migrations, rollback — all `AGENTS.md` high-risk items) out of the picture until the deterministic core and UI flows are proven on synthetic data, and it honours "Rollback export must exist before any migration touches user data." M3/M4 already specify "synthetic local data only" and "save-to-memory," which satisfies the hard constraint.

**Guardrail to add (two parts):**

1. **Hard rule:** no real user health data may be entered or stored before Milestone 5 exit (which includes independent key-management review). State this in M3 and M4 exit criteria, not only in the risk section.
2. **Define a storage interface in M3/M4** (a Kotlin repository abstraction) even though the M3/M4 implementation is in-memory, so M5 swaps the implementation without reworking the UI's data model. The plan defers `core/data` correctly but should pin the *interface* early to avoid coupling the UI to in-memory storage.

---

## Required deliverables

### 1. Recommended smallest Rust workspace

Two crates:

```text
rust/
  Cargo.toml                # workspace
  crates/
    insight_core/           # lib — all deterministic logic, modules: domain, foods, scoring, chronic, quality
      tests/                # golden-fixture parity tests (Track A) + scientific checks (Track B)
      fixtures/             # language-neutral JSON fixtures + expected outputs
      data/                 # versioned FII dataset + decomposition table (externalized per M-1)
    insight_ffi/            # cdylib — the only crate that knows UniFFI types
```

Use **modules, not crates**, for `domain / foods / scoring / chronic / quality`. No `insight_persistence` (persistence is Kotlin-native). No `insight_validation` crate (tests + fixtures live in `insight_core`). Split out a crate later only on demonstrated need.

### 2. Recommended first UniFFI API

```text
score_meal(ConfirmedMeal) -> ScoredMeal          # resolution, decomposition, aggregation, acute score,
                                                 # estimate quality, per-item source/why — all internal
validate_meal_draft(MealDraft) -> ValidationReport
compute_chronic_series(Vec<ChronicDayInput>) -> ChronicSeries
formula_version() -> String
dataset_version() -> String
```

DTOs: `MealDraft`, `ConfirmedMeal`, `MealItemInput`, `ScoredMeal`, `ScoredMealItem` (nested), `EstimateQuality`, `FiiSource`, `ChronicDayInput`, `ChronicMetricPoint`, `ValidationIssue`.

Internal (not FFI) until a concrete need: `score_item`, `resolve_fii`, `decompose_food`, `FiiResolution`, `FoodComponent`.

### 3. Recommended persistence ownership

**Kotlin/Android-native.** `core/data` owns the encrypted database (Room + SQLCipher `SupportFactory`), schema, versioned migrations, backup/restore policy, and Android Keystore-wrapped key material. iOS later owns the Swift equivalent (Keychain + GRDB/SQLCipher or SwiftData). The Rust core never receives a DB handle or key — it is a pure function over decrypted domain inputs. Remove `insight_persistence` from the Rust plan. Revisit only on a funded iOS effort with demonstrated duplication.

### 4. Corrected milestone sequence

Order is largely retained; changes are scope/label, not reordering:

- **M0 — Verified baseline.** *Add:* fix the §1 backend labels (B-1) so the baseline the team acts on is correct. Establish the four test tracks (A–D) as distinct (H-4).
- **M1 — Rust core (two crates).** Port deterministic logic into `insight_core` modules; externalize FII + decomposition data (M-1); add formula/dataset versions. Exit on **Track A (parity)** *and* **Track B (scientific validation, reported separately)**.
- **M2 — Parity verification (descoped).** Default to a CLI/JSON parity harness (M-2/M-3). Add a live PyO3/maturin binding only if backend-served Rust scoring is explicitly required; never via the mobile UniFFI surface. Keep all compatibility endpoints.
- **M3 — Native Android skeleton.** UniFFI scoring bindings only (narrowed surface, H-3). Define the Kotlin storage *interface* now; implementation in-memory (A-2). No real data.
- **M4 — Native manual capture + review.** Manual draft + review on synthetic data; relabel (AI draft deferred to M6). No real data.
- **M5 — Encrypted local persistence (Kotlin-owned).** Room + SQLCipher + Keystore key-wrapping + versioned migrations + import/export + rollback-restore test; independent key-management review. First milestone permitted to store real data.
- **M6 — AI gateway (preserved Python) + recognition accuracy.** Keep the FastAPI `/ai-meal-extract` gateway (B-1). Add **Track C** recognition-accuracy evaluation (six dimensions) to exit criteria. Temporary-image lifecycle with default deletion.
- **M7 — Data migration from legacy.** Unchanged; gated on M5's rollback/export.
- **M8 — Legacy retirement.** Retire Ionic client and Python **deterministic scoring functions only**; explicitly preserve the FastAPI AI gateway and any still-active compatibility endpoints (B-1).

Standing track, not a milestone: **Track D — FII dataset coverage** (H-4), surfaced from M0, never a migration gate.

### 5. Verdict

**REVISE.**

The plan's direction, sequencing, and discipline are sound and faithful to the approved architecture — it should not be discarded (not STOP) — but it should not be executed as written (not GO). One BLOCKER (B-1: the `RETIRE AFTER PARITY` labels on `main.py` / `api/meals.py` contradict the architecture's mandate to retain FastAPI and the AI gateway, and could lead an agent to delete a required component) must be corrected before any agent acts on the labels. Four HIGH findings (over-fragmented workspace, ambiguous/duplicated persistence ownership, an over-broad FFI contract, and the parity-vs-validation conflation) should be resolved before Milestone 1 freezes the workspace and FFI surface. All are documentation/scoping corrections — no code exists yet — so the cost of revising now is low and the cost of not revising (manifest tax, FFI lock-in, deleted gateway, overclaimed science) is high. Revise §1, §7, §8, and §13, apply the guardrails to M3–M5, then proceed.
