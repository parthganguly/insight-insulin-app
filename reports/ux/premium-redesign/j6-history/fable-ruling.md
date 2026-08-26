# J6 Fable Ruling — History and Previous Meal Picker

**Author:** Claude Fable 5, product and visual-design authority for J6.
**Date:** 2026-07-27.
**Base verified:** repository `insight-insulin-app`, branch `main`,
HEAD = origin/main = `e80c00d1c8cf0635f7128731827d26d0493d0032`, clean tree.
**Status:** sealed. This document is the authoritative product/design ruling
for Annotated Journal slice J6. It is reproduced here verbatim in substance as
the implementation authority for issue #123. It may not be reinterpreted,
simplified, expanded, or redesigned by the implementer.

Governing authority above this ruling, unchanged: `AGENTS.md`, `CLAUDE.md`,
roadmap issue #111, design constitution v2.0
(`../fable-discovery/design-constitution.md`, §6.10 and §11 in particular),
`../fable-discovery/sol-implementation-slices.md` (Slice J6), and the accepted
J1–J5 implementations and merge records.

---

## J6 FABLE VERDICT

**READY FOR OPUS IMPLEMENTATION**

---

## PRODUCT CONTRACT

- **History purpose** — "I want to review what I logged." A read-only,
  day-broken journal archive at `/meals`. Every entry opens the canonical J5
  saved result at `/meals/saved/:mealId`. It is the long-form counterpart to
  the J2 Home recents.
- **Previous Meal Picker purpose** — "I want to use a saved meal as the
  starting point for a new draft." At `/meals/previous`, reached only through
  the Log Meal chooser's "Log a previous meal again". Selecting an entry builds
  a fresh draft via `buildDraftFromSavedMeal`, stamps every item
  `draftProvenance: "user_entered"`, places it in `currentMealStore`, and
  routes to `/meals/new` for review. Nothing is logged or saved by the tap
  itself; the source meal is untouched.
- **Non-negotiable distinction** — the two pages must be tellable apart
  *before* the first tap, through three cues acting together: (1) different
  folio heading and explainer sentence, (2) a visible per-card action line in
  the picker only ("Use as new draft"), (3) different card metadata (History
  shows the sealed journal meta line with estimate and quality; the picker
  shows time and calories only — never the old score or quality, so selection
  can never read as reopening or duplicating the old estimate).
- **Preserved behavior** — hydration via `syncMealsFromBackend` on both pages,
  fail-soft; newest-first store order; History tab ownership of `/meals` and
  `/meals/saved/:id`; Log Meal tab ownership of `/meals/previous` and
  `/meals/new`; draft-building, provenance stamping, trust-boundary field
  clearing, delete integrity, photo-persistence limits — all byte-for-byte as
  today.

---

## HISTORY CHASSIS

**Exact page order (normative, top to bottom):**

1. Top chrome: existing `IonToolbarWrapper` with `IonTitle` **"History"** —
   kept, not demoted (chrome-law consistency with Home; `typography-108.cy.ts`
   pins toolbar typography on `/meals`). No back button (tab root). No kicker
   pill — this page needs no draft/saved status.
2. In-page folio: serif-italic `h1` in the Home folio voice — sealed copy
   **"Meal journal"**.
3. Read-only explainer, one caption-weight line (`--ink-2`, body-secondary
   size), sealed copy: **"Tap an entry to revisit its saved result. To log one
   again, use Log Meal."** Hidden in the empty state.
4. Day-broken entries: for each group from `groupJournalMealsByDay(meals)`, an
   `h2.journal-daybreak` (existing class, italic serif + hairline) followed by
   one `JournalEntryCard` per meal, identical anatomy to J2 Home.
5. Final breathing room: bottom content padding >= 24 px plus safe-area inset
   above the tab bar; the last card must fully clear the tab bar at true bottom
   scroll.
6. No footer dock (Home owns "Check a meal"; History adds no action).

**Connective copy:** exactly the two strings in item 2–3; nothing else new. The
current `section-label` ("Saved meals / most recent first") is removed.

**Day grouping:** `groupJournalMealsByDay` exactly as shipped — `Today`,
`Yesterday`, then full "weekday, month day" labels, `"Date unavailable"`
fallback, newest-first as delivered by the store. Display-only; no store,
timestamp, or sorting change of any kind.

**Entry anatomy:** the accepted `JournalEntryCard` verbatim — full-bleed photo
(7 rem; 5.6 rem <= 340 px) or `TypographicPlate` fallback; serif `h3` meal name
with `overflow-wrap: anywhere` (no truncation); `getJournalEntryMetaLine` meta
line (time · `estimate N` · `Data quality: X`, parts dropped when missing);
`aria-labelledby` name+meta; no chevron (`detail={false}`); whole card is the
44 px+ tap target; card border + hairline + raised shadow per tokens. **The
`AcuteScoreProgressbar` and `getAcuteScoreCaption` ("above ref"/"score") leave
this page entirely.** The quiet "estimate N" inside the meta line is the only
score presence — editorial metadata, never a badge, gauge, or verdict. Calories
leave History rows (the saved result carries them; the J2-accepted entry
anatomy governs).

**Empty state:** centered journal-voice block replacing the generic card —
serif `h2` and body `p`, keeping today's strings byte-identical: **"No saved
meals yet"** / **"Meals you check and save will appear here."** Folio `h1`
remains above it. No plate, no illustration, no button.

**Paper/Ink:** all surfaces, hairlines, and text via existing tokens
(`--paper`, `--raised`, `--tint`, `--ink/-2/-3`, `--line`, shadows).
Structurally identical in both appearances; no new colors; accent appears
nowhere on this page.

---

## PREVIOUS-MEAL PICKER CHASSIS

**Exact page order:**

1. Top chrome: `IonToolbarWrapper` with `IonTitle` **"Choose a previous meal"**
   (existing string, kept) plus an `IonBackButton` (`IonButtons slot='start'`,
   `defaultHref="/log-meal"`, accessible name "Back") — the page is a pushed
   step in the Log Meal journey and must offer an explicit way back.
2. In-page folio: serif-italic `h1`, sealed copy **"Log a previous meal
   again"** — byte-identical to the chooser option title the user just tapped
   (journey continuity).
3. Explainer, one line, sealed copy: **"Pick a meal to start a new draft you
   can review and edit. The original stays unchanged in History."** Hidden in
   the empty state.
4. Day-broken entries: **grouping decision — the picker uses the same
   `groupJournalMealsByDay` day breaks as History.** Recency is the primary
   retrieval cue when repeating a meal, and structural consistency keeps one
   system; the distinction is carried by copy, metadata, and the action line,
   not by flattening the list.
5. Entries: `PreviousMealEntryCard` (see Component Law) — same visual
   plate/photo + caption body as History, plus the action line.
6. Bottom breathing room: same tab-bar clearance rule as History. No footer
   dock.

**Entry anatomy:** photo or plate exactly as History; serif `h3` name; meta
line from the new display-only helper `getPreviousMealMetaLine(meal)` =
localized time (same format as the journal meta line; `"Time unavailable"`
fallback) + " · " + `Math.round(calculateTotalCalories(meal))` + " kcal"
(existing display arithmetic — calories help distinguish similar meals). **No
score, no quality, no provenance on picker cards** — the old estimate must not
be re-presented at the moment of selection, because the new draft will be
re-scored after review.

**Selection affordance:** the **entire card is the single action** — no inner
buttons, no swipe. A visible trailing caption line inside the caption block,
sealed copy **"Use as new draft"**, caption size, `--accent` color (permitted:
it labels the card's own action), no icon. This line is part of the card's
`aria-labelledby` chain, ordered name → meta → action, so the screen-reader
name reads: *"{meal name}, {time · N kcal}, Use as new draft, button."*

**Empty state:** same journal-voice treatment as History, keeping today's
strings byte-identical: **"No previous meals yet"** / **"Meals you save will
appear here for quick reuse."**

**Paper/Ink:** identical token discipline; the accent action line must pass AA
in both appearances (v2.0 accent does: 7.29:1 paper, 8.22:1 ink).

---

## COMPONENT LAW

**Selected architecture: Option C — one shared visual body, two semantic
wrappers.**

- **New `frontend/src/components/JournalEntryBody.tsx`** — presentational only:
  renders the photo/`TypographicPlate` + caption block (`h3` name, meta `p`,
  optional trailing action line) with the existing
  `journal-entry-card-content` DOM and classes. Accepts `meal`, `metaLine`,
  optional `actionLine`, and the label ids. No routing, no stores, no handlers.
- **`frontend/src/components/JournalEntryCard.tsx`** — refactored *only* to
  delegate its body to `JournalEntryBody`. Its public contract is frozen: props
  stay `{ meal }`; the `routerLink` stays hardwired to `/meals/saved/:id`;
  rendered DOM, class names, accessible name, and the read-only guard comment
  stay byte-equivalent. **The existing `JournalEntryCard.test.tsx` must pass
  unmodified — that file is the negative control for this refactor.**
- **New `frontend/src/components/PreviousMealEntryCard.tsx`** — `IonItem
  lines='none' detail={false} button` with `routerLink='/meals/new'` hardwired
  and an `onSelect` callback prop invoked on click. It renders
  `JournalEntryBody` with the picker meta line and the "Use as new draft"
  action line. It owns *no* store logic: the page supplies `onSelect` = build
  draft → stamp provenance → `setMeal` (current mechanics, moved verbatim).

**Interaction semantics:** `JournalEntryCard` can only ever navigate read-only
(no click handler prop exists to misuse). `PreviousMealEntryCard` can only ever
go to `/meals/new` (no destination prop exists). Accidental cross-use is
structurally impossible, and tests pin each hardwired destination.

**Accessibility semantics:** both are single buttons named by `aria-labelledby`
from visible text; images `alt=''`; plates `aria-hidden`. History name =
name+meta; picker name = name+meta+action.

**Prohibited alternatives:** a `mode`/`variant`/`destination` prop on
`JournalEntryCard`; duplicating the card markup inside page files; a generic
"list row" abstraction; any second interactive element inside either card.

---

## RESPONSIVE AND ACCESSIBILITY

- **Heading structure:** toolbar `IonTitle` is chrome, not a heading. Each
  page: one `h1` (folio) → `h2` per day label (`journal-daybreak`, inside a
  `section` with `aria-labelledby`) or `h2` empty-state headline → `h3` meal
  names. No skipped levels.
- **Viewports:** 390x844 and 320x700 with zero horizontal overflow; <= 340 px
  uses the existing reduced gutters and 5.6 rem media heights; content
  max-width 560 px centered in landscape/wide.
- **Large text:** all sizes in rem; layouts survive 133 % root scale and
  Android font scale 1.3 with no clipped meta lines, no truncated names (wrap,
  never ellipsize the name or action line).
- **Targets/focus:** every card >= 44x44; back button >= 44 px;
  `focus-visible` = 2 px accent outline, 2 px offset on cards and back button;
  pressed state per constitution §7 (opacity, no ripple invention).
- **Safe area / tab bar:** bottom padding includes `env(safe-area-inset-bottom)`;
  last entry and empty state fully visible above the tab bar at true bottom
  scroll; no reliance on color alone anywhere (the picker's action line is
  text, not a color signal).

---

## STATE MATRIX

- **History:** empty · one meal/one group · many meals across >= 3 day groups
  (Today / Yesterday / dated) · all-plates · mixed photo+plate · long name ·
  missing score (meta drops "estimate") · missing quality (meta drops quality)
  · invalid timestamp ("Date unavailable" group + "Time unavailable" meta) ·
  hydration failure with local cache (list renders from cache, no error UI) ·
  hydration failure with nothing local (empty state).
- **Picker:** the same set, minus score/quality states (never shown), plus:
  selection navigates to `/meals/new` with draft populated.
- **Edge rule:** **no new loading or error state is authorized** —
  `syncMealsFromBackend` fails soft by design, and inventing spinner/error UI
  would misrepresent or alter sync semantics. The empty state honestly covers
  "nothing to show".

---

## ALLOWED PRODUCTION FILES

1. `frontend/src/pages/meal/Meals.tsx` — History rebuild (original grant).
2. `frontend/src/pages/meal/PreviousMealPicker.tsx` — picker rebuild (original
   grant).
3. `frontend/src/theme/app.css` — J6 styles; may also delete the now-orphaned
   `.recent-card*` / `.meal-card-thumbnail` / `.meal-card-image` rules **only
   if** no other file references them after the rebuild (grep-verified).
4. `frontend/src/components/JournalEntryCard.tsx` — **bounded**: body
   extraction only; DOM/route/name frozen; its test file untouched and green.
   Justification: the fixed router link makes naive reuse impossible;
   extraction is the minimal change that avoids markup duplication.
5. **New** `frontend/src/components/JournalEntryBody.tsx` — shared visual body
   (Component Law C).
6. **New** `frontend/src/components/PreviousMealEntryCard.tsx` — picker
   semantic wrapper.
7. `frontend/src/utils/journalPresentation.ts` — **additive only**:
   `getPreviousMealMetaLine`. Justification: keeps date/time display logic in
   the one presentation module; no existing export may change.

No other production file. In particular **not** `TypographicPlate.tsx` (no
change needed) and **not** `App.tsx` (routes/tabs untouched).

## ALLOWED TEST FILES

- **New:** `frontend/src/pages/meal/Meals.journal.test.tsx`;
  `frontend/src/components/PreviousMealEntryCard.test.tsx`; new Cypress spec
  `frontend/cypress/e2e/j6-history-picker.cy.ts`.
- **Additive updates:** `frontend/src/utils/journalPresentation.test.ts` (new
  helper cases); `frontend/src/pages/meal/PreviousMealPicker.test.tsx`
  (behavioral guards preserved verbatim; only the wording assertion
  `"choose one to edit and log again"` updates to the new sealed explainer,
  plus new no-score/accessible-name assertions);
  `frontend/src/pages/meal/Meals.reuse.test.tsx` (selector-level updates only
  if a queried string moved; both guards — read-only landing on the sealed
  "Saved to history" pill and no-draft-created — keep identical assertions).
- **Comment-only (optional):** the "until J6 retires it" notes in
  `j5-saved-result.cy.ts` and `acute-score.cy.ts`; their assertions are
  `.result-page`-scoped and must not change.
- **Must pass unmodified:** `JournalEntryCard.test.tsx`, all J2/J3/J4/J5
  suites, `typography-108.cy.ts`, full Cypress.

## PROTECTED FILES

`frontend/src/stores/persistentMealStore.ts` ·
`frontend/src/stores/currentMealStore.ts` ·
`frontend/src/utils/fiiTrustBoundary.ts` · `frontend/src/utils/safetyCopy.ts` ·
`frontend/src/utils/acuteScoreDisplay.ts` ·
`frontend/src/utils/insulinImpactPresentation.ts` · `frontend/src/utils.ts` ·
`frontend/src/api/api.ts` · `frontend/src/App.tsx` ·
`frontend/src/pages/meal/SavedMealDetail.tsx` and all J5 components ·
`frontend/src/pages/meal/LogMealChooser.tsx` ·
`frontend/src/utils/logMealOptions.ts` ·
`frontend/src/components/TypographicPlate.tsx` ·
`frontend/src/components/AcuteScoreProgressbar.tsx` + its test (left in place
unused; deletion is a recorded P2, not a J6 action) · all backend, Rust,
config, CI, and docs of record.

---

## TEST CONTRACT

**History (unit/page):** entries link to `/meals/saved/:id` and create no draft
(existing guards); day groups render in store order with Today/Yesterday/dated
labels and correct `h2` semantics; photo vs plate; meta line drops missing
score/quality; "Date unavailable" grouping; long-name wrap; empty state
strings; **negative controls:** no `AcuteScoreProgressbar`/SVG/ring aria-label,
no "above ref", no kcal text, no `onClick` reuse path, no "Use as new draft"
text anywhere on `/meals`.

**Picker (unit/page):** tap → `buildDraftFromSavedMeal` path with new id,
`source_meal_id` back-link, all derived scoring fields cleared, every item
`draftProvenance: "user_entered"` (existing guard, preserved verbatim); saved
source JSON-identical after selection; route ends at `/meals/new`; **negative
controls:** no fetch/save call fired by selection, no link to `/meals/saved/`,
no score/quality/estimate text, no ring; accessible name contains name + "Use
as new draft"; empty state; photo/plate; long names.

**Shared / Cypress (`j6-history-picker.cy.ts`):** both pages x paper/ink
structural identity; heading order (`h1`→`h2`→`h3`); no nested cards
(`ion-card` absent, no `.app-card` inside cards); no horizontal overflow at 390
and 320; last card clears the tab bar; forbidden-language audit on both routes
("percentile", "than most meals", "better", "worse", "healthy", "unhealthy",
"good", "bad", "ranks"); navigation distinction end-to-end (History entry →
"Saved to history" pill; picker entry → confirm screen with draft kicker);
`git diff --name-only` allowed-files audit in the report.

---

## BROWSER EVIDENCE

History: populated paper 390x844 · populated ink 390x844 · populated paper
320x700 · >= 3 day groups visible · mixed photo/plate · empty state · long-name
+ 133 % text · true bottom scroll (tab-bar clearance visible).

Picker: populated paper 390x844 · populated ink 390x844 · 320x700 · empty state
· long-name + 133 % · close crop showing the "Use as new draft" line.

All synthetic data; every capture visually inspected before retention; hashes
in an evidence ledger per J5 convention.

## PHYSICAL-DEVICE EVIDENCE (Samsung SM-M356B)

History paper + ink; picker paper + ink; font scale 1.0 and 1.3; portrait and
landscape; true bottom scroll on both pages; hot resume; and the
navigation-distinction walk: History entry → saved result ("Saved to history"),
picker entry → editable confirmation draft at `/meals/new`. Device evidence may
not be inferred from browser runs (J5 lesson: the WebView broke a projection
browser evidence missed).

---

## SEALED COPY

**Newly authorized strings (exact, byte-for-byte):**

1. `Meal journal` — History folio h1.
2. `Tap an entry to revisit its saved result. To log one again, use Log Meal.`
   — History explainer.
3. `Log a previous meal again` — picker folio h1 (deliberately byte-identical
   to the existing chooser option title).
4. `Pick a meal to start a new draft you can review and edit. The original
   stays unchanged in History.` — picker explainer.
5. `Use as new draft` — picker card action line.
6. Picker meta format: `{time} · {kcal} kcal` with the journal time format and
   `Time unavailable` fallback.

**Must remain byte-identical:** `History` and `Choose a previous meal` toolbar
titles; empty-state strings `No saved meals yet` / `Meals you check and save
will appear here.` / `No previous meals yet` / `Meals you save will appear here
for quick reuse.`; every `getJournalEntryMetaLine`, `getJournalDayLabel`,
`getEstimateQualityCopy` output; all J5 result copy; chooser option strings.

---

## FORBIDDEN

Everything in the mission boundary, restated as law: no change to scoring, FII
resolution, thresholds, formulas, backend, Rust, API contracts, payloads,
persistent types/store mechanics, hydration, sorting, current-meal semantics,
`buildDraftFromSavedMeal`, provenance stamping, save timing, delete behavior,
photo persistence, telemetry, consent, auth, privacy, route or tab ownership,
or J5 behavior. No B2 unsaved estimates; no J7 scales/bands; no rankings,
percentiles, population comparisons, or better/worse/healthy/good/bad framing;
no new meter, gauge, traffic light, score chip, or dashboard module; no
swipe-to-delete; no edit/reuse/logging from History; no search, filters,
favourites, tags, calendar, or pagination; no generic Ionic list styling,
nested cards, colored nutrient icons, large score badges, or dense metadata
grids; no new loading/error UI; no serif outside constitution §3 roles; no red
except delete (J6 has no delete).

## P2 DEFERRALS

App-wide Ionic alert chrome · transparent status-bar scroll paint · empty
`FII:` copy resolution (#47 residue) · Settings redesign slice · J9
focus/motion pass · J7 comparative scale · B2 unsaved estimate · permanent
Android identity · photo persistence · **deletion of the now-unused
`AcuteScoreProgressbar.tsx` + test and the retired `getAcuteScoreCaption`
caption usage** (dead code after J6; removal is cleanup, not J6) · orphaned
`.recent-card` CSS if implementation elects not to remove it under allowed-file
3's condition.

---

## ISSUE BLUEPRINT

**Title:** `J6: History and Previous Meal Picker as Porcelain Journal folios
(presentation only)`

**Body:** Implements constitution §6.10 under design law v2.0 and the sealed
Fable J6 ruling (this document, committed with the slice report). History at
`/meals` becomes a read-only day-broken journal folio using
`JournalEntryCard`; the Previous Meal Picker at `/meals/previous` receives the
same premium presentation with an unmistakable "Use as new draft" selection
identity, unchanged reuse semantics. Component Law C: shared
`JournalEntryBody`, two semantic wrappers with hardwired destinations. Removes
the retired score circle from both routes. No store, API, scoring, routing, or
persistence change. Base: `e80c00d`.

**Acceptance checklist:**

- [ ] Page orders, sealed copy, and anatomy exactly per ruling; no other new
      strings.
- [ ] `JournalEntryCard.test.tsx` passes unmodified; all existing suites green;
      lint, `tsc --noEmit`, build, full Cypress green.
- [ ] History negative controls: no ring/"above ref"/kcal/reuse affordance;
      picker negative controls: no score/quality, no saved-result link, no save
      call.
- [ ] Reuse guards preserved verbatim (provenance, cleared fields, source
      untouched, `/meals/new`).
- [ ] `git diff --name-only` matches the allowed-file list exactly.
- [ ] Browser evidence set and Samsung SM-M356B matrix captured per ruling.

**Stop conditions:** any acceptance seems to require touching a protected file,
a store, a helper's existing output, or route/tab wiring; any sealed string
fails byte-comparison; the `JournalEntryCard` refactor cannot keep its test
green unmodified; device QA shows a layout defect whose fix would exceed the
allowed files.

## FINAL IMPLEMENTATION BRIEF (for Opus)

1. Branch from `e80c00d` per git law; work only in the allowed files.
2. Extract `JournalEntryBody` from `JournalEntryCard` (DOM-stable; its test
   unmodified and green before proceeding).
3. Build `PreviousMealEntryCard` (hardwired `/meals/new`, `onSelect` prop,
   action line, labelledby order name→meta→action).
4. Add `getPreviousMealMetaLine` to `journalPresentation.ts` (additive) +
   tests.
5. Rebuild `Meals.tsx` per the History chassis; rebuild
   `PreviousMealPicker.tsx` per the picker chassis, moving the existing
   draft-building `onClick` logic verbatim into the page's `onSelect`.
6. Style in `app.css` with existing tokens; both viewports; paper/ink; remove
   orphaned `.recent-card` CSS only if grep-clean.
7. Write the new unit/page tests and `j6-history-picker.cy.ts`; update only the
   two permitted existing test files as bounded above.
8. Run lint, `tsc --noEmit`, unit suite, build, full Cypress; capture the
   browser evidence set; then the Samsung matrix.
9. Produce the standard slice report (files, acceptance table, check output,
   protected-file verification, evidence ledger, honest deviations). No commit
   to main; PR per repo law after independent review.
10. **Stop immediately** on any stop condition above; report and await Fable,
    citing the ruling section.
