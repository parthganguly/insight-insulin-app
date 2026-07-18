# Campaign B1 — Fable independent release review

**Reviewer:** Claude Fable 5, independent release captain (did not inherit Sol's PASS).
**Date:** 2026-07-18
**Scope reviewed:** complete uncommitted worktree diff on
`feature/campaign-b1-consequential-correction` at base `a81ff73`, all five new B1
test/spec files, Sol's implementation report and browser evidence, and the sealed v1.0
contracts (`insight-ux-campaign-b.md`, `campaign-b-correction-and-calculation.md`,
`sol-campaign-b.md`).

## Provisional verdict (recorded before any edit)

**Merge-ready**, conditional on my independent verification runs reproducing green
(see `fable-review/working-notes.md`, written before any file was touched).

## Final release verdict

**Merge-ready.** One defect was found and corrected (ESLint failure in the new B1
Cypress spec — details below). All semantic-audit areas pass against the sealed
contracts; all verification checks pass independently.

## Independent findings

### Defect found and corrected

1. **ESLint failure in `frontend/cypress/e2e/campaign-b1-correction.cy.ts`** —
   four `@typescript-eslint/no-unused-expressions` errors (lines 23, 46, 67, 95),
   each a bare chai property-access assertion `expect(x, msg).to.exist;`.
   `npm run lint` exited 1, contradicting the implementation report's "ESLint PASS:
   0 errors" claim. **Correction:** replaced the four statements with the function-call
   form `assert.exists(x, msg)`, which asserts exactly the same condition (not
   null/undefined) with the same failure message. Test-only file, no behavioural or
   product meaning changed; ESLint now exits 0 and the spec still passes 2/2 at both
   viewports. Regression coverage is inherent: the assertions still run inside the
   passing journeys, and lint itself now guards the form.

No production-code defect was found. No other correction was made.

### Semantic audit results (A–G)

- **A. Correction-control removal — pass.** `SUBTYPE_CHIPS`, `detectDishBase`,
  `applySubtype`, the chip UI, and `SUBTYPE_NAME_ONLY_NOTICE` are gone; repo-wide grep
  finds only removal-asserting tests; the related CSS was already absent. No
  replacement quick-rename/quick-add/hidden-ingredient/subtype chips exist. The exact
  sealed helper "The name is a label. The items below are what the estimate uses."
  renders once, directly under the meal-name field. Meal-name editing goes through
  `setName`, which touches only `meal.name` (store test proves items are untouched).
- **B. Provenance origins — pass.** `normalizeAiExtractedItem` stamps `ai_proposed`
  and stops overloading `source: "ai"` (compatible: `safetyCopy.DRAFT_ITEM_SOURCES`
  already treats `undefined` as a draft source); `addEmptyMealItem` stamps
  `user_entered`; the single production `buildDraftFromSavedMeal` call site
  (PreviousMealPicker) stamps `user_entered`; edits and explicit confirmation
  transition `ai_proposed → user_reviewed`. Provenance is draft-only: the payload
  mapper enumerates its output fields so `draftProvenance`/`needsReview` cannot leak;
  canonical hydration (`mapMealModelingResponseToMeal`) never sets draft fields;
  provenance is shown as plain language, never a percentage; no path promotes
  AI-proposed FII (it is dropped at normalization and again deleted on rename).
  `addMealItem` and `fetchBarcodeMealItemFromAPI` are unstamped but have **no
  production callers** (verified by grep) — recorded as a pre-existing gap below.
- **C. Rename invariant — pass.** The item editor's name input is the only production
  rename path. `updateDraftMealItem` records the first previous name (kept across
  continued typing), deletes `fii`/`source`/`why`, preserves every numeric value
  (no zeroing), sets `needsReview`, and blocks the Campaign A calculate-and-save
  action. Same-name updates are `Object.is` no-ops. Case-/whitespace-only changes are
  treated as identity changes — coherent (previous name preserved, both resolution
  paths work, no review loop) and the faithful reading of sealed §3.3/§6.1, which
  contain no case-insensitivity rule. Editor open/close mutates nothing (modal is
  derived from the store by item id — no second stale copy). Amount/unit edits neither
  create nor resolve identity review. Add/remove behaviour is unchanged.
- **D. Review-resolution semantics — pass.** The warning names the old component
  exactly: `These values were for "<old name>". Check they still fit.` The explicit
  action "These still fit" clears only `needsReview` (plus the `ai_proposed →
  user_reviewed` transition) and restores nothing. Resolution by editing is limited to
  the six carried-nutrition fields the warning itself lists
  (`kcalPerServing`, `carbPerServing_g`, `proteinPerServing_g`, `fatPerServing_g`,
  `satFatPerServing_g`, `gi`); name/amount/unit/servingSize/FII edits do not resolve.
  Editing one carried field resolves the item's review — that is the sealed rule
  ("the user either edits the values or explicitly confirms them", §3.3), not an
  invention; re-entering an identical value is an `Object.is` no-op and does not
  resolve. Focus, open, close, scroll, and renaming again never count as confirmation.
  No contract ambiguity required a stop.
- **E. Validation — pass.** The gate is two-layered: `disabled`/`aria-disabled` on the
  primary action plus `validateMealBeforeSave` inside `handleLogMeal` (the only
  `postMealToAPI` caller in production). The message names every unresolved component;
  multiple unresolved items are listed; unrelated valid items are preserved; state
  lives in the zustand store so it survives modal close, in-draft navigation, and
  re-renders; the only clearing paths are a carried-nutrition edit,
  `confirmMealItemReview`, or removing the item itself.
- **F. Trust and payload boundary — pass.** `mapDraftMealItemToCreatePayload`
  enumerates the exact existing backend shape; tests assert the full payload equals
  the pre-B1 shape with `draftProvenance`, `needsReview`, and previous-name absent and
  AI FII never present; explicit user FII still flows only through
  `normalizeExplicitFii`; confirming carried nutrition cannot restore discarded AI FII
  (it was deleted from the item on rename); no backend or saved-meal contract changed
  (zero backend files in the diff).
- **G. Persistence and reuse safety — pass.** Saves store only the canonical response
  (`mapMealModelingResponseToMeal` output — no draft fields), so reopening a saved
  meal cannot hydrate review metadata; save is blocked while unresolved, so no
  needs-review state can reach persistence anyway; previous-meal reuse produces a
  clean `user_entered` draft with evidence stripped; History remains read-only; no
  persistence-architecture change.

## Test-quality assessment

All 14 required coverage areas are behaviourally covered (store actions and rendered
UI through a real `<App />` render, not string-only assertions): provenance origins
(store + api + PreviousMealPicker tests), rename evidence clearing, nutrition
preservation (full numeric `toMatchObject`), unresolved validation, explicit
confirmation, nutrition-edit resolution (looped over **all six** sealed fields),
editor open/close non-resolution, meal-name non-invalidation, amount and unit
non-invalidation, payload stripping (exact-shape `toEqual`), AI-FII non-promotion
(new test plus the pre-existing `aiFiiTrustBoundary.test.ts`, unmodified), subtype
absence (Campaign A + Campaign B + Cypress), multiple unresolved items, and reuse
cleanliness. The copy-constant tests exist alongside, not instead of, behavioural
tests. Weakest point: reuse "does not inherit `needsReview`" is guaranteed
structurally (canonical items can never carry it) rather than by a dedicated
assertion — acceptable.

## Mutation assessment

I independently re-ran five high-value mutations (files backed up and byte-restored;
final `git diff --stat` identical to the pre-mutation tree):

| Mutation (applied by me) | Result |
|---|---|
| Remove `fii`/`source`/`why` clearing on rename | Caught — `currentMealStore.campaignB.test.ts` 1 failure |
| Remove the needs-review block in `validateMealBeforeSave` | Caught — 4 failures across `mealDraftUx.campaignB.test.ts` and `PreviewMeal.campaignB.test.tsx` |
| Make `confirmMealItemReview` skip the provenance transition | Caught — store test failure |
| Leak `draftProvenance`/`needsReview` into the create payload | Caught — `campaignBProvenance.test.ts` 2 failures |
| Remove `hasUnresolvedReview` from the save button's disabled/aria-disabled gate | Caught — `PreviewMeal.campaignB.test.tsx` 2 failures |

Sol's remaining table rows (AI-FII restore, meal-name-as-identity, zero-on-rename,
subtype restore) were assessed statically: each named test's assertions would fail
under the described mutant (e.g. the rename test's full-numeric `toMatchObject` fails
on zeroing; the Campaign B fixture meal name "Chicken biryani" would re-trigger the
chip detector, so `queryByText("Keema")` would go non-null). Mutation table accepted.

## Browser findings (independent run)

Rebuilt the production bundle to an isolated output (`.fable-verify-dist`, removed
afterwards; the standard `dist` remains locked by a stale pre-existing preview
process) and served it at `http://localhost:4210`. Synthetic fixtures only.

- Focused `campaign-b1-correction.cy.ts`: **2/2 passing** at 390×844 and 320×700; the
  spec asserts the AUT's `innerWidth`/`innerHeight` exactly immediately after
  `cy.viewport` (the 390-wide PNGs record 390×720 due to Electron's cropped capture —
  capture metadata, not a viewport failure, matching Sol's note).
- Complete Cypress suite: **41/41 passing** (8 specs).
- Screenshot inspection (mine, under `fable-review/`, and Sol's six): no subtype/quick
  chips; meal-name helper present exactly once; renamed-component warning names the
  old item ("chicken biryani") with carried per-serving nutrition visible; save
  blocked with the review banner naming the item; after "These still fit" the panel is
  gone, save re-enabled, FII empty and no `Source:` evidence in the editor;
  nutrition-edit resolution after a second rename behaves as sealed; meal-name-only
  edit produces no warning; full-width 44px confirm action; no horizontal overflow;
  editor inputs focusable and bottom actions scroll-reachable at 320×700.

Independent evidence: `reports/ux/campaign-b/b1/fable-review/` (six screenshots +
`working-notes.md` with the pre-edit provisional verdict).

## Protected-boundary result

`git diff --name-only` + `git status --porcelain` show exactly: the ten authorized
B1 frontend production/test files, the five new B1 test/spec files, and
`reports/ux/campaign-b/`. Explicit audit against every protected class: **no** backend,
database/migration, Rust, scoring, FII data/lookup, estimate-quality, chronic, AI
prompt/provider, package-identity, preview/idempotency (`/meals/preview`,
`/meals/estimate`), issue #97, or Campaign B2 path is touched. `fiiTrustBoundary.ts`,
`safetyCopy.ts`, `persistentMealStore.ts`, and all presentation-protected files are
unmodified (import-only). The `api.ts` diff is exactly two lines inside
`normalizeAiExtractedItem` (provenance stamp; `source: "ai"` overload removed).
`app.css` gains only new B1 presentation rules. `git diff --check` exits 0.

## Verification summary (all run by me, final tree state)

| Check | Result |
|---|---|
| Focused B1 unit tests | PASS — 4 files, 28 tests |
| Complete frontend unit suite | PASS — 32 files, 393 tests |
| TypeScript (`tsc --noEmit`) | PASS — exit 0 |
| ESLint (`npm run lint`) | PASS — exit 0 (after the Cypress-spec correction) |
| Production build (`vite build`, isolated outDir; `tsc` separately) | PASS |
| Focused B1 Cypress (production preview, both viewports, AUT-asserted) | PASS — 2/2 |
| Complete Cypress suite | PASS — 41/41 |
| `git diff --check` | PASS — exit 0 |
| Protected-path audit | PASS — see above |

## Remaining gaps (honest, non-blocking)

1. **Placeholder rename creates review state.** Renaming a fresh manual "New Item"
   (all-zero values, no evidence) triggers "These values were for 'New Item'". This is
   the strict-faithful reading of sealed §3.3/§6.1, which contain no placeholder
   exemption; resolution paths work and forcing explicit confirmation of zero
   nutrition is honest (it even guards the issue #97 zero-input case pre-fix). An
   exemption would be a new product rule — deliberately not made here. Flag for
   product follow-up in a future sealed revision if desired.
2. **Case-/whitespace-only renames trigger review** (same strict-faithful reasoning;
   coherent, no loops).
3. `validateMealBeforeSave`'s "Item N" fallback label indexes the filtered unresolved
   list, so an unresolved item renamed to an empty string in a multi-item meal could
   carry the wrong ordinal. Cosmetic, unreachable in normal flows, never weakens the
   gate.
4. Pre-existing dead code (`addMealItem`, `fetchBarcodeMealItemFromAPI`) does not
   stamp provenance; it has no callers today but must be stamped if ever wired up.
5. The standard `frontend/dist` directory is still locked by a stale preview process
   from an earlier session (environment cleanup, not a code issue; builds verified via
   an isolated outDir, which was removed after use).

## Confirmation of non-started work

B2-1, B2-2, B2-3, issue #97, package-identity (issue #96), backend preview,
persistence migrations, and calculate-before-save were **not started**. No commit,
merge, or branch change was made before this review's own authorized commit.
