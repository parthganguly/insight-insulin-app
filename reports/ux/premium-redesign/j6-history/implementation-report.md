# J6 Implementation Report — History and Previous Meal Picker

**CURRENT STATUS — 2026-07-29: READY FOR NARROW OPUS MAX RE-REVIEW after a bounded product/visual correction (§27) of the two sealed-ruling P1 defects found by independent Opus Max review — the picker action line's lost cascade and the uncentred empty states. Current APK is `0B29929A…` (§27.10); `A80D4403…` is superseded. No physical Samsung validation is claimed.**

**PRIOR STATUS — 2026-07-28, SUPERSEDED: READY FOR FINAL FABLE REVIEW after independent Terra Pixel 8 API 36 emulator acceptance.**

**INITIAL IMPLEMENTATION STATUS — SUPERSEDED: J6 implementation, automated validation, browser evidence, and APK preparation complete — independent review and Samsung QA required.**

## 1. Issue

- **Number:** #123
- **URL:** https://github.com/parthganguly/insight-insulin-app/issues/123
- **State:** open
- Roadmap #111 remains open and was not modified.

## 2. Branch and worktree

- **Branch:** `opus/annotated-journal-j6-history`
- **Worktree:** `work/insight-j6-history` (linked worktree created from the
  clean `main` worktree)
- **Status:** nothing staged, zero commits ahead of base, no remote branch, no
  pull request.

## 3. Base

`e80c00d1c8cf0635f7128731827d26d0493d0032` — verified equal to `origin/main`
with a clean tree before the branch and worktree were created, and verified
again inside the new worktree.

## 4. Sealed Fable authority

The complete J6 ruling is preserved at `fable-ruling.md` beside this report.
It was treated as sealed: no decision in it was reinterpreted, relaxed, or
extended. Where implementation discovered something the ruling did not
anticipate (see §16), the response stayed inside the ruling's allowed files and
its stated intent.

## 5. Product distinction

History answers "I want to review what I logged." The previous-meal picker
answers "I want to use a saved meal as the starting point for a new draft."

They are told apart before the first tap by three cues acting together, exactly
as the ruling requires:

1. different folio heading and explainer sentence;
2. a visible per-card action line, on the picker only;
3. different card metadata — History carries the sealed journal meta line with
   estimate and data quality, the picker carries time and calories and never
   the old score.

## 6. History page anatomy (`/meals`)

1. Toolbar `IonToolbarWrapper` with `IonTitle` **History**, no back button.
2. `IonContent.journal-folio-content`.
3. Folio `section` with `h1` **Meal journal**.
4. Explainer `p`: **Tap an entry to revisit its saved result. To log one again,
   use Log Meal.** — rendered only when meals exist.
5. One `section` per group from `groupJournalMealsByDay(meals)`, each labelled
   by an `h2.journal-daybreak`, containing one `JournalEntryCard` per meal.
6. Empty state: `section` with `h2` **No saved meals yet** and `p` **Meals you
   check and save will appear here.**, with the folio heading still above it
   and the explainer absent.
7. No footer dock.

Removed: the `section-label` ("Saved meals / most recent first"), the generic
`IonItem` row, `IonThumbnail`/`IonImg`, the calorie row, `AcuteScoreProgressbar`,
and `getAcuteScoreCaption`.

## 7. Previous-meal picker anatomy (`/meals/previous`)

1. Toolbar with `IonButtons slot='start'` containing `IonBackButton`
   (`defaultHref='/log-meal'`, `aria-label='Back'`) and `IonTitle` **Choose a
   previous meal**.
2. `IonContent.journal-folio-content`.
3. Folio `section` with `h1` **Log a previous meal again**.
4. Explainer `p`: **Pick a meal to start a new draft you can review and edit.
   The original stays unchanged in History.** — rendered only when meals exist.
5. The same day-grouped `section`/`h2` structure, containing one
   `PreviousMealEntryCard` per meal.
6. Empty state: `h2` **No previous meals yet** and `p` **Meals you save will
   appear here for quick reuse.**
7. No footer dock.

## 8. Component Law C, and why mode props were rejected

- **`JournalEntryBody.tsx` (new)** renders the photo or `TypographicPlate`, the
  `h3` meal name, a supplied metadata line, and an optional action line, using
  the accepted `.journal-entry-card-content` / `.journal-entry-image` /
  `.journal-entry-caption` structure. It imports no store, no router hook, owns
  no route and no handler, and cannot tell which page is using it.
- **`JournalEntryCard.tsx` (refactored)** keeps its `{ meal }` prop, its
  hardwired `routerLink={/meals/saved/${encodeURIComponent(meal.id)}}`, its
  `aria-labelledby` name+meta contract, and its read-only guard comment. Only
  its inner markup moved into `JournalEntryBody`.
- **`PreviousMealEntryCard.tsx` (new)** is one `IonItem` with
  `routerLink='/meals/new'` hardwired and an `onSelect` callback. It renders
  the picker meta line and the exact action line `Use as new draft`, and names
  itself name → metadata → action.

A `mode`, `variant`, or `destination` prop on `JournalEntryCard` was rejected
because it would make the two meanings one switch apart. A single wrong prop
value would turn a History entry into a draft-creating control — the precise
confusion issue #89 and Campaign A exist to prevent. With two wrappers, neither
component has a prop that could express the other's behaviour, so the mistake
is not available to make; the tests then pin each hardwired destination.

## 9. Connective copy

Newly authorised, rendered byte-for-byte:

- `Meal journal`
- `Tap an entry to revisit its saved result. To log one again, use Log Meal.`
- `Log a previous meal again`
- `Pick a meal to start a new draft you can review and edit. The original stays unchanged in History.`
- `Use as new draft`
- picker metadata `{localized time} · {rounded calories} kcal`, with the
  existing journal time format and the `Time unavailable` fallback.

Preserved byte-identical: `History`, `Choose a previous meal`, `No saved meals
yet`, `Meals you check and save will appear here.`, `No previous meals yet`,
`Meals you save will appear here for quick reuse.`, and all
`getJournalDayLabel`, `getJournalEntryMetaLine`, data-quality, J5 result, and
chooser strings. No other user-visible J6 copy was added.

## 10. Day grouping

Both pages call the existing `groupJournalMealsByDay(meals)` and render its
output. The helper was not modified. No store mutation, timestamp migration, or
sorting change was made; ordering is whatever the persistent store already
delivers, and the tests assert that the rendered order equals the input order.

## 11. History read-only proof

- Entries render `JournalEntryCard`, whose route is hardwired to
  `/meals/saved/:id`; the page imports no current-meal store and no
  `buildDraftFromSavedMeal`.
- `Meals.reuse.test.tsx` (existing guard, assertions unchanged) still proves a
  tap lands on the canonical saved result and leaves the draft store untouched.
- `Meals.journal.test.tsx` adds negative controls: no `CircularProgressbar`, no
  `svg`, no capped-ring aria-label, no `above ref`, no `kcal`, no `Use as new
  draft`, and no edit/delete/log affordance anywhere on the page.
- The Cypress spec repeats the route and absence checks on the live page.

## 12. Picker draft/reuse proof

The selection body was moved verbatim from the old inline card into the page's
`reuseMeal`, and is passed to the card as `onSelect`:

```ts
const draft = buildDraftFromSavedMeal(meal);
setMeal({
  ...draft,
  items: draft.items.map((item) => ({ ...item, draftProvenance: "user_entered" })),
});
```

`PreviousMealPicker.test.tsx` keeps its existing guard assertions unchanged: a
new draft id, `source_meal_id` back-link, every derived scoring field cleared
(`acute_score`, `insulin_load_total`, `kcal_total`, `carbs_total`,
`estimate_quality`, `main_insulin_drivers`), per-item `fii`/`source`/`why`
stripped, every item stamped `draftProvenance: "user_entered"`, the saved source
record byte-identical before and after, and the route ending at `/meals/new`.
New assertions add: no non-GET request fires on selection, no `/meals/saved/`
link exists on the page, and no score, quality, or estimate text is shown. The
Cypress spec additionally intercepts `POST /meals` and asserts zero calls, and
re-reads `localStorage` after selection to confirm the source meal still holds
its canonical score.

## 13. Changed production files

| File | Change |
|---|---|
| `frontend/src/pages/meal/Meals.tsx` | History folio rebuild |
| `frontend/src/pages/meal/PreviousMealPicker.tsx` | Picker folio rebuild; selection logic moved to `onSelect` unchanged |
| `frontend/src/components/JournalEntryCard.tsx` | Body extraction only; contract, route and DOM frozen |
| `frontend/src/components/JournalEntryBody.tsx` | New shared presentational body |
| `frontend/src/components/PreviousMealEntryCard.tsx` | New picker wrapper |
| `frontend/src/utils/journalPresentation.ts` | Additive `getPreviousMealMetaLine`; time formatting factored into a private helper with identical output |
| `frontend/src/theme/app.css` | J6 folio section; removal of orphaned legacy rules |

This matches the sealed allowed-file list exactly. No other production file
changed.

**CSS removals.** `.recent-card`, `.recent-card-name`, `.recent-card-time`,
`.recent-card-chips`, `.recent-card-score`, `.recent-card-score-label`,
`.recent-card > ion-icon[slot="end"]`, `.meal-card-thumbnail`, and
`.meal-card-image` were deleted after a repository-wide grep proved the two J6
pages were their only remaining users. `.advanced-nutrient-totals` rules that
had shared a selector list with `.recent-card-chips` were kept, with only the
dead `.recent-card-chips` half of each selector removed. `.CircularProgressbar`
token overrides were left in place because `AcuteScoreProgressbar.tsx` still
exists (its deletion is a recorded P2).

## 14. Changed test files

| File | Change |
|---|---|
| `frontend/src/pages/meal/Meals.journal.test.tsx` | New — History folio contract and negative controls |
| `frontend/src/components/PreviousMealEntryCard.test.tsx` | New — wrapper semantics, hardwired route, accessible name |
| `frontend/cypress/e2e/j6-history-picker.cy.ts` | New — both folios, both appearances, both viewports, evidence |
| `frontend/src/utils/journalPresentation.test.ts` | Additive — `getPreviousMealMetaLine` cases only |
| `frontend/src/pages/meal/PreviousMealPicker.test.tsx` | Retired wording assertion updated to the new sealed copy; new back-control, empty-state, and no-score assertions. All existing reuse guards unchanged |
| `frontend/src/pages/meal/Meals.reuse.test.tsx` | **Not modified** — it passed unchanged |

`frontend/cypress/e2e/j5-saved-result.cy.ts` and `acute-score.cy.ts` were **not
modified**. Their "until J6 retires it" comments now describe history, but their
assertions are `.result-page`-scoped, still correct, and still passing; changing
them was unnecessary and would have been out of scope.

## 15. Protected-file audit

`git diff` against the base reports **no change** to any protected path:
`persistentMealStore.ts`, `currentMealStore.ts`, `fiiTrustBoundary.ts`,
`safetyCopy.ts`, `acuteScoreDisplay.ts`, `insulinImpactPresentation.ts`,
`utils.ts`, `api/`, `App.tsx`, `TypographicPlate.tsx`,
`AcuteScoreProgressbar.tsx`, `SavedMealDetail.tsx`, `ResultHero.tsx`,
`EvidenceRows.tsx`, `LogMealChooser.tsx`, `logMealOptions.ts`, all backend, all
Rust, all Android source and configuration, and all CI configuration.

`frontend/src/components/JournalEntryCard.test.tsx` is **byte-identical to
base** — verified by blob hash, not by inspection:

```
base blob: d920f260c13ad1ec8c48d52cf94240d367778dbd
worktree : d920f260c13ad1ec8c48d52cf94240d367778dbd
```

It passed unmodified, which is what makes it a valid negative control for the
`JournalEntryCard` extraction.

## 16. Two defects the implementation found and fixed

Both were found in my own J6 work, not in existing code, and both were fixed
inside the allowed files.

**Mislabelled evidence.** Two captures were first taken as oversized element
screenshots. Cypress produces those by scrolling and stitching, and against
Ionic's fixed inner scroll container the result contained a duplicated day
heading and a tab bar baked into the middle of the image — a file that did not
show what its name claimed. They were re-captured as real viewport screenshots
with a dataset and scroll position chosen so the named subject genuinely fits,
and the spec now asserts that fit (all three day labels inside the scroll
viewport) instead of assuming it.

**Back arrow missing from the ink capture.** The ink picker capture appeared to
lack the back arrow. A computed-style test passed, so the styling was not the
cause; pixel sampling of the two PNGs settled it — 116 arrow pixels in paper,
**0** in ink, with the ink region exactly equal to the background. The cause is
that `ion-icon` sizes its host before fetching the glyph SVG, so the capture
raced first paint. The spec now waits for the glyph itself before capturing, and
both appearances were re-verified at 116 arrow pixels each. A contrast assertion
was also added so a genuinely invisible arrow would fail rather than pass.

## 17. Validation results

All commands were run from `work/insight-j6-history/frontend`. Node v26.5.0,
npm 11.17.0, Cypress 13.17.0, Chrome 150.0.7871.182.

| Gate | Command | Result |
|---|---|---|
| Focused unit | `npm run test.unit -- --run <6 J6 files>` | PASS — 48/48 |
| Full unit | `NODE_OPTIONS='--no-experimental-webstorage' npm run test.unit -- --run` | PASS — 567 tests, 49 files |
| TypeScript | `npx tsc --noEmit` | PASS — exit 0 |
| ESLint | `npm run lint` | PASS — exit 0 |
| Build | `npm run build` | PASS — built in 14.42s |
| Full Cypress | `cypress run --browser chrome --headed` | PASS — 117/117, 14 specs |
| Whitespace | `git diff --check` | PASS — exit 0 |

`j6-history-picker.cy.ts` contributes 22 tests. The J5 spec passes 21/21
alongside it.

**One diagnosis worth recording.** The first full Cypress run used the default
headless Electron browser and reported failures in both `j5-saved-result.cy.ts`
(6) and `j6-history-picker.cy.ts` (1). Rather than assume the J5 failures were
mine, I ran the J5 spec against the **untouched base worktree** on a separate
port: it failed there identically, with the same
`cy.screenshot() only works with a screenshot area with a height greater than
zero` error. That is a pre-existing headless-Electron limitation, not a J6
regression — consistent with the repository's existing note that exact captures
are headed-Chrome-only. Everything reported above was then run in Chrome, where
all 117 tests pass. The single genuine J6 failure was mine: two non-retrying
geometry measurements taken before Ionic finished laying the page out, now
written as retrying assertions.

## 18. Cypress server provenance

- Dedicated port **5206**, proven free before starting.
- Server started from the J6 worktree; **PID 32688**, command
  `node .../work/insight-j6-history/frontend/node_modules/.bin/../vite/bin/vite.js --port 5206 --strictPort`.
- Branch identity verified before running: the served `Meals.tsx` contained
  `Meal journal` and the J6 explainer and did **not** contain
  `AcuteScoreProgressbar`.
- No pre-existing server on 5173 was used. The temporary baseline server used
  for the diagnosis in §17 ran on port 5207 from the main worktree and was
  stopped immediately after.
- Cypress screenshots, downloads and videos were routed outside the repository
  for every run. Only the fifteen intentionally retained captures were copied
  into the report tree.
- Both servers were stopped after the run; ports 5206 and 5207 verified clear.

## 19. Browser evidence

Fifteen captures in `evidence/browser/`, hashed and described in
`evidence/EVIDENCE-LEDGER.md`. Every file was opened and visually inspected
before retention; two were rejected and re-captured (§16). No failed,
transitional, blank, or mislabelled capture was kept.

## 20. Evidence privacy

Synthetic meals only. The only image content is an inline SVG data URI drawn by
the spec. No real health data, no real meal photograph, no personal
information, no device identifiers, no notifications, no credentials. The
changed tree was scanned for absolute user paths, `%20`, ADB serials, carrier
and Health Connect identifiers, keys, tokens, `.env` files, databases, logs,
APKs, Cypress downloads and videos, temporary browser profiles, temporary
scripts, `node_modules`, and Gradle output — **no hits**. All changed text
files are UTF-8, BOM-free, free of U+FEFF, C1 controls and replacement
characters, and end with exactly one trailing newline.

## 21. APK identity

> **Superseded by §25.** Independent device QA rejected the landscape History
> cell built from this APK. Use the §25 hash for any further QA.

| Field | Value |
|---|---|
| Path | `frontend/android/app/build/outputs/apk/debug/app-debug.apk` |
| SHA-256 | `3808D4A66030F88FCE23ADED1A7ECFEFCFB4868A039ACF82FA539C8D495F5716` |
| Bytes | 8,580,898 |
| Package | `io.ionic.starter` (starter identity; replacement is issue #96, a recorded P2) |
| Version name | `1.0` |
| Version code | `1` |
| Built | 2026-07-27 01:44:18 local |

Built with `npx cap sync android` followed by `gradlew.bat assembleDebug`
(BUILD SUCCESSFUL, 247 tasks). The sync rewrote
`frontend/android/app/capacitor.build.gradle` and
`frontend/android/capacitor.settings.gradle` with **line-ending changes only** —
confirmed by a whitespace-insensitive diff showing no content change — so both
were restored. The Android tree is clean. The APK is **not** staged, committed,
or placed in the change tree; the independent reviewer should use the exact
hash above for Samsung QA.

## 22. Honest limitations

- **No independent engineering review has happened.** This report is the
  implementer's own account.
- **No physical-device QA has happened.** No Samsung SM-M356B was attached, no
  APK was installed, and no device claim of any kind is made here. Browser
  evidence cannot stand in for it, and the J5 slice is the precedent for why.
- **No final Fable review has happened.**
- **Nothing is staged, committed, pushed, tagged, merged, or opened as a pull
  request.** The branch is zero commits ahead of base.
- J6 is **not** merge-ready.

## 23. Deferred P2 items

Not absorbed by J6:

- app-wide Ionic alert chrome;
- transparent status-bar scroll paint;
- unresolved empty `FII:` copy (#47 residue);
- Settings redesign slice;
- J9 app-wide focus and motion pass (runtime focus traversal across routes
  belongs there; J6 asserts only that its own focus rings are declared);
- J7 comparative scale;
- Campaign B2 unsaved estimate;
- permanent Android package identity (#96);
- photo persistence;
- deletion of the now-unused `AcuteScoreProgressbar.tsx`, its test, and the
  retired `getAcuteScoreCaption` helper — dead after J6, but removal is cleanup,
  not J6;
- the `.CircularProgressbar` token overrides in `app.css`, intentionally
  retained while that component still exists.

## 24. Next disposition

Superseded by §25. The current disposition is at the end of that section.

## 25. Landscape defect repair (2026-07-27, post-device-QA)

Independent device QA on a Pixel 8 API 36 emulator (Android font scale 1.3,
Ink, History) accepted portrait and rejected landscape: after rotation the
painted application occupied only part of the 2400 × 1080 display and the rest
stayed unpainted. The rejected screenshot was not retained. This section
records the diagnosis and the repair.

### 25.1 Which layer was partial-width

Measured on the same emulator against the exact §21 APK
(`3808D4A6…`, confirmed byte-identical to the installed `base.apk`):

| Layer | Portrait | Landscape | Partial? |
|---|---|---|---|
| Android window / `mAppBounds` | `[0,0][1080,2400]` | `[0,0][2400,1080]` | no |
| WebView CSS viewport | 412 × 915 | 915 × 412 | no |
| `document.body` | x 0, w 412.2 | x 0, w 915 | no |
| `ion-app` | x 0, w 412.2 | **x 177.5, w 560** | **yes** |
| active `ion-page` | x 0, w 412.2 | x 177.5, w 560 | inherited |
| active `ion-content` | x 0, w 412.2 | x 177.5, w 560 | inherited |

`(min-width: 768px)` matched `false` in portrait and **`true`** in landscape.
The native window and the WebView both filled the display; only the CSS shell
collapsed. **This was not an Android or manifest defect**, so no Android source
or manifest file was touched.

### 25.2 Root cause

The J1 shared-foundation rule in `frontend/src/theme/app.css`:

```css
/* Centered demo frame on desktop; mobile-first full-bleed below 768px. */
@media (min-width: 768px) {
	ion-app { max-width: 560px; margin: 0 auto; box-shadow: var(--shadow-frame); }
}
```

The 768px breakpoint was written as a proxy for "desktop". A Pixel 8 in
landscape is **915 CSS px** wide (2400 device px ÷ 2.625 dppx), so the phone
itself crossed it. Computed `ion-app` in landscape was
`max-width: 560px; margin-left: 177.524px; margin-right: 177.524px;
box-shadow: rgb(46,49,54) 0 0 0 1px, rgba(0,0,0,.5) 0 18px 48px` — the demo
frame, drawn on a real device. The flanks were not "blank black" by accident:
`html`/`body` carry `background: var(--paper)`, which in Ink is
`rgb(20, 22, 25)`.

Constitution §2.3 says *"Single-column layout only; content max-width 560 px
centred on wide/desktop."* That is a **content** measure. J1 applied it to the
whole application canvas.

### 25.3 Repair

One rule in `frontend/src/theme/app.css` replaces the old one:

```css
@media (min-width: 768px) {
	ion-content::part(scroll) {
		max-width: 560px;
		margin-inline: auto;
		--ion-safe-area-left: 0px;
		--ion-safe-area-right: 0px;
	}
}
```

- The shell fills its window at every width and on every platform: `ion-app`,
  the router outlet, the header and the tab dock span the whole canvas, so the
  paper/ink background paints edge to edge.
- The 560px measure moves to the scrolling content layer, so **every page keeps
  the content width it already had at ≥768px** — the change is measure-
  preserving, not a re-layout. Below 768px nothing matches, so portrait, both
  browser evidence viewports (390×844, 320×700) and every existing Cypress
  assertion are untouched.
- `ion-content`'s `background` part still spans the full canvas, so the
  appearance covers the window rather than the column.
- The horizontal safe-area insets are zeroed *inside* the centred column. A
  rotated Pixel 8 reports a 50px left inset against an 18px gutter; inside a
  column whose margin is already ≥ (768 − 560) / 2 = 104px a side there is no
  display edge to clear, and keeping the inset pushed the column 16px off
  centre. Vertical insets are untouched, and `.result-dock` is a sibling of
  `ion-content`, so it keeps the real insets for the edges it does touch.

This is shared-shell correct rather than a History workaround: it is one rule
on the app-wide shell, it names no route, no page, no orientation and no device
dimension, it adds no JavaScript and no resize listener, and it changes no
Android orientation policy. `--shadow-frame` is left defined in `tokens.css`
and is now unused; removing a token is cleanup, not this repair.

### 25.4 Regression test

`frontend/cypress/e2e/j6-history-picker.cy.ts` gains one describe block,
`J6 History fills the canvas on a landscape phone`, run at **915 × 412** in
**both appearances** with the long synthetic name at 133% root text. It asserts
the breakpoint really matches, then: the shell spans the viewport; the content
region is not boxed to half the display; the appearance background covers the
full width; the reading column stays ≤ 560px and centred; a 50px device inset
does not push the column off centre; every entry shares one column edge and
width; the long name wraps to more than one line without clipping; the tab
chrome spans the canvas and starts below the content; no horizontal document
overflow; and the last entry still clears the tab bar.

Both halves were negative-controlled by temporarily reintroducing the defect:

| Reintroduced | Result |
|---|---|
| `ion-app { max-width: 560px; margin: 0 auto }` | both cells fail — *"shell starts at the left edge: expected 177.5 to be close to 0"* (the exact device number) |
| removing the two safe-area zeroing declarations | both cells fail — *"a device inset does not push the reading column off centre: expected 473.5 to be close to 457.5"* (the exact device offset) |

In both controls the other 22 tests passed. `app.css` was restored by SHA-256
after each control.

### 25.5 Validation

> **This table is not trustworthy as written — see §26.** The unit-suite row
> was produced against an earlier form of the repair and was never re-run
> against the CSS this section actually ships. Terra's closeout found that CSS
> failed two startup-policy tests. §26.5 carries the re-run results.

Run from `frontend/`:

| Check | Result |
|---|---|
| `npx eslint src cypress` | clean |
| `npm run lint` | 1 error, in the gitignored Gradle output `android/app/build/intermediates/assets/debug/mergeDebugAssets/native-bridge.js` (Capacitor's own bundled file, pre-existing, absent from a fresh checkout and from CI) |
| `npx tsc --noEmit` | exit 0 |
| `npm run test.unit -- --run` | **567 passed / 567**, 49 files (with `NODE_OPTIONS=--no-experimental-webstorage`; without it this machine's Node 26 global `localStorage` breaks 137 unrelated tests — environmental, CI pins Node 22) |
| `npm run build` | built, only the pre-existing chunk-size warning |
| `j6-history-picker.cy.ts` (headed Chrome) | **24 passed / 24** |
| `j5-saved-result.cy.ts` (headed Chrome) | **21 passed / 21** |
| `home-journal`, `j4-confirm`, `j3-log-meal-camera`, `typography-108` | **33 passed / 33** |
| `git diff --check` | clean |

### 25.6 Repaired APK identity

> **Superseded by §26.6.** This APK carries the CSS that failed startup policy.
> It is not current and must not be used for QA.

| Field | Value |
|---|---|
| Path | `frontend/android/app/build/outputs/apk/debug/app-debug.apk` |
| SHA-256 | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` |
| Bytes | 8,624,760 |
| Package | `io.ionic.starter` (starter identity; replacement is issue #96, a recorded P2) |
| Version name | `1.0` |
| Version code | `1` |
| minSdk / targetSdk | 23 / 35 |
| Built | 2026-07-27, `npx cap sync android` then `gradlew assembleDebug` (BUILD SUCCESSFUL, 247 tasks) |

The APK pulled back off the emulator after installation hashes identically, so
the device below ran exactly this build. The APK is not staged or committed.

### 25.7 Device self-verification

Pixel 8 API 36 emulator, 1080 × 2400 @ 420dpi, font scale 1.3, Ink, History,
the synthetic J6 fixture (five meals, one 120-character name). Root font size
measured 20.8px, confirming the 1.3 scale reached the WebView.

| | Portrait | Landscape |
|---|---|---|
| Android window | `[0,0][1080,2400]` | `[0,0][2400,1080]` |
| CSS viewport | 412 × 915 | 915 × 412 |
| `(min-width: 768px)` | false | true |
| `ion-app` | x 0, w 412.2 | **x 0, w 915** |
| header / tab bar | w 412.2 / 412.2 | **w 915 / 915** |
| `ion-content` background part | w 412.2 | **w 915** |
| reading column | w 412.2, gutters 18/18 | w 560 centred, gutters 18/18 |
| column centre vs viewport centre | +0.1px | **0.0px** |
| entry cards | x 18, w 376.2 (all five) | x 195.5, w 524 (all five) |
| horizontal overflow | none (412 = 412) | none (915 = 915) |
| tab chrome overlap | none | none (content bottom 317.4 = tab top 317.4) |

Landmarks in landscape: toolbar `History`, folio `Meal journal`, day breaks
`Today` / `Yesterday` / `Thursday, July 23` / `Saturday, July 18`, and the long
synthetic entry reachable by scroll — it wraps to 4 lines, is not clipped, and
stays inside the column. Text scan of the rendered page found **no** `kcal`, no
calorie wording, no `Use as new draft`, no edit or reuse wording, and zero
`.CircularProgressbar` or folio `svg` nodes. Ink contrast reads correctly.
Rotating back to portrait recovered the original layout exactly, with the shell
full-bleed and the reading column back to the plain 18px gutters.

Retained device evidence, `evidence/emulator/`:

| File | SHA-256 | Bytes | Dimensions |
|---|---|---|---|
| `pixel8-api36-j6-history-ink-landscape-defect.png` | `C8453FA5EB66B85D03BF1047DB612BD2FFDA3BE6713F4D01A82544EDAB1B6808` | 98,858 | 2400x1080 |
| `pixel8-api36-j6-history-ink-landscape-repaired.png` | `F699C222F831F5E8124C730A3FD008376EDADC82B94008AFC2A6C112654D7CC4` | 91,683 | 2400x1080 |
| `pixel8-api36-j6-history-ink-landscape-repaired-long-name.png` | `0CBD299337D6EA3944DD41C86D26C080B34A58F1385DC898DDC6E9A605B625D9` | 126,560 | 2400x1080 |

The defect capture was taken from the unmodified §21 APK and reproduces what
device QA rejected. All three are synthetic-fixture only; no real health data,
meal photograph, account, contact, or unrelated application content appears.

### 25.8 Known consequence, not repaired here

At ≥768px the J5 saved-result dock (`.result-dock`, a footer sibling of
`ion-content`) now spans the full canvas while its content column is capped, so
its primary button stretches in landscape. Before this repair the whole J5 page
was boxed to 560px there, i.e. it carried the same half-screen defect, and no
accepted J5 evidence exists at any viewport ≥768px — every J5 capture and
assertion is at 390×844 or 320×700. Extending the measure to the dock is a
one-line change, but it is a J5 presentation decision at a viewport J5 has
never been accepted at, so it is reported rather than taken.

### 25.9 Honest limitations of this repair

- This is implementation self-verification on an emulator. It does **not**
  replace the independent acceptance cell, and no Samsung SM-M356B was used.
- Only the failed History Ink landscape cell was exercised. The rest of the J6
  device matrix was not run.
- No independent engineering review of this diff has happened.
- Nothing is staged, committed, pushed, tagged, merged, or opened as a pull
  request. The branch remains zero commits ahead of base.
- J6 is still **not** merge-ready.

### 25.10 Next disposition

Superseded by §26.10.

## 26. Bounded correction: startup-policy regression (2026-07-28)

### 26.1 Terra's finding

Terra's closeout ran the full unit suite against the §25 repair and found it
red: **48/49 files, 565/567 tests**, with two failures in
`src/startupPolicy.test.ts`:

| Test | Assertion |
|---|---|
| `abolished startup mechanisms stay removed` → *has no hardcoded 50px body padding and no inset-padding-top class anywhere* | `expect(source).not.toMatch(/(?<!\d)50px/)` — `app.css:26` |
| `single safe-area mapping with browser CSS-env fallback` → *never writes `--ion-safe-area-*` outside variables.css* | `expect(source).not.toMatch(/--ion-safe-area-[a-z]+\s*:/)` — `app.css:64` |

Both reproduced exactly before any edit.

**How this reached closeout is my error, not a tooling gap.** §25.5 reported
`567 passed / 567`. That run was real, but it was made against the *first*
form of the repair (`padding-inline: 18px` in the shared block). When that form
lost the cascade I changed the mechanism to `--ion-safe-area-*` overrides and
re-ran only ESLint, TypeScript and Cypress — never the unit suite again. The
table therefore reported a result the shipped CSS had never been tested
against. `startupPolicy.test.ts` did its job; I stopped asking it.

### 26.2 Root cause

Two prohibited patterns, both introduced by §25.3:

1. **The literal.** The explanatory comment read *"the left inset is 50px
   against an 18px gutter"*. The guard forbids a standalone `50px` anywhere in
   the protected sources — it is the fingerprint of the abolished hardcoded
   body padding from issue #107. The lookbehind `(?<!\d)` deliberately spares
   `350px`, so only the bare literal tripped it.

2. **The second safe-area source.** The rule declared
   `--ion-safe-area-left/right: 0px` on `ion-content::part(scroll)`.
   `variables.css` is contractually the *only* place those may be written; a
   component that redefines them is precisely the drift issue #107 abolished,
   even when scoped to one shadow part.

**Why I reached for the variables at all — the cascade.** The J6 folio gutter
lives at `app.css:2293`:

```css
.journal-folio-content::part(scroll) {
	padding-inline: max(18px, var(--ion-safe-area-left)) max(18px, var(--ion-safe-area-right));
}
```

My wide-screen block sits at `app.css:80`, far earlier. My first attempt put
`.journal-folio-content::part(scroll) { padding-inline: 18px }` inside it —
**identical specificity, earlier in the file, so the later rule won** and the
gutter stayed inset-derived. Rather than fix the specificity I redefined the
variables the later rule consumed. That worked visually and broke the contract.

### 26.3 The correction

`frontend/src/theme/app.css` — the only file changed:

```css
@media (min-width: 768px) {
	ion-content::part(scroll) {
		max-width: 560px;
		margin-inline: auto;
	}

	ion-content.journal-folio-content::part(scroll) {
		padding-inline: 18px;
	}
}
```

- **No `--ion-safe-area-*` anywhere in `app.css`** — verified by grep, and by
  the contract test itself. `variables.css` is untouched and remains the single
  source; the file is byte-identical to `HEAD`.
- **`ion-content.journal-folio-content`** (element + class, `0-1-1`) beats the
  later bare-class rule (`0-1-0`) regardless of source order, so the cascade is
  won on specificity rather than on position. No `!important`.
- **The comment no longer contains the prohibited literal.** The asymmetric
  cutout is described qualitatively — *"its cutout on the leading edge only,
  and that one-sided inset measures several times the reading gutter"* — which
  is the fact a future reader needs without re-planting the fingerprint.
- Both J6 folios (History and the Picker share `.journal-folio-content`) are
  covered by one rule. No route-specific or orientation-specific selector, no
  JavaScript, no device dimension, no Android or manifest change.

**Why safe-area ownership stays central and correct.** Only the *padding of the
centred reading column* is stated here. Every element that genuinely touches a
display edge still reads the real variables from `variables.css`: the toolbar
and its back control (measured at x=54 in landscape — sitting exactly clear of
the cutout), the tab dock, and `.result-dock`. Nothing consumes a redefined
inset, because nothing is redefined.

**Why the shell and the measure remain correct.** The `ion-app` cap is still
gone, so the canvas, background, header, router outlet and tab dock still fill
the window; the 560px measure still lives on the scroll part. §25's
architecture is unchanged — only the mechanism for the folio's gutter changed.

**`startupPolicy.test.ts` was not modified.** `git status --porcelain` and
`git diff` are both empty for that path.

### 26.4 Live prototype before the source edit

Prototyped against the running WebView on the flagged APK (`EBAD4E38…`) before
touching any file, Pixel 8 API 36 / Ink / font 1.3 / landscape:

| Injected | `padding-inline` | Column centre offset |
|---|---|---|
| nothing (flagged APK as installed) | 18px / 18px | 0 |
| removal only (vars → `inherit`) | **50px / 18px** | **+16px** |
| removal + `ion-content.journal-folio-content::part(scroll)` | 18px / 18px | **0** |

The middle row is the proof that the removal alone regresses and that the
correction is doing real work. The real root inset measured left 50px / right
0px — asymmetric, which is why the column shifted by half the difference.

### 26.5 Validation (re-run against the shipped CSS)

Run from `frontend/`, `NODE_OPTIONS=--no-experimental-webstorage`:

| Check | Command | Result |
|---|---|---|
| Focused gate | `npm run test.unit -- --run src/startupPolicy.test.ts` | **18 passed / 18** |
| Full unit suite | `npm run test.unit -- --run` | **567 passed / 567**, 49 files |
| TypeScript | `npx tsc --noEmit` | exit 0 |
| ESLint | `npx eslint src cypress` | exit 0, clean |
| Build | `npm run build` | built; only the pre-existing chunk-size warning |
| J6 | `npx cypress run --headed --browser chrome --spec cypress/e2e/j6-history-picker.cy.ts` | **24 passed / 24** |
| J5 | `… --spec cypress/e2e/j5-saved-result.cy.ts` | **21 passed / 21** |
| Global shell | `… --spec home-journal,j3-log-meal-camera,j4-confirm,typography-108` | **33 passed / 33** (14 + 10 + 4 + 5) |
| Whitespace | `git diff --check` | exit 0 |

### 26.6 Corrected APK identity — current

| Field | Value |
|---|---|
| Path | `frontend/android/app/build/outputs/apk/debug/app-debug.apk` |
| SHA-256 | `A80D4403059F6761CBF670F8E3E6592D3B7701CEF8E8D8AFD5136271356C986F` |
| Bytes | 8,582,819 |
| Package | `io.ionic.starter` |
| Version name / code | `1.0` / `1` |
| minSdk / targetSdk | 23 / 35 |
| Built | 2026-07-28, `npm run build` → `npx cap sync android` → `gradlew assembleDebug` (BUILD SUCCESSFUL, 247 tasks) |

Installed with `adb install -r`, then pulled back off the device and re-hashed:
`A80D4403…` — **installed binary matches the local APK exactly**.

**`EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` is
superseded and must not be used for QA.** It carries the CSS that fails
startup policy.

### 26.7 Device self-verification — affected cells only

Pixel 8 API 36 emulator, 1080 × 2400 @ 420dpi, font scale 1.3 (root font
measured 20.8px), Ink, synthetic J6 fixture (5 meals, one 120-character name),
corrected APK `A80D4403…`. Native window `[0,0][2400,1080]` landscape /
`[0,0][1080,2400]` portrait throughout.

| | History landscape | Picker landscape | Both, portrait recovery |
|---|---|---|---|
| CSS viewport | 915 × 412 | 915 × 412 | 412 × 915 |
| `(min-width: 768px)` | true | true | false |
| `ion-app` | x 0, w 915 | x 0, w 915 | x 0, w 412.2 |
| header / tab bar | 915 / 915 | 915 / 915 | 412.2 / 412.2 |
| appearance background part | w 915 | w 915 | w 412.2 |
| reading column | 560 centred | 560 centred | 412.2 full-bleed |
| gutters | **18 / 18** | **18 / 18** | 18 / 18 |
| centre offset | **0.0px** | **0.0px** | +0.1px |
| entry cards | x 195.5, w 524 (all 5) | x 195.5, w 524 (all 5) | x 18, w 376.2 (all 5) |
| horizontal overflow | none (915 = 915) | none (915 = 915) | none (412 = 412) |
| tab overlap | none (317.4 = 317.4) | none | none |

History landmarks: toolbar `History`, folio `Meal journal`, day breaks
`Yesterday` / `Sunday, July 26` / `Thursday, July 23` / `Saturday, July 18`;
the long synthetic name wraps to 4 lines, unclipped, inside the column. Text
scan found no `kcal`, no calorie wording, no reuse/edit wording, zero score
rings. Picker landmarks: toolbar `Choose a previous meal`, folio `Log a
previous meal again`, back control painted (glyph present, x=54 — clear of the
cutout, since the toolbar still honours the real inset), `Use as new draft` on
all 5 entries, every action line inside the column. Ink contrast readable in
both.

Retained evidence, `evidence/emulator/`:

| File | SHA-256 | Bytes | Dimensions |
|---|---|---|---|
| `pixel8-api36-j6-history-ink-landscape-safearea-corrected.png` | `7CC5931CEE44DFD25EFDCEC4D48D7D80C6FB575C5A8CD1D6F36D9A3976B12870` | 132,697 | 2400x1080 |
| `pixel8-api36-j6-picker-ink-landscape-safearea-corrected.png` | `DA17587C26A5488834243E2A9124EFEC10D686048E405863C0F0E63F15EEB3C8` | 132,160 | 2400x1080 |

Synthetic fixture only; no real health data, meal photograph, account, contact
or unrelated application content.

### 26.8 Regression coverage review

The §25.4 landscape block still gates every property it was written for, and
still gates *this* implementation: removing the corrected rule fails both cells
with `a device inset does not push the reading column off centre: expected
473.5 to be close to 457.5` — the same 16px, in both Paper and Ink, with the
other 22 tests passing. It continues to cover full-width shell, full-width
appearance background, centred ≤560px column, asymmetric inset input, long-name
wrapping, tab geometry and horizontal overflow.

**No test was added, removed, weakened or retargeted.** In particular the
Cypress negative control still injects the asymmetric inset via
`documentElement.style.setProperty("--ion-safe-area-left", "50px")`. That is a
spec file simulating *device input*, not production CSS declaring a second
source — `startupPolicy.test.ts` reads only `main.tsx`, `App.tsx`,
`IonToolbarWrapper.tsx`, `variables.css`, `app.css` and `index.html`, so it
neither scans nor should scan it. Weakening it to match the source guard would
have destroyed the only assertion that catches this regression class.

### 26.9 Honest limitations

- Implementation self-verification on an emulator only. It does **not** replace
  Terra's independent acceptance, and no Samsung SM-M356B was used.
- Only the two affected landscape cells were exercised; the rest of the J6
  device matrix was not re-run.
- The §25.8 consequence is unchanged and still unrepaired: at ≥768px the J5
  dock spans the canvas while its content column is capped. Still a J5
  presentation decision at a viewport J5 has never been accepted at.
- No independent engineering review of this correction has happened.
- Nothing staged, committed, pushed, tagged, merged or opened as a PR; the
  branch remains zero commits ahead of base. J6 is still **not** merge-ready.

### 26.10 Next disposition

Superseded by the independent Terra closeout recorded below.

## Independent Terra engineering, evidence, and Pixel 8 API 36 emulator review — 2026-07-28

### Verdict

**READY FOR FINAL FABLE REVIEW.** Component Law C, the History read-only and Picker draft boundaries, and corrected full-width shell/centred 560px reading measure passed. `variables.css` remains the sole safe-area source; no scientific, API, persistence, scoring, Android, or J7 behaviour changed.

### Validation and APK

`npm run test.unit -- --run` with `NODE_OPTIONS=--no-experimental-webstorage`: 567/567 in 49 files; TypeScript, `npx eslint src cypress`, build, and `git diff --check` passed. Headed Chrome: J6 24/24, J5 21/21, bounded global shell 33/33, aggregate 78/78. Current APK: `A80D4403059F6761CBF670F8E3E6592D3B7701CEF8E8D8AFD5136271356C986F`, 8,582,819 bytes, `io.ionic.starter` 1.0/code 1; installed equality passed. `EBAD4E38…` is superseded.

### Matrix, findings, and limitation

Pixel 8 API 36 emulator—not physical Samsung—accepted true-bottom (1003 / 1002.667 / 0.333px; clearances 61.65px and 76.42px), saved-result versus editable-draft navigation, deterministic private-state test, HOT resume, and hardware Back without source mutation or writes. Only corrected History and Picker landscape cells were rerun on A80D4403; unaffected portrait/interaction evidence remains from the earlier APK. No runtime debug hook exists; private Zustand state remains unexposed. P0/P1: none. P2: J5 wide dock, appearance selector, package identity, and physical OEM qualification. Restoration: Home, portrait, automatic rotation, font 1.0, no modal/CDP/Appium/helper. Remaining gate: final Fable product and visual review.

### Next disposition

Superseded by §27.

## 27. Bounded product/visual correction: action line and empty states (2026-07-29)

### 27.1 Independent Opus Max findings

An independent Opus Max product and visual review approved the J6 architecture,
Component Law C, the product distinction, navigation semantics, the landscape
repair, the accessibility structure and the overall visual system, and found two
sealed-ruling P1 defects. Only those two were corrected. Nothing else in J6 was
redesigned, and no P2 was absorbed.

**P1-1 — the picker action line lost the CSS cascade.** The sealed ruling
requires a trailing action line at caption size in `--accent`. It shipped in
`--ink-3`, identical to the metadata line directly above it.

**P1-2 — the empty states were not centred.** The sealed ruling requires a
centred journal-voice block; both folios rendered left-aligned and top-anchored.

Both were reproduced against the running implementation before any file was
edited.

### 27.2 Reproduction, measured before the correction

Picker action line, `/meals/previous`, 390x844, headed Chrome:

| | Paper | Ink |
|---|---|---|
| action-line `color` | `rgb(107, 107, 98)` | `rgb(143, 144, 137)` |
| resolved `--accent` | `#28577e` | `#82b4dd` |
| resolved `--ink-3` | `#6b6b62` | `#8f9089` |
| metadata `color` | `rgb(107, 107, 98)` | `rgb(143, 144, 137)` |
| action vs metadata | **identical** | **identical** |
| `font-size` | 12.64px (metadata's 0.79rem) | 12.64px |
| `margin-top` | 2px | 2px |
| `font-weight` | 600 | 600 |

Both rules matched the element and both declared `color`:

```
.journal-entry-caption p { color: var(--ink-3) }   /* 0-2-0 — winner */
.journal-entry-action   { color: var(--accent) }   /* 0-1-0 — lost */
```

`font-weight` was the only one of the five J6 action-line declarations that
survived, because it is the only one `.journal-entry-caption p` does not also
declare.

Empty states, 390x844, identical on both routes:

| Property | Before |
|---|---|
| `text-align` | `start` |
| `padding` | `20px 4px 0px` |
| block rect | x 18, y 102.03, w 354 |
| folio rect | x 18, y 56, w 354, bottom 102.03 |
| `h2` | x 22, w 346, `max-width: none`, `margin: 0px` |
| `p` | x 22, w 346, `max-width: none`, `margin: 8px 0 0` |
| separation from folio | 20px |
| explainer | absent (correct) |

### 27.3 Root cause

One cause, the same class of cascade error recorded in §26.2 and fixed there for
the folio gutter. The J6 action-line rule sits **later** in `app.css` than the
accepted J2 rule but at **lower** specificity, so source order cannot rescue it:
a 0-2-0 descendant selector beats a 0-1-0 class wherever the class appears. The
J6 block was written as if proximity decided the cascade.

The empty-state defect was simply an unimplemented clause: `.journal-empty-state`
carried padding only, and the ruling's word *centered* was never expressed. The
block it replaced (`.list-empty-state`) was `text-align: center`, and the
accepted Home empty state is centred on both axes, so the deviation ran against
the ruling, the previous behaviour and the system precedent at once. It was not
declared anywhere in this report — that omission was mine.

### 27.4 The correction

`frontend/src/theme/app.css` — the only file changed. No `!important`.

```css
.journal-entry-caption p.journal-entry-action {   /* 0-3-0, beats 0-2-0 */
	margin: 6px 0 0;
	font-size: var(--type-caption);
	font-weight: 600;
	line-height: 1.45;
	color: var(--accent);
	overflow-wrap: anywhere;
}

.journal-empty-state {
	padding: 44px 4px 0;
	text-align: center;
}

.journal-empty-state h2 { margin: 0 auto;      max-width: 300px; /* … */ }
.journal-empty-state p  { margin: 10px auto 0; max-width: 300px; /* … */ }
```

The action-line rule is qualified by the caption block rather than promoted with
`!important`, so the metadata keeps its own `.journal-entry-caption p` treatment
untouched and only the one line is raised. The empty-state rule centres the empty
block only; the folio `h1` above it stays left-aligned, and populated History and
Picker content is untouched because `.journal-empty-state` renders only when the
list is empty.

### 27.5 Measured after the correction

| | Paper | Ink |
|---|---|---|
| action-line `color` | `rgb(40, 87, 126)` = `--accent` | `rgb(130, 180, 221)` = `--accent` |
| metadata `color` | `rgb(107, 107, 98)` = `--ink-3` | `rgb(143, 144, 137)` = `--ink-3` |
| action vs metadata | **distinct** | **distinct** |
| `font-size` | 12.48px = `--type-caption` 0.78rem | 12.48px |
| `margin-top` | 6px | 6px |
| `font-weight` | 600 | 600 |
| text | `Use as new draft` | `Use as new draft` |

Empty states, identical on both routes:

| Property | After |
|---|---|
| `text-align` | `center` |
| `padding` | `44px 4px 0px` |
| `h2` | x 45, w 300, `max-width: 300px`, auto margins (23px a side) |
| `p` | x 45, w 300, `max-width: 300px`, auto margins |
| headline centre offset in content | **0.0px** |
| separation from folio | **44px** (was 20px) |
| folio `h1` `text-align` | `start` — **not** centred |
| explainer | absent |

**No DOM, copy, route, store, provenance, scoring or navigation change.** The
diff is confined to `app.css` plus the J6 Cypress spec. `JournalEntryBody.tsx`,
`JournalEntryCard.tsx`, `PreviousMealEntryCard.tsx`, both page files,
`journalPresentation.ts` and every protected path are byte-identical to their
pre-correction state; Component Law C, the hardwired destinations, the sealed
copy and the safe-area/startup-policy correction from §26 are all untouched.

### 27.6 Tests added

`frontend/cypress/e2e/j6-history-picker.cy.ts` — two new helpers and two new
cells; **no existing assertion was weakened, removed or retargeted.** 24 → 26
tests.

- `assertActionLineUsesAccent()` — asserts the action colour equals the resolved
  appearance accent, differs from `--ink-3`, that the metadata still *is*
  `--ink-3`, that action and metadata are distinct, the caption font size, the
  6px separation, the weight, the exact text, and that the card still contains
  no nested interactive control. Run as its own cell in **both** appearances.
- `assertEmptyStateGeometry()` — asserts computed `text-align: center`,
  headline and copy centred within the block, a bounded `max-width` on both,
  ≥32px separation from the folio, that the folio `h1` is **not** centred, that
  the explainer stays absent, and that no card, plate, illustration or action
  appears. Wired into the existing History and Picker empty-state cells.

**One defect in my own new test, found and fixed.** The accent helper first read
`--accent` from `documentElement`. The appearance class is applied both to the
root element and to `ion-app`, by different paths, so a run could observe the
element already switched while the root had not — the ink cell failed once for
that reason. The helper now reads the tokens off the action line itself; custom
properties inherit, so it compares the element against exactly the tokens its own
`var()` resolves against. Three consecutive clean J6 runs followed.

### 27.7 Negative controls

Each fix was reintroduced as a defect and the source restored by SHA-256
afterwards (`app.css` = `3b7bd1aea7e228b3f21bef88c4c0c9d3d17df4c9e7458b15c804723b6381079d`
before and after every control).

| Reintroduced | Result |
|---|---|
| action selector reverted to bare `.journal-entry-action` | **both** action cells fail — Paper `expected 'rgb(107, 107, 98)' to equal 'rgb(40, 87, 126)'`, Ink `expected 'rgb(143, 144, 137)' to equal 'rgb(130, 180, 221)'`; other 24 pass |
| centring declarations removed from `.journal-empty-state` | **both** empty-state cells fail — `empty-state copy is centred: expected 'start' to equal 'center'`; other 24 pass |

The action control was re-run after the helper fix in §27.6 and still fails
exactly those two cells, so the corrected assertion still catches the regression.

### 27.8 Validation

Run from `frontend/`, `NODE_OPTIONS=--no-experimental-webstorage`, headed Chrome
against a dedicated Vite server on port **5208** started from this worktree and
verified to serve this branch.

| Check | Command | Result |
|---|---|---|
| Full unit suite | `npm run test.unit -- --run` | **567 passed / 567**, 49 files |
| TypeScript | `npx tsc --noEmit` | exit 0 |
| ESLint | `npx eslint src cypress` | exit 0 |
| Build | `npm run build` | built; only the pre-existing chunk-size warning |
| J6 | `--spec j6-history-picker.cy.ts` | **26 passed / 26** |
| J5 | `--spec j5-saved-result.cy.ts` | **21 passed / 21** |
| Global shell | `home-journal`, `j3-log-meal-camera`, `j4-confirm`, `typography-108` | **33 passed / 33** (14 + 10 + 4 + 5) |
| Aggregate (one run) | all six specs | **80 passed / 80** |
| Whitespace | `git diff --check` | exit 0 |

**Two flakes observed and honestly recorded.** A cold-start run failed the first
J6 cell once on a freshly started dev server and did not reproduce across four
later runs. Separately, during a negative-control run the existing
`keeps Paper and Ink structurally identical on both routes` cell failed on the
pre-existing `ion-icon` back-glyph fetch race already documented in §16; it did
not appear in any clean run. Neither is caused by this correction, and neither
was suppressed.

### 27.9 Browser evidence refreshed

Seven files were recaptured from a clean single-spec J6 run and re-inspected.
The brief named five; the two additional picker cells were refreshed because
measurement showed they materially display the corrected action line (4.28% and
10.82% of sampled pixels changed), and retaining them would have preserved
captures showing the uncorrected colour — the exact defect being fixed.

| File | New SHA-256 | Bytes | Dimensions |
|---|---|---|---|
| `history-empty-paper.png` | `6815333C9607B2F402A321A4470BE7BD85D8F46407C86EC10D76036CDDD4C9EE` | 21,044 | 390x844 |
| `picker-empty-paper.png` | `0BF1BC2F15E975769E7C03D7C91F0966C05375EFCA7C3183263BD8A376E878BE` | 29,228 | 390x844 |
| `picker-action-line-paper.png` | `808D72E62D661FA1EC0DBBDEDC3DF38C15B11184F1B3237493AB13E58542966B` | 16,037 | 339x233 |
| `picker-populated-paper-390x844.png` | `95CF4FF7A6506904E6664A778AA9838CA7C3BF66A88E0042F58D54E2A8CA650D` | 72,270 | 390x844 |
| `picker-populated-ink-390x844.png` | `30B8398C66EC3017A46B5B8AC14BAE86CCFEB83DD091D3352373F228A4AD96BF` | 71,830 | 390x844 |
| `picker-populated-paper-320x700.png` | `47D669C21358D92D19238EE8637466957AC9232DE232971E3BAF1D0D323667D2` | 58,776 | 320x700 |
| `picker-bottom-scroll-paper.png` | `14ABA3DD482156E43999FD9F34C6C5A425CE5067B9AEE0395901A257C396CC90` | 64,313 | 390x844 |

Pixel sampling of the refreshed captures confirms the accent: the Paper crop's
action line measures `#28577E` and the Ink populated capture's measures
`#82B4DD`, with the metadata lines still at `#6B6B62` and `#8F9089`.

**Files deliberately not refreshed, with reasons.** The four History populated
captures and `picker-long-name-133-paper.png` differ from their retained
versions by only 0.02–0.24% of sampled pixels — run-to-run scroll and
antialiasing variance, not content. History has no action line and no empty
state in those states, and in the long-name capture the action line sits below
the fold, so none of them displays anything this correction changed. Replacing
them would churn hashes without adding evidentiary value. The long-name
capture's **ledger wording** is corrected instead, in §27.12.

All refreshed captures use synthetic fixtures only; the sole image content is an
inline SVG data URI drawn by the spec. No real health data, meal photograph,
account, contact, notification, serial or unrelated-application content.

### 27.10 APK rebuilt — current

Production CSS changed, so `A80D4403…` is **superseded** and must not be used
for QA.

| Field | Value |
|---|---|
| Path | `frontend/android/app/build/outputs/apk/debug/app-debug.apk` |
| SHA-256 | `0B29929AAC558106B5AC28D4FF26693D5A0D6AA1A7BE434B71BB62B3C218034C` |
| Bytes | 8,584,770 |
| Package | `io.ionic.starter` |
| Version name / code | `1.0` / `1` |
| minSdk / targetSdk | 23 / 35 |
| Built | 2026-07-29, `npm run build` → `npx cap sync android` → `gradlew assembleDebug` (BUILD SUCCESSFUL, 247 tasks) |

`cap sync` again rewrote `frontend/android/app/capacitor.build.gradle` and
`frontend/android/capacitor.settings.gradle` with line-ending-only changes —
confirmed by `git diff --ignore-all-space` returning empty — and both were
restored. The Android tree is clean and the APK is not staged or committed.

Installed with `adb install -r`, then pulled back off the device and re-hashed:
`0B29929A…` — **installed binary matches the local APK exactly.**

### 27.11 Emulator re-acceptance — affected cells only

Pixel 8 API 36 emulator (`emulator-5554`, `sdk_gphone64_x86_64`), 1080x2400 @
420dpi, Android font scale 1.3 with root font measured at **20.8px**, synthetic
five-meal fixture with one 120-character name, corrected APK `0B29929A…`.
Day groups `Yesterday` / `Sunday, July 26` / `Thursday, July 23` /
`Saturday, July 18`, matching the earlier device matrix.

| | Picker Paper portrait | Picker Ink portrait | Picker Ink true bottom | Picker Ink landscape | History Ink landscape |
|---|---|---|---|---|---|
| CSS viewport | 412 x 915 | 412 x 915 | 412 x 915 | 915 x 412 | 915 x 412 |
| `(min-width: 768px)` | false | false | false | true | true |
| action-line colour | `rgb(40,87,126)` accent | `rgb(130,180,221)` accent | `rgb(130,180,221)` accent | `rgb(130,180,221)` accent | n/a — none |
| metadata colour | `rgb(107,107,98)` ink-3 | `rgb(143,144,137)` ink-3 | ink-3 | ink-3 | n/a |
| action ≠ metadata | yes | yes | yes | yes | n/a |
| `margin-top` | 6px | 6px | 6px | 6px | n/a |
| action lines | 5, exact text | 5, exact text | 5, exact text | 5, exact text | **0** |
| nested controls | 0 | 0 | 0 | 0 | 0 |
| Back glyph | painted | painted, 48x48 | painted | painted, x=54 | n/a (tab root) |
| `ion-app` / header / tab bar | 412.19 | 412.19 | 412.19 | 915.05 / 915.05 / 915.05 | 915.05 / 915.05 / 915.05 |
| reading column | 412.19 full-bleed | full-bleed | full-bleed | 560 centred, x 177.52 | 560 centred, x 177.52 |
| gutters | 18 / 18 | 18 / 18 | 18 / 18 | 18 / 18 | 18 / 18 |
| centre offset | — | +0.10px | — | **+0.02px** | **+0.02px** |
| entry cards | x 18, w 376.2 (all 5) | x 18, w 376.2 | x 18, w 376.2 | x 195.5, w 524 (all 5) | x 195.5, w 524 (all 5) |
| long name | 120 chars, 5 lines, unclipped | 5 lines, unclipped | — | 4 lines, unclipped | — |
| horizontal overflow | none (412 = 412) | none | none | none (915 = 915) | none (915 = 915) |

**True-bottom measurements were recomputed, not copied**, because the 6px action
margin changes card height (measured heights 226.8 / 354.4 / 258.7 / 226.8 /
258.7):

| Measure | Value |
|---|---|
| `scrollTop` | 1085.333 |
| `scrollHeight − clientHeight` | 1086.000 |
| residual | **0.667px** — true bottom reached |
| tab-bar top | 820.29 |
| last card bottom / clearance | 758.24 / **62.04px** |
| last action line bottom / clearance | 743.48 / **76.80px**, fully visible, in accent |

Semantic boundary re-confirmed in landscape: History shows **zero** action
lines, no `kcal`, no reuse or edit wording, zero score rings, and five
`/meals/saved/` links; the Picker shows five action lines, `kcal`, and no
`estimate` or `Data quality` text.

Retained, `evidence/emulator/`:

| File | SHA-256 | Bytes | Dimensions |
|---|---|---|---|
| `pixel8-api36-j6-picker-paper-font-1.3-long-name-action-accent-corrected.png` | `32DEBF95A168D90F00955ADA933EB66668AF68F9E834F0C4BEAB5254E1351CFA` | 263,947 | 1080x2400 |
| `pixel8-api36-j6-picker-ink-font-1.3-action-accent-corrected.png` | `EA8503ED36C839D4CE621660C552FA689E00D5B93E623929892BED68BBE24442` | 247,531 | 1080x2400 |
| `pixel8-api36-j6-picker-ink-font-1.3-true-bottom-action-accent-corrected.png` | `A13B1EB1344EEB5F46426101D8AA422795EAC8C60B37061FF65BCEE359F1E27E` | 231,843 | 1080x2400 |
| `pixel8-api36-j6-picker-ink-font-1.3-landscape-action-accent-corrected.png` | `D64695966ECCEBA96A52F8B89440CF208474B63A7ECCAADDF85B3D41B0FA8A40` | 132,670 | 2400x1080 |
| `pixel8-api36-j6-history-ink-font-1.3-landscape-action-accent-corrected.png` | `FA33899F06DF491615F8973AD4037DA57E2CEC86D435514D2E05ABA5A8601851` | 100,903 | 2400x1080 |

Not rerun, per the correction brief: History saved-result navigation,
Picker-to-draft interaction, HOT resume, hardware Back and the draft-state tests.
Those behaviours are outside the changed selectors. The hardware-Back capture
does end on the Picker, so its action lines show the pre-correction colour; it is
retained for its **navigation** claim only and reclassified accordingly in the
ledger, not as current action-line evidence.

Device restored afterwards: portrait, automatic rotation re-enabled, font scale
returned to 1.0, application force-stopped, DevTools forward removed.

### 27.12 Report and ledger claims corrected

- The evidence ledger's action-line crop row claimed the line was legible "in
  the accent colour". That was measurably false of the file it described; it now
  describes the newly proven accent result against the refreshed capture.
- The ledger's long-name browser description claimed the action line stayed
  legible below the wrapped name. In that capture the action line is below the
  fold; the description no longer claims it, and points at the device long-name
  cell, which does prove it.
- Hashes, bytes and dimensions updated for the seven refreshed browser files.
- Emulator classifications and APK provenance updated: the five new captures are
  the current-APK acceptance for their cells, and the picker captures they
  replace are reclassified as superseded.

All historical error admissions and the independent Terra sections are preserved
unchanged.

### 27.13 Honest limitations

- Emulator only. **No physical Samsung SM-M356B was used**, and no OEM
  qualification is claimed.
- This correction is implementer self-verification; the independent re-review has
  not happened.
- The §25.8 consequence is unchanged and still unrepaired: at ≥768px the J5 dock
  spans the canvas while its content column is capped. The same is true of the
  Home and confirmation docks. Still a P2 owned by whichever slice first accepts
  a ≥768px viewport.
- Wide-viewport automated coverage still exists only for the two J6 routes.
- P2 items from the independent review were **not** absorbed: the orphaned
  `.recent-card-name` selector-list remnant, the now-unused `--shadow-frame`
  token, and the doubled blank line left by the earlier CSS removals.
- Nothing staged, committed, pushed, tagged, merged or opened as a PR; the branch
  remains zero commits ahead of base.

### 27.14 Next disposition

**READY FOR NARROW OPUS MAX RE-REVIEW** of the two corrected defects.
