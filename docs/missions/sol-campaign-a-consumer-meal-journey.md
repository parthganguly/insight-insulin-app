# Sol Mission — Campaign A: Consumer Meal Journey

**Agent:** sol-engineer (GPT-5.6 Sol via Codex MCP)
**Authority:** `docs/product/ux/insight-ux-v1.md` is the product specification. Where this contract and that spec conflict, stop and report.
**Governing rules:** `AGENTS.md` and `CLAUDE.md` apply in full.

---

## Mission

Restructure the frontend meal journey so a first-time user can go: Home → Check a meal → Photo / Manual / Previous → Confirm what INSIGHT found → Calculate & save → dedicated result screen. Frontend only. Backend, scoring, datasets, and scientific copy are untouched.

## User-visible outcome

- Home leads with one labeled **Check a meal** action in every lifecycle state.
- A **Log Meal** tab directly offers **Take a photo / Enter manually / Log a previous meal again**.
- The Smart Camera has one labeled **Analyze meal** primary button and a human-language note field.
- The confirmation screen asks "Did we get your meal right?" and hides FII/GI/source fields behind an "Advanced details" disclosure.
- Saving navigates to the existing canonical saved-meal view, reordered as the result screen, with all backend values displayed unchanged.

## Allowed scope

- `frontend/src/App.tsx` — tab bar: **Home / Log Meal / History**, all with visible text labels and accessible names; new route for the Log Meal chooser; Settings moved to a gear icon in the Home header (settings route itself unchanged).
- `frontend/src/pages/dashboard/Dashboard.tsx` — retitle to Home; add the always-first "Check a meal" primary action; implement the three Home states from spec §5. Trend display gating uses only the existing `logged_days_last_7` / `window_days` coverage fields; trend mathematics, copy constants, and accessibility-state logic in `utils/trendDisplay.ts` are not modified.
- New Log Meal chooser page (three options per spec §7) and a "previous meal" picker that reuses the existing `buildDraftFromSavedMeal` call exactly as `Meals.tsx` does today.
- `frontend/src/pages/meal/Meals.tsx` — becomes the read-only **History** list; items open `/meals/saved/:mealId`. The draft-creating reuse behaviour moves behind the explicit "Log a previous meal again" choice.
- `frontend/src/pages/meal/AiMealAdd.tsx` — simplify per spec §8: labeled primary **Analyze meal** button (replaces the icon-only FAB), note field relabeled "Anything the photo can't show? (optional)", instruction list shortened to plain language. Keep: multi-image support, privacy disclosure, curated failure copy usage, state reset on enter/leave, "Enter manually instead" recovery.
- `frontend/src/pages/meal/PreviewMeal.tsx` — confirmation hierarchy per spec §9: identity → components with portion quick-adjust → whole-meal estimate card → primary **Calculate & save** + secondary **Discard**. Move FII, GI, per-serving densities, and source rows inside the item editor behind a collapsed "Advanced details" disclosure. Add the mandatory disclosure line next to the subtype chips: "This changes the name only — check the ingredient list below still matches your meal." On successful save, navigate to `/meals/saved/:id` (the canonical meal returned by the backend) instead of remaining on the editing screen.
- `frontend/src/pages/meal/SavedMealDetail.tsx` — reorder into the result hierarchy of spec §10; add **Check another meal** (→ Log Meal chooser) and Done/Home actions; put per-item FII/GI/source evidence behind a collapsed disclosure. All values, disclaimers, and safety copy render unchanged.
- New small UX helper modules + tests under `frontend/src/utils/` (e.g. Home-state resolution, log-entry options) following the existing helper-plus-`.test.ts` pattern.
- `frontend/src/theme/app.css` and component-level styling needed for the above.
- Additive string constants in `frontend/src/utils/mealDraftUx.ts` if needed (no changes to existing exported strings).

## Forbidden scope

Do not touch, even trivially:

- anything under `backend/` (including `backend/fii_foods.csv`) or `rust/`;
- `frontend/src/utils/safetyCopy.ts`, `acuteScoreDisplay.ts`, `insulinImpactPresentation.ts`, `fiiTrustBoundary.ts`, `trendDisplay.ts` (import them; never edit them);
- `frontend/src/api/api.ts` request/response mapping, endpoints, or normalization semantics;
- store persistence logic in `persistentMealStore` / `currentMealStore` beyond calling existing functions;
- golden fixtures, scoring tests, migrations, deployment config.

Do not implement:

- any new or changed backend endpoint (no preview/calculate-without-save);
- semantic subtype correction (chips updating ingredients/portions/nutrition) — Campaign B;
- new AI extraction behaviour or prompt changes;
- traffic-light bands, thresholds, "healthy/safe" labels, or any reinterpretation of score meaning;
- merged confidence percentages;
- dashboard trend math changes;
- native migration, persistence redesign, production deployment work.

## Likely starting files

`frontend/src/App.tsx`, `frontend/src/pages/dashboard/Dashboard.tsx`, `frontend/src/pages/meal/Meals.tsx`, `frontend/src/pages/meal/AiMealAdd.tsx`, `frontend/src/pages/meal/PreviewMeal.tsx`, `frontend/src/pages/meal/SavedMealDetail.tsx`, `frontend/src/utils/mealDraftUx.ts`, `frontend/src/theme/app.css`, plus new chooser page and helper/test files.

## Required states and copy intent

Copy below is intent; refine wording but preserve meaning, honesty, and tone (calm, factual, non-judgmental; no medical framing).

- **Home, no meals:** promise line "Understand and compare the estimated insulin demand of meals." + primary **Check a meal** + one-line explanation.
- **Home, < 3 logged days in window:** primary action first; compact line "Your 7-day trend appears after you log meals on 3 different days (N of 3 so far)"; Recents below.
- **Home, ≥ 3 logged days:** primary action first, existing trend card unchanged, Recents below.
- **Log Meal chooser:** three options with one-line descriptions per spec §7.
- **Smart Camera:** empty (no image: Analyze disabled), captured (thumbnails + "Add another angle"), loading ("Reading your meal photo…"), failure (curated copy + **Try again** + **Enter manually instead**), cancelled (clean state on re-entry).
- **Confirmation:** heading answering "Did we get your meal right?"; draft/saved status pill retained; subtype-chip disclosure line; validation and inline save-feedback behaviour retained.
- **Result:** hierarchy per spec §10; existing disclaimer and quality copy verbatim from their helper modules.

## Explicit non-goals

Calculate-before-save; real semantic corrections; changing what any score, quality label, driver, or disclaimer says; altering AI/manual trust-boundary semantics (`isAiDraft`, `buildDraftFromSavedMeal`, `updateMealItemFii` flows); redesigning meal deletion or photo-persistence behaviour.

## Observable acceptance criteria

1. A first-time user (empty store) sees Home with one clearly labelled primary **Check a meal** action; activating it reaches the Log Meal chooser.
2. The Log Meal tab directly presents **Take a photo**, **Enter manually**, and **Log a previous meal again** — no meal-history detour to create a meal.
3. Every bottom-tab action, including the central one, has a visible text label and an accessible name.
4. The Smart Camera has exactly one visible primary **Analyze meal** action, disabled until an image exists; its note field label contains no internal jargon ("Textual Description" appears nowhere).
5. AI extraction failure shows curated copy with working **Try again** and **Enter manually instead** paths; raw error text is never rendered.
6. The ordinary confirmation surface shows identity, components, and portions only; FII/GI/density/source fields are not visible until "Advanced details" is expanded.
7. The subtype chips display the "changes the name only" disclosure whenever they are shown.
8. Saving a valid meal navigates to `/meals/saved/:id`; the screen shows conclusion → score → drivers → quality → limitations → next actions, and offers **Check another meal**.
9. Every score, quality label, driver, and disclaimer shown equals the backend response value / existing helper output byte-for-byte (no new interpretation).
10. History items open the read-only saved-meal view; creating a draft from a previous meal happens only via the explicit chooser option.
11. `git diff --name-only` contains no file from the Forbidden scope list.
12. Existing delete-integrity, draft-reset, validation, and photo-quota behaviours still pass their tests.

## Targeted tests

- New helper tests (Vitest, matching the existing `utils/*.test.ts` pattern): Home-state resolution (empty / insufficient-coverage / sufficient), Log Meal option definitions, any new copy helpers (e.g. subtype disclosure line, trend-coverage line).
- Update `mealDraftUx.test.ts` only additively if constants are added.
- Run: `npm test` (or the repo's configured Vitest command) and the frontend lint/build (`npm run lint`, `npm run build`) in `frontend/`. Do not run backend or Rust suites.

## Browser screenshot evidence required

Capture (dev server, synthetic data only — never real meal photos or health data):

1. Home — empty state; 2. Home — with meals and visible trend; 3. Log Meal chooser; 4. Smart Camera — empty and with an image; 5. Confirmation — ordinary view and with "Advanced details" expanded; 6. Result screen after a save.

## Protected-file verification

Before reporting completion, run `git status` and `git diff --name-only` and confirm no changes to: `backend/**`, `rust/**`, `frontend/src/utils/safetyCopy.ts`, `frontend/src/utils/acuteScoreDisplay.ts`, `frontend/src/utils/insulinImpactPresentation.ts`, `frontend/src/utils/fiiTrustBoundary.ts`, `frontend/src/utils/trendDisplay.ts`, `frontend/src/api/api.ts`. Paste the file list into the completion report.

## Stop conditions

Stop and report (do not work around) if:

- the target experience appears to require a backend or API contract change;
- any acceptance criterion seems to require editing a forbidden file;
- existing tests fail for reasons unrelated to your change;
- score/quality/disclaimer output would differ from current values;
- the spec and this contract conflict;
- you are tempted to make subtype chips modify ingredients — that is Campaign B.

Do not commit, push, branch, open issues or PRs; leave changes in the working tree for review.

## Completion-report format

1. **Summary** (≤ 5 lines) of what changed.
2. **Changed files** (full list).
3. **Acceptance criteria table** — each criterion: pass/fail + one-line evidence.
4. **Test/lint/build output** (final lines).
5. **Protected-file verification** output.
6. **Screenshots** (paths + captions).
7. **Unresolved risks / deviations** — honest, including anything deferred.
