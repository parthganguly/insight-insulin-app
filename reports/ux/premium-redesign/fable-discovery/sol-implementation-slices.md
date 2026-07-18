# Sol Implementation Slices — Annotated Journal

**Mission:** issue #101, Part 5 decomposition. **Author:** Claude Fable 5.
**Date:** 2026-07-18 (updated same day for the human disposition on PR #102).
**Status:** **J1–J6 and J9 are authorized for implementation** under
design-constitution v1.1. **J7 is deferred** (tick-scale, cold-start rule,
verdict bands) — no part of it may be implemented implicitly inside another
slice; constitution §6.7-interim governs result screens meanwhile.
**Photo persistence is deferred** — existing photo behaviour plus the
typographic-plate fallback is the boundary. **Seven-day trend semantics are
preserved** — presentation changes only as J2 allows. **The B1
placeholder-rename gap stays separate.** **J8 stays blocked** until the
approved Campaign B2 architecture exists. Implementation work does not
happen on this discovery branch; each slice runs as its own Sol thread on
its own branch per repo git law.

Ground rules for every slice (inherit `AGENTS.md`, `CLAUDE.md`, and the
sealed Campaign A/B contracts in full):

- Sol implements the frozen `design-constitution.md`; Sol never invents
  design. Ambiguity ⇒ stop and ask Fable, citing the constitution section.
- Presentation-only: no change to `api.ts` semantics, stores' persistence
  logic, scoring, copy-helper modules (`safetyCopy.ts`,
  `acuteScoreDisplay.ts`, `insulinImpactPresentation.ts`,
  `fiiTrustBoundary.ts`, `trendDisplay.ts`) — import, never edit.
- Sealed strings render byte-for-byte; new connective copy only where a
  slice explicitly grants it.
- Every slice: run `npm run lint`, `npx tsc --noEmit`, `npm run test.unit --
  --run`, `npm run build`, and the full Cypress suite; add the slice's named
  screenshot comparisons at 390×844 and 320×700 (and dark where stated);
  paste `git diff --name-only` proving allowed-files compliance.
- No commits/PRs by Sol; working-tree only, per repo law.

---

## Slice J1 — Token foundation and app chrome

**Goal:** the two appearances, type scale, surfaces, dock, and tab chrome
exist app-wide; no screen restructuring yet.
**Allowed files:** `frontend/src/theme/variables.css`,
`frontend/src/theme/app.css`, `frontend/src/App.tsx` (tab bar
presentation + dark-mode class application only),
`frontend/src/components/IonToolbarWrapper.tsx`, new
`frontend/src/theme/tokens.css`, `frontend/src/utils/appearance.ts` (+ test).
**Fixed behaviour:** routes, tab semantics, settings route, all page logic
untouched. Dark mode = constitution §2.2 values, applied via a root class;
respects `prefers-color-scheme` with in-app override persisted in the
existing settings store field (the orphaned `darkMode` flag becomes real).
Uppercase button text globally removed (`text-transform: none`).
`--app-faint` eliminated; replacement tokens meet AA.
**Tests:** appearance helper unit tests; existing suites green.
**Screenshots:** Home/chooser/History at both viewports, light + dark.
**Stop if:** any Ionic component resists tokenisation without touching a
forbidden file.

## Slice J2 — Home as journal

**Goal:** constitution §6.1–6.3 (mature/empty/building states).
**Allowed files:** `frontend/src/pages/dashboard/Dashboard.tsx`, `app.css`,
new `frontend/src/components/JournalEntryCard.tsx`,
`frontend/src/components/TypographicPlate.tsx`, new helpers + tests under
`frontend/src/utils/` (folio date line, entry meta line).
**Fixed behaviour:** `resolveHomeLifecycleState`, trend gating, coverage
lines, `trendDisplay.ts` semantics and ARIA distinctions unchanged. The
trend renders as the one-line sentence (existing values/copy meanings; ring
removed). Recents open `/meals/saved/:id` read-only, as today.
**Tests:** entry-card rendering (photo vs typographic plate), lifecycle
states, trend-sentence accessibility states.
**Screenshots:** home-empty, home-building, home-mature × 2 viewports ×
light/dark vs `screenshots/final-annotated-journal/` references.
**Stop if:** tempted to alter trend math/copy or add the tick-scale here.

## Slice J3 — Log Meal chooser + Smart Camera

**Goal:** constitution §6.4–6.5.
**Allowed files:** `frontend/src/pages/meal/LogMealChooser.tsx`,
`frontend/src/pages/meal/AiMealAdd.tsx`, `app.css`, new camera-layout
components, helper tests.
**Fixed behaviour:** capture/upload plumbing, multi-image support, privacy
disclosure copy (collapsed but same sealed text), curated failure copy via
`aiFailureCopy.ts`, state reset on enter/leave, "Enter manually instead"
recovery — all unchanged. Analyze disabled until an image exists.
**Tests:** existing AiMealAdd suite green; new layout-state tests (empty /
captured / loading / failure).
**Screenshots:** chooser, camera empty, camera with image, camera failure ×
2 viewports; camera dark.
**Stop if:** any change would touch extraction requests or provider code.

## Slice J4 — Confirm as annotated review

**Goal:** constitution §6.6 including the C-voice needs-review card.
**Allowed files:** `frontend/src/pages/meal/PreviewMeal.tsx`, `app.css`,
new confirm components, `frontend/src/utils/mealDraftUx.ts` (additive
strings only), helper tests.
**Fixed behaviour:** B1 correction law exactly (rename invalidation,
review-blocking, resolution paths, provenance stamping, payload mapping);
meal-name helper sealed string; Advanced details contents and disclaimers;
validation messages; draft-leave guard. Needs-review wording may adopt the
constitution voice **only** by adding new strings while preserving the
sealed meanings ("These values were for 'X'…" / "These still fit" meanings
fixed).
**Tests:** all Campaign B suites green; new hierarchy tests (technical
fields hidden until disclosure; review card placement).
**Screenshots:** confirm ordinary, confirm needs-review, advanced expanded,
320×700 stacking, long-text state, dark.
**Stop if:** any acceptance seems to require changing store invalidation
semantics — that is sealed law, not styling.

## Slice J5 — Result chassis (saved)

**Goal:** constitution §6.8–6.9 applied to `SavedMealDetail.tsx` (the saved
result), including evidence rows and footnote treatment, using the
**§6.7-interim hierarchy**: the existing `insulinImpactPresentation` title
is the verdict-weight line ("Hard to estimate from this meal" for
insufficient-data ships here — it is existing helper output, not a J7
element). **The tick-scale and verdict bands are deferred (J7) and must not
appear in any form** — no dots/needle/strip, no "more / about as much /
less than most meals you log", no percentile/position/ranking language.
Reference-screenshot comparisons exclude those two modules; all else binds.
**Allowed files:** `frontend/src/pages/meal/SavedMealDetail.tsx`, `app.css`,
new `EvidenceRows.tsx`, `ResultHero.tsx`, helper tests.
**Fixed behaviour:** every displayed number/label/disclaimer from backend +
helpers byte-for-byte; delete integrity; Check-another-meal → chooser;
insufficient-data presentation driven by the existing
`insulinImpactPresentation` kinds. Share-of-load percentages are display
arithmetic over the item loads already present in the response — rendered
with tabular numerals, hairline bars, provenance why-lines.
**Tests:** result-order tests; share arithmetic unit tests (pure helper);
insufficient-data state renders "What we could read" note with nominal
reading de-emphasised.
**Screenshots:** result normal, result insufficient, dark, large-text.
**Stop if:** share-of-load requires any value not already in the stored
meal (it does not — per-item loads exist).

## Slice J6 — History as journal

**Goal:** constitution §6.10.
**Allowed files:** `frontend/src/pages/meal/Meals.tsx`,
`PreviousMealPicker.tsx` (presentation), `app.css`, reuse of
`JournalEntryCard`.
**Fixed behaviour:** read-only; reuse only via chooser; day grouping is
display-only over existing timestamps.
**Tests/screenshots:** history at both viewports + dark; picker unchanged
semantics.

## Slice J7 — Comparative tick-scale + verdict sentence [DEFERRED — do not implement]

**Deferred by the human disposition of 2026-07-18 (PR #102).** This slice —
including the comparative tick-scale, the cold-start rule, and the
"more / about as much / less than most meals" verdict bands — is not
authorized, and no part of it may be implemented implicitly inside another
slice. It becomes actionable only through a future explicit human
product+scientific sign-off on `final-direction.md` §6 items 1–3, recorded
in an issue. Until then this section is a specification on ice.
**Goal:** constitution §6.7 scale + verdict on estimate/result screens, with
the approved cold-start rule.
**Allowed files:** result/estimate components from J5, new
`ScoreAmongMeals.tsx`, pure helper + exhaustive tests (min/max/position,
cold-start, single-meal, ties, uncapped values).
**Fixed behaviour:** client-side arithmetic on canonical saved scores only;
full text aria-label; no colours, no thresholds; insufficient-data results
never show the scale.
**Stop if:** anyone proposes percentile/target/"normal range" language.

## Slice J8 — Campaign B2 estimate screens (when B2 ships)

The unsaved-estimate route (`/meals/estimate`), stale banner, and
Save-to-History dock are constitution-ready (§6.7); this slice applies the
same chassis to the B2 screens once the sealed B2 architecture lands. It
must not precede B2-1/B2-2 and follows the B2 mission contract's own rules.

## Slice J9 — Accessibility & motion audit pass

**Goal:** constitution §8–§9 verified app-wide: focus-on-route-change fix
for the observed `aria-hidden` warnings, reduced-motion coverage, 133 %
text-scale pass, automated contrast check wired into lint/CI config **only
if** the humans approve the CI edit (CI files are otherwise out of scope).
**Screenshots:** large-text and reduced-motion evidence.

---

### Sequencing (authorized)

J1 → J2 → (J3 ∥ J4) → J5 → J6 → J9. J7 deferred (see above); J8 blocked on B2.
Each slice is one Sol thread with the standard completion-report format from
the Campaign A/B missions (summary, files, acceptance table, check output,
protected-file verification, screenshots, honest deviations).
