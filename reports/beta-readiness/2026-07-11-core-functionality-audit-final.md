# INSIGHT private-beta core functionality audit (final) — issue #76

## 1. Exact commit

`6ab4ab4` — "Clarify acute score presentation above 100 (#88)" — `main`, confirmed
equal to `origin/main` at audit start (`git fetch origin` + `git status --short`
clean, `git log -1 --oneline` = `6ab4ab4`). Working tree was clean before and
remained clean after the audit (`git status --short` empty, `git diff --check`
clean; no application code was modified).

Issues #74, #75, #77, #78, #79, #80 confirmed **CLOSED** via `gh issue list`
before starting.

## 2. Date and environment

- Date: 2026-07-11
- OS: Windows 11 Home 10.0.26200
- Node: v21.6.2, npm 10.5.0
- Python (backend venv): 3.13.12
- Backend: FastAPI + Uvicorn on `127.0.0.1:8000`, existing `backend/app.db` (no
  DB reset performed)
- Frontend: Vite dev server on `127.0.0.1:5173` (`npm run dev`)
- Browser automation: Cypress 13.17.0 driving **Electron 118 (headless)** —
  real Chromium-family browser automation, not a stub. Config lived outside
  the repo (scratchpad `cypress.config.js`, `--project` pointed at scratchpad)
  so no repository files were touched; specs are also scratchpad-only and are
  not part of this report's diff.

## 3. Viewport sizes tested

- Desktop: 1280×800 (default Cypress viewport)
- 390×800 (iPhone-class width)
- 320×800 (smallest common mobile width)

## 4. Synthetic seeded-data description

The backend `app.db` already contained 40 synthetic meals from prior sessions
before this audit started, none of which are real user data:
- `Demo: *` — rows from the documented `backend/scripts/seed_demo_data.py`
  (~12 days of synthetic demo history)
- `Smoke: timestamp check (synthetic)`, `PR58 Synthetic Manual Bowl`,
  `Beta Manual Oatmeal`, `synthetic demo bowl` — synthetic rows from prior
  verification sessions

This audit added one more synthetic meal (`Synthetic Audit Rice Bowl`, manual
entry, no photo) to exercise the save/delete/persistence flows, then deleted
it via the app's own delete flow as the last step of that test. Backend meal
count was 40 before and 40 after the audit (verified via `GET /meals`). No
real photos, health data, or credentials were used at any point.

## 5. OPENAI_API_KEY configured

**No.** `backend/.env` does not exist in the working tree, and no
`OPENAI_API_KEY` is set in the shell environment. (Value never read, printed,
or logged — only presence was checked.)

## 6. Automated-check results

| Check | Command | Result |
|---|---|---|
| Backend unit tests | `python -m unittest discover -s tests -v` (from `backend/`, venv active) | **PASS** — 24/24 tests, 0 failures |
| Backend scientific validation | `python -m validation.run_validation` (from `backend/`) | **PASS** — 6/6 cases (`summary.total=6, passed=6, failed=0`) |
| Frontend unit tests | `npm run test.unit -- --run` (from `frontend/`) | **PASS** — 171/171 tests, 14/14 files |
| Frontend type check | `npx tsc --noEmit` (from `frontend/`) | **PASS** — no errors |
| Frontend production build | `npm run build` (from `frontend/`) | **PASS** — built in ~19s; one pre-existing non-blocking Vite warning (main chunk >500 kB, informational only) |
| Rust unit + golden-fixture tests | `cargo test --workspace` (repo root) | **PASS** — 160 + 44 = 204 tests, 0 failed |
| Repo diff hygiene | `git diff --check` | **PASS** — no whitespace errors |
| Repo status | `git status --short` | **PASS** — clean before and after |

No dependencies were installed; all runs used the existing `backend/.venv`
and `frontend/node_modules`.

## 7. Functional-audit pass/fail table

Legend: **TESTED** = genuinely driven in a real headless-Chromium browser
(Cypress/Electron) against the live dev server + backend, with screenshots
and/or DOM/JSON evidence captured. **INSPECTED** = confirmed by reading the
actual shipped source, not run live. **UNTESTED** = not verified this session.

| # | Area | Item | Status | Result |
|---|---|---|---|---|
| 1 | Dashboard | Fresh localStorage load hydrates seeded backend meals | TESTED | PASS |
| 1 | Dashboard | Refresh does not duplicate meals | TESTED | PASS |
| 1 | Dashboard | Recents newest-first, readable; Chronic Score readable | TESTED | PASS |
| 1 | Dashboard | Bottom navigation (Dashboard/Add/Settings) works | TESTED | PASS |
| 1 | Dashboard | Disclaimers visible (chronic trend disclaimer) | TESTED | PASS |
| 1 | Dashboard | Backend-fetch failure does not blank-crash the page | TESTED | PASS (forced network error via `cy.intercept`; page stayed rendered, no crash) |
| 1 | Dashboard | No infinite loading | TESTED | PASS |
| 1 | Dashboard | No new console errors | TESTED | PASS (0 `console.error` calls captured across every flow) |
| 1 | Dashboard | Empty state (`No Meals Logged`) with zero meals | INSPECTED | Code path confirmed in `Dashboard.tsx`; not exercised live (would have required destructively clearing all 40 seeded backend meals, out of scope for a read-only audit) |
| 2 | Manual meal | Manual opens as a clearly editable draft, not a broken saved meal | TESTED | PASS — "Editable draft — not saved yet" pill + explicit "This meal is an editable draft" copy |
| 2 | Manual meal | Item editing affordance obvious; item editor opens | TESTED | PASS |
| 2 | Manual meal | Empty/zero-value save rejected with visible, specific feedback | TESTED | PASS — `"New Item" needs an amount greater than 0. Tap the item to set its portion.` |
| 2 | Manual meal | Valid synthetic meal saves, success feedback appears | TESTED | PASS — `Meal saved to your history. Its estimated insulin demand is shown above.` |
| 2 | Manual meal | Dashboard Recents updates; refresh does not duplicate | TESTED | PASS — 1 occurrence before and after refresh |
| 3 | Smart Camera | External-AI disclosure visible | TESTED | PASS |
| 3 | Smart Camera | Manual fallback always available/clear | TESTED | PASS |
| 3 | Smart Camera | Take-photo / upload-photo affordances present | TESTED | PASS |
| 3 | Smart Camera | Camera cancellation/denial/unavailable feedback | INSPECTED | `describeCameraFailure` in `aiFailureCopy.ts` (covered by passing unit tests); the native OS camera/file-picker dialog itself cannot be driven by browser automation |
| 3 | Smart Camera | Missing OPENAI_API_KEY gives understandable feedback, no leak | TESTED (backend) + INSPECTED (frontend) | PASS — direct `POST /ai-meal-extract` returned `{"detail":"AI meal extraction is not configured on this server"}` (safe, no key/stack leak); frontend's `describeAiExtractionFailure` maps any such HTTP error to the curated `"AI meal extraction is not available right now. You can add the meal manually instead."` (source-verified, and covered by passing `aiFailureCopy.test.ts`) |
| 3 | Smart Camera | Failed extraction does not save a broken meal | INSPECTED | `handleOnSubmit` only calls `setMeal`/navigates on success; errors set `error` state and return |
| 3 | Smart Camera | No backend image retention | TESTED (backend unit tests) | PASS — `test_no_image_retention.py` (2/2) passing |
| 3 | Smart Camera | No full-size image persisted to localStorage | TESTED (code + live) | PASS — `isPersistableImage`/`stripUnpersistableImages` cap persisted images at 24,000 chars; live localStorage dump after a full session showed only the `insight-meals` key, sized for meal JSON, no images |
| 4 | Meal review | A recent saved meal opens, item rows readable | TESTED | See finding below — opens, but not in the state a "review" implies |
| 4 | Meal review | Explanations and score disclaimer visible | **TESTED — FAILS for previously-saved meals** | See **Finding A** below |
| 4 | Meal review | Persistent deletion works after refresh | TESTED | PASS — deleted meal did not reappear after reload |
| 4 | Meal review | Meal timestamps display in local time | INSPECTED | Already covered by 5 passing backend tests in `test_meal_timestamps.py` (issue #77, closed); local-time rendering also visually confirmed (`Logged at: 7/11/2026, 11:55 PM`-style strings throughout) |
| 4 | Meal review | Score below 100 understandable / == 100 is reference / 101 shows "above ref" / 300–500 keeps raw number | TESTED | PASS — live save produced `Score: 52667 · above reference meal (100)` (large value from synthetic test-data entry, not a bug) with correct "above ref" language and no clamping/crash; formula/threshold logic is also covered by passing golden-fixture tests |
| 4 | Meal review | High-score rings do not clip or collide | INSPECTED | `getAcuteRingValue` clamps the ring's value to [0,100] by design (`acuteScoreDisplay.ts`), so the ring itself cannot overflow regardless of the underlying score |
| 4 | Meal review | PreviewMeal explains the relative score can exceed 100 | TESTED | PASS — `ACUTE_SCORE_SCALE_EXPLAINER` text visible after a fresh save |
| 4 | Meal review | Low/unknown-quality meals retain "Hard to estimate" | TESTED | PASS (also see Finding A — this copy appears correctly for genuinely low-quality meals, but incorrectly for high-quality ones once reopened) |
| 4 | Meal review | No numerical AI-confidence percentage reappeared | TESTED | PASS — no such percentage found anywhere in the flows exercised |
| 5 | Settings | Male 30/70kg/175cm/Sedentary → BMR 1648.75, TDEE 1979 | TESTED | **PASS — exact match**, screenshot-confirmed |
| 5 | Settings | Female 30/70kg/175cm/Sedentary → BMR 1482.75, TDEE 1779 | TESTED | **PASS — exact match**, screenshot-confirmed |
| 5 | Settings | Switching gender updates both immediately | TESTED | PASS |
| 5 | Settings | Refresh preserves settings | TESTED | PASS |
| 5 | Settings | No new medical overclaim, no console errors | TESTED | PASS |
| 6 | Persistence | Expected localStorage keys only (`insight-meals`, `app-settings`) | TESTED | PASS — only `insight-meals` present after a Dashboard-only session (expected: `app-settings` is written lazily, only once Settings is visited, which was separately confirmed working in section 5) |
| 6 | Persistence | Large/full-size images absent from localStorage | TESTED | PASS (see Smart Camera row above) |
| 6 | Persistence | Clearing localStorage recovers safely | TESTED | PASS — no blank/crash, re-hydrates from backend |
| 6 | Persistence | Deleted backend meals do not resurrect | TESTED | PASS |
| 6 | Persistence | Save failure displays feedback | INSPECTED | `handleLogMeal` catch block sets both inline banner and toast on any `postMealToAPI` rejection |
| 6 | Persistence | Hydration failure does not erase valid local state | INSPECTED | `syncMealsFromBackend` catches and only `console.warn`s, leaving existing local state untouched (confirmed no meals disappeared during the forced-network-error dashboard test) |
| 6 | Persistence | No infinite loading / blank crash | TESTED | PASS |
| 7 | Safety/science copy | App disclaimer, meal-score disclaimer, Chronic Score disclaimer visible | TESTED | PASS |
| 7 | Safety/science copy | External-AI disclosure visible | TESTED | PASS |
| 7 | Safety/science copy | No diagnosis/treatment/personal insulin/glucose claims | TESTED + INSPECTED | PASS — reviewed all visible copy plus `safetyCopy.ts` source; no such claims found |
| 7 | Safety/science copy | AI/default FII not presented as user-confirmed | INSPECTED | Covered by 12/12 passing `test_ai_fii_trust_boundary.py` backend tests plus frontend `aiFiiTrustBoundary.test.ts` (29 tests, part of the 171 passing) |
| 7 | Safety/science copy | Acute score not called a percentage; 100 described as reference, not a biological maximum | TESTED | PASS — `ACUTE_SCORE_SCALE_EXPLAINER` explicitly says "not a percentage" |
| 8 | Responsive | Desktop demo credible | TESTED | PASS |
| 8 | Responsive | 390px and 320px usable, no clipped buttons/toolbars | TESTED | PASS — 0px horizontal overflow measured at every combination of {Dashboard, Review Meal, Settings} × {390px, 320px}; screenshots confirm bottom nav, cards, and text all readable and unclipped |
| 8 | Responsive | No console errors | TESTED | PASS |

## 8. Finding A — Reopening a saved meal from Dashboard Recents hides its real score (significant, pre-existing)

**Summary:** Tapping any already-saved meal in the Dashboard's "Recents" list
(or the Meals-tab "Re-add Previous Meals" list) does **not** open a review of
that meal's actual saved state. It silently converts it into a brand-new,
never-saved draft: the "Saved to history" status is replaced with "Editable
draft — not saved yet", and the real `acute_score`, `estimate_quality`,
`main_insulin_drivers`, and per-item `fii`/`source`/`why` are all discarded
and replaced with the generic "Hard to estimate from this meal" fallback —
**regardless of the meal's actual computed quality or score.**

**Root cause:** `frontend/src/utils/fiiTrustBoundary.ts`,
`buildDraftFromSavedMeal()`. Both `Dashboard.tsx`'s `MealCard` and
`Meals.tsx`'s `MealCard` call this helper on tap and route to `/meals/new`.
The helper unconditionally sets `backend_created_at: undefined`,
`acute_score: undefined`, `insulin_load_total: undefined`,
`estimate_quality: undefined`, `main_insulin_drivers: undefined`, and strips
`fii`/`source`/`why` from every item — by design, for the Meals-tab's
explicitly-labeled "tap a meal to reuse it" flow. `Dashboard.tsx` reuses the
exact same handler for its "Recents" section, which carries no such
"reuse" framing (it is labeled "most recent first", implying history/review).
There is only one meal-detail route in the whole app (`/meals/new` — see
`App.tsx`), so there is currently no way to view a previously-saved meal's
actual computed score after the moment it was first saved, except for the
small ring + "score"/"above ref" caption already visible on the Recents/Meals
list card itself.

**Reproduction steps:**
1. Start the app with backend seed data present (any meal with a real,
   non-trivial `acute_score` works; verified with `Smoke: timestamp check
   (synthetic)`, backend `acute_score=360`, `estimate_quality=high`).
2. From the Dashboard, tap that meal's Recents card.
3. Observe: the Review Meal screen shows "Editable draft — not saved yet"
   and "Hard to estimate from this meal", with no mention of the real score
   (360) or that it is above the 100 reference.
4. Compare against `GET http://127.0.0.1:8000/meals`, which shows the same
   meal's real `acute_score: 360.0`, `estimate_quality: "high"`.

Live evidence captured this session:
`results/bug-recents-tap-state.json` → `{"showsDraftPill": true,
"showsSavedPill": false, "showsHardToEstimate": true, "showsAboveRefLine":
false}`, plus a screenshot showing the same.

**Not affected / does not corrupt data:** Deletion still works correctly
even through this path — `resolveMealDeletionTarget()` follows
`source_meal_id` back to the real backend record, so deleting a reopened
"draft" correctly and permanently removes the original saved meal (verified
live, confirmed gone after refresh). No data loss or double-save was
observed.

**Suggested smallest safe follow-up (not implemented — needs product
decision + human review, per the scientific/UX-copy guardrails in
`AGENTS.md`):** either (a) give the Dashboard's "Recents" tap a genuine
read-only detail view that preserves and displays the real saved score,
quality, and drivers, with editing/reuse as an explicit separate action, or
(b) if "tap to reuse as a new entry" is the intended Dashboard behavior too,
relabel "Recents" and its per-tap UX so it doesn't read as a history/review
affordance, and stop presenting a meal that already has a real score as
"Hard to estimate". This is a product/UX-copy decision, not something to
guess at — flagging for human review rather than picking one implementation.

## 9. Other observations (non-blocking)

- **`aria-label` on some `IonFabButton`s was unreliable to query via
  automation** in this Cypress/Electron environment even though the JSX sets
  it unconditionally (`aria-label='Meal actions'` etc., in
  `PreviewMeal.tsx`). Structural selectors (fab-list position, `color`
  attribute) worked reliably instead. This may be nothing but a headless
  Electron/custom-element hydration timing quirk rather than a real
  accessibility regression — screen-reader behavior was not independently
  verified this session — but it's worth a human spot-check with a real
  screen reader before treating those labels as reliably present.
- Vite production build emits a "chunk larger than 500 kB" warning
  (`index-*.js` ~995 kB / ~237 kB gzipped). Purely a build-time advisory, not
  a functional issue; pre-existing, not introduced by anything in scope here.
- The manual-save test happened to produce an unusually large synthetic score
  (52,667) from the specific numbers typed during automation. This was not a
  deliberate edge-case input, but it usefully double-confirmed that very
  large acute scores render correctly ("Score: 52667 · above reference meal
  (100)") without clipping, clamping incorrectly, or crashing.

## 10. Untested items (explicitly labelled)

- True zero-meal / empty-backend Dashboard state (would require destructively
  clearing all 40 seeded backend meals; not attempted in a read-only audit).
- Actual native camera/file-picker invocation and permission-prompt handling
  — this is an OS-level dialog outside what Cypress or any in-browser
  automation can drive. Covered instead by source inspection, a direct
  backend API call, and the existing passing unit-test suite.
- Screen-reader / assistive-technology behavior (see aria-label note above).
- Android/iOS native shells (Capacitor) — out of scope; this beta targets the
  Ionic web/dev-server build only, per `docs/private-beta-topology.md`.
- Multi-tab / multi-window concurrent-write races — not part of the issue
  #76 checklist and out of scope for a single-user local beta.

## 11. Final verdict

**BLOCKED** — one significant, reproducible finding (Finding A) directly
contradicts explicit issue #76 checklist requirements under "Meal
review/detail" (`explanations and score disclaimer are visible`, `high
scores above 100 are understandable`) for **every** previously-saved meal in
the app, not an edge case. It does not corrupt or lose data, and deletion
still targets the correct backend record, but it means there is currently no
way for a user to review their own logged meal's real insulin-demand
estimate after the moment they first saved it — which is a core part of what
this app is for.

Everything else audited — automated suites (24 backend + 6 validation + 171
frontend + 204 Rust, all passing), the manual save/reject/duplicate flow, AI
disclosure and fallback copy, Settings BMR/TDEE math (exact match on both
sample calculations), persistence/localStorage hygiene, backend-down
resilience, and responsive layout at 390px/320px — passed cleanly with no
console errors observed.

**Recommendation:** do not close #76 yet. File a narrowly-scoped follow-up
issue for Finding A (UX/product decision required — see suggested follow-up
above) and re-run this same audit's "Meal review and detail" section once
that lands. Everything else in this report can be considered verified and
does not need to block a decision on #76 specifically for Finding A's sake if
the team decides the current Dashboard-tap behavior is acceptable pending a
copy-only relabel — that call belongs to the team, not to this audit.
