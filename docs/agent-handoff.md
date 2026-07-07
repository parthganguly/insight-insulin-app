Last updated: 2026-07-06

# INSIGHT Agent Handoff Guide

Continuity document for any agent or human picking up work on this
repository. It summarizes current status, invariants, guardrails, the
work queue, and safe next steps. It does not change, authorize, or
reinterpret any behavior. Where this document and the governing
documents differ, the governing documents win:

- `docs/target-architecture.md` — approved technical direction
- `docs/scientific-model.md` / `docs/engineering-model.md` — scientific meaning
- `docs/migration-plan.md` — authoritative migration plan
- `AGENTS.md` / `CLAUDE.md` — agent working rules

---

## 1. Current project status

**Private local beta / demo readiness.** The app runs as a local,
single-user, tightly controlled private beta: FastAPI backend on
`127.0.0.1:8000` with a local SQLite database, Ionic React frontend on a
local dev server, optional AI meal extraction through an external
provider. The demo flow (dashboard trend, meal capture, review,
scoring, chronic trend) works end to end with synthetic seed data.

**Completed beta blockers.**

- Backend no longer retains uploaded AI-extraction images (#49).
- Beta privacy disclosure for the AI extraction data flow is in the
  README and frontend (#51).
- The topology and trust model (local-only, no auth, no multi-tenant
  isolation, do not expose publicly) is documented (#54).
- Synthetic demo seed data exists for local demos, operator-invoked
  only (#56).
- The frontend hydrates its meal store from backend meals, so the
  dashboard reflects seeded/saved data (#58).
- Large meal photos no longer break localStorage persistence (#66).
- Approved safety copy and UX wording for insulin-demand estimates is
  in place (#46), with a polish follow-up still open (#47).

**Intentionally not production-ready.** The following are known,
accepted gaps for the beta — do not "fix" them casually and do not
claim they are done:

- no production authentication, account isolation, or multi-tenant
  data separation; the backend must not be exposed publicly
- no cloud deployment, sync, or accounts
- no encrypted local database yet (target architecture calls for
  SQLCipher-class encryption in the native clients)
- scoring is implementation-verified, not scientifically validated;
  the FII dataset is a small starter placeholder
- the Rust core is a migration/parity component, not yet wired into
  any client

## 2. Scientific / scoring invariants

These are the current backend formulas, ported byte-for-byte to the
Rust parity core. They are protected behavior: never change them
without an explicitly approved scientific-change issue.

- **Acute item load:** `insulin_load_item = (FII / 100) × kcal_item`,
  where `kcal_item = max(0, quantity × kcal_per_unit)`.
- **Meal load:** `insulin_load_meal = Σ insulin_load_item`.
- **Acute score:**
  `acute_score = (insulin_load_meal / 30.0) × 100`, where `30.0` is the
  fixed `REFERENCE_MEAL_INSULIN_LOAD` constant (100 ≈ typical meal).
- **Chronic DIL/DII:** `daily_dil = Σ item insulin loads for the day`;
  `daily_dii = daily_dil / total_daily_energy`; rolling 7-day trend
  exposed by the backend (7/14/28-day definitions in the engineering
  model).
- **FII resolution precedence per item:** provided FII → (if likely
  mixed) weighted decomposition → exact/alias lookup → conservative
  mapped lookup → decomposition retry → macro fallback (`K_EST = 0.6`)
  → terminal unknown (0.0 load, confidence 0.2).
- **Source labels:** exactly
  `exact_fii | mapped_fii | macro_fallback | user_confirmed | unknown`.
  Decomposed dishes always aggregate as `mapped_fii`, never
  `exact_fii`. Provenance (rule path, component weights, matched share,
  per-component FII/source/confidence) stays explicit; never merge
  recognition, nutrition, and FII confidence into one unexplained
  percentage.
- **Claims boundary:** INSIGHT estimates population-level meal insulin
  demand. It makes no medical claims and no personal insulin, glucose,
  dosing, or diagnostic predictions. Wording that implies otherwise is
  a defect.

## 3. Hard guardrails

- No changes to formulas, `backend/fii_foods.csv`, `estimate_quality`
  rules, or chronic DIL/DII behavior without an explicitly approved
  issue.
- No backend retention of uploaded meal images (#49 removed it; do not
  reintroduce it, even "temporarily").
- No AI-proposed FII may ever become `user_confirmed`: AI extraction
  does not emit FII (#42), the POST boundary neutralizes non-positive
  provided FII (#42/#43), and the Rust request-boundary wrapper (#68)
  exists to preserve this at the FFI seam. `fii` is the canonical
  request field; `fii_value` is a deprecated compatibility alias
  (#44/#69).
- No production, deployment, or multi-user readiness claims anywhere.
- No scientific-behavior change ships without independent review;
  implementation parity is never scientific validation.
- Synthetic data only; never real health data, real meal photos, or
  secrets in code, fixtures, tests, or prompts.

## 4. Recently completed work

- #49 — backend stopped retaining AI-extraction images
- #51 — beta privacy disclosure for the AI extraction data flow
- #54 — private-beta topology and trust-model documentation
- #56 — synthetic demo seed data script (operator-invoked, local only)
- #58 — frontend meal store hydrates from backend meals
- #60 / #64 — demo UI polish (dashboard/meal flow; CSS-only material
  polish and journey cues)
- #61 — CI hotfix for red main after #60 frontend tests
- #66 — large meal photos no longer break localStorage persistence
- #68 — Rust provided-FII request-boundary wrapper (draft PR, open)
- #70 — provided-FII boundary docs and `fii_value` deprecation-in-place
  (draft PR, open; closes #69)
- #71 — mixed-dish decomposition parity close-out tests (draft PR,
  open; closes #27 — the port itself merged earlier via #28)
- #25 / #26 — isolated macro-fallback parity, already complete and
  merged

## 5. Open work queue

> **Superseded for current status:** PRs #68/#70/#71 below have since
> merged, and the #76 audit produced a newer execution queue. See
> `docs/fable-sunset-baton.md` (issue #82) for the authoritative
> post-Fable queue and per-issue guardrails.

1. Review and merge draft PR #68 (Rust request-boundary wrapper).
2. Review and merge draft PR #70 (boundary docs / `fii_value`
   deprecation).
3. Review and merge draft PR #71 (decomposition precedence tests).
4. #47 — safety-copy polish (frontend copy only: spell out "Food
   Insulin Index" once, better label for unscored AI items, qualify
   "Chronic Score" wording).
5. Remaining #44 follow-ups after #68/#70 land (e.g., UniFFI exposure
   of the wrapper; the long-term type-level provenance idea recorded as
   Option D in #44 needs its own approval).
6. Future (needs its own approved issues; do not start ad hoc):
   deployment, authentication, account isolation, multi-user data
   separation, cloud sync.

## 6. Review model

- Complex implementation work is done by Fable (or the strongest
  available model), one agent per narrowly scoped task.
- Codex is the preferred reviewer when available, especially for
  scoring, parity, and Rust work.
- Sonnet is an acceptable reviewer for docs, frontend, and reliability
  changes, and a backup Rust reviewer with careful, explicit checks.
- A human is the final gate for merges, safety copy, formulas, and any
  claims wording. Scientific-scoring and FII-resolution diffs always
  require review by someone other than the author.

## 7. Local demo runbook

1. **Sync main:** `git checkout main && git pull`.
2. **Run backend** (first time: create the venv and
   `pip install -r requirements.txt` per the README):
   from `backend/` with the venv active,
   `python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload`.
3. **Seed demo data** (optional, so the trend is not empty): from
   `backend/`, `python scripts/seed_demo_data.py`
   (`--reset-demo` removes exactly the seeded meals).
4. **Run frontend:** from `frontend/` (first time: `npm ci`),
   `npm run dev -- --host 127.0.0.1`. It reads `frontend/config.json`,
   which points at `http://127.0.0.1:8000` — start the backend first.
5. **`OPENAI_API_KEY`** in `backend/.env` is needed only for the Smart
   Camera / AI meal extraction path. Everything else — manual entry,
   scoring, dashboard, chronic trend — works without it.
6. **60-second demo path:** open the Dashboard (seeded chronic trend
   visible) → add a meal manually (e.g., "chicken biryani", a portion
   with kcal) → review the estimate card (source label + why) → save →
   see the acute score and the meal appear → return to the Dashboard
   to see the trend include it.

## 8. Safe prompts for future reviewers / builders

Copy-paste starting points that stay inside approved scope:

- **Reviewing #68:** "Review draft PR #68 only. Verify the Rust
  request-boundary wrapper mirrors the Python POST-boundary
  neutralization exactly, that raw-core parity tests are byte-for-byte
  unchanged (including `zero_provided_fii_remains_user_confirmed`),
  and that no formula, fixture, or CSV changed. Do not extend scope."
- **Reviewing #70:** "Review draft PR #70 only. Confirm it is
  docs-only, matches the backend's actual `fii`/`fii_value` behavior
  in `backend/models.py` and `backend/api/meals.py`, deprecates
  `fii_value` without removing or changing it, and adds no new claims."
- **Reviewing #71:** "Review draft PR #71 only. Confirm the three new
  tests are test-only, that their expected values match the live
  Python backend for the same inputs, and that no production code,
  rule, weight, or fixture changed."
- **Implementing #47:** "Implement #47: frontend copy/display changes
  only. Spell out 'Food Insulin Index' at least once, improve the
  unscored-AI-item label, and qualify 'Chronic Score' wording. No
  scoring, API, or safety-copy weakening; keep all disclaimers."
- **Future auth/deployment:** "Draft a plan-only issue for
  authentication/deployment. Do not write code. Respect
  `docs/target-architecture.md`, keep the local-first posture, list
  privacy/security risks, and stop for human approval before any
  implementation."

## 9. What not to touch without an explicit approved issue

- scoring formulas, coefficients, thresholds, or rule/weight tables
- `backend/fii_foods.csv` (values, aliases, confidences)
- `estimate_quality` semantics
- chronic DIL/DII definitions
- medical/scientific claims and safety copy meaning
- backend image retention behavior
- production-readiness or deployment claims
- authentication, database schema, storage, or persistence
  architecture
