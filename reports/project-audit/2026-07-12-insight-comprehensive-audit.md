# INSIGHT — Comprehensive Independent Project Audit

**Audit date:** 2026-07-12
**Audited commit:** `ab9ab37` ("Give Dashboard Recents a read-only saved-meal detail view (#89) (#90)"), branch `main`, equal to `origin/main` at audit start.
**Auditor:** Fable 5 primary agent, reconciling five read-only domain reviews (scientific, frontend/product, backend/privacy, Rust/architecture, history/tests) plus the primary agent's own scientific tracing and external literature research.
**Working tree during audit:** clean except the untracked `reports/` directory (audit output). No application code, dataset, formula, config, branch, issue, or PR was modified. `git diff --check` clean; `git status --short` shows only `?? reports/`.

> **Fable certification (2026-07-12, replacement pass): FABLE-CERTIFIED WITH QUALIFICATIONS.** An earlier certification attempt was invalidated because the active model switched from Fable to Opus 4.8 mid-pass; its banner and appendix were voided. This report was then re-verified end-to-end in a single uninterrupted Fable session: all load-bearing scoring numbers were re-derived from the live code, the §2 checks were re-run, and the key Holt and Bao citations were re-checked against available primary journal records, while figures or later studies that could not be confirmed were explicitly marked EXTERNAL VALIDATION REQUIRED. Corrections made in the certified pass: the Veggie Omelette demo score **190 → 189** (`Math.round(189.4999…)`, `frontend/src/utils.ts:9`); the Bao composite-meal paper re-dated **2009;90:986-992** (was 2011; 2011 is a different paper); the §10 demo-meal quality analysis refined to separate the four worst-of-N "poisoned staple" meals from the two genuinely all-fallback meals; and the regulatory section labelled as non-legal, jurisdiction-dependent planning pointers. The "predicted 5-fold spread" figure is flagged EXTERNAL VALIDATION REQUIRED. Full evidence and the model-integrity disclosure: `reports/project-audit/2026-07-12-insight-fable-verification.md`.

---

## 1. Executive verdict

INSIGHT is a **methodologically disciplined, well-tested, honestly-documented software prototype wrapped around a scientific model that is not yet validated and is, in several concrete ways, presently miscalibrated.** The engineering process (small reviewed PRs, protected-formula rules, a byte-for-byte Rust parity core, candid disclaimers) is stronger than the median early-stage health app. The science underneath it is a 10-row placeholder dataset, an uncalibrated normalization constant flagged `TODO` in the source, colour thresholds with no empirical basis, a mixed-dish decomposition that silently drops food components it has no data for, and a "Chronic Score" whose value mechanically rewards logging fewer days. None of this is hidden — the repository's own documents repeatedly say "implementation parity is not scientific validation" — but the gap between the polish of the shell and the maturity of the model is the single most important fact about this project.

**Fit for purpose today:** acceptable for **local, single-user private demonstration** and **a tightly-scoped private beta whose testers are told the numbers are illustrative**. Not acceptable for public beta, and far from acceptable for any production or health-adjacent use. The product's own topology and safety documentation reaches the same conclusion; this audit confirms it against the code.

**The central strategic risk is not technical debt — it is investing further in parity/native infrastructure for a scoring model whose outputs no one has yet shown to be meaningful.** The urgent work is scientific (dataset provenance, calibration, external comparison) and a few safety/operational fixes; the Rust/native migration, while cleanly executed, is premature relative to that.

Evidence label: **STRONG INFERENCE** (verdict), built from VERIFIED component findings below.

---

## 2. Exact audited commit and environment

- Commit: `ab9ab37` on `main`; `git pull --ff-only` reported "Already up to date"; PR #90 confirmed merged; **no open PRs**; 9 open issues (#1, #2, #6, #7, #16, #23, #44, #47, #62).
- Platform: Windows 11 (10.0.26200), PowerShell + Git Bash.
- Toolchains present and used read-only: backend `.venv` Python 3.13; Node/npm with existing `frontend/node_modules`; Rust stable via `cargo`.
- No dependencies installed; no network writes; external web research used only public scientific sources.

### Automated check results (run this audit, unmodified repo)

| Check | Command | Result |
|---|---|---|
| Backend unit tests | `python -m unittest discover -s tests` (backend/) | **PASS** 24/24 |
| Backend "scientific validation" | `python -m validation.run_validation` | **PASS** 6/6 cases |
| Golden fixture drift | `python -m validation.export_golden_fixtures --check ...` | **PASS** (current) |
| Frontend typecheck | `npx tsc --noEmit` | **PASS** |
| Frontend unit tests | `npm run test.unit -- --run` | **PASS** 187/187, 19 files |
| Frontend build | `npm run build` | **PASS** (chunk >500 kB advisory only) |
| Frontend lint | `npm run lint` | **FAIL** — 8 errors (unused vars), pre-existing |
| Rust tests | `cargo test --workspace` | **PASS** 204 (160 unit + 44 golden) |
| Rust format | `cargo fmt --all -- --check` | **PASS** clean |
| Rust lint | `cargo clippy --workspace --all-targets -- -D warnings` | **PASS** clean |
| Diff hygiene | `git diff --check` | **PASS** |
| Status | `git status --short` | **PASS** (`?? reports/` only) |

Note the lint failure: `frontend/eslint.config.js` and a `"lint"` script exist, but **CI never invokes them** (see §18), which is why 8 unused-variable errors sit on `main` unnoticed.

---

## 3. Method and evidence sources

Five parallel read-only reviews plus primary tracing:

1. **Scientific model** (primary agent, direct): read and executed `backend/scoring_service.py`, `fii_lookup.py`, `food_normalizer.py`, `estimate_quality.py`, `chronic_service.py`, `fii_foods.csv`, `validation/*`; ran the live scoring pipeline against realistic and demo-seed meals.
2. **Frontend/product** (subagent): `frontend/src` pages, stores, utils, tests, copy, accessibility.
3. **Backend/data/privacy/security** (subagent): API surface, persistence, AI path, secrets, threat model.
4. **Rust/architecture/migration** (subagent): `crates/insight-core`, Python↔Rust parity, fixtures, FFI status.
5. **History + tests/CI** (subagent): full `git log`, merged PRs, all issues, every test layer, CI coverage.
6. **External literature** (primary agent, WebSearch): original and composite-meal FII publications.

Every load-bearing conclusion is tagged **VERIFIED** (confirmed in code/tests/history I read directly), **STRONG INFERENCE** (multiple corroborating repository facts), **TENTATIVE**, or **EXTERNAL VALIDATION REQUIRED**. Scientific items additionally carry evidence strength and validation state.

---

## 4. Confidence and uncertainty statement

- Repository facts (formulas, constants, dataset size, test/CI coverage, file behaviour) were executed or read directly — **high confidence**.
- History/issue dispositions rely on `git log` + `gh` output cross-checked against code — **high confidence**, with the caveat that squash-merges make branch-merge state noisy (individually diff-checked where it mattered).
- External scientific claims come from reputable sources (AJCN etc.) via search summaries; I did not read every full paper, so specific numeric quotes are **TENTATIVE / EXTERNAL VALIDATION REQUIRED** and are cited as such.
- I did **not** run the app's browser E2E flows this session; frontend runtime behaviour is inferred from source + the existing (untracked) #76 Cypress audit report + the passing unit suite.
- Internet access **was** available; where a claim needs a primary-source read I say so rather than asserting certainty.

---

## 5. Canonical project definition

INSIGHT is a mobile-oriented meal-logging application that estimates the **relative, population-level insulin demand of meals** using the Food Insulin Index (FII) as the primary driver, extended heuristically to mixed dishes and to a rolling multi-day "chronic" trend, with explicit source-quality labelling and safety disclaimers. Architecturally it is today an **Ionic React + Capacitor frontend** talking to a **FastAPI + SQLite backend**, with an **OpenAI-based meal-image extraction** helper and a **parallel Rust "scientific core"** built as a parity port toward an approved (but unbuilt) native Android/iOS + shared-Rust-core target architecture.

---

## 6. What the product currently does (VERIFIED)

- Lets a user log a meal **manually** (name, items, portions, macros) or via **Smart Camera / AI extraction** (image/text → structured draft the user reviews).
- Scores each item's **insulin load** = `(FII/100) × kcal_item`, resolving FII through an ordered chain: provided → mixed-dish weighted decomposition → exact CSV/alias lookup → conservative token-subset mapped lookup → decomposition retry → GI/macro fallback → terminal unknown.
- Aggregates to a meal **acute score** = `(Σ item load / 30.0) × 100`, presented as a ring + "relative to a reference meal of 100" copy, tiered green/amber/red at 35/60.
- Labels each item's source (`exact_fii | mapped_fii | macro_fallback | user_confirmed | unknown`) and a meal **estimate_quality** (high/medium/low/unknown), plus **main_insulin_drivers**.
- Computes a **Chronic Score** = rounded `rolling_7d_dii × 100`, where `daily_dii = daily_dil / total_daily_energy`, shown on the Dashboard with a "not a measure of insulin resistance or metabolic health" disclaimer.
- Persists meals server-side (SQLite) and mirrors them in browser localStorage; hydrates the frontend from the backend; supports read-only saved-meal detail (PR #90), reuse-as-new-draft (Meals tab), and backend-first delete.
- Shows a Settings BMR/TDEE (Mifflin-St Jeor) calculator, unrelated to scoring.

## 7. What it explicitly does NOT do (VERIFIED against code and copy)

It does not measure or predict personal insulin or glucose, does not diagnose, does not compute insulin dosing, does not personalize to the individual, and makes no medical claims. The safety copy (`frontend/src/utils/safetyCopy.ts`) states each of these disclaimers explicitly and consistently, and no user-facing string was found that violates them. There is **no authentication, no multi-user isolation, no encryption at rest, no cloud sync**, all by documented design for the local private beta.

---

## 8. Chronological reconstruction (VERIFIED from git/PRs/issues)

1. **Founding docs (2026-06-17→21):** issues #1/#2 and PR #3 establish the approved native-Android + Rust-core + UniFFI target architecture and migration plan; CI added (PR #4, issue #6); Gemini/agent instructions.
2. **Rust parity migration (PR #8→#40, 2026-06-24→07-03):** one scoring slice per PR — direct-FII item/meal/acute (#11/#13/#15), exact lookup (#17), mapped lookup (#21/#22), provided FII (#24), macro fallback (#26), mixed-dish decomposition (#28), terminal unknown (#30), mean confidence (#32), estimate quality (#34), chronic DIL/DII (#36), score_meal contract (#38), main_insulin_drivers (#40). Issue #23's "safest implementation order" was followed line-by-line.
3. **AI-FII trust boundary (#41→#44, #67/#68, #69/#70, #71):** AI extraction stripped of FII (#42), trust-boundary tests (#43), decision to neutralize non-positive provided FII and deprecate `fii_value` in place, Rust request-boundary wrapper (#68), docs (#70), precedence tests (#71).
4. **Privacy/storage (#49/#51/#54):** stopped backend image retention (#49), privacy disclosure (#51), topology/trust-model doc (#54).
5. **Frontend hydration + demo polish (#56/#58/#60/#61/#64/#66):** synthetic seed data, backend→frontend hydration, UI polish, CI hotfix, CSS material polish, localStorage photo-quota safety.
6. **Archon experiment (#52, 2026-07-04):** external review-harness pilot evaluated against 4 historical blockers, **declined** ("0/4 baseline catches"); no code/config residue remains — cleanly closed dead end.
7. **Beta-readiness audit #76 (2026-07-06→11):** live Cypress/Electron QA produced fixes #74/#81 (camera failure UX), #77/#84 (timestamp UTC/local), #78/#85 (delete integrity), #75/#86 (manual draft UX), #80/#87 (BMR gender constants), #79/#88 (acute >100 clarity). Its "Finding A" (Dashboard Recents silently converted saved meals into drafts, hiding real scores) became #89 → **PR #90, the audited HEAD**.
8. **Handoff docs:** `docs/agent-handoff.md` (#73) and `docs/fable-sunset-baton.md` (#82/#83) — execution batons for post-Fable continuation.

---

## 9. Completed / provisional / active / superseded inventory

### A. Completed and dependable (merged + tested)
- Rust parity port of the scoring pipeline: 204 passing tests, clippy/fmt clean; CSV single-sourced via `include_str!`. **VERIFIED.**
- AI-FII trust boundary: AI schema has no `fii` field; non-positive provided FII neutralized; three enforcement layers + regression tests. **VERIFIED** (but see §18 — those tests don't run in CI).
- Backend image non-retention (#49) with a regression test. **VERIFIED.**
- Meal delete integrity, UTC/local timestamp handling, manual-draft UX, saved-meal read-only detail (#90). **VERIFIED** by code + unit tests.
- Disciplined safety copy; recognition-vs-scoring uncertainty kept separate. **VERIFIED.**

### B. Completed but provisional (works, not validated)
- Acute score, thresholds, colours, chronic DII presentation — implemented and internally consistent, **scientifically uncalibrated** (see §10).
- `estimate_quality`/confidence labels — coherent ordinal scheme, not empirically calibrated probabilities.
- FastAPI + unencrypted SQLite persistence — fine for local beta, not the encrypted-native target.
- Additive `ALTER TABLE` startup "migration" shim — safe for additive history only, no rollback/versioning.

### C. Currently active or unfinished
- Issue **#47** (safety-copy polish: spell out "Food Insulin Index", relabel unscored AI items, qualify "Chronic Score") — **genuinely open**, none implemented.
- Issue **#44** follow-ups: UniFFI exposure and typed confirmation-provenance — deliberately deferred.
- Rust request-boundary wrapper does not yet implement the two-field `fii_value`/`fii` merge (see §14).

### D. Proposed, abandoned, superseded, or stale
- Issues **#1/#2/#6/#7/#16/#23** — work **silently completed**, issues never closed (GitHub state misrepresents reality).
- Issue **#62** (premium component-library audit) — approved deliverable `reports/design/2026-07-05-component-library-audit.md` **never created**; effort redirected to #76. Stale.
- `docs/code-audit.md` — dated **2026-03-21**, references a deleted `docs/scoring-model.md`, describes pre-migration chronic behaviour; still listed among AGENTS.md "read first" files. **Stale.**
- Archon — cleanly declined, no residue.
- `backend/utils.py::save_base64_images` and `backend/test.py` (asks the AI for FII directly) — dead code that re-implements the exact two behaviours the codebase was hardened against. Re-wiring hazards.

---

## 10. Scientific-model audit

Formulas traced directly in `backend/scoring_service.py` and confirmed byte-for-byte in the Rust core.

### Item insulin load — `insulin_load_item = (FII/100) × kcal_item`
- **Classification:** adapted from published evidence (FII scales insulin response per energy). **Evidence strength: moderate** for the *concept*; **low** for *this implementation* because the FII inputs are placeholders. **Validation state: parity-tested only.**
- The FII/energy formulation is defensible and matches how FII is defined in the literature (response per iso-energetic portion).

### Meal load — `Σ item loads`; Acute score — `(load / 30.0) × 100`
- `REFERENCE_MEAL_INSULIN_LOAD = 30.0` is **explicitly flagged `# TODO: Calibrate this baseline against real meal history`** (`scoring_service.py:9-10`). **VERIFIED.**
- **Consequence, measured live:** a plain 600 kcal serving of rice (FII 79) scores **1580**; the six demo-seed meals a beta user actually sees score **39, 106, 189, 375, 551, 829** (as displayed via `Math.round`, `frontend/src/utils.ts:9`). The claim "100 ≈ a typical mixed meal" (`docs/scientific-model.md:36`) is **false for the app's own realistic inputs** — a typical meal lands in the hundreds. To score 100 a meal must have a total insulin load of exactly 30, i.e. roughly a 30–40 kcal portion. **VERIFIED by execution.**
- **Classification: currently unvalidated / product-display convention. Evidence strength: absent. Validation state: unvalidated.**

### Thresholds 35 / 60 and green/amber/red
- No source, no derivation; two *different* colour hex sets encode the same three tiers (`AcuteScoreProgressbar.tsx` vs `insulinImpactPresentation.ts`). Because real meals usually exceed 60, the presentation is red for most food; the **green (<35) band was unreached by every demo meal checked**, and amber (35–60) is narrow but reachable (one demo meal, Grilled Chicken Salad, scores 38.8). **VERIFIED.** **Evidence strength: absent.**

### FII resolution — exact / mapped / decomposition / macro fallback / unknown
- **Dataset: 10 rows, every one `source = starter_placeholder`** (`fii_foods.csv`). **VERIFIED.** This is the root scientific weakness: everything downstream rests on ten hand-entered numbers with no cited measurement.
- **Mixed-dish decomposition silently drops components absent from the CSV.** `food_normalizer.py` decomposes "chicken biryani" → rice 0.60 + chicken 0.25 + oil 0.15, but **`chicken` and `oil` have no CSV rows**, so only rice matches: `matched_share` caps at 0.60 and the dish is scored *as if it were 60% rice and nothing else*, then labelled `mapped_fii`. "rice and chicken" scores on rice alone (0.65 share). **VERIFIED by execution.** Decomposition **weights are heuristic**, not empirical (the code says so).
- **Macro fallback** coefficients (`K_EST=0.6`, protein ×0.5, sat-fat ×0.1, unsat-fat ×0.05, GL ×1.0) are **unsourced engineering heuristics**. **VERIFIED.** **Evidence strength: absent.**
- **Terminal unknown** contributes 0 load but is disclosed ("may be higher than shown") — a reasonable honest choice.
- **The `estimate_quality` aggregation is worst-of-N; for the meals that have a well-covered staple, that — not lack of data coverage — is why they are labelled `low`.** Re-executed independently during Fable certification (all six displayed demo-meal scores reproduced exactly: 39, 106, 189, 375, 551, 829). `estimate_quality.py::resolve_estimate_quality` returns `low` if **any single item** falls outside `{exact_fii, mapped_fii, user_confirmed}`. The six demo meals split into two mechanisms:
  - **Four meals have a well-covered staple poisoned by one low-confidence side** — `eggs` (98.2% of load, `exact_fii`), `plain yogurt` (96.1%, `exact_fii`), `white rice` (95.3%, `exact_fii`), and `whole wheat bread` (96.7%, `mapped_fii` via the decomposition token-fallback to white bread) each drive nearly all of their meal's insulin load, but a single `macro_fallback` side (a saute, berries, drink, or turkey slice) drags the whole meal to `low`. These are the true worst-of-N victims, and a load-weighted rule would rescue them.
  - **Two meals — Grilled Chicken Salad (39) and Pasta with Cake Dessert (106) — are genuinely all-`macro_fallback`** (no `exact_fii`/`mapped_fii` item at all), so they would be `low` under any reasonable rule and load-weighting would **not** rescue them.
  So the actionable defect is the **fragile worst-of-N meal-quality rule** (should it be weighted by insulin-load share?) for the majority of demo meals — but it is not the whole story: two of six are legitimately low-coverage. **VERIFIED by execution.**

### Chronic DIL/DII and 7-day rolling trend
- `daily_dil = Σ day item loads`; `daily_dii = dil / daily_energy`; `rolling_7d = mean of last 7 daily values`, where the endpoint pre-seeds **zero rows for unlogged days** (`main.py:96-99`).
- **Consequence, measured live:** identical eating gives a Chronic Score of **79 if logged every day** vs **11 if logged once in seven days** — the metric mechanically rewards *not logging*. A user eating the same food every day but logging sporadically sees a "better" chronic trend. This is an **adherence artifact presented as a health-adjacent score.** **VERIFIED by execution.** The disclaimer ("days without logged meals may lower the trend") mentions the direction but not that the number is dominated by logging frequency rather than diet.
- Day bucketing is by **UTC date**, so late-evening local meals can fall on the "wrong" chronic day (acknowledged in code). **VERIFIED.**
- **Classification: descriptive engineering metric, not clinical. Evidence strength: absent for any health interpretation. Validation state: unvalidated.**

### Estimate quality / confidence
- `estimate_quality` is a clean **ordinal** derivation from source labels; per-item `confidence` is a number in [0.2, 1.0] assembled from blended heuristics. It is **not a calibrated probability** and should be treated as ordinal. The per-item numeric confidence and AI nutrition confidence are parsed but **never displayed** — a good instinct (avoids a false-precision percentage), though it means the field is currently dead. **VERIFIED.**

---

## 11. Scientific evidence ledger

| Component | Type | Evidence strength | Validation state |
|---|---|---|---|
| FII concept (insulin response ≠ carbs-only; per-energy) | Adapted from published evidence | Moderate | Literature-derived |
| `insulin_load = FII/100 × kcal` | Engineering formalization of FII | Moderate (concept) / Low (inputs) | Parity-tested only |
| 10-row FII table | Placeholder data | Absent (all `starter_placeholder`) | Unvalidated |
| Acute reference 30.0 → score 100 | Product-display convention | Absent (code says "TODO calibrate") | Unvalidated |
| Thresholds 35/60, colours | Product-display convention | Absent | Unvalidated |
| Decomposition weights | Engineering heuristic | Absent | Unvalidated (+ data-coverage bug) |
| Macro fallback coefficients | Engineering heuristic | Absent | Unvalidated |
| Chronic DII 7-day rolling | Descriptive engineering metric | Absent (for health meaning) | Unvalidated (+ adherence artifact) |
| estimate_quality ordinal | Provenance heuristic | Low | Internally tested |
| Rust == Python parity | Implementation parity | High (for tested paths) | Parity-tested only |

**External literature grounding (EXTERNAL VALIDATION REQUIRED for exact figures):**
- Original FII: Holt, Brand-Miller, Petocz, *An insulin index of foods*, **Am J Clin Nutr 1997;66:1264-1276** — 38 foods, ~11–13 healthy subjects, 1000 kJ (~239 kcal) portions, insulin iAUC over 120 min, white bread = 100. Study design: small-N acute crossover in healthy adults.
- Composite meals: Bao J, de Jong V, Atkinson F, Petocz P, Brand-Miller JC, *Food insulin index: physiologic basis for predicting insulin demand evoked by composite meals*, **Am J Clin Nutr 2009;90:986-992** (corrected during Fable certification — the first draft mis-dated this as 2011; 2011 is a *different* Bao et al. paper, "Dietary insulin index and insulin load…", PMID 21543531) — 13 isoenergetic (2000 kJ) mixed meals, n≈10-11 per meal, healthy subjects; FII-predicted meal insulin correlated with observed (**r = 0.78, P = 0.0016**, confirmed against the abstract), and observed responses varied over a **3-fold range** (35 → 116). The specific "predicted 5-fold spread" figure was **not** independently confirmed from the primary source in this pass and is flagged EXTERNAL VALIDATION REQUIRED; the direction (FII over-predicts mixed-meal spread) is the paper's stated conclusion. Fat content was inversely related to insulin response.
- Later validation work extends FII to type-2-diabetes and lean cohorts in mixed-meal crossover trials, still small-N and acute.

**Takeaway:** the *concept* INSIGHT builds on is real and peer-reviewed, and even supports "carbs alone are insufficient." But (a) the published evidence is small-N, acute, healthy-skewed, and over-predicts mixed-meal spread; (b) INSIGHT's *implementation* uses none of the measured FII values — it uses 10 placeholders — so the literature does **not** transfer to this app's outputs. The app is best described today as *"a relative meal-insulin-demand estimator whose scoring concept is literature-derived but whose data and calibration are not."*

---

## 12. Claim audit

Every user-facing/ documented claim touching insulin, glucose, resistance, metabolic health, diagnosis, or personal response was catalogued. **Result: the copy layer is disciplined and defensible.** Representative strings (all `safetyCopy.ts` / `acuteScoreDisplay.ts` / `insulinImpactPresentation.ts`):

- `APP_DISCLAIMER`: "…estimates the relative insulin demand of meals using published population-level food data. It does not measure or predict your personal insulin or glucose response, does not diagnose any condition, and is not medical advice." — **acceptable.**
- `CHRONIC_TREND_DISCLAIMER`: "…It is not a measure of insulin resistance or metabolic health." — **acceptable**, and important given the "Chronic Score" name.
- Tier descriptions all end "This is a general tendency, not a personal prediction." — **acceptable.**
- `ACUTE_SCORE_SCALE_EXPLAINER`: "…compares…with a reference meal set to 100. It is not a percentage and can exceed 100." — **acceptable** as far as it goes.

**Gaps (wording is safe; framing is not fully honest):**
1. "100 ≈ typical meal" (`docs/scientific-model.md:36`) is contradicted by the app's own outputs (typical meals score in the hundreds). The *disclaimer* is fine; the *reference-point claim* is empirically wrong and should be softened to "an internal reference constant, not yet calibrated to real meals." **P1.**
2. "Chronic Score" reads as a health score despite the disclaimer; issue #47 already proposes qualifying it. The deeper problem (it tracks logging frequency more than diet) is not disclosed. **P1.**
3. "published population-level food data" slightly oversells a 10-row `starter_placeholder` table; acceptable only while testers know it's illustrative. **P2.**

No claim implies diagnosis, treatment, dosing, personal prediction, insulin resistance, cognition, or weight loss. **VERIFIED.**

---

## 13. Dataset and provenance audit

- **`backend/fii_foods.csv`: 10 foods, columns `food_name,fii,aliases,source,confidence`, every `source = starter_placeholder`, confidences 0.65–0.75 hand-set.** **VERIFIED.**
- Coverage: white bread, rice, banana, yogurt, milk, egg, beef, potato, lentils, oats. **No chicken, no oil, no fish, no vegetables, no composite dishes** — yet the decomposition rules reference chicken/oil/fish/beans, guaranteeing permanent partial matches (§10).
- **Cultural coverage:** decomposition hardcodes some South-Asian dishes (biryani, dal rice) but the underlying data cannot support them (no chicken/oil rows). GCC/Indian food coverage is effectively absent at the data layer.
- **Aliases/mappings extend beyond measured evidence:** e.g. "brown rice", "jasmine rice", "skim milk" all inherit one number; the token-subset matcher can map unmeasured phrases to these placeholders. Mapped matches are therefore **not defensible as evidence**, only as UX.
- **Uncertainty representation:** a single `confidence` column, not tied to any measurement variance.
- Single source of truth is respected: Rust embeds the same CSV (`include_str!`) and fingerprints it — good engineering, but it propagates the same placeholder data to both implementations.

**Validation state: unvalidated. Evidence strength: absent.** This is the highest-leverage scientific gap: no downstream calibration can be meaningful until the dataset is real and provenanced. Note the interaction with the worst-of-N `estimate_quality` rule (§10): even when the dataset *does* cover a meal's dominant staple, one uncovered side item still drags the whole meal to `low` — so dataset expansion alone will not fix the quality labels without also revisiting the aggregation rule.

---

## 14. Python/Rust parity and migration audit

- **Parity breadth:** ~90%+ of the deterministic scoring pipeline is ported and matches Python on every path the audit checked (item load, meal aggregation, acute score, exact/mapped lookup, decomposition, macro fallback, terminal unknown, estimate quality, drivers, chronic DIL/DII). **VERIFIED.**
- **Rust quality:** zero `unwrap`/`panic` in non-test code, validated newtypes reject NaN/∞/negative, epsilon float asserts, 204 substantive tests, clippy/fmt clean. Genuinely high-quality. **VERIFIED.**
- **Constants are hand-duplicated literals** in both languages (`30.0`, `0.6`, clamp bounds, confidences). Only the CSV has a single source of truth; the numeric constants and decomposition rule tables do not. A one-language edit would silently desync, caught only by fixtures — imperfectly (below). **VERIFIED.**
- **Golden fixtures are generated *from* the Python implementation** (`export_golden_fixtures.py` runs Python scoring), so they can only prove "Rust reproduces current Python," never correctness. Only **6 fixture cases / ~11 real food names**; entire paths (direct mapped-FII lookup, 3 of 7 decomposition phrase rules, generic-token fallback) are **not exercised** by any cross-language fixture. A plausible bug in those paths would pass the whole golden suite. **VERIFIED.**
- **Request-boundary gap:** the Rust wrapper (#68) normalizes a single `Option<f64>`; the Python boundary merges **two** fields (`fii_value` preferred over `fii`) with documented non-canonical precedence. The Rust wrapper does not implement that merge, so a real UniFFI client would have to reimplement it per-platform — exactly what the target architecture forbids. **VERIFIED.**
- **Rust is dead code at runtime:** no UniFFI, no generated bindings, no Kotlin/Swift project, no PyO3 bridge, no backend/frontend call into it. After 21 PRs, **0% of the "make it the real shared core" work exists**; the crate is exercised only by its own `cargo test`. **VERIFIED.**
- **Provider not neutral:** AI extraction is hardcoded to OpenAI `gpt-4.1` (`services.py`), conflicting with the target's provider-neutral requirement. **VERIFIED.**

**Assessment:** the migration is *well-executed but premature.* It hardens a formula set that is not yet validated; any scientific correction will invalidate parity work and require dual-language edits plus fixture regeneration. Value banked = a clean, tested Rust reimplementation nothing calls.

---

## 15. Frontend and product-flow audit

**Strengths (VERIFIED):** PR #90's `SavedMealDetail` genuinely fixed #76 Finding A — Dashboard Recents now opens a read-only canonical view (real score, quality, drivers, item explanations) and never routes through `buildDraftFromSavedMeal`; malformed-id guarded; reuse path preserved and tested. Safety copy disciplined; recognition vs scoring uncertainty separated; no merged confidence percentage anywhere.

**Functional defects:**
- **F1 — no unsaved-draft guard:** `/meals/new` isn't tab-scoped; tapping a tab (or a reuse card) mid-edit silently overwrites the in-progress draft in `currentMealStore`, no warning. Data-loss path. **P1.**
- **F2 — unsaved-draft delete has no confirmation** (`PreviewMeal.tsx`): a half-composed manual meal is discarded on one tap. **P2.**
- **F3 — "Update Data Using First Item"** silently overwrites meal name/image from the first item, no confirm, vague label. **P2.**
- **F4/F5 — misleading modal affordances:** the item-edit modal's "back" arrow and "save" icon both just close the sheet (edits are already live-bound); the same save icon means two different things across the screen. **P2/P3.**
- **F7 — `main.tsx` computes safe-area insets then ignores them**, hardcoding `paddingTop: 50px`; wrong padding on real devices, duplicates correct handling elsewhere. **P2.**
- **F8 — dark-mode setting fully orphaned:** persisted default `darkMode:true`, but the only toggle UI is commented out and nothing applies it on load. Dead feature. **P3.**

**Cosmetic / dead code:** commented-out blocks, unused `lottie-react` dependency, **broken Cypress starter test** asserting "Tab 1 page" that would fail if run (so `test.e2e` gives zero real coverage), hardcoded undocumented dish-subtype chips (`SUBTYPE_CHIPS`) with no provenance/tests, several `e.detail.value!` non-null assertions. **P3.**

**Product-strategy questions:** "Chronic Score"/"DII" is unexplained in-app (no expansion of the acronym, no plain-language meaning); the richer chronic series/DIL data is fetched but unused; whether the AI camera flow earns its complexity vs. manual entry is untested (`AiMealAdd.tsx` has **zero tests**); whether Settings BMR/TDEE belongs in the product at all.

---

## 16. Backend, storage and API audit

- **API:** `GET /`, `POST /ai-meal-extract`, `GET /metrics/chronic`, `POST /meals`, `GET /meals`, `DELETE /meals/{id}`. Pydantic validation; ORM (no SQL-injection surface); delete cascades to items (tested); no duplicate prevention.
- **Trust boundary solid:** AI schema has no `fii`; `normalize_non_positive_fii` + `resolve_positive_provided_fii` neutralize non-positive provided FII; only a positive explicit value becomes `user_confirmed`. Three layers, regression-tested. **VERIFIED.**
- **Persistence:** single local SQLite (`app.db`, gitignored, unencrypted), `check_same_thread=False` with no WAL/retry (lock → generic 500 under concurrency); additive-only `ALTER TABLE` startup shim, no versioning/rollback. Timestamps stored naive-UTC, serialized with explicit UTC marker (#77 fix).
- **AI path:** images in-memory only, never written (verified, #49 test); OpenAI error types mapped to sanitized messages (a genuinely strong spot). **But:** hardcoded OpenAI, no client timeout, **no image count/size cap** (unauthenticated cost/abuse vector against a real key), and the generic `except Exception` returns raw `str(e)` (`main.py:75-77`) — internal-detail leak. **`GET /metrics/chronic?days=` has no upper bound** → unauthenticated large-loop DoS.
- **Secrets:** `OPENAI_API_KEY` via `os.getenv`, never echoed; `.env` gitignored; no key-shaped strings in tracked files. Dead `backend/test.py` still prompts the AI for FII directly and `backend/utils.py` still contains the image-saving function — both re-wiring hazards to delete.
- **Readiness:** local demo **ready**; limited private beta **ready as scoped** (close the `days` bound and `str(e)` leak first); public beta **not ready** (no auth, shared table, no rate limit/size caps, open CORS, real-cost AI endpoint); production health-adjacent **not ready by a wide margin** (no encryption at rest, no migration framework, no consent/data-separation, placeholder dataset).

---

## 17. Privacy, security and safety audit

**Threat model highlights (VERIFIED):**
- Meal photos: **not** persisted server-side. A full-size image may remain in the frontend's in-memory Zustand state for the current session, but images larger than 24,000 characters are stripped before the meal store is written to browser localStorage (#66); small images at or below that threshold may still be persisted locally. Backend deletion cannot reach any locally-persisted copy (documented gap).
- Health-adjacent data (meal names, macros, scores) in one unencrypted, unscoped SQLite table — every client's meals share it. Acceptable only for single-user local use.
- No known API-key value is deliberately returned, but the generic exception path both logs the exception (`print(f"Error: {e}")`) and exposes `str(e)` in the HTTP 500 response. That may disclose internal implementation or provider details and should be scrubbed before any network-exposed beta. CORS `*` + credentials is dev-only and documented.
- Deletion of backend records is complete (cascade); no export/backup endpoints (privacy-neutral, but no data portability).
- Privacy/topology docs were checked line-by-line against code and are **accurate, not aspirational** — a real strength.

**Classification (kept separate, per instructions):**
- Local private demonstration: **acceptable.**
- Limited private beta (trusted single tester, local): **acceptable as scoped**, after the two cheap backend fixes.
- Public beta: **not acceptable.**
- Production health-adjacent: **not acceptable.**

**Regulatory framing (not yet applicable, flag before any status change).** At its current single-user local-prototype stage no specific regime is triggered, but the moment INSIGHT leaves that boundary the following become live and should gate release: (1) **FDA general-wellness vs. Software-as-a-Medical-Device (SaMD)** — staying descriptive/"general wellness" depends on *not* making disease/treatment/dosing claims, which is exactly why the §12 claim discipline matters; (2) **GDPR Article 9 special-category (health) data** if any EU user is involved — meal/health-adjacent data needs a lawful basis, and research use needs separate explicit consent (already reflected in the target architecture's data-separation design); (3) **US state health-data-privacy statutes** (e.g. Washington My Health My Data-class laws) for consumer health data. None require action now; all require a named owner and a checklist item before public beta.

These three items are **general, jurisdiction-dependent planning pointers, not a settled legal classification** of INSIGHT, and whether any of them applies turns on facts not decided here (where users are located, what claims the product makes, whether data leaves the device). **This audit is not legal advice**; obtain qualified regulatory counsel for the relevant jurisdictions before any status change.

---

## 18. Testing and CI audit

- **Durable tests:** backend 24 unit + 6 validation; frontend 187 unit (19 files); Rust 204 (160 unit + 44 golden). All pass. **VERIFIED.**
- **The "scientific validation suite" is 6 self-consistency property tests** (ranking, source-quality ordering, portion monotonicity, chronic rise, uncertainty degradation, driver ranking) with **developer-authored expected outcomes and no external ground truth.** Honestly scoped in `docs/scientific-validation-plan.md`, but "6/6 validation passed" is easily over-read as clinical validation. **VERIFIED.**
- **Golden fixtures freeze current Python behaviour**, cannot validate correctness; coverage gaps leave real code paths cross-language-unverified (§14). **VERIFIED.**
- **CI COVERAGE GAP (most important operational finding):** `.github/workflows/ci.yml` backend job runs only `compileall`, `run_validation`, and the fixture drift check. **It never runs `backend/tests/*` — including `test_ai_fii_trust_boundary.py` (the safety-critical trust-boundary regression suite) and `test_no_image_retention.py` (the privacy regression suite).** A PR reintroducing AI-FII-as-user-confirmed, or backend image retention, would keep CI green. CI also never runs `npm run lint` (8 lint errors sit on `main`) and the Cypress E2E is broken starter boilerplate. **VERIFIED.**
- **Untested risks:** `/metrics/chronic` HTTP layer (incl. the `days` DoS and UTC bucketing), payload-size limits, concurrent writes, corrupted (non-JSON) localStorage, large-data/many-meal scale, malformed AI responses beyond the one error-shape test, DST/non-UTC clocks, the `AiMealAdd` and `Settings` pages (zero tests each), schema migration.

**Would CI-green catch a regression?** Rust scoring: **yes.** Frontend unit-covered logic: **yes.** Backend trust boundary / image retention / delete / timestamps / chronic endpoint: **no** — those tests exist and pass locally but never run in CI.

---

## 19. Accessibility audit

- **Positive:** the acute-score ring is `role='img'` with a descriptive `aria-label` that states it's not a percentage — better than most chart components. Live-region roles on the save/validation banner and AI error box are correct. Destructive actions on *saved* meals confirm.
- **Defects:** `--app-faint #8a97a5` on white ≈ **2.98:1 contrast — fails WCAG AA** and even the 3:1 large-text minimum, and it's used for real text (timestamps, score captions, tab labels). Several icon-only buttons lack `aria-label` (modal back/save/delete). A decorative chevron lacks `aria-hidden`. No `<h1>`; ad-hoc heading levels. **No a11y tooling** (`jsx-a11y`, `axe`) in lint or tests. Small overlay touch targets unverified against 44×44. Draft delete / "update from first item" have no confirmation.
- Classification: mostly **accessibility defects** (contrast, labels) and one **process gap** (no automated a11y checks). None block a local demo; several block a public beta.

---

## 20. Architecture assessment

Two coexisting realities: (1) the **running product** — Ionic/React + FastAPI/SQLite + OpenAI, a coherent local-first prototype; and (2) the **approved target** — native Android/iOS + shared Rust core via UniFFI + encrypted SQLite. The Rust core is a faithful bridge-in-progress but currently **an island**: no consumer, no FFI, provider not neutral, request-boundary merge unported. Source-of-truth is respected for the FII CSV but not for numeric constants or decomposition rules. The architecture docs are internally consistent and honest about status. The main architectural risk is **sequencing**: heavy investment in the shared-core/native path ahead of any evidence that the scoring model is worth shipping.

---

## 21. Technical-debt register

| Item | Location | Severity |
|---|---|---|
| CI omits `backend/tests/*` (safety + privacy regressions) | `.github/workflows/ci.yml` | **High** |
| CI omits lint; 8 lint errors on main | ci.yml, `Meals.tsx`/`Settings.tsx`/`currentMealStore.ts` | Medium |
| Unbounded `days` on `/metrics/chronic` (DoS) | `main.py:80-99` | Medium |
| Unbounded AI image payload; no client timeout | `models.py`, `services.py` | Medium |
| Generic exception leaks `str(e)` | `main.py:75-77` | Medium |
| Dead re-wiring hazards (`utils.py`, `test.py`) | backend | Medium |
| Numeric constants hand-duplicated Py/Rust | scoring_service.py / crates | Medium |
| Golden fixtures freeze behaviour; path gaps | validation / fixtures | Medium |
| Broken Cypress starter test (`test.e2e` = 0 coverage) | frontend/cypress | Low |
| `main.tsx` ignores computed insets | main.tsx | Low |
| Orphaned dark-mode; dead lottie dep; commented blocks | frontend | Low |
| `code-audit.md` stale, references deleted file, in "read first" set | docs | Low |
| Deprecated FastAPI `@app.on_event("startup")` | main.py:37 | Low |

---

## 22. Product-strategy assessment

The value proposition — *"understand the relative insulin demand of what you eat, beyond just carbs"* — is genuinely differentiated and literature-motivated. But the product currently cannot deliver it credibly because (a) the numbers are uncalibrated and mostly render red, (b) the chronic score rewards not logging, (c) meals are labelled low-quality by a fragile worst-of-N rule even when a well-covered staple drives most of their load, and (d) the AI camera flow adds cost/complexity/privacy surface without demonstrated value over manual entry. The strongest near-term product bet is **not more features or native migration — it is making a small number of foods trustworthy end-to-end and learning whether users find relative meal ranking useful.** Personalization must not be attempted without personal data and validation.

---

## 23. Retrospective: could this have been done better?

1. **Sequencing (avoidable):** ~21 PRs of Rust parity were completed before the scoring model was validated or even calibrated (the reference constant is still `TODO`). Consequence: substantial hardened infrastructure atop unvalidated numbers, with rework risk. *Better rule:* validate/ calibrate the model to a "worth shipping" bar before investing in cross-language/native parity. **Evidence:** #8–#40 vs `scoring_service.py:9` TODO. *Note:* the parity work is high quality and low-risk to the running app, so this is a prioritization critique, not wasted craftsmanship.
2. **Test breadth vs depth (partly avoidable):** the suite grew large (400+ tests) but the two most safety-critical backend suites don't run in CI, and "validation" is self-consistency. *Better rule:* CI must run every regression test that guards a safety/privacy invariant; distinguish "parity/consistency" from "validation" in all reporting. **Evidence:** ci.yml.
3. **Issue hygiene (avoidable, cheap):** six completed issues never closed; #62's promised deliverable never produced; a stale March audit remains a mandated "read first" doc. Consequence: the tracker misrepresents reality and onboarding reads stale guidance. *Better rule:* close-on-merge and prune the read-first set.
4. **Data-before-decomposition (avoidable):** decomposition rules were written for foods (chicken, oil) the dataset never contained, guaranteeing silent partial matches. *Better rule:* never ship a mapping whose targets aren't in the data. **Evidence:** `food_normalizer.py` vs `fii_foods.csv`.
5. **Chronic metric design (hindsight-tempered):** presenting a logging-frequency-sensitive average as a "Chronic Score" was a design miss, though a subtle one. *Better rule:* pressure-test any aggregate for the "identical behaviour, different logging" invariant before shipping it as a score.
6. **AI complexity ahead of proof (avoidable):** a hardcoded-OpenAI camera flow with cost/privacy surface and zero tests preceded evidence it beats manual entry. *Better rule:* prove the value of an AI path against a manual baseline before hardening it.

What was done *well*: small reversible PRs, strict formula-preservation discipline, honest disclaimers and docs, the CSV single-source, the trust-boundary layering, and a genuinely useful #76 live audit that caught a real UX regression.

---

## 24. Current blockers and open decisions

- **Open decisions for humans (§34).** No open PRs. Nine open issues, most already done or deferred; only #47 (safety copy) and #62 (design audit, stale) are genuinely actionable, and #47 partially overlaps §12.

---

## 25. Prioritized risk register

| Risk | Likelihood | Impact | Priority |
|---|---|---|---|
| Users interpret uncalibrated/red acute scores as meaningful | High | High | **P0** |
| Chronic Score misread as health signal (adherence artifact) | High | High | **P0** |
| CI green while trust-boundary/image-retention regressions ship | Medium | High | **P1** |
| Placeholder dataset treated as real by any wider audience | High (if expanded) | High | **P0/P1** |
| Unauthenticated DoS / AI cost abuse if backend exposed | Low (local) → High (exposed) | Medium/High | **P1** |
| Data-loss UX (unsaved draft overwrite/delete) | Medium | Medium | **P1/P2** |
| Rust/native effort compounding before validation | Ongoing | Medium | **P2** |
| Accessibility (contrast/labels) blocks wider use | High (wider) | Medium | **P2** |

---

## 26. Immediate roadmap (0–4 weeks)

Evidence-gated; each item names its exit criterion.

1. **Truth-in-presentation for the acute score (P0).** Re-word "100 = typical meal" to "internal, not-yet-calibrated reference"; consider hiding numeric scores behind an explicit "illustrative" label until calibrated. *Exit:* no user-facing string asserts an empirical meaning the data can't support. *Effort: small.*
2. **Fix or reframe the Chronic Score (P0).** Either exclude unlogged days from the rolling mean, or relabel it as a coverage-dependent "logged-meal load trend" with prominent framing. *Exit:* identical eating logged daily vs sporadically no longer produces wildly different "scores," or the dependency is unmissable. *Effort: small–medium.*
3. **Make CI run the safety/privacy regressions (P1).** Add `backend/tests` and `npm run lint` to CI. *Exit:* a PR reintroducing AI-FII-as-user-confirmed or image retention fails CI. *Effort: small.*
4. **Two cheap backend hardening fixes (P1).** Bound `days`; scrub the generic exception. *Exit:* both covered by a test. *Effort: small.*
5. **Delete re-wiring hazards (P1).** Remove `backend/utils.py::save_base64_images` and `backend/test.py`. *Exit:* gone; image-retention test still green. *Effort: small.*
6. **Documentation truth (P1).** Close the six done issues; retire/replace `docs/code-audit.md`; drop it from the read-first set. *Exit:* tracker and docs match reality. *Effort: small.*
7. **Ship #47 safety-copy polish (P2).** Spell out "Food Insulin Index"; relabel unscored items; qualify "Chronic Score". *Exit:* human-approved wording merged. *Effort: small.*

## 27. Near term (1–3 months)

- **Structured private-beta learning:** put 5–15 measured, provenanced foods in the dataset; instrument whether relative *ranking* of meals feels right to testers. *Evidence required:* qualitative usefulness of ranking. *Exit:* decision on whether the core value lands.
- **Decide the AI camera flow's fate** by comparing it against manual entry on accuracy, effort, and abandonment. *Exit:* keep/simplify/drop decision with data.
- **Fix the decomposition-vs-data mismatch:** never map to components absent from the dataset; add chicken/oil/vegetables or remove those rules. *Exit:* no dish silently scores on a partial component set.
- **Reduce duplication risk:** single-source the numeric constants or add fixtures that actually exercise the currently-unverified paths. *Exit:* a one-language constant change fails a test.
- **Decide whether Rust/native continues** given validation status (recommend: pause new parity work, keep the crate compiling). *Exit:* explicit go/pause decision recorded.

## 28. Medium term (3–12 months)

- **Scientific validation programme (§30) Phases 1–2:** dataset audit + internal analytical validation + external retrospective comparison against published FII/meal-insulin data. *Exit:* documented ranking performance vs literature on held-out foods/meals.
- **Calibrate the reference constant and thresholds** against real (or literature-derived) meal distributions so scores and colours are interpretable. *Exit:* a "typical meal" actually scores near 100; bands are reachable.
- **Dataset expansion with provenance** (measured values, sources, uncertainty), including GCC/Indian coverage if that's the target market. *Exit:* every scored food traces to a citation.
- **Security/privacy upgrades** only if moving beyond local: auth, per-user scoping, encryption at rest, migration framework. *Exit:* public-beta readiness checklist met.
- **Native/Rust migration** only if validation succeeds and a native client is actually planned. *Exit:* a real UniFFI consumer exists.

## 29. Long term (12–24+ months, conditional)

Conditional branches, each with a stop criterion:
- **If validation succeeds:** a scientifically-grounded relative meal-insulin-demand product; possibly a scoring-engine API for researchers/clinicians (with appropriate regulatory review). *Stop if* prospective validation fails.
- **If validation is weak but ranking is useful:** reposition as an explicitly-descriptive dietary-awareness tool, drop score-like framing. *Stop if* users don't value ranking.
- **If validation fails:** pivot away from insulin-demand claims entirely, or discontinue. *Do not* add personalization, CGM, or clinical features on unvalidated foundations.

---

## 30. Scientific-validation programme

1. **Dataset audit (foundational).** Replace `starter_placeholder` with measured FII values, each with source, population, portion protocol, and uncertainty; resolve alias/mapping over-reach; represent uncertainty explicitly. *Exit:* provenanced dataset, no placeholder rows on any live path.
2. **Internal analytical validation.** Formula correctness (already parity-tested), sensitivity analysis (portion/FII error propagation), boundary behaviour, ablation of each fallback, robustness to the decomposition-coverage bug. *Exit:* documented sensitivity + no silent-partial-match paths.
3. **External retrospective validation.** Compare INSIGHT's meal-insulin-demand *rankings* against independent published composite-meal insulin data (e.g. Bao 2009-style composite-meal datasets) on held-out foods and mixed meals; report rank correlation and calibration. *Exit:* pre-registered ranking-performance target met on held-out data. *Note:* the literature reports FII over-predicts the *spread* of mixed-meal responses (observed spread ≈ 3-fold, confirmed; the exact predicted-spread multiple is unconfirmed against the primary source), so expect and report shrinkage.
4. **Prospective human validation (only if 1–3 pass).** Standardized mixed-meal protocol, insulin iAUC endpoints, repeatability, relevant populations (including the target market and impaired-glucose subjects), ethics/IRB oversight, pre-registration, a pre-specified statistical-analysis plan. **Do not name a sample size without a justified power analysis** — derive N from the effect size and variance observed in Phase 3, not by guessing.
5. **Claim ladder (gate wording to evidence):**
   - *Now:* "descriptive relative meal index; internal reference; not validated."
   - *After Phase 3:* "ranks meals by expected population-level insulin demand, consistent with published FII data (with known over-prediction of spread)."
   - *After Phase 4:* "population-level meal insulin-demand estimate validated against measured insulin responses in [population]."
   - *Never without much stronger, personalized, regulated evidence:* personal prediction, insulin-resistance guidance, clinical/treatment use.

---

## 31. Top 10 next actions (ordered)

1. Reframe acute-score presentation so no string claims an empirical meaning the data can't support (P0).
2. Fix or relabel the Chronic Score's logging-frequency artifact (P0).
3. Add `backend/tests` + `npm run lint` to CI (P1).
4. Bound `/metrics/chronic?days=` and scrub the generic exception leak (P1).
5. Delete `backend/utils.py` image-saver and `backend/test.py` (P1).
6. Close the six silently-completed issues; retire stale `code-audit.md` (P1).
7. Fix decomposition so it never maps to components missing from the dataset (P1/P2).
8. Put 5–15 measured, provenanced foods in the dataset and re-check `estimate_quality` on realistic names (P2).
9. Add a data-loss guard for unsaved drafts (nav + delete confirmation) (P2).
10. Record an explicit go/pause decision on further Rust/native parity work (P2).

## 32. Top 10 things NOT to do

1. Do **not** expand medical/health claims until Phase-4 validation.
2. Do **not** add personalization/CGM without personal data *and* validation.
3. Do **not** expand the dataset indiscriminately or scrape unsourced FII values.
4. Do **not** rewrite the frontend or backend — they are adequate for their stage.
5. Do **not** build native clients / UniFFI bindings before the model is validated and a native client is actually planned.
6. Do **not** recalibrate the acute score arbitrarily; calibrate against real distributions with a documented method.
7. Do **not** display numeric confidence percentages until they are calibrated.
8. Do **not** expose the backend publicly (no auth, shared table, open CORS, real-cost AI endpoint).
9. Do **not** treat "more AI" (more images, more models) as inherently better; prove value vs manual entry first.
10. Do **not** treat passing golden fixtures or the 6-case validation suite as scientific validation.

---

## 33. Proposed issue candidates

1. `[P0] Acute score presentation: remove "100 = typical meal" empirical claim; label as uncalibrated reference`
2. `[P0] Chronic Score is a logging-frequency artifact — exclude unlogged days or relabel`
3. `[P1] CI must run backend/tests and npm run lint`
4. `[P1] Backend hardening: bound /metrics/chronic days; scrub generic exception detail`
5. `[P1] Remove dead re-wiring hazards (backend/utils.py image saver, backend/test.py)`
6. `[P1] Issue hygiene: close #1/#2/#6/#7/#16/#23; retire docs/code-audit.md from read-first set`
7. `[P1] Decomposition must not map to dataset-absent components (chicken/oil/fish/beans)`
8. `[P2] Dataset: replace starter_placeholder with ≥N measured, provenanced FII values`
8b. `[P2] Reconsider worst-of-N estimate_quality aggregation (weight by insulin-load share so one minor side item doesn't force a whole meal to "low")`
9. `[P2] Frontend data-loss guards: unsaved-draft nav + delete confirmation`
10. `[P2] Accessibility: fix --app-faint contrast, add missing aria-labels, add jsx-a11y/axe to CI`
11. `[P2] Decision record: pause vs continue Rust/native parity given validation status`
12. `[P3] Remove orphaned dark-mode, unused lottie dep, broken Cypress starter test`

(All are candidates only — not filed by this audit.)

---

## 34. Human decisions required

1. **Scientific gate:** commit to the validation programme (dataset provenance → calibration → external comparison) before any wider release or stronger claim. Who owns it, what's the evidence bar?
2. **Chronic Score:** fix vs relabel vs remove — a product+science call.
3. **Rust/native:** continue, pause, or freeze the migration given the model isn't validated.
4. **AI camera flow:** keep, simplify, or drop pending value-vs-manual evidence.
5. **Target market & dataset:** which cuisines/populations, and therefore which foods must be measured first.
6. **Any wording change touching the score/claims** requires the human safety-copy gate per the project's own rules.

---

## 35. Final recommendation

**Freeze scope, tell the truth in the UI, wire up CI safety, and pivot effort from parity/native engineering to scientific validation.** INSIGHT has an unusually clean engineering substrate and an honest documentation culture; its risk is not code quality but shipping science-shaped numbers that aren't yet science. The three things that matter most, in order: (1) stop the two presentation defects that could mislead a user *today* (acute-score framing, chronic-score artifact); (2) make CI actually guard the safety/privacy invariants that already have tests; (3) start a real dataset+calibration+validation programme and gate every claim to it. Everything else — native migration, more AI, polish — should wait behind those gates.

---

## 36. Appendix

**Key files:** `backend/scoring_service.py` (formulas, `REFERENCE_MEAL_INSULIN_LOAD=30.0` TODO at :9-10, `K_EST=0.6`), `backend/fii_foods.csv` (10 `starter_placeholder` rows), `backend/food_normalizer.py` (decomposition rules referencing dataset-absent components), `backend/fii_lookup.py`, `backend/estimate_quality.py`, `backend/chronic_service.py`, `backend/main.py` (`:75-77` leak, `:80-99` unbounded days), `backend/api/meals.py` (trust boundary), `backend/validation/{run_validation,evaluators,fixtures}.py` (6 self-consistency cases), `frontend/src/utils/{safetyCopy,acuteScoreDisplay,insulinImpactPresentation}.ts`, `frontend/src/pages/meal/{PreviewMeal,SavedMealDetail}.tsx`, `frontend/src/pages/dashboard/Dashboard.tsx`, `frontend/src/main.tsx` (:13-17 ignored insets), `crates/insight-core/src/*` (parity core, `include_str!` CSV, `request_boundary.rs`), `crates/insight-core/tests/golden_fixtures.rs`, `.github/workflows/ci.yml` (missing backend tests + lint).

**Commits/PRs referenced:** HEAD `ab9ab37` (PR #90); parity chain PR #8–#40; trust boundary #42/#43/#68/#70/#71; privacy #49/#51/#54; hydration/polish #56/#58/#60/#61/#64/#66; #76 audit fixes #81/#84/#85/#86/#87/#88; batons #73/#83.

**Open issues:** #1, #2, #6, #7, #16, #23 (silently done); #44 (mostly done); #47 (open); #62 (stale).

**Test commands:** see §2 matrix.

**External scientific sources (public):**
- Holt SHA, Brand-Miller JC, Petocz P. *An insulin index of foods: the insulin demand generated by 1000-kJ portions of common foods.* Am J Clin Nutr 1997;66:1264-1276. (Original FII; 38 foods, ~11–13 subjects, white bread=100.) — https://ajcn.nutrition.org / researchgate PDF.
- Bao J, de Jong V, Atkinson F, Petocz P, Brand-Miller JC. *Food insulin index: physiologic basis for predicting insulin demand evoked by composite meals.* Am J Clin Nutr **2009;90:986-992**. (Composite-meal FII; **r = 0.78, P = 0.0016**; observed responses 3-fold range 35→116; fat inversely related. Year corrected from 2011 during Fable certification; the "predicted 5-fold" figure is unconfirmed from the primary source.) — https://ajcn.nutrition.org/article/S0002-9165(23)23265-7/fulltext / https://www.sciencedirect.com/science/article/pii/S0002916523232657.
- Subsequent FII validation in type-2-diabetes and lean cohorts (acute mixed-meal crossover) — https://www.sciencedirect.com/science/article/pii/S000291652313704X.

*Exact numeric figures above are from search summaries and are marked EXTERNAL VALIDATION REQUIRED; confirm against the primary PDFs before citing in any product or scientific claim.*

**Confirmation:** No application code, dataset, formula, configuration, branch, issue, or PR was modified during this audit. The only file created is this report.
