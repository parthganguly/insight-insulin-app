# Fable B1 release review — working notes

**Reviewer:** Claude Fable 5 (independent release captain, Campaign B1)
**Date:** 2026-07-18
**Basis:** complete uncommitted worktree diff at `a81ff73`, all five new B1 test/spec
files, sealed product/architecture/mission contracts v1.0 (2026-07-18), Sol's
implementation report and browser evidence. Sol's PASS verdict was **not** inherited.

## Provisional verdict (recorded before any edit): **merge-ready**, conditional on my
independent verification runs (unit, tsc, eslint, build, Cypress, mutation re-checks)
reproducing green.

## Static findings supporting the provisional verdict

- Subtype chips, detection, application, and `SUBTYPE_NAME_ONLY_NOTICE` fully removed;
  no replacement chips; `MEAL_NAME_HELPER` exact sealed copy, rendered once beside the
  meal-name field; meal-name edits go through `setName` (name only).
- Provenance: `normalizeAiExtractedItem` → `ai_proposed` (and stops overloading
  `source: "ai"`); `addEmptyMealItem` → `user_entered`; the single production
  `buildDraftFromSavedMeal` call site (PreviousMealPicker) stamps `user_entered`;
  edits/confirm transition `ai_proposed → user_reviewed`. Plain-language copy, no
  percentage. `safetyCopy.DRAFT_ITEM_SOURCES` already contains `undefined`, so removing
  `source: "ai"` is compatible.
- Rename invariant: the item editor is the only production rename path
  (`addMealItem`/`fetchBarcodeMealItemFromAPI` have no callers). Rename records first
  previous name, deletes `fii`/`source`/`why`, keeps numeric values, sets
  `needsReview`; no auto-zeroing. `Object.is` guard makes same-value updates no-ops
  (no state churn, no accidental resolution). Editor keyed by item id (no stale copy);
  open/close mutates nothing.
- Resolution: only the six carried-nutrition fields (`REVIEW_RESOLVING_NUTRITION_FIELDS`)
  or explicit `confirmMealItemReview` clear review; amount/unit/servingSize/name/fii do
  not; confirm restores nothing. Faithful to sealed §3.3/§6 ("edits the values or
  explicitly confirms").
- Validation: `hasUnresolvedReview` disables the button AND `handleLogMeal` re-runs
  `validateMealBeforeSave` (single save path, `postMealToAPI` only from PreviewMeal).
  Message names each unresolved item; state lives in the zustand store (survives modal
  close and re-render).
- Payload: `mapDraftMealItemToCreatePayload` enumerates fields — `draftProvenance`,
  `needsReview`, previous-name can never leak; explicit-FII path unchanged via
  `normalizeExplicitFii`. `mapMealModelingResponseToMeal` builds canonical items with no
  draft fields, so saved/hydrated/reused meals cannot carry review metadata.

## Observations that are NOT correction-authority defects (no sealed rule violated;
fixing any would require a new product decision or unrelated cleanup — out of scope)

1. Renaming a fresh manual "New Item" placeholder creates a review state ("These values
   were for 'New Item'", all-zero values). Strict-faithful reading of sealed §3.3/§6.1
   (no placeholder exemption exists in the contract); resolution paths work; forcing
   explicit confirmation of zero nutrition is honest (it even guards the #97 zero-input
   case). Flag for product follow-up.
2. Case-only / whitespace-only rename triggers review. Coherent: treated as identity
   change, previous name preserved across continued typing, no review loop. The sealed
   contract has no case-insensitivity rule; inventing one is forbidden.
3. `validateMealBeforeSave` fallback label "Item N" uses the index within the filtered
   unresolved list, so an unresolved item renamed to an empty string in a multi-item
   meal could be labeled with the wrong ordinal. Cosmetic, unreachable in normal flows,
   never bypasses the gate.
4. Pre-existing dead code (`addMealItem`, `fetchBarcodeMealItemFromAPI`) does not stamp
   provenance. No callers today; must be stamped if ever wired up.

## To verify before final verdict
unit suites, tsc, eslint, production build, focused + full Cypress at both viewports,
mutation re-checks (fii-clearing, needsReview gate, payload stripping), protected-path
audit, screenshot inspection.
