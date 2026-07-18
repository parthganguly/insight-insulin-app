# Sol Mission — Campaign B: Consequential Correction and Calculate-Before-Save

**Agent:** sol-engineer (GPT-5.6 Sol via Codex MCP)
**Authority:** `docs/product/ux/insight-ux-campaign-b.md` (product) and
`docs/architecture/campaign-b-correction-and-calculation.md` (architecture) — both
sealed v1.0, 2026-07-18. Where this contract and those documents conflict, stop and
report.
**Decision boundary:** Sol makes **no** product, persistence, scientific, or
copy-meaning decisions under this contract. Anything the sealed documents do not
explicitly decide is a stop condition, never an implementation choice.
**Governing rules:** `AGENTS.md` and `CLAUDE.md` apply in full.
**Precondition (hard gate):** the issue #97 decision is approved and implemented (its own
reviewed change with fixtures) **before Slice B2-2 starts**. B1 and B2-1 may proceed
without it. Do not implement any #97 option inside this mission.

---

## Mission

Make visible corrections real (B1) and split calculation from persistence (B2) exactly
as specified, with no change to any scoring formula, coefficient, dataset, confidence
value, estimate-quality rule, or scientific copy.

## Campaign structure — two sequential sub-campaigns, four slices

Each slice is independently reviewable and shippable. **B1-1 and B2-1 are independent
of each other and of issue #97** and may land in either order (still one writing agent
at a time, per AGENTS.md). **B2-2 requires B1-1, B2-1, and the issue #97 gate; B2-3
requires B2-2.** Every slice has an explicit start gate below.

### Slice B1-1 — Draft provenance and consequential rename (frontend only)

**Start gate:** none — may begin immediately; independent of B2 and of issue #97. This
slice must not reference, call, or depend on the preview endpoint in any way.

**User-visible outcome:** renaming a component clears stale evidence, flags the item for
review with "These values were for '<old name>'. Check they still fit." + a "These still
fit" confirm action; calculation is blocked until resolved. Meal-level subtype chips are
**removed** (with `SUBTYPE_NAME_ONLY_NOTICE` and its test coverage); the meal-name field
gains the descriptive-only helper line. Items show plain-language provenance
("Suggested from your photo" / "Copied from your saved meal").

**Allowed:** `frontend/src/types/MealItem.ts` (additive `draftProvenance`,
`needsReview` fields), `currentMealStore.ts` (rename/confirm actions),
`PreviewMeal.tsx`, `mealDraftUx.ts` (+ tests), `api.ts` **only** in
`normalizeAiExtractedItem` / `buildDraftFromSavedMeal` call sites' provenance stamping
(mapping to backend payload must not change — assert via existing tests),
`fiiTrustBoundary.ts` is import-only. New helper + test files.

**Forbidden:** any backend file; any payload shape change; touching `source` semantics
for canonical meals; auto-zeroing carried values.

**Acceptance criteria:**
1. Rename ⇒ item's `fii`, `source`, `why` gone; numeric values unchanged and visibly
   flagged; needs-review announced via `aria-live`.
2. Calculate/save action disabled while any item needs review; enabled after edit or
   explicit confirm.
3. Subtype chips and their notice absent from the UI and constants no longer referenced.
4. AI-proposed FII still never reaches the payload (existing trust-boundary tests pass
   unmodified).
5. Reuse drafts stamped `user_entered`, AI drafts `ai_proposed`, transitions to
   `user_reviewed` on edit/confirm.

**Mutation challenges:** (a) comment out the fii-clearing on rename ⇒ a test must fail;
(b) make "These still fit" skip the provenance transition ⇒ a test must fail; (c) let
calculate proceed with `needsReview` ⇒ a test must fail.

### Slice B2-1 — Backend preview endpoint + idempotent save

**Start gate:** a plan-mode migration/refactor plan reviewed and approved by a human
before any persistence edit (high-risk process). Independent of B1-1 and of issue #97 —
and it must not implement any part of #97 (protected files below).

**User-visible outcome:** none yet (API only).

**Allowed:** `backend/api/meals.py` (extract `model_meal` verbatim; add
`POST /meals/preview`; add `client_request_id` handling), `backend/models.py` (additive:
`MealPreviewRequest`, `MealPreviewResponse`, optional `client_request_id` on
`MealCreate`), `backend/db_models.py` + migration for nullable
`meals.client_request_id` (unique index) and `meals.client_request_fingerprint`,
backend tests. **Plan mode first** (persistence + high-risk).

**Forbidden:** `scoring_service.py`, `estimate_quality.py`, `fii_lookup.py`,
`food_normalizer.py`, `fii_foods.csv`, `chronic_service.py`; any change to computed
values, rounding, ordering, or response field semantics; image fields anywhere.

**Acceptance criteria:**
1. Golden pinning tests written **before** the refactor pass unchanged after it.
2. `POST /meals/preview` returns save-identical scoring fields (no `id`/`created_at`,
   `persisted: false`) and provably writes no rows.
3. Same `client_request_id` + same items ⇒ one row + equal responses; same id with
   materially different items ⇒ 409 and no write; NULL ⇒ legacy behaviour; race
   handled via unique index + fingerprint re-check.
4. Pre-B2 database copy passes the migration-compatibility test (reads, save, delete,
   chronic metrics unchanged).
5. No new request limits introduced; the request/response models match the
   architecture doc §4.2 exactly (no `id`/`created_at`/image field on preview).

**Mutation challenges:** (a) make preview insert a row ⇒ no-write test fails; (b) skew
one coefficient in the moved code ⇒ golden test fails; (c) drop the unique index ⇒
idempotency race test fails; (d) skip the fingerprint comparison ⇒ the 409-mismatch
test fails.

### Slice B2-2 — Frontend calculate-before-save journey

**Start gate (hard):** the approved issue #97 outcome is implemented, independently
reviewed, and merged (architecture doc §13), **and** B1-1 and B2-1 are landed. Do not
start otherwise; do not partially start.

**User-visible outcome:** Confirm screen primary action is **Calculate estimate**; the
approved unsaved-result route `/meals/estimate` shows the full canonical result with
"Estimate only — not saved", offering **Save to History / Adjust meal / Discard**;
stale-estimate banner + Recalculate on post-calculation edits; idempotent Retry on save
failure; leave-guard for unsaved estimates; insufficient-data outcome rendered per the
approved #97 semantics.

**Allowed:** `PreviewMeal.tsx`, new estimate screen + route in `App.tsx`, estimate state
(in `currentMealStore` or new `estimateStore`), `api.ts` (add `postMealPreviewToAPI`,
add `client_request_id` to save payload — additive only), `mealDraftUx.ts` copy
constants, styling, tests. `SavedMealDetail.tsx` may be refactored only to extract
shared presentational components without changing its rendered output (snapshot-guard).

**Forbidden:** writing preview results to `persistentMealStore`; any `/meals/saved/`
route for unsaved results; client-side score computation; changes to safety-copy
helpers; backend changes beyond B2-1's landed contract.

**Acceptance criteria:**
1. Calculating does not add the meal to History/Recents/backend (verify by list +
   `GET /meals` before/after).
2. Unsaved result renders the same conclusion/score/drivers/quality/limitation content
   as an equivalent saved meal, plus the unsaved pill; no "Logged at".
3. Save submits the frozen previewed payload; saved values equal previewed values.
4. Any structured-input edit after calculation disables Save and shows the stale banner;
   meal-name edit alone does not (but reaches the payload).
5. Double-tap Save / retry after failure ⇒ exactly one saved meal.
6. Discard (with confirm) leaves no trace anywhere; back/adjust preserves the draft.
7. Dirty-draft and unsaved-estimate leave-guards both work; background/resume restores
   the state.

**Mutation challenges:** (a) make Save re-serialize the live draft instead of the frozen
payload ⇒ a test fails; (b) drop the fingerprint check ⇒ stale-estimate test fails;
(c) reuse a `client_request_id` across different payloads ⇒ a test fails.

### Slice B2-3 — Journey QA and evidence (no code)

**Start gate:** B2-2 accepted. The native ADB session additionally requires one
authorized idle device and explicit user confirmation immediately before any input.

Browser + native evidence for the full journey (below), plus a completion report.

## Starting files

B1-1: `frontend/src/pages/meal/PreviewMeal.tsx`, `frontend/src/stores/currentMealStore.ts`,
`frontend/src/utils/mealDraftUx.ts`, `frontend/src/types/MealItem.ts`.
B2-1: `backend/api/meals.py`, `backend/models.py`, `backend/db_models.py`,
`backend/tests/`.
B2-2: `frontend/src/api/api.ts`, `frontend/src/App.tsx`, `frontend/src/pages/meal/`.

## Protected files (never touch)

`backend/scoring_service.py`, `backend/estimate_quality.py`, `backend/fii_lookup.py`,
`backend/food_normalizer.py`, `backend/fii_foods.csv`, `backend/chronic_service.py`,
`frontend/src/utils/safetyCopy.ts`, `acuteScoreDisplay.ts`,
`insulinImpactPresentation.ts`, `trendDisplay.ts`, `fiiTrustBoundary.ts`, anything under
`rust/`, golden fixture *values*. Before each completion report run
`git diff --name-only` and paste it; stop if any protected file appears.

## Test commands

Frontend: `npm test`, `npm run lint`, `npm run build` in `frontend/`.
Backend (B2-1 only): repo's pytest suite in `backend/`, including the new golden,
no-write, idempotency, and migration tests.

## Browser QA evidence (B2-3, synthetic data only)

Screenshots: needs-review flag after rename; calculate blocked; unsaved result with
pill; stale banner after edit; save-failure retry (backend stopped); saved result;
History before/after discard proving no residue.

## Native ADB QA evidence (B2-3)

Rules of the Campaign A native QA session apply: one authorized device, idle, user
confirmation before input, synthetic meals only, clean up reverse mapping and backend
afterwards.

Journeys: calculate → background 10 s → resume (unsaved estimate intact); calculate →
discard → History unchanged; calculate → save → History gains exactly one meal (one
`POST /meals` in the access log); hardware-Back leave-guard on unsaved estimate;
airplane-mode calculate failure → draft intact.

## Stop conditions

Stop and report (do not work around) if: preview and save outputs differ for any golden
payload; the refactor cannot be verbatim; any acceptance criterion seems to require a
protected file; the #97 gate is not met when B2-2 would start; existing tests fail for
unrelated reasons; a schema change beyond the approved `client_request_id` +
`client_request_fingerprint` columns appears necessary; any copy would imply
measurement, dosing, safety, or calibration; any situation arises that the sealed
documents do not explicitly decide.

Do not commit, push, branch, or open issues/PRs; leave changes in the working tree for
review. One slice per review cycle.

## Completion-report format (per slice)

1. **Summary** (≤ 5 lines). 2. **Changed files**. 3. **Acceptance criteria table**
(pass/fail + evidence). 4. **Mutation-challenge results** (each: mutation applied,
failing test name, reverted). 5. **Test/lint/build output** (final lines).
6. **Protected-file verification** (`git diff --name-only`). 7. **Screenshots/evidence
paths** (B2-3). 8. **Unresolved risks / deviations** — honest, including anything
deferred.

---

## Approval

- **Status:** Sealed implementation contract, v1.0, 2026-07-18. Companion to the
  sealed product and architecture documents of the same date.
- **Approved decisions:** the slice structure and start gates above; approved route
  `/meals/estimate`; `POST /meals/preview` with the architecture doc §4.2 types;
  `client_request_id` + fingerprint idempotency per architecture doc §7; meal-level
  subtype chips removed with no replacement chips; no new request/item limits.
- **Remaining hard gates:** issue #97 outcome before B2-2; human-approved plan before
  B2-1 persistence edits; explicit user consent before native ADB input in B2-3.
- **Prohibited interpretations:** Sol makes no product, persistence, scientific, or
  copy-meaning decisions under this contract; anything the sealed documents leave
  undecided is a stop condition. No sentence in this mission authorizes a scoring
  formula, coefficient, dataset, confidence, estimate-quality, image-retention, or
  scientific-copy change.
- **Version/date:** v1.0 — 2026-07-18.
