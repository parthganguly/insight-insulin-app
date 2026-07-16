# Campaign A test adequacy audit

**Date:** 2026-07-15  
**Worktree:** `C:\Users\Parth Ganguly\Documents\Codex\2026-06-21\github-plugin-github-openai-curated-remote\work\insight-insulin-app\.claude\worktrees\agent-a1a3898911460a46a`  
**Audited HEAD:** `35defafc819b08d08f4ab8286bf0f1b127ba1096`  
**Scope:** Current Ionic/React frontend implementation. Read-only scientific/backend/Rust/API-mapping/scoring/trust-boundary/persistence behaviour. Synthetic test data only.  
**Verdict:** **Tests partially verify Campaign A.**

The 332-test frontend suite is green and contains useful regression guards, especially for History versus reuse, reused-draft sanitization, logged-day trend states, deletion integrity, validation, and photo-quota persistence. It is not yet sufficient to call Campaign A verified. Five of the eight deliberately broken Campaign A behaviours survived the smallest relevant existing test sets: saved-result routing, the subtype warning, progressive disclosure, the Log Meal tab label, and raw AI error suppression. There is no end-to-end test, no real browser in the automated suite, and every backend interaction used by the Campaign A component tests is mocked.

## Method and baseline

- Read `AGENTS.md`, `CLAUDE.md`, the repository's six mandatory architecture/science/audit documents, `docs/product/ux/insight-ux-v1.md`, and `docs/missions/sol-campaign-a-consumer-meal-journey.md`.
- Read every tracked and untracked Campaign A file and all frontend tests directly exercising the changed pages/helpers or the acceptance criterion 12 regression behaviours.
- Compared the rewritten tracked tests with their pre-Campaign-A versions using `git diff`.
- Baseline command: `npm run test.unit -- --run` in `frontend/`.
- Baseline result: **24 test files passed; 332 tests passed**. Expected negative-path console output and several existing React `act(...)` warnings were present.
- No backend, Rust, scientific, trust-boundary, API-mapping, or persistence file was changed.

Test-type labels below use these definitions:

- **Unit:** a pure helper or store function is called directly.
- **Component:** React is rendered in jsdom, normally through `App`, with Ionic/router code running and network calls mocked.
- **Integration:** multiple real frontend modules/stores are exercised together, but not a real backend or browser.
- **End-to-end:** a real browser drives the app and real frontend/backend boundary. Campaign A currently has none.

## Acceptance-criterion coverage matrix

| # | Observable criterion | Exact existing test file and test name | Type | Backend/browser real or mocked | Direct verification? | Uncovered part | Risk |
|---|---|---|---|---|---|---|---|
| 1 | Empty Home has one primary **Check a meal** action and activating it reaches Log Meal | `Dashboard.hydration.test.tsx` — `still shows the empty Home state when the backend is unavailable and the local store is empty`; `homeMealJourney.test.ts` — `uses the empty state when no meals exist` | Component + unit | Backend fetch mocked; jsdom, not a real browser | **Partial.** It asserts the promise and one `Check a meal` text instance. | Does not assert there is exactly one primary action, click it, assert `/log-meal`, or assert chooser content after navigation. | High |
| 2 | Log Meal directly presents Photo / Manual / Previous with no History detour | `logMealOptions.test.ts` — `defines exactly the three approved entry choices in order`, `gives every choice a visible label and one-line description`; `PreviousMealPicker.test.tsx` — `keeps the explicit reuse wording` | Unit + component | No backend for helper; picker backend mocked; jsdom | **Partial.** Exact option data and explicit picker copy are verified. | `LogMealChooser` itself is never rendered by a focused test; none of its three buttons is clicked; destination routes and manual/photo draft setup are not asserted. | High |
| 3 | Every bottom tab has visible text and accessible name | `App.test.tsx` — `renders without crashing` | Component smoke | jsdom; an unmocked hydration fetch may fail soft | **No.** Rendering without a crash does not inspect the tab bar. | No role/name assertions, visible-label assertions, tab count assertion, or navigation assertion. The Log Meal-label mutation passed. | High |
| 4 | Smart Camera has exactly one visible primary Analyze action, disabled without image; no `Textual Description` | No direct component test. `logMealOptions.test.ts` only verifies the chooser's photo option. | None for the criterion | N/A | **No.** | `AiMealAdd` is not rendered under test; action count, disabled/enabled transition, note label, loading copy, and jargon absence are all untested. | High |
| 5 | AI failure uses curated copy, working retry/manual paths, and never renders raw errors | `aiFailureCopy.test.ts` — all six tests, especially `maps the missing-key backend error to curated copy without leaking internals` and `maps provider/backend HTTP errors of any status to the unavailable copy` | Unit | Error objects synthetic; no component, browser, or backend | **Partial.** The pure mapping helper is strong. | No proof that `AiMealAdd` calls the helper, renders the curated result, suppresses raw text, retries, or routes to manual entry. Raw-error rendering mutation passed all relevant tests. | Critical |
| 6 | Confirmation shows ordinary facts; FII/GI/density/source stay hidden until Advanced details opens | `mealDraftUx.test.ts` — `uses the explicit advanced-details label`; `PreviewMeal.draftUx.test.tsx` — `presents an unsaved manual meal as an editable draft, not a broken saved meal` | Unit + component | POST mocked in save test; jsdom | **No for disclosure.** The constant test only proves a string exists. | No AI/scored item fixture, item-editor interaction, closed/open-state assertion, or assertion that technical fields are absent from the ordinary surface. Exposing the fields passed. | Critical |
| 7 | Subtype chips show the name-only disclosure whenever shown | `mealDraftUx.test.ts` — `states that subtype chips change the name only using ASCII copy` | Unit | No backend/browser | **No.** Exact constant equality is implementation-coupled and tautological with the exported literal. | No AI biryani/curry fixture renders chips; no conditional co-presence assertion. Removing the rendered warning passed. | Critical |
| 8 | Save routes to `/meals/saved/:id`; result order is conclusion → score → drivers → quality → limitations → actions; Check another exists | `PreviewMeal.draftUx.test.tsx` — `saves a valid manual meal, confirms it inline, and marks the meal as saved`; `SavedMealDetail.test.tsx` — `shows the canonical saved state: status, real score, quality, drivers, and item explanations` | Component/integration | POST/GET mocked; jsdom | **Partial.** Save/persist mapping and result content are exercised. | Save test does not assert pathname or canonical result destination. Result test uses text presence, not section order, next-action presence, or Check-another route. Broken navigation passed. | Critical |
| 9 | Displayed score/quality/driver/disclaimer values equal backend/helper outputs byte-for-byte | `SavedMealDetail.test.tsx` — `shows the canonical saved state: status, real score, quality, drivers, and item explanations`, `keeps the 'Hard to estimate' presentation...`, `surfaces the rough-estimate notice...`; helper suites `acuteScoreDisplay.test.ts`, `insulinImpactPresentation.test.ts`, `safetyCopy.test.ts`; `Dashboard.trendCoverage.test.tsx` raw-number cases | Unit + component/integration | Backend responses mocked; jsdom | **Partial, relatively strong for selected examples.** Several exact helper strings and synthetic response values are asserted. | Does not cover every displayed value, duplicates, ordering, or a real serialization/mapping boundary. `screen.getByText` can find content inside closed `<details>`, so presence does not establish visibility. | Medium-high |
| 10 | History opens read-only result; reuse creates a draft only through explicit chooser | `Meals.reuse.test.tsx` — `tapping a saved meal opens the read-only result view and creates no draft`; `PreviousMealPicker.test.tsx` — `tapping a saved meal still creates a fresh editable draft with derived scoring cleared`; `Dashboard.recents.test.tsx` — `navigates to the saved-meal detail route and never builds a draft from the tapped meal` | Component/integration | GET mocked; real frontend stores/router in jsdom | **Yes for the main state boundary.** The mutations were caught. | History test does not assert pathname explicitly, and no chooser-button test proves the picker is reachable only from the explicit option. | Medium |
| 11 | Diff contains no forbidden-scope file | No automated test. This audit ran `git diff --name-only` and `git status --short`. | Process/static check | Real git worktree | **Yes as a current manual check, not a durable test.** | Untracked files require `git status`; `git diff --name-only` alone omits them. No CI/path allow-list guard. | Medium |
| 12 | Delete integrity, draft reset, validation, photo quota still pass | `persistentMealStore.delete.test.ts` — all 8 `deleteMealEverywhere` tests; `SavedMealDetail.test.tsx` — deletion success/failure tests; `mealDraftUx.test.ts` — 6 `validateMealBeforeSave` tests; `PreviewMeal.draftUx.test.tsx` — zero-quantity rejection and stale-error clearing; `persistentMealStore.quota.test.ts` — all 6 tests | Unit + component/integration | DELETE/POST mocked; jsdom/localStorage | **Partial.** Delete, validation, and quota guards are substantive and green. | Smart Camera enter/leave reset and its five-photo limit have no direct component tests. Calls to `resetMeal` in test setup are not reset-behaviour assertions. | High |

## Rewritten-test review

| Rewritten test | Specification alignment | Quality finding |
|---|---|---|
| `Dashboard.hydration.test.tsx` | The new empty-state copy matches UX v1 §5. | Mostly a text-presence update after implementation. It does not verify primary-action uniqueness, order, or route. Backend hydration is fully mocked. Useful old hydration regression, weak Campaign A acceptance proof. |
| `Dashboard.trendCoverage.test.tsx` | The below-three-day gate and preservation of loading/unavailable semantics match UX v1 §§5 and 13. | Strongest rewritten Campaign A test. It asserts DOM replacement, absence of the ring, distinct ARIA states, and uncapped values. The trend mutation failed for the intended reason. Backend is still mocked, so response-shape/runtime integration remains outside scope. |
| `Meals.reuse.test.tsx` | Correctly changes the Meals tab contract from reuse to read-only History per UX v1 §§6–7. | Meaningful component/state-integrity guard. It caught the History-to-draft mutation. It would be stronger with an explicit pathname assertion and an assertion that the canonical record object remains unchanged. |
| `PreviousMealPicker.test.tsx` | Correctly relocates reuse to the explicit previous-meal path and preserves `buildDraftFromSavedMeal`. | Strong state-integrity coverage: new identity, source backlink, aggregate score fields, per-item FII/source/why clearing. It caught the reuse mutation, though first at the missing backlink. It does not assert the `/meals/new` route. |
| `homeMealJourney.test.ts` | Encodes the approved 0/1/2 versus ≥3 logged-day gate and preserves unknown loading/failure states. | Good pure decision-table tests. Because the helper and tests were created together, helper-only assertions could agree with a wrong UI; the Dashboard tests provide the necessary independent integration layer for key cases. |
| `mealDraftUx.test.ts` | The exact Advanced-details and name-only strings match UX v1 §9/§12 intent (ASCII hyphen differs typographically but not semantically). | The two Campaign A assertions are tautological/implementation-coupled: exported literal equals repeated literal. They prove neither rendering nor conditional visibility. Both relevant UI mutations passed. |

Additional concern: `logMealOptions.test.ts` exactly repeats the production array. It protects accidental copy drift but cannot prove the chooser renders, routes, or initializes state correctly.

## Mutation challenge results

Each mutation was applied to one production frontend file, the smallest relevant existing test set was run, and the mutation was immediately reversed. No test was added or edited.

| # | Temporary mutation | Smallest existing test set | Result | Did it fail for the correct reason? | Interpretation |
|---|---|---|---|---|---|
| 1 | Successful save routed to `/log-meal` instead of `/meals/saved/:id` | `PreviewMeal.draftUx.test.tsx` (5 tests) | **PASS, 5/5** | No failure | The suite verifies POST, local persistence, and saved status but not the required destination. |
| 2 | History card called `buildDraftFromSavedMeal` and opened `/meals/new` | `Meals.reuse.test.tsx` (2 tests) | **FAIL, 1/2** | **Yes.** `Meal result` was absent; the read-only expectation failed. | History's read-only boundary is meaningfully guarded. |
| 3 | Removed rendered subtype name-only warning | `mealDraftUx.test.ts` + `PreviewMeal.draftUx.test.tsx` (16 tests) | **PASS, 16/16** | No failure | Constant existence is not UI coverage; conditional disclosure is unverified. |
| 4 | Replaced the item editor's closed `<details>` with an always-visible `<div>` | `mealDraftUx.test.ts` + `PreviewMeal.draftUx.test.tsx` (16 tests) | **PASS, 16/16** | No failure | Progressive disclosure has no behavioural test. |
| 5 | Unknown/loading/failed coverage returned `building-history` | `homeMealJourney.test.ts` + `Dashboard.trendCoverage.test.tsx` (25 tests) | **FAIL: 6 failures** | **Yes.** Two helper expectations and four loading/failure DOM/ARIA expectations failed. | The distinction between confirmed low coverage and unknown states is strongly guarded. |
| 6 | Removed both visible `Log Meal` tab text and its `aria-label` | `App.test.tsx` + `logMealOptions.test.ts` (3 tests) | **PASS, 3/3** | No failure | Accessibility/visible-label acceptance is entirely untested. |
| 7 | `AiMealAdd` rendered `err.message` directly instead of curated helper copy | `aiFailureCopy.test.ts` + `App.test.tsx` (7 tests) | **PASS, 7/7** | No failure | The helper is tested in isolation, but the component-to-helper safety connection is not. |
| 8 | Previous-meal picker passed the saved canonical meal directly to `setMeal` | `PreviousMealPicker.test.tsx` (2 tests) | **FAIL, 1/2** | **Yes.** The required source backlink was absent; subsequent assertions would also reject retained derived fields/ids. | Reuse draft sanitization is substantively guarded. |

**Mutation sensitivity: 3/8 challenged Campaign A behaviours detected (37.5%).** This is deliberately not a general mutation score; it measures only the eight user-specified high-value behaviours.

## Tautologies, coupling, and weak assertions

- `mealDraftUx.test.ts` repeats the exact production constants. It can pass when the UI stops rendering either constant, as mutation 3 demonstrated.
- `logMealOptions.test.ts` repeats the exact array exported by the implementation. It does not test the chooser component or destinations.
- `App.test.tsx` only asserts that a base element exists. It provides almost no route, navigation, or accessibility protection.
- Several component tests rely on `getByText`/`queryByText`. Text presence does not prove visual order, actionability, accessible naming, or progressive-disclosure visibility. In particular, Testing Library can locate text mounted inside a closed native `<details>` depending on query type; these assertions cannot establish what a user sees.
- `PreviewMeal.draftUx.test.tsx` still describes inline confirmation as the success outcome even though Campaign A requires immediate result navigation. The rewritten production behaviour and old test expectation now coexist without a pathname assertion.
- Tests often render the entire `App` but mock every fetch response. This is useful frontend integration, not backend/browser integration.
- There is no automated accessibility engine (`axe`) or lint rule demonstrating the Campaign A accessibility claims.

## Uncovered risks

1. A release can save correctly but land on the wrong page while all tests pass.
2. Raw provider/backend text can leak into the AI failure UI while the curated-copy helper suite remains green.
3. Technical/scientific controls can become primary visible controls without a failing test.
4. A subtype chip can imply semantic correction without the mandatory honesty line.
5. The central product tab can become icon-only and unnamed without a failing test.
6. Chooser destinations can drift or initialize the wrong draft state; option-array tests will still pass.
7. Result sections can be reordered or next actions removed while current presence assertions continue passing.
8. Mocked fetch responses can conceal frontend/backend contract drift, HTTP timing/failure behaviour, and hydration races.
9. Smart Camera reset, cancel-without-residue, five-photo quota, analyze enabled state, and retry/manual recovery are not component-tested.
10. Current component tests do not prove actual Ionic focus order, screen-reader naming, contrast, touch target size, native camera behaviour, or `<details>` interaction in Chromium/WebView.

## Exact tests recommended before Campaign A is considered verified

### Required before verified

1. Add `frontend/src/App.campaignA.test.tsx`:
   - `shows exactly three bottom tabs named Home, Log Meal, and History with visible matching labels`;
   - `activating the empty Home Check a meal action navigates to /log-meal and renders all three chooser choices`;
   - `each chooser choice routes to the approved destination`;
   - for Manual, assert one clean editable item exists; for Photo, assert a reset draft; for Previous, assert no draft conversion occurs until a saved meal is selected.
2. Add `frontend/src/pages/meal/AiMealAdd.campaignA.test.tsx` with mocked Capacitor Camera and mocked `fetch`:
   - `renders one Analyze meal action and keeps it disabled until a synthetic image exists`;
   - `uses the human note label and never renders Textual Description`;
   - `shows Reading your meal photo while the request is pending`;
   - `renders curated failure copy, never the raw synthetic provider detail, retries the request, and routes Enter manually instead to /meals/new with an editable item`;
   - `resets images, note, error, and loading state on leave/re-entry`;
   - `enforces the existing five-photo limit`.
3. Add `frontend/src/pages/meal/PreviewMeal.campaignA.test.tsx`:
   - `renders an AI biryani draft with subtype chips and the name-only warning adjacent to them`;
   - `opens an item editor with Advanced details closed by default`;
   - `keeps FII, GI, nutrient densities, and source evidence inside the closed disclosure and makes them available only after expansion`;
   - `keeps identity, components, and portions available without expansion`.
4. Extend `PreviewMeal.draftUx.test.tsx` with `successful save navigates to the canonical /meals/saved/:id route` and assert `window.location.pathname === "/meals/saved/saved-meal-1"`, then assert the result heading and backend-derived content render.
5. Extend `SavedMealDetail.test.tsx`:
   - `renders result sections in the approved DOM order` by comparing section heading/action element positions;
   - `offers Check another meal linked to /log-meal and Done linked to /dashboard`;
   - `keeps advanced evidence closed by default`;
   - parameterize exact backend score, driver, source, why, quality and helper-copy outputs so no client reinterpretation or truncation is hidden.
6. Extend `Meals.reuse.test.tsx` to assert `/meals/saved/saved-meal-1`; extend `PreviousMealPicker.test.tsx` to assert `/meals/new` and that the original persistent saved record remains byte-for-byte unchanged.
7. Add an automated accessibility check for the three campaign surfaces (Home, Log Meal, Confirmation), using `axe` in jsdom where reliable, while retaining explicit role/name assertions. Treat real-browser accessibility as a separate gate.
8. Make criterion 11 a repeatable path-allow-list check that reads both tracked diffs and untracked status. It should fail if any Campaign A change is under `backend/**`, `rust/**`, the named protected utilities, `frontend/src/api/api.ts`, or persistence stores.

### Useful but non-blocking

- Replace broad text-presence assertions with semantic role/name assertions where Ionic exposes stable roles.
- Add explicit `act(...)` wrapping to the existing store-driven component tests so warnings do not mask genuine async problems.
- Stub all network calls in `App.test.tsx`; its current unmocked fail-soft hydration produces noise without adding useful coverage.
- Add a result-view test with no drivers/items to verify honest empty handling and section stability.
- Add CSS/static checks for the visible-label class and minimum touch-target intent, recognizing that computed layout still needs a browser.
- Add a lightweight dev-server contract smoke against a synthetic backend fixture, separate from unit tests, to cover real HTTP serialization without changing backend behaviour.

## Better handled through live Computer Use

Automated unit/component tests should not be treated as proof of these journeys:

1. Empty Home → Check a meal → chooser, confirming the primary action is visually first and only one primary action competes for attention.
2. All three bottom tabs on the target viewport: visible labels, selected state, safe-area spacing, touch targets, keyboard/focus order, and screen-reader names.
3. Smart Camera empty/captured/loading/failure/retry/manual states in the real Ionic browser, plus native device camera/photo-picker behaviour on Android.
4. Confirmation with a synthetic AI biryani: subtype-warning adjacency, ordinary facts visible, Advanced details genuinely collapsed, focus behaviour after expansion, and portion quick-adjust usability.
5. Full synthetic save with the real local FastAPI process: POST once, canonical id route, result hierarchy, unchanged backend values, Check another, Done, and backend-first delete.
6. History versus Previous: History must remain read-only; explicit previous-meal reuse must create a clean editable draft while the saved canonical record remains unchanged.
7. Home trend lifecycle at empty, 1/3, 2/3, ≥3/3, loading, failed, and confirmed-no-data states, including screen-reader announcements.
8. Visual/accessibility review for contrast, zoom/reflow, reduced motion, 44×44 targets, headings, focus visibility, and no icon-only primary controls.

## Restoration confirmation

Every temporary mutation was reversed immediately after its test run. Final SHA-256 checks matched the pre-mutation hashes for the tracked production files used by challenges:

| File | Restored SHA-256 |
|---|---|
| `frontend/src/pages/meal/PreviewMeal.tsx` | `EE0295751B29B35CFD1474370756BE736BACBC4AB93B79FA5353FED85761C599` |
| `frontend/src/pages/meal/Meals.tsx` | `3E6D7DF2D6C516BC62512C49C94F3AEF9B3D555236A5C99EFDA3C5D4704889B3` |
| `frontend/src/pages/meal/AiMealAdd.tsx` | `CE1776CB8FFC3EE54C37D3ACC73B362408AF089491B28844264D2F7D92018CB9` |
| `frontend/src/pages/dashboard/Dashboard.tsx` | `07AC9AA7F64BAE9794F91FA8CABC8E0386468E455B4A812CE44CF93D00C0D758` |
| `frontend/src/App.tsx` | `D9A4171B92BC0BD7D48FFD3255B13184DE6147A0BD8AF8897258CD11B64BCD5D` |
| `frontend/src/pages/meal/PreviousMealPicker.tsx` | `E0CA9EF19FAE618DA4BDFC703B7A80B11CF5BFC5F5D3E742F14FFA6E9E4CA926` |

`homeMealJourney.ts` is an untracked Campaign A file, so Git cannot provide a baseline blob hash; its temporarily changed branch was explicitly reversed and verified to read `if (!coverageKnown) return "trend-ready";`, and its focused tests were rerun as part of final verification.

## Final `git diff --name-only`

`git diff --name-only` reports tracked changes only:

```text
frontend/src/App.tsx
frontend/src/pages/dashboard/Dashboard.hydration.test.tsx
frontend/src/pages/dashboard/Dashboard.trendCoverage.test.tsx
frontend/src/pages/dashboard/Dashboard.tsx
frontend/src/pages/meal/AiMealAdd.tsx
frontend/src/pages/meal/Meals.reuse.test.tsx
frontend/src/pages/meal/Meals.tsx
frontend/src/pages/meal/PreviewMeal.tsx
frontend/src/pages/meal/SavedMealDetail.tsx
frontend/src/theme/app.css
frontend/src/utils/mealDraftUx.test.ts
frontend/src/utils/mealDraftUx.ts
```

No forbidden-scope tracked file appears. Untracked files are shown by status below.

## Final `git status --short`

```text
 M frontend/src/App.tsx
 M frontend/src/pages/dashboard/Dashboard.hydration.test.tsx
 M frontend/src/pages/dashboard/Dashboard.trendCoverage.test.tsx
 M frontend/src/pages/dashboard/Dashboard.tsx
 M frontend/src/pages/meal/AiMealAdd.tsx
 M frontend/src/pages/meal/Meals.reuse.test.tsx
 M frontend/src/pages/meal/Meals.tsx
 M frontend/src/pages/meal/PreviewMeal.tsx
 M frontend/src/pages/meal/SavedMealDetail.tsx
 M frontend/src/theme/app.css
 M frontend/src/utils/mealDraftUx.test.ts
 M frontend/src/utils/mealDraftUx.ts
?? frontend/src/pages/meal/LogMealChooser.tsx
?? frontend/src/pages/meal/PreviousMealPicker.test.tsx
?? frontend/src/pages/meal/PreviousMealPicker.tsx
?? frontend/src/utils/homeMealJourney.test.ts
?? frontend/src/utils/homeMealJourney.ts
?? frontend/src/utils/logMealOptions.test.ts
?? frontend/src/utils/logMealOptions.ts
?? reports/ux/
```

## Central verdict

**Tests partially verify Campaign A.** They meaningfully protect a few important state boundaries, but too many observable acceptance criteria are represented only by helper literals or text presence, and five of eight high-value regressions were invisible to the nearest suite. Campaign A should not be considered verified until the required component/navigation tests above pass and the remaining real-browser journeys are completed with synthetic data.

---

## Post-audit test improvements (2026-07-15)

The minimum permanent automated coverage recommended by this audit has now been added. The frontend suite increased from 332 to 351 tests. No production file was permanently changed during this test-improvement pass; all production-file differences shown by Git remain the pre-existing Campaign A implementation.

### Tests and guard added

| File | Permanent coverage added or strengthened |
|---|---|
| `frontend/src/App.campaignA.test.tsx` | Exactly three bottom tabs; matching visible and accessible names; Home primary-action navigation; all three chooser options; approved destination for each option. |
| `frontend/src/pages/meal/AiMealAdd.campaignA.test.tsx` | Single Analyze action; disabled/enabled image state; human note label; internal-label absence; pending state; curated error and raw-detail suppression; retry; clean manual fallback; enter/leave reset; five-image quota. |
| `frontend/src/pages/meal/PreviewMeal.campaignA.test.tsx` | AI biryani subtype chips and adjacent warning; ordinary facts; closed disclosure; technical evidence structurally contained and unavailable before expansion; evidence available after expansion. |
| `frontend/src/pages/meal/PreviewMeal.draftUx.test.tsx` | Successful save must route to `/meals/saved/saved-meal-1` and render the canonical result and backend-derived score. |
| `frontend/src/pages/meal/SavedMealDetail.test.tsx` | Approved result-section DOM order; Check another meal route; Done route; advanced evidence closed by default. |
| `frontend/src/pages/meal/Meals.reuse.test.tsx` | History explicitly opens `/meals/saved/saved-meal-1`. |
| `frontend/src/pages/meal/PreviousMealPicker.test.tsx` | Explicit `/meals/new` reuse route and byte-for-byte preservation of the original persistent saved record. |
| `scripts/verify-campaign-a-scope.ps1` | Reads tracked and untracked paths from porcelain status and rejects `backend/**`, `crates/**`, `rust/**`, the protected utilities, `frontend/src/api/api.ts`, and persistence stores. An untracked synthetic `backend/` probe was correctly rejected and then deleted; the restored worktree passes the guard. |

The component tests use role/name assertions where Ionic exposes stable accessibility semantics. Structural assertions are retained where the requirement is specifically DOM containment/order or native `details` disclosure state.

### Final mutation sensitivity

| # | Temporary regression | Smallest test set | Correct detection after improvements | Failure reason |
|---:|---|---|---|---|
| 1 | Save routes to `/log-meal` instead of `/meals/saved/:id` | `PreviewMeal.draftUx.test.tsx` | Yes | Expected `/meals/saved/saved-meal-1`, received `/log-meal`. |
| 2 | History creates a reusable draft and opens `/meals/new` | `Meals.reuse.test.tsx` | Yes | Expected canonical saved route, received `/meals/new`. |
| 3 | Subtype name-only warning removed | `PreviewMeal.campaignA.test.tsx` | Yes | Adjacent warning could not be found. |
| 4 | Technical fields exposed by replacing the closed disclosure | `PreviewMeal.campaignA.test.tsx` | Yes | Required `details.advanced-details` disclosure was absent. |
| 5 | Unknown/loading/failed trend coverage collapsed into building-history | `homeMealJourney.test.ts`, `Dashboard.trendCoverage.test.tsx` | Yes | Helper expectations returned `building-history`; loading/failure trend-card assertions also failed. |
| 6 | Log Meal tab loses visible and accessible label | `App.campaignA.test.tsx` | Yes | Tab accessible-name array contained `null` instead of `Log Meal`. |
| 7 | Raw AI/provider error rendered | `AiMealAdd.campaignA.test.tsx` | Yes | Alert contained the synthetic raw provider detail instead of curated copy. |
| 8 | Reused meal retains backend-derived score fields | `PreviousMealPicker.test.tsx` | Yes | Clean-draft provenance/derived-field assertions failed (`source_meal_id` was absent). |

Final sensitivity is **8/8 mutations detected for the intended behavioural reason**. Each mutation was reverted immediately after its focused run.

### Verification after restoration

| Check | Result |
|---|---|
| Focused Campaign A test files | Pass |
| Complete frontend unit/component suite | Pass: 27 files, 351 tests |
| TypeScript (`npx tsc --noEmit`) | Pass |
| Lint (`npm run lint`) | Pass |
| Production build (`npm run build`) | Pass; only the existing chunk-size and Browserslist age advisories were emitted. |
| Protected-path guard | Pass: 26 tracked/untracked changed paths, no protected path. |

The final suite still emits pre-existing diagnostic stderr and React `act(...)` warnings in some tests. They do not fail the suite, but warning cleanup remains useful non-blocking work.

### Restoration proof

All seven production files used in the mutation pass exactly match their pre-mutation SHA-256 values, including `homeMealJourney.ts`:

| File | Restored SHA-256 |
|---|---|
| `frontend/src/pages/meal/PreviewMeal.tsx` | `EE0295751B29B35CFD1474370756BE736BACBC4AB93B79FA5353FED85761C599` |
| `frontend/src/pages/meal/Meals.tsx` | `3E6D7DF2D6C516BC62512C49C94F3AEF9B3D555236A5C99EFDA3C5D4704889B3` |
| `frontend/src/pages/meal/AiMealAdd.tsx` | `CE1776CB8FFC3EE54C37D3ACC73B362408AF089491B28844264D2F7D92018CB9` |
| `frontend/src/pages/dashboard/Dashboard.tsx` | `07AC9AA7F64BAE9794F91FA8CABC8E0386468E455B4A812CE44CF93D00C0D758` |
| `frontend/src/App.tsx` | `D9A4171B92BC0BD7D48FFD3255B13184DE6147A0BD8AF8897258CD11B64BCD5D` |
| `frontend/src/pages/meal/PreviousMealPicker.tsx` | `E0CA9EF19FAE618DA4BDFC703B7A80B11CF5BFC5F5D3E742F14FFA6E9E4CA926` |
| `frontend/src/utils/homeMealJourney.ts` | `6BE7931E163A23CED1AB4695D4DFA7B7D49952D0B00EDCDA68FFDCA775C1C10B` |

### Remaining gaps reserved for Computer Use

No visual QA was performed in this pass. Live Computer Use is still required for:

1. Visual firstness and competing-action hierarchy on empty Home and the chooser.
2. Real Ionic/WebView tab selected state, safe-area spacing, touch targets, keyboard focus order, and screen-reader announcement.
3. Native Android camera/photo-picker behaviour and the visible Smart Camera empty, captured, loading, failure, retry, and manual-fallback transitions.
4. Biryani warning adjacency, collapsed-content visibility, expansion focus, and quick portion controls at target viewport sizes.
5. A synthetic end-to-end save against the real local FastAPI process, including the canonical result and backend-first delete path.
6. History read-only versus Previous editable reuse across actual navigation, back navigation, and reload.
7. Trend states in the browser at empty, 1/3, 2/3, at least 3/3, loading, failed, and confirmed-no-data coverage.
8. Contrast, zoom/reflow, reduced motion, focus visibility, and 44-by-44 touch-target review.

### Final changed-file list

This combines tracked `git diff --name-only` output with untracked files, because `git diff --name-only` alone omits new tests and scripts:

```text
frontend/src/App.campaignA.test.tsx
frontend/src/App.tsx
frontend/src/pages/dashboard/Dashboard.hydration.test.tsx
frontend/src/pages/dashboard/Dashboard.trendCoverage.test.tsx
frontend/src/pages/dashboard/Dashboard.tsx
frontend/src/pages/meal/AiMealAdd.campaignA.test.tsx
frontend/src/pages/meal/AiMealAdd.tsx
frontend/src/pages/meal/LogMealChooser.tsx
frontend/src/pages/meal/Meals.reuse.test.tsx
frontend/src/pages/meal/Meals.tsx
frontend/src/pages/meal/PreviewMeal.campaignA.test.tsx
frontend/src/pages/meal/PreviewMeal.draftUx.test.tsx
frontend/src/pages/meal/PreviewMeal.tsx
frontend/src/pages/meal/PreviousMealPicker.test.tsx
frontend/src/pages/meal/PreviousMealPicker.tsx
frontend/src/pages/meal/SavedMealDetail.test.tsx
frontend/src/pages/meal/SavedMealDetail.tsx
frontend/src/theme/app.css
frontend/src/utils/homeMealJourney.test.ts
frontend/src/utils/homeMealJourney.ts
frontend/src/utils/logMealOptions.test.ts
frontend/src/utils/logMealOptions.ts
frontend/src/utils/mealDraftUx.test.ts
frontend/src/utils/mealDraftUx.ts
reports/ux/campaign-a/test-audit.md
scripts/verify-campaign-a-scope.ps1
```

### Final `git status --short`

```text
 M frontend/src/App.tsx
 M frontend/src/pages/dashboard/Dashboard.hydration.test.tsx
 M frontend/src/pages/dashboard/Dashboard.trendCoverage.test.tsx
 M frontend/src/pages/dashboard/Dashboard.tsx
 M frontend/src/pages/meal/AiMealAdd.tsx
 M frontend/src/pages/meal/Meals.reuse.test.tsx
 M frontend/src/pages/meal/Meals.tsx
 M frontend/src/pages/meal/PreviewMeal.draftUx.test.tsx
 M frontend/src/pages/meal/PreviewMeal.tsx
 M frontend/src/pages/meal/SavedMealDetail.test.tsx
 M frontend/src/pages/meal/SavedMealDetail.tsx
 M frontend/src/theme/app.css
 M frontend/src/utils/mealDraftUx.test.ts
 M frontend/src/utils/mealDraftUx.ts
?? frontend/src/App.campaignA.test.tsx
?? frontend/src/pages/meal/AiMealAdd.campaignA.test.tsx
?? frontend/src/pages/meal/LogMealChooser.tsx
?? frontend/src/pages/meal/PreviewMeal.campaignA.test.tsx
?? frontend/src/pages/meal/PreviousMealPicker.test.tsx
?? frontend/src/pages/meal/PreviousMealPicker.tsx
?? frontend/src/utils/homeMealJourney.test.ts
?? frontend/src/utils/homeMealJourney.ts
?? frontend/src/utils/logMealOptions.test.ts
?? frontend/src/utils/logMealOptions.ts
?? reports/ux/
?? scripts/
```

### Updated verdict

**Tests meaningfully verify Campaign A at the automated unit/component layer.** The eight audited behavioural regressions are now directly detectable. Campaign A still needs the Computer Use journeys above before claiming full visual, native-device, accessibility, or real-process end-to-end verification.
