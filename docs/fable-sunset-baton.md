Last updated: 2026-07-07 (issue #82)

# Fable Sunset Baton — Post-Fable Execution Guide

Fable access is time-limited. This document is the execution baton for
whichever model continues afterwards (Codex, GPT-5.5, Sonnet, or
smaller). It says what the known-good baseline is, what to do next, in
what order, under which guardrails — so no future agent has to
re-litigate science or rediscover scope.

This document authorizes nothing new. Where it differs from the
governing documents, the governing documents win:

- `docs/target-architecture.md` — approved technical direction
- `docs/scientific-model.md` / `docs/engineering-model.md` — scientific meaning
- `docs/migration-plan.md` — authoritative migration plan
- `AGENTS.md` / `CLAUDE.md` — agent working rules
- `docs/agent-handoff.md` — general handoff context (runbook, review
  model, safe prompts)

For status as of this writing, this baton supersedes the "Open work
queue" section of `docs/agent-handoff.md` (written 2026-07-06, before
PRs #68/#70/#71 merged and before the #76 audit).

---

## 1. Current known-good baseline

**Latest `main` commit at time of writing:**
`2ef936d` — "Make Smart Camera failure states clear without leaking
internals (#74) (#81)".

**Recently merged PRs and why they matter:**

- **#68** (`d771bdb`) — Rust provided-FII request-boundary wrapper.
  Preserves the "AI/default FII never becomes `user_confirmed`"
  invariant at the future FFI seam. Raw-core parity semantics
  unchanged.
- **#70** (`3abee35`) — documents the provided-FII request boundary
  and deprecates backend `fii_value` in place (`fii` is canonical;
  `fii_value` still accepted). Docs-only; closes #69.
- **#71** (`bb77699`) — discriminating precedence tests for mixed-dish
  decomposition parity. Test-only; closes out #27.
- **#73** (`6197353`) — `docs/agent-handoff.md`, the general project
  handoff guide (status, invariants, runbook, review model).
- **#81** (`2ef936d`) — Smart Camera failure states (denied /
  cancelled / unavailable camera, missing `OPENAI_API_KEY`, AI
  failure) now give clear user feedback without leaking internals;
  closes #74, one of the audit findings.

**Current private-beta status:** local, single-user, tightly
controlled private beta (see `docs/private-beta-topology.md` — no
auth, permissive CORS, shared unencrypted local SQLite, localhost
only, no production claims). The demo flow works end to end with
synthetic seed data. The #76 core functionality audit ("test like a
first-time beta user") was run on 2026-07-07; its report lives locally
under `reports/` (untracked by design) and its findings were converted
into the approved issues below.

**Remaining blockers before the demo is credible:**

- #77 — meal timestamps display with a UTC/local offset (wrong times,
  potentially wrong calendar day, outside UTC)
- #78 — meal delete is not persistent (backend hydration resurrects
  "deleted" meals)
- #75 — manual meal draft/save UX looks broken to first-time users

After those: #79 (acute score >100 presentation), #80 (swapped
BMR/TDEE gender constants in Settings), #47 (safety-copy polish).

---

## 2. Immediate execution queue

Work these in order, one issue per branch/PR, smallest possible diff:

1. **#77** — fix meal timestamps displayed with UTC/local offset
2. **#78** — fix or disable non-persistent meal delete behavior
3. **#75** — improve manual meal draft and save feedback UX
4. **#79** — clarify acute score presentation above 100
5. **#80** — fix swapped BMR/TDEE gender constants in Settings
6. **#47** — polish remaining safety-copy clarity after #46

All six are already approved in their issues; do not expand their
scope, and do not implement anything not listed in the issue body.

---

## 3. Per-issue execution cards

Common to all six issues — do not restate per card:

- No scoring-formula, FII-CSV (`backend/fii_foods.csv`),
  `estimate_quality`, or chronic DIL/DII changes.
- No medical claims; no production-readiness claims.
- `git diff --check` clean; CI green before merge.
- Independent review: **required for every PR** (no model approves its
  own PR); the cards below note where a human gate is additionally
  required.
- PR body structure for all: "Closes #NN", what changed and why (one
  paragraph), exact changed files, checks run (with results), live
  smoke evidence, unresolved risks. Open as draft.

### #77 — Meal timestamps UTC/local offset

- **Risk class:** medium-high. Persistence/API-boundary change; the
  highest-risk item in the queue.
- **Allowed scope:** smallest serialization/parsing fix so displayed
  meal times are correct in local time. Prefer timezone-aware UTC
  serialization (ISO with `Z` or explicit offset). Preserve sort order
  and meal IDs. Handle existing naive rows safely if practical.
- **Forbidden:** auth/storage architecture changes; schema migrations
  beyond what the smallest fix truly needs. **Watch:** chronic DIL/DII
  buckets meals by day — the fix must not silently move meals across
  day boundaries in the chronic aggregation. If day bucketing would
  change, stop and report before proceeding.
- **Tests:** backend tests if serialization changes; frontend tests if
  display parsing changes.
- **Live smoke:** save a meal in Asia/Kolkata timezone; displayed time
  matches wall-clock save time; existing meals still render and sort
  correctly; chronic trend unchanged for existing data.
- **Review:** independent model review required (backend behavior
  change).
- **Branch:** `<agent>/meal-timestamp-utc-offset`
- **PR title:** `Fix meal timestamps displayed with UTC/local offset (#77)`

### #78 — Delete integrity

- **Risk class:** medium. Data-integrity UX; may add a backend
  endpoint.
- **Allowed scope:** either (1) a real `DELETE /meals/{id}` endpoint
  plus frontend integration, or (2) short-term UI fix: hide/disable
  delete for backend-persisted meals with honest copy. Never pretend
  deletion succeeded unless it persists.
- **Forbidden:** auth/storage architecture rewrite; bulk-delete or
  data-export scope creep.
- **Tests:** backend tests for the endpoint (if option 1) and/or
  frontend tests for the chosen behavior.
- **Live smoke:** delete a saved meal, refresh — the meal must not
  resurrect (option 1) or the delete affordance must be honestly
  absent/disabled (option 2).
- **Review:** independent model review required (backend behavior
  and/or destructive action semantics).
- **Branch:** `<agent>/meal-delete-integrity`
- **PR title:** `Fix or disable non-persistent meal delete behavior (#78)`

### #75 — Manual meal draft/save UX

- **Risk class:** low. Frontend UX only.
- **Allowed scope:** clearer draft-placeholder labeling, obvious
  edit affordance on item rows, visible empty/zero validation
  feedback, better after-save feedback. Preserve current save/edit/
  delete behavior and rejection rules exactly.
- **Forbidden:** backend changes (unless a tiny error-shape fix is
  separately justified in the PR); storage/hydration changes; new UI
  dependencies; any change to scoring inputs or source semantics.
- **Tests:** frontend tests where feasible; typecheck/build.
- **Live smoke:** create a manual meal, edit an item, get rejected on
  empty/zero, save a valid meal, refresh without duplicates.
- **Review:** independent model review (Sonnet-class is sufficient).
- **Branch:** `<agent>/manual-meal-draft-ux`
- **PR title:** `Improve manual meal draft and save feedback UX (#75)`

### #79 — Acute score >100 presentation

- **Risk class:** low-medium. Presentation-only, but touches score
  display, so wording is safety-adjacent.
- **Allowed scope:** frontend presentation only — e.g. capped ring
  with explicit numeric label, scale explanation, copy explaining the
  100-=-typical-meal reference baseline. Formula and thresholds
  untouched.
- **Forbidden:** acute-score formula or threshold changes; backend or
  Rust changes; any new interpretation of what the score means beyond
  `docs/scientific-model.md` (relative index of meal insulin demand
  against an uncalibrated internal reference of 100; see issue #93).
- **Tests:** frontend tests where feasible; typecheck/build.
- **Live smoke:** visual check with scores below and above 100.
- **Review:** independent model review, plus human sign-off on any
  new user-facing wording about the score.
- **Branch:** `<agent>/acute-score-over-100-presentation`
- **PR title:** `Clarify acute score presentation above 100 (#79)`

### #80 — BMR/TDEE gender constants

- **Risk class:** low-medium. Display-formula bug fix. This is the
  Mifflin-St Jeor display in Settings, **not** insulin scoring — but
  it is still a published formula, so cite the source and prove the
  fix with tests.
- **Allowed scope:** one small frontend utility fix swapping the
  gender constants back to the published values; unit tests with
  known male/female examples; formula citation in code comment or
  test.
- **Forbidden:** insulin-scoring, backend, or Rust changes; wiring
  BMR/TDEE into scoring; new health claims.
- **Tests:** frontend unit tests (male and female cases with expected
  published-formula values); typecheck/build.
- **Live smoke:** Settings shows the corrected BMR/TDEE for the audit
  case (male, 30 y, 70 kg, 175 cm, sedentary) and its female
  counterpart.
- **Review:** independent model review; verify the constants against
  the published formula, not against the current code.
- **Branch:** `<agent>/bmr-gender-constants`
- **PR title:** `Fix swapped BMR/TDEE gender constants in Settings (#80)`

### #47 — Safety-copy polish

- **Risk class:** low, but human-gated (safety copy meaning).
- **Allowed scope:** frontend copy/display only — spell out "Food
  Insulin Index" at least once; better label for unscored AI items
  (e.g. "Not yet scored" instead of "Unknown / not estimated").
  **The "Chronic Score" qualification is superseded by issue #93:** the
  concept was renamed to the "7-Day Logged Meal Trend" and its
  zero-filled-missing-day artifact was fixed in the aggregation, not
  papered over with copy.
- **Forbidden:** weakening or removing any disclaimer; scoring,
  backend, Rust, fixture, or `estimate_quality` changes.
- **Tests:** frontend tests where copy is asserted; typecheck/build.
- **Live smoke:** read every changed string in the running app; all
  existing disclaimers still visible.
- **Review:** independent model review **and** human approval of the
  final wording (claims boundary).
- **Branch:** `<agent>/safety-copy-polish`
- **PR title:** `Polish remaining safety-copy clarity after #46 (#47)`

---

## 4. Model handoff rules

- **Fable / strongest available model:** architecture decisions,
  scientific-risk plans, and the *first* implementation of tricky
  boundaries (FFI seams, trust boundaries, persistence semantics).
  Of the queue above, #77 is the one that most benefits from the
  strongest available model.
- **Codex / GPT-5.5 / Sonnet:** narrow implementation from approved
  issues, tests, reviews, and docs cleanup. All six queue issues are
  scoped tightly enough for this tier, in queue order.
- **No model approves its own PR.** Every PR gets a reviewer that is
  not its author; a human is the final gate for merges, safety copy,
  formulas, and claims wording (see `docs/agent-handoff.md` §6).
- **Implementation PRs must not mix in unrelated planning or design
  changes.** One issue, one branch, one PR. Docs edits ride along only
  when the issue itself requires them.
- **If a model finds a new risk while implementing, it stops and asks
  for an issue before coding.** No drive-by fixes, no scope expansion
  inside an open PR, no new issues created unilaterally.

---

## 5. Non-negotiable invariants

These hold regardless of model, deadline, or demo pressure:

- **No scoring-formula changes without an explicitly approved issue.**
  Acute item load, meal load, acute score, `REFERENCE_MEAL_INSULIN_LOAD
  = 30.0`, FII resolution precedence, `K_EST = 0.6` macro fallback,
  terminal-unknown behavior — all frozen (see
  `docs/agent-handoff.md` §2 for the exact formulas).
- **No `backend/fii_foods.csv` changes without an approved issue** —
  values, aliases, and confidences are protected data.
- **No chronic DIL/DII changes without an approved issue** — daily
  DIL/DII definitions and rolling-trend windows are protected.
- **No backend image retention.** #49 removed it; do not reintroduce
  it, even temporarily or "for debugging".
- **No AI-proposed or default FII may ever become `user_confirmed`.**
  The POST boundary neutralizes non-positive provided FII and the Rust
  wrapper (#68) preserves this at the FFI seam. `fii` is canonical;
  `fii_value` is a deprecated alias — do not remove it without an
  approved issue.
- **INSIGHT estimates population-level relative meal insulin demand.**
  It does not measure or predict personal insulin or glucose, does not
  diagnose, and does not dose. Wording implying otherwise is a defect,
  not a style choice.
- **No production, multi-user, or auth claims** until such systems are
  explicitly designed, implemented, and approved. The beta is
  local-only, single-user, unauthenticated by design
  (`docs/private-beta-topology.md`).
- Synthetic data only — never real health data, real meal photos,
  production records, or secrets in code, fixtures, tests, or prompts.

---

## 6. Practical commands

Run from the repository root unless noted. Windows/PowerShell is the
current dev environment; commands are shell-neutral where possible.

**Clean-tree check (before branching, after finishing):**

```bash
git status --porcelain
```

Expected output: empty, or only known local-only entries. Local-only,
never to be committed: `local-notes/`, `reports/` (audit reports stay
local per #76), `backend/app.db`, `backend/.venv/`, `backend/.env`,
`frontend/node_modules/`, `frontend/dist/`.

**Run tests (mirror CI, `.github/workflows/`):**

```bash
# Backend (from backend/, venv active)
python -m compileall -q .
python -m validation.run_validation
python -m validation.export_golden_fixtures --check --out ../crates/insight-core/fixtures/golden
python -m pytest tests            # regression tests (pytest is a local dev dep)

# Frontend (from frontend/)
npm ci                            # first time
npx tsc --noEmit
npm run test.unit -- --run
npm run build

# Rust (from repo root)
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Run the suites relevant to what you touched, plus the golden-fixture
check whenever anything near scoring moved.

**Update a feature branch against main:**

```bash
git fetch origin
git merge origin/main    # from the feature branch; resolve, re-test
```

Do not force-push shared or protected branches; never rewrite `main`.

**Merge workflow:**

1. Branch from up-to-date `origin/main`: `git checkout -b <agent>/<slug> origin/main`.
2. Small commits; open the PR as **draft** with the body structure
   from §3.
3. Wait for CI green and independent review (never self-approve).
4. Human performs the merge on GitHub. Do not merge with failing
   required checks; do not commit directly to `main`.

**Live smoke (see `docs/agent-handoff.md` §7 for the full runbook):**
backend `uvicorn` on `127.0.0.1:8000`, optional
`python scripts/seed_demo_data.py`, frontend `npm run dev -- --host
127.0.0.1`. `OPENAI_API_KEY` in `backend/.env` is needed only for the
Smart Camera path.

---

## 7. After the queue is empty

When #77/#78/#75/#79/#80/#47 are merged: re-run the #76 audit
checklist against the app, update the local report, and stop. Anything
beyond that — deployment, authentication, account isolation, cloud
sync, UniFFI exposure of the #68 wrapper, the Option D provenance idea
from #44 — needs its own explicitly approved issue first.
