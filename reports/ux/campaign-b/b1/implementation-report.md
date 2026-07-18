# Campaign B B1-1 implementation report

## Scope and verdict

Campaign B Slice B1-1 is implemented in the current Ionic React/Capacitor behavioral-reference client. Component identity corrections are consequential, frontend draft provenance is separate from canonical scientific evidence, unresolved carried nutrition blocks the existing Campaign A Calculate & save flow, and the meal-level subtype UI has been removed. No backend, saved-meal schema, migration, scoring, B2, or issue #97 implementation was added.

Independent post-hardening coordinator verification is green against a clean isolated production build at `baseUrl=http://127.0.0.1:4203`. The focused B1 run passed 2/2 tests in 16 seconds and the complete Cypress suite passed 41/41 tests in 1 minute 17 seconds. The focused B1 Vitest set passed 4 files/28 tests, the complete unit suite passed 32 files/393 tests, and TypeScript and ESLint passed. Each Cypress journey asserted the AUT `innerWidth` and `innerHeight` exactly as 390x844 or 320x700 immediately after `cy.viewport`. Six screenshots from this final run were copied into this report directory and visually checked. No production or unit-test file was changed during the browser-only correction.

## Current behavior before this slice

- Meal-level subtype chips changed only the meal display name and showed `SUBTYPE_NAME_ONLY_NOTICE`.
- Meal names were editable without the sealed descriptive-only helper.
- Component edits were live-bound in `PreviewMeal`; a component rename retained carried `fii`, `source`, and `why`, retained nutrition without a review state, and never blocked save.
- AI draft origin overloaded canonical `MealItem.source` with `"ai"`.
- Manual/reused drafts had no draft provenance.
- `validateMealBeforeSave` checked empty meals, item names, and positive amounts only.

## State-transition design

`MealItem` now has optional draft-only `draftProvenance` and `needsReview` fields. Store actions own item changes:

| Event | Result |
|---|---|
| Actual component-name change | Retain every portion/nutrition number; record the first prior name; delete `fii`/`source`/`why`; set unresolved review; change `ai_proposed` to `user_reviewed`. |
| Continued typing during rename | Keep the original prior name rather than replacing it with an intermediate string. |
| Same-name update | No transition and no invalidation. |
| Amount or unit edit | Update the value; do not create or resolve identity review. |
| kcal, carbs, protein, fat, saturated-fat, or GI edit | Update the value and resolve review. These six fields are explicitly classified in `REVIEW_RESOLVING_NUTRITION_FIELDS`. |
| Explicit “These still fit” | Clear review, retain the new name and all numeric values, keep stale evidence absent, and change `ai_proposed` to `user_reviewed` when applicable. |
| Meal-name edit | Change the descriptive label only; component evidence/provenance/review is untouched. |
| Editor open/close | No draft transition. |

The item editor is keyed by item id and derives the current item from the store, avoiding a second stale modal copy.

## Provenance and trust boundary

- AI-normalized items: `ai_proposed`; canonical `source` is not set to `"ai"`; AI-proposed FII remains discarded.
- Manual empty items: `user_entered`.
- Previous-meal reuse at the existing `buildDraftFromSavedMeal` call site: `user_entered`, after the existing helper strips `fii`/`source`/`why`.
- User edit/confirmation of AI proposals: `user_reviewed` without creating or restoring an FII value.
- UI copy is plain language: “Suggested from your photo”, “Reviewed by you”, “Entered by you”, or “Copied from your saved meal — adjust anything that's different today.” No provenance percentage is used.
- `mapDraftMealItemToCreatePayload` and `buildCreateMealPayload` enumerate the existing backend payload shape; tests prove `draftProvenance` and `needsReview` are omitted.
- Explicit positive FII typed through `updateMealItemFii` / `normalizeExplicitFii` remains the only frontend path that adds `fii` to the create payload.

## UI and accessibility

- Removed `SUBTYPE_CHIPS`, subtype detection/application UI, and `SUBTYPE_NAME_ONLY_NOTICE`; no replacement rename/add/preparation chips were added.
- Added the exact meal-name helper once near the meal name.
- Added plain-language per-item provenance.
- Unresolved rows expose the previous-name warning, retained per-serving kcal/macros/saturated-fat/GI summary, and a full-width “These still fit” action.
- Review status and the save-block explanation use `role="status"` and `aria-live="polite"`; the primary action is disabled while review is unresolved and references its explanation.
- Added missing protein/fat editor inputs so every sealed nutrition-review field can be explicitly edited.
- Narrow-layout styling uses wrapping text, 44px actions, existing scrollable `IonContent`, and the existing single-column editor action rule below 340px.

## Files changed

### Production

- `frontend/src/types/MealItem.ts`
- `frontend/src/stores/currentMealStore.ts`
- `frontend/src/pages/meal/PreviewMeal.tsx`
- `frontend/src/pages/meal/PreviousMealPicker.tsx`
- `frontend/src/utils/mealDraftUx.ts`
- `frontend/src/api/api.ts`
- `frontend/src/theme/app.css`

### Tests and evidence

- `frontend/src/stores/currentMealStore.campaignB.test.ts`
- `frontend/src/utils/mealDraftUx.campaignB.test.ts`
- `frontend/src/api/campaignBProvenance.test.ts`
- `frontend/src/pages/meal/PreviewMeal.campaignB.test.tsx`
- `frontend/src/pages/meal/PreviewMeal.campaignA.test.tsx`
- `frontend/src/pages/meal/PreviousMealPicker.test.tsx`
- `frontend/src/utils/mealDraftUx.test.ts`
- `frontend/cypress/e2e/campaign-b1-correction.cy.ts`
- `reports/ux/campaign-b/b1/implementation-report.md`
- `reports/ux/campaign-b/b1/390x844-needs-review.png`
- `reports/ux/campaign-b/b1/390x844-review-confirmed.png`
- `reports/ux/campaign-b/b1/390x844-nutrition-edit-resolved.png`
- `reports/ux/campaign-b/b1/320x700-needs-review.png`
- `reports/ux/campaign-b/b1/320x700-review-confirmed.png`
- `reports/ux/campaign-b/b1/320x700-nutrition-edit-resolved.png`

## Tests and commands

| Check | Result |
|---|---|
| Final identity/status | PASS: branch `feature/campaign-b1-consequential-correction`, exact HEAD `a81ff73f2eab46bc80da71540f5700d93b3ffd27`, 10 expected tracked modifications, and 12 expected untracked files (the original six B1 files plus six authorized screenshots). |
| Focused B1 Vitest (independent coordinator execution) | PASS: 4 files, 28 tests. |
| TypeScript (independent coordinator execution) | PASS: 0 type errors. |
| ESLint (independent coordinator execution) | PASS: 0 errors. |
| Focused Cypress after exact AUT viewport assertions (independent coordinator execution) | PASS: 1 spec, 2 tests, 2 passing, 0 failing, 16 seconds, using `baseUrl=http://127.0.0.1:4203`. Both journeys asserted the AUT `innerWidth`/`innerHeight` exactly: 390x844 and 320x700. |
| Complete Cypress suite after viewport assertions (independent coordinator execution) | PASS: 8 specs, 41 tests, 41 passing, 0 failing, 1 minute 17 seconds. Per spec: acute 8, Campaign A layout 4, Campaign B1 2, dashboard 6, manual 5, saved detail 5, settings 2, trend 9. |
| Browser evidence | PASS: six screenshots from the final viewport-asserting run were copied byte-for-byte into this report directory and visually checked. |
| Complete frontend unit suite (final coordinator execution) | PASS: 32 files, 393 tests. Existing stderr warnings only. |
| Production build (final coordinator execution) | PASS: `npm run build -- --outDir .verify-dist`; TypeScript + Vite, 298 modules transformed. The isolated output directory was used because the standard `dist` directory was locked by a previously started verified-worktree preview. Existing outdated Browserslist data and >500 kB chunk advisories only. |
| Isolated production preview | Used the clean `.verify-dist` build at `http://127.0.0.1:4203`. |
| `git diff --check` | PASS: final exit 0. |
| Protected-path audit | PASS: no changed path outside the expected B1 allowlist and authorized report evidence; no protected backend, Rust, persistence, scientific-boundary, package-identity, B2, or issue #97 path changed. |
| Campaign A scope guard | Expected contract mismatch: it flags `frontend/src/api/api.ts` and `frontend/src/stores/currentMealStore.ts`, both explicitly allowed by the sealed B1-1 contract. |

Pre-existing unit stderr remained limited to expected synthetic failure logs, local-backend-unavailable paths, storage-quota coverage, and existing React `act(...)` warnings. No new B1 test warning was introduced.

## Mutation challenges

| Mutation | Required failing test | Reverted |
|---|---|---|
| Keep old FII after rename | `renames one component, clears only its evidence, preserves every numeric value, and records the old name` | Yes |
| Remove needs-review calculation block | `blocks one unresolved component with its current name and an explicit resolution path` | Yes |
| Include provenance in payload | `omits draft provenance and needs-review state from an item payload` | Yes |
| Promote/restore AI FII after nutrition confirmation | `never promotes or restores discarded AI FII after rename and nutrition confirmation` | Yes |
| Treat meal-name edit as component identity change | `meal-name edits leave component evidence, provenance, and review state untouched` | Yes |
| Zero nutrition on rename | `renames one component, clears only its evidence, preserves every numeric value, and records the old name` | Yes |
| Restore subtype chip UI | `renders the descriptive meal-name helper exactly once and no subtype or quick chips` | Yes |

Each command produced exactly one expected failing test (other selected tests skipped); every mutation was reverted before the next challenge. The final focused and full suites pass.

## Browser evidence

The passing Cypress spec encodes the complete required synthetic journey at 390×844 and 320×700: exact meal-name helper once; no subtype/quick-chip UI; a manually entered component with nutrition plus explicit FII and source evidence; rename; stale FII/source evidence cleared; nutrition retained; old-name warning; Calculate & save blocked; explicit confirmation; evidence still absent; nutrition-edit resolution after a second rename; meal-name-only isolation; no horizontal overflow; editor input focus; and scroll reachability. Immediately after each `cy.viewport`, the spec asserts the AUT window's `innerWidth` and `innerHeight` exactly; both 390x844 and 320x700 passed. Confirmation interactions are scoped to the unique visible `ion-content.confirmation-page`, modal interactions to the visible modal, and item actions to the intended named card. Setup and action helpers normalize Ionic host/shadow duplication to one actionable raw element, while the subsequent URL, state, and behavior assertions verify the intended handler ran.

Electron records the 390-wide PNG files as 390x720 because its screenshot capture is cropped; this is capture metadata, not a viewport failure. The independent AUT assertion proved `innerHeight === 844` during both the journey and evidence capture.

Valid focused-run evidence copied and visually checked:

- `reports/ux/campaign-b/b1/390x844-needs-review.png`
- `reports/ux/campaign-b/b1/390x844-review-confirmed.png`
- `reports/ux/campaign-b/b1/390x844-nutrition-edit-resolved.png`
- `reports/ux/campaign-b/b1/320x700-needs-review.png`
- `reports/ux/campaign-b/b1/320x700-review-confirmed.png`
- `reports/ux/campaign-b/b1/320x700-nutrition-edit-resolved.png`

## Protected-boundary confirmation

- No backend, database, migration, Rust/core, saved-meal schema, persistence store, or protected scientific/presentation file changed.
- `frontend/src/utils/fiiTrustBoundary.ts` and `frontend/src/stores/persistentMealStore.ts` were read-only.
- Backend payload field names and shape are unchanged.
- No formula, FII lookup/mapping, dataset, confidence, estimate-quality, threshold, scientific claim, safety copy, retention, telemetry, consent, or privacy flow changed.
- Tests and fixtures use synthetic meal data only; no images, real health data, secrets, `.env` contents, or production records were used.
- No B2-1/B2-2/B2-3 or issue #97 behavior was implemented.
- No commit, push, PR, branch change, tag, publish, merge, or issue operation occurred.

## Known gaps and risks

1. A previously started verified-worktree preview left the standard `dist` directory locked, so the coordinator used the temporary clean `.verify-dist` output. This is an environment/process cleanup issue, not a Campaign B1 code or verification blocker.

## Commit recommendation

The browser correction is ready for human diff review: focused and complete browser verification are green, the six required screenshots are present and inspected, and the protected-path audit passes. No commit, push, or PR was performed.
