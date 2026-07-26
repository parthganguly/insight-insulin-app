# Annotated Journal J5 — saved result chassis implementation report

**J5 ENGINEERING, SCIENTIFIC-BOUNDARY REVIEW, CORRECTED-APK SAMSUNG QA, AND FINAL FABLE REVIEW COMPLETE.**

The implementation and its evidence remained uncommitted throughout
engineering, independent review, physical-device QA, and final Fable review;
nothing was staged, committed, pushed, tagged, merged, or opened as a pull
request while any gate was still open. Packaging began only after every
required gate passed.

Read this report in stages. Sections up to "Unresolved risks" describe the
original J5 implementation; the Terra review and device follow-up sections
record the blocking defect found on hardware; the final section records the
bounded correction made in response. Earlier statements that no device testing
had occurred are historical and true of the stage they describe.

The correction was initially blocked from hardware verification when the
Samsung SM-M356B disconnected from ADB. That statement remains historically
true for the correction stage. A later independent recovery pass installed
and byte-verified the corrected APK, ran the bounded physical-device matrix,
and passed the gate. See "Final independent corrected-APK physical-device
re-verification".

- Issue: [#120](https://github.com/parthganguly/insight-insulin-app/issues/120)
- Roadmap: #111 (remains open; J5 is one slice of it)
- Branch: `opus/annotated-journal-j5-result`
- Worktree: `work/insight-j5-result`
- Base: `b73766d27fc6fa43f4854b8ffa0671a0d799fed8` (verified equal to `origin/main` at start)
- Authority: sealed Fable J5 ruling of 2026-07-26; design constitution v2.0 §6.7-interim / §6.8–6.9

J5 is a presentation-only change to the **current Ionic React/Capacitor
implementation**. It is not a target-native component. It claims no scientific
validation and changes no scientific behaviour.

## Scope and behaviour

The retained journey is unchanged:

`Confirm → Calculate & save → Saved result`

J5 changes the saved-result route's presentation only. It does not change
scoring, thresholds, formulas, FII resolution, backend responses, API
contracts, payloads, stores, persistence, navigation semantics, correction law,
meal-save timing, delete integrity, telemetry, consent, authentication, image
retention, scientific claims, or source/provenance semantics. No unsaved-estimate
(B2) path and no comparative scale, percentile, ranking or verdict band (J7) was
introduced in any form. Issue #97 was not touched.

## The share-of-load finding

The roadmap asked for evidence rows with "share-of-load arithmetic from stored
values only". **The stored meal cannot support that**, and Fable's ruling
resolved it before implementation:

- `frontend/src/api/api.ts` parses per-item `insulin_load` from the backend
  response (`MealModelingItemResponse.insulin_load`, normalised at line 199);
- `mapMealModelingResponseToMeal` builds each `MealItem` **without** it;
- `frontend/src/types/MealItem.ts` has no load field at all;
- `persistentMealStore.syncMealsFromBackend` rehydrates through that same mapper.

So the meal this screen reads carries only a whole-meal `insulin_load_total`.
Recomputing per-item load in the client would reimplement a protected
scientific formula; retaining it would require a payload/type/store change.
Both are outside J5.

The implemented alternative is honest and says so on screen: bars show each
item's share of the **meal's calories**, with the visible sentence

> Bars compare each item's calories within this meal — not its share of the score.

No percentage is printed anywhere in the evidence section, because a figure
like "64%" beside a food name would read as its share of the score.

## Implemented page anatomy

Hero (photo or typographic plate, scrim, back) → sheet:

1. `Saved to history` pill (sealed `SAVED_MEAL_STATUS`)
2. serif meal name (`h1`, the page heading)
3. composition meta line — `N items · ≈ kcal · g carbs`
4. logged meta line — `Logged <date, year> · <time>`
5. verdict title (`h2`) — existing `insulinImpactPresentation.title`, verbatim
6. verdict support — its `description`, verbatim
7. quality sentence — `Data quality: <label>.` + sealed description
8. unknown-items and rough-estimate notices, always visible, never in a disclosure
9. score/reference block — sealed `getAcuteScoreDetailLine` in mid-size tabular
   numerals + `ACUTE_SCORE_SCALE_EXPLAINER` caption
   (insufficient-data results replace this with the "What we could read" note)
10. evidence — "What drove it": backend drivers line + per-item rows with
    portion, `≈ kcal`, provenance why-line, and a decorative calorie-share bar
11. footnotes disclosure — "What this doesn't mean", closed by default,
    containing `MEAL_SCORE_DISCLAIMER` then `APP_DISCLAIMER`
12. advanced details disclosure — closed by default, hairline-separated
    articles, no nested cards

Fixed dock: **Check another meal** (primary) / Done · Delete.

Removed from this page: the circular acute-score meter, the coloured nutrient
icon chips, the driver pill chips, the seven boxed `IonCard` modules, the
nested advanced-detail cards, and the toolbar title. `AcuteScoreProgressbar`
and `NutrimentComponent` themselves are untouched — History and the previous-meal
picker still use them until J6.

## Declared intentional presentation changes

These four are deliberate, ruled by Fable, and pinned by tests:

1. **Insufficient-data nominal reading.** Previously the score line was hidden
   entirely for low/unknown-quality meals. Constitution §6.9 and the J5 slice
   spec direct a de-emphasised "What we could read" note instead. It renders
   **only when a finite score exists**; when `acute_score` is absent, no number
   appears anywhere. `insulinImpactPresentation.ts` was not modified — the
   change is in this page's rendering alone.
2. **Disclaimers into disclosure.** The two sealed disclaimers moved from an
   always-open card into the single closed-by-default footnote disclosure
   (constitution §10: full sealed disclaimers in exactly one footnote
   disclosure). Both strings remain byte-identical and one tap away.
3. **Rough-estimate notice rendered once.** Previously one copy per rough item;
   the constitution forbids stacking a disclaimer on one screen. Per-item
   provenance remains on every evidence row and in Advanced details.
4. **Delete label.** Visible text is now `Delete`; the accessible name remains
   `Delete saved meal`. Destructive confirmation, backend-first deletion and
   failure handling are unchanged.

## Scope expansion beyond the enumerated allowed files

Fable's allowed list named `SavedMealDetail.test.tsx`, the new helper/component
tests, and selector updates in `saved-detail`, `acute-score`, `manual-meal` and
`campaign-a-layout` Cypress specs. Three further **test-only** files had to
follow the structure, because the hero replaces the toolbar title `Meal result`
that they used as a navigation landmark, and because one asserted the retired
ring:

- `frontend/src/pages/meal/Meals.reuse.test.tsx` — landmark switched to the
  sealed `Saved to history` pill;
- `frontend/src/pages/meal/PreviewMeal.draftUx.test.tsx` — landmark switched to
  the sealed score line `Score: 42 · internal reference: 100`, and the ring
  aria-label assertion inverted to assert the ring is gone;
- `frontend/cypress/e2e/j4-confirm.cy.ts` — landmark switched to the pill.

No production file outside the allowed list was touched. Each replacement
asserts sealed copy, so the checks are stronger than the page-chrome string
they replace. This mirrors the documented J4 scope-exception precedent.

Two further deliberate test adaptations inside authorized files:

- `acute-score.cy.ts` — the two assertions that read the **ring's**
  `getAcuteScoreAriaLabel` now assert the visible sealed score line and
  explainer, plus an explicit no-ring guard scoped to `.result-page`. The
  helper itself is untouched and still serves History via
  `AcuteScoreProgressbar`. Fable's ruling states the ring's aria-label leaves
  with the ring because the visible sealed text is self-describing.
- `campaign-a-layout.cy.ts` — the driver-layout guard follows the chips → inline
  list change. It still guards the original defect (drivers running together)
  via an explicit separator assertion. The pairwise bounding-box overlap check
  was dropped deliberately: these are inline spans, and a driver that wraps
  across two lines reports a union rectangle that legitimately overlaps its
  neighbour's, so that check no longer means what it meant for inline-block pills.

## Automated validation

All checks run in the J5 worktree on the exact working tree described here.

| Check | Result |
| --- | --- |
| Full unit suite (`NODE_OPTIONS=--no-experimental-webstorage`) | PASS — 538/538 tests, 47 files |
| New `resultPresentation` helper tests | PASS — 22 tests |
| New `EvidenceRows` + `ResultHero` component tests | PASS — 16 tests |
| `SavedMealDetail` page tests (+ untouched malformed-id suite) | PASS — 25 tests |
| `npx tsc --noEmit` | PASS |
| ESLint on every changed TS/TSX file (including Cypress specs) | PASS |
| Full Cypress suite, Chrome 150 headless | PASS — 92/92 tests, 13 specs (19 in `j5-saved-result.cy.ts` after the evidence-row capture was added) |
| `npm run build` | PASS |
| `npx cap sync android` + `./gradlew assembleDebug` | PASS |
| `git diff --check` | PASS |
| Changed-file boundary audit | PASS |
| Protected-file audit | PASS — 18 protected paths show no diff |
| Forbidden-language audit | PASS |

Build emitted the existing non-blocking Browserslist and chunk-size advisories.

### A Cypress environment trap worth recording

The first full Cypress run reported 23 failures. None were real: a stale Vite
dev server belonging to a **different worktree** was occupying the configured
`baseUrl` port 5173, so Cypress was exercising old code — the run found
`ion-card.advanced-item-card`, markup this branch deletes. The suite was re-run
against a dedicated server for this worktree on port 5199 and the failures
disappeared. Anyone reproducing these results must confirm the server under
`baseUrl` is serving *this* worktree.

### Forbidden-language audit method

The audit scanned added lines only (`git diff` additions plus the four new
files) for `percentile|ranking|ranks|better than|worse than|share of load|
% of load|traffic|healthy|unhealthy|dangerous|diagnos|prescrib|dosage|
Save to History|Unsaved estimate|verdict band|than most meals|population`.

Every hit is a **negative assertion or an explanatory comment**, never
user-visible copy: tests asserting `Save to History` does not exist, tests
asserting `share of load` does not appear, the helper comment explaining why
share-of-load is not derivable, and the test title "never implies ranking…".
Pre-existing occurrences elsewhere in the repository were not counted, per the
ruling's instruction to distinguish new user-visible strings from historical text.

### Behavioural assertions preserved

Read-only (no textboxes, no save/edit/add controls), current-meal draft store
untouched, delete confirmation header, backend-first delete success **and**
failure paths, malformed meal id, not-found state, `Check another meal` →
`/log-meal`, `Done` → `/dashboard`, both disclosures closed by default, and the
duplicate-React-key regression all still pass.

### New assertions added

Page anatomy order; heading hierarchy (`h1` meal name → `h2` verdict → `h3`
sections); photo hero and typographic-plate fallback; no circular meter/gauge;
sealed strings byte-identical (imported, never retyped, because they carry
typographic apostrophes); insufficient-data with finite **and** non-finite
score; driver-first row ordering; drivers that match no item; kcal rounding;
zero-calorie and zero-item behaviour; no percentage text in evidence; bars
`aria-hidden`; rough notice exactly once; unknown notice outside any disclosure;
no nested cards; delete label and accessible name.

An Ionic detail was found and documented while writing these tests: `ion-button`
keeps `aria-label` on the host until the component initialises, then moves it
onto the native button inside the shadow root. Testing Library's `ByLabelText`
is therefore unreliable against Ionic buttons; the delete control is located
structurally and its accessible name is read from either location.

## Browser evidence

Captured by `frontend/cypress/e2e/j5-saved-result.cy.ts` at Chrome 150
headless, synthetic meals and a synthetic inline SVG "photo" only. Every file
below was opened and visually inspected before being called evidence. Stored in
`evidence/browser/`; hashes in `evidence/EVIDENCE-LEDGER.md`.

| Capture | State |
| --- | --- |
| `result-normal-photo-paper.png` | normal result, photo hero, 390×844, Paper |
| `result-normal-photo-ink.png` | normal result, photo hero, 390×844, Ink |
| `result-normal-plate-paper.png` | normal result, typographic plate (no photo) |
| `result-evidence-rows-paper.png` | score line, drivers line, evidence rows and calorie bars |
| `result-insufficient-paper.png` | insufficient-data result, 390×844, Paper |
| `result-insufficient-ink.png` | insufficient-data result, 390×844, Ink |
| `result-disclosures-open-paper.png` | footnotes and advanced details open |
| `result-delete-confirm-paper.png` | destructive confirmation dialog |
| `result-long-name-320x700-paper.png` | long meal name and large score at 320×700 |
| `result-large-text-paper.png` | 133% root text scale at 390×844 |

Observations from inspection:

- Paper and Ink are structurally identical; only tokens resolve differently.
- The long meal name wraps across four lines at 320 px with no clipping and no
  horizontal overflow. This is the state J4 recorded as a P2 clipping defect.
- The evidence capture shows the intended reading: sealed score line in tabular
  numerals, sealed explainer, "Main drivers" as an inline serif list with
  visible `·` separators, then rows with `≈ kcal`, portion, why-line and a
  hairline bar. No percentage appears.
- Advanced details render as hairline-separated articles with no nested cards.
- The delete dialog is Ionic's own alert; its uppercase `CANCEL`/`DELETE`
  buttons are pre-existing Ionic Material styling, unchanged by J5 and outside
  its scope. Recorded as an observation, not a J5 defect.

## Android build artifact

Built from the exact working tree described here:

- Path: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
- Size: 8,585,176 bytes
- SHA-256: `ca293d1b75aa57926be0e0715046c1abc2af747547e2df3df5484c080a524d7a`
- Package: `io.ionic.starter`
- Version: `1.0` (`versionCode` 1)

`npx cap sync android` rewrote `frontend/android/app/capacitor.build.gradle` and
`frontend/android/capacitor.settings.gradle` with different line endings but
byte-identical content; both were restored with `git checkout --` so the
changed-file boundary stays exactly as listed. No Android source or generated
configuration remains modified in Git.

## Physical device QA — NOT PERFORMED

**This is an open gate, not a passed one.**

The Samsung SM-M356B device matrix required by the ruling — normal and
insufficient states, Paper and Ink, font scale 1.0 and 1.3, one rotation cycle,
one hot resume, safe-area and fixed-dock relationship, no system-navigation
overlap — **was not run.** `adb` is installed and functional, but
`adb devices` reported no attached device for the duration of this work.

The APK above was built and hashed but **was not installed and was not
exercised on hardware**. No claim about on-device rendering, safe areas, dock
placement, rotation, hot resume, or font-scale relaunch behaviour is made here,
and none may be inferred from the browser evidence.

J5 adds one new fixed element (`.result-dock`) that uses the same
`env(safe-area-inset-*)`-derived variables and the same structural pattern as
the J4 confirm dock, whose device behaviour was validated in #118. That is a
structural argument for expecting correct behaviour, **not** evidence of it.
The device gate must be run on this exact APK, or on a rebuild whose hash is
recorded, before J5 can be considered device-verified.

## Evidence privacy

No device evidence was collected, so no whole-device logcat, ADB serial,
carrier identifier, Health Connect activity, third-party application activity,
or personal device telemetry exists in this tree. Every browser capture uses
synthetic meal content generated inside the Cypress spec; no real user data, no
real health data and no real meal photograph appears in any artifact. Each
screenshot was visually inspected for incidental personal content before
retention; none was present. No absolute machine-local path is recorded in the
committed evidence. A 2.2 MB `frontend/cypress/downloads/downloads.htm` run
artifact produced by Cypress was deleted rather than retained.

## Unresolved risks and honest limitations

1. **Physical-device QA is outstanding** (above). This is the single blocking
   gap for J5 completion.
2. The insufficient-data nominal-reading note is a deliberate behaviour change
   to what a low-quality result displays. It is constitution-directed and
   test-pinned, but it is the one change here that a reviewer should confirm
   against product intent rather than against the previous code.
3. `insulin_load_total` remains unrendered, exactly as before J5. Surfacing it
   would need its own product ruling.
4. The `#47` copy items (spelling out Food Insulin Index, the legacy `ai`
   source label) and `#105` were deliberately not addressed; `FII:` and the
   `humanizeFiiSource` labels remain byte-identical.
5. `#97` (zero-nutrition meals labelled high quality) is untouched and still
   open; a zero-calorie meal renders no bars and no bar sentence, which is a
   presentation guard, not a fix for that issue.

## Independent Terra engineering and evidence review — 2026-07-26

### Verdict

**DEVICE QA BLOCKER.** Source/data-honesty, targeted automated verification,
and retained browser evidence passed independently. The required Samsung
SM-M356B was not attached (`adb devices -l` returned no devices), so the
physical-device matrix is wholly outstanding. This review does not use the
ready-for-final-Fable status.

### Repository and scope audit

- Branch, HEAD, and `origin/main`: `opus/annotated-journal-j5-result`,
  `b73766d27fc6fa43f4854b8ffa0671a0d799fed8`, and the same SHA.
- HEAD is the stated base; there are zero commits ahead; nothing is staged;
  no push or PR was found.
- The implementation paths are the declared saved-result TS/TSX, CSS, focused
  Cypress/unit tests, and J5 report/evidence tree. The three scope-expansion
  tests only replace retired saved-result landmarks/ring assertions with the
  sealed saved-result pill or score line.
- `git diff --check` passed. No protected scoring, FII, API, store, type,
  backend, Rust, or sealed-copy helper is changed. Implementation paths were
  hash-recorded during review and were not edited by Terra.

One review-harness limitation is explicit: the independent Cypress run created
an ignored, untracked `frontend/cypress/downloads/downloads.htm`
(33,619,428 bytes). It is generated browser-run output, unstaged, and outside
the proposed implementation. The execution environment refused deletion. It
must be removed before final tree-cleanliness attestation or staging.

### Scientific and data-honesty audit

PASS. `MealItem` has no insulin-load field. The raw backend item response has
`insulin_load`, but `mapMealModelingResponseToMeal` drops it and
`syncMealsFromBackend` hydrates through that mapper. The only persisted load is
whole-meal `insulin_load_total`, which this chassis neither renders nor
allocates.

`resultPresentation.ts` uses only stored per-item calories for evidence
fractions; non-finite/negative values become zero and a zero-sum meal omits
bars and their note. `EvidenceRows.tsx` renders no percentage text and displays
the sealed calorie-not-score sentence. Drivers remain backend descriptions,
not numerical claims. No formula, threshold, provenance copy, or protected
helper changed; diff term hits were negative tests/comments, not unsupported
user-visible scientific or comparative claims.

### Targeted verification

| Command | Independent result |
| --- | --- |
| Focused Vitest: `resultPresentation`, `EvidenceRows`, `ResultHero`, `SavedMealDetail`, malformed ID | PASS — 5 files, 63 tests |
| `npx tsc --noEmit` | PASS |
| ESLint on every changed/new TS/TSX path | PASS |
| `npm run build` | PASS — existing Browserslist/chunk-size advisories only |
| Dedicated Vite `127.0.0.1:5199`, then the six required Cypress specs | PASS — 6 specs, 45/45 tests |
| `git diff --check` | PASS |

Port 5199 was unused before launch, served this worktree before Cypress, and
was clear after stopping its Vite process. Cypress screenshots were routed to a
unique temporary folder outside the repository, so retained browser evidence
was not overwritten. Focused units emitted non-failing Ionic/JSDOM `act(...)`
and layout stderr around two delete-state tests; this is a test-environment
limitation, not a behavioral failure.

### Browser evidence and APK

PASS for browser evidence. All ten retained browser PNG SHA-256 values and
byte counts match the ledger. Visual review found synthetic content only,
structurally matching Paper/Ink, no saved-result gauge or coloured nutrient
icons, truthful plate fallback, visible calorie-share note/no percentage,
usable disclosures and delete confirmation, and no observed clipping or
horizontal overflow in the labelled 320×700 and 133% states. Browser evidence
does not prove Android system-navigation or safe-area behavior.

- APK: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
- Bytes/SHA-256: 8,585,176 /
  `ca293d1b75aa57926be0e0715046c1abc2af747547e2df3df5484c080a524d7a`
- Package/version: `io.ionic.starter`, `1.0` (`versionCode` 1)
- Modification time (UTC): `2026-07-26T08:07:14.5688216Z`

### Physical device, privacy, and Terra boundary

Not performed: no Samsung SM-M356B was connected, so model/API/navigation,
font scale 1.0/1.3, Paper/Ink, rotation, resume, hardware back, delete cancel,
and Android safe-area/dock behavior remain unexercised. The verified APK was
not installed. No device evidence, serial, logcat, personal data, or health
data was collected.

Terra modified this report and the companion ledger only. No production code,
test, CSS, Android, backend, Rust, API, store, type, or configuration path was
intentionally edited. Nothing is staged, committed, pushed, or PR-created; J6
was not started. The untracked Cypress download noted above is the sole
review-run residue and must be cleaned before final staging.

## Samsung SM-M356B device follow-up — 2026-07-26

**RETURN TO OPUS FOR BOUNDED CORRECTION.** The verified APK was installed on
SM-M356B (Android 16, API 36), in three-button navigation mode. Synthetic
normal and insufficient states rendered in Paper and Ink at font scale 1.0,
and in Paper at font scale 1.3; the large-text top states wrapped without
horizontal overflow or clipping. The font scale was restored to 1.0.

The device gate fails one material requirement: after scrolling to evidence
and opening both disclosures at font scale 1.3, the result dock is no longer
visually present above the content/system navigation. The app tab bar and
three-button system navigation remain, while disclosure text occupies the
dock's expected screen area. DOM inspection reports `.result-dock` as
`position: absolute`, not fixed. This prevents the required safe-area/dock
attestation. Correct this device-specific scroll/dock behavior, then rerun the
bounded physical-device matrix. No scientific, source, browser, or APK finding
changed.

## Bounded Android dock correction — 2026-07-26 (Opus)

Response to the Terra device blocker above. Scope was one layout defect. No
scientific, product, persistence, navigation, API, store, backend, telemetry,
privacy, consent, scoring, FII, quality, provenance or sealed-copy behaviour
was touched, and J4's validated confirm dock was not modified.

### Confirmed root cause

The J5 dock was a `<div slot="fixed">` **inside** `IonContent`. That is not a
layout sibling of the scrolling area — it is a light-DOM child of
`ion-content` that Ionic *projects* into a shadow `<slot name="fixed">` placed
outside `.inner-scroll`, and then positions with `position: absolute` against
the `ion-content` box (Ionic's own `::slotted([slot=fixed])` rule, plus the
identical rule J5 declared). Persistent placement therefore depended on that
shadow-slot projection plus absolute positioning resolving correctly, rather
than on the page's flex layout.

Two facts confirm the mechanism rather than assuming it:

- A Cypress DOM probe shows `ion-content.contains(dock) === true` for the old
  markup: the dock really is inside the content element, escaping the scroll
  area only by Ionic's projection. The corrected footer returns `false`.
- On desktop Chrome 150 the same probe shows the old dock resolving correctly
  even under the failing combination (`offsetParent` = `ion-content`,
  `dockIsInsideInnerScroll: false`, pinned at the content's bottom edge).

That is precisely why browser evidence missed the defect: the indirection
resolves correctly in desktop Chrome, so no browser capture could expose it.
The retained J5 browser captures also never combined the two conditions that
made the result tall enough to break it on hardware — the 133% capture had
both disclosures closed, and the disclosures-open capture was at 100% text.
The Android WebView on SM-M356B did not hold the same projection once the
result grew tall (font scale 1.3 with both disclosures open), leaving the
scroll content occupying the dock's region while the tab bar and system
navigation remained.

A second, independently provable defect existed in the same code regardless of
the projection question: `.result-page` reserved bottom space with a hardcoded
`--padding-bottom: calc(140px + safe-area)`. That constant cannot scale with
Android font scale, so at font scale 1.3 — where the dock is taller than
140 px — the last content sat behind the dock. Any fix that kept a
hand-computed reserve would have kept that bug.

### Why the chosen correction is robust

The dock is now an `IonFooter` **sibling** of `IonContent`, which is the
pattern the device-validated Home dock (`Dashboard.tsx`, `.home-action-dock`)
already uses inside this same tabs layout. This removes the failure class
rather than re-tuning it:

- the footer is laid out by `ion-page`'s flex column, so its position does not
  depend on shadow-slot projection, absolute positioning, a containing block,
  or compositing order;
- it reserves real layout space, so no hand-computed bottom reserve is needed
  and none can go stale at a larger font scale — Ionic measures the footer and
  applies `--offset-bottom` itself (measured at 196 px at 133%);
- it sits above the tab bar structurally, so the tab bar keeps ownership of the
  bottom safe-area inset and the dock cannot double it.

The correction was deliberately *not* "change `absolute` to `fixed`", which
would have kept the dock inside the content and merely swapped one positioning
assumption for another.

### Production change

Two files, both already authorized:

- `frontend/src/pages/meal/SavedMealDetail.tsx` — the dock moves out of
  `IonContent` and becomes `<IonFooter className='result-dock'>`, a sibling
  inside `IonPage`. Button order, labels, routes, the delete handler, its
  accessible name, and the confirmation dialog are unchanged.
- `frontend/src/theme/app.css` — `.result-dock` drops `position`, `inset` and
  `z-index`; the bottom padding drops `--ion-safe-area-bottom` (the tab bar
  below owns that inset, and adding it here would double it); left/right
  padding keeps its `max()` safe-area form for landscape; `.result-dock::before`
  nulls Ionic's Material footer gradient so the hairline above the dock is
  ours, exactly as the Home dock does. The `.result-page` `--padding-bottom`
  reserve is removed.

Behaviour preserved: Check another meal to `/log-meal`, Done to `/dashboard`,
Delete to confirmation and backend-first deletion with unchanged failure copy;
44x44 minimum targets; Paper and Ink structurally identical; normal and
insufficient states identical in structure.

### Regression coverage added

- `SavedMealDetail.test.tsx` — a DOM-placement test asserting the dock is an
  `ion-footer`, is **not** contained by `ion-content`, carries no `slot`
  attribute, shares a parent with the content, and follows it in DOM order.
  The test states explicitly that JSDOM cannot prove painted anchoring.
- `j5-saved-result.cy.ts` — a "dock persistence under tall content" block that
  reproduces the reported combination for both the normal and insufficient
  states: 133% root text, both disclosures opened, scrolled to the evidence
  section and then to the very bottom. It asserts at each position that the
  dock is rendered, stays within the viewport, never overlaps `ion-tab-bar`,
  and that the final content clears the dock. Geometry assertions select by
  `.result-dock` class, not by tag, so a regression to any other element or
  positioning strategy still fails on geometry rather than on a missing
  selector.

These were verified as real guards, not passing decoration: with the old
`slot="fixed"` dock temporarily restored, both Cypress dock tests fail on
substance — `dock is not inside the scrolling content: expected true to equal
false` — and pass again once the footer is restored.

### Measured result at 133% with both disclosures open

At true end-of-scroll, 390x844: `ion-content` bottom 648 px, dock top 648 px
(no overlap), last advanced item bottom 614 px — 34 px of clearance — with
Ionic reporting `--offset-bottom: 196px`. Nothing is trapped behind the dock.

### Automated validation after the correction

| Check | Result |
| --- | --- |
| Focused unit tests (`src/pages/meal`, `src/components`, `resultPresentation`) | PASS — 128 tests, 18 files |
| Cypress `j5-saved-result.cy.ts` (incl. 2 new dock-persistence tests) | PASS — 21/21 |
| Cypress `saved-detail`, `acute-score`, `manual-meal`, `campaign-a-layout`, `j4-confirm` | PASS — 26/26 |
| Negative control: old dock restored | Both dock tests FAIL as intended |
| `npx tsc --noEmit` | PASS |
| ESLint on changed TS/TSX | PASS |
| `npm run build` | PASS |
| `npx cap sync android` + `./gradlew assembleDebug` | PASS |
| `git diff --check`, boundary and protected-file audits | PASS |

The full unit and Cypress suites were not re-run; focused results revealed no
broader regression.

### Corrected APK — built, NOT installed

- Path: `frontend/android/app/build/outputs/apk/debug/app-debug.apk` (not committed)
- Size: 8,631,515 bytes
- SHA-256: `0bcd8598d2f23526731533302015ae17d51cbd22a7df150a6a360fc3126bdd6c`
- Package: `io.ionic.starter`, version `1.0`, versionCode 1
- Built: 2026-07-26 16:13:12 local

This supersedes the blocker APK
`ca293d1b75aa57926be0e0715046c1abc2af747547e2df3df5484c080a524d7a`
(8,585,176 bytes), which remains the artifact Terra's blocker finding refers
to. `cap sync` again rewrote two Android gradle files with different line
endings and byte-identical content; both were restored, and no Android
generated or configuration change remains.

### Opus device spot-check — NOT PERFORMED

The bounded spot-check could not be run. The Samsung SM-M356B was attached and
authorized at the start of this correction (model and API level confirmed,
font scale read as 1.0), and a read-only CDP inspection of the running blocker
APK was begun. The device then dropped off ADB and did not return across
repeated `adb kill-server` / `start-server` cycles and roughly ten minutes of
polling. The corrected APK was therefore never installed, and none of the
required device steps — dock visibility at font scale 1.3 with both
disclosures open, scroll to evidence and to the bottom, rotation, hot resume,
delete confirmation — were exercised.

**No safe-area or dock attestation is made from hardware.** The correction's
justification is structural plus browser-level, and Terra's device
re-verification of APK `0bcd8598...` remains required.

**Device state left changed:** Android font scale was set to **1.3** on the
handset for the intended spot-check and could not be restored to 1.0 before
the device disconnected. Whoever next picks up the device should restore it
(Settings, Display, Font size — or `adb shell settings put system font_scale
1.0`).

No device artifact was produced by this correction, so no whole-device logcat,
ADB serial, notification, account, carrier, Health Connect, modem or Wi-Fi
material entered the tree. The one ADB listing consulted during preflight was
redacted before display and never written to a file.

### Evidence added

One browser capture,
`browser/result-corrected-dock-font-1.3-disclosures-open-paper.png`. It shows
the corrected dock anchored at the bottom of the viewport, above the tab bar,
at 133% text with both disclosures open while tall content scrolls beneath it.
It is a mid-scroll view: Cypress re-establishes the Ionic scroll position when
it captures, so this image does **not** depict the end-of-scroll state.
End-of-scroll clearance is proven by the geometric assertion and the
measurements above, not by this artifact.

Terra's blocker device captures and all previously retained browser captures
are unchanged; their SHA-256 values were re-verified against the ledger after
this correction.

## Final independent corrected-APK physical-device re-verification — 2026-07-26

### Verdict

**PASS — DEVICE QA BLOCKER CLEARED.** An independent Codex recovery reviewer
who did not author the dock correction verified the installed binary, inspected
the actual correction and its guards, exercised the bounded Samsung matrix,
and visually inspected every retained final-pass capture.

This is a presentation-only verdict for the current Ionic React/Capacitor
implementation. It does not claim scientific validation and does not alter or
approve scoring, FII resolution, quality semantics, persistence, API, stores,
privacy, consent, telemetry, or scientific copy.

### Binary and device provenance

- Device: Samsung SM-M356B, Android 16 / API 36.
- Navigation: three-button navigation (`navigation_mode = 0`).
- Package: `io.ionic.starter`, version `1.0`, versionCode 1.
- Local corrected APK: 8,631,515 bytes,
  `0bcd8598d2f23526731533302015ae17d51cbd22a7df150a6a360fc3126bdd6c`.
- Installed `base.apk`: independently read with on-device `sha256sum`; the
  hash matched the local corrected APK exactly.
- The superseded blocker APK (`ca293d1...`) was not used in this pass.

### Matrix result

All content was synthetic and matched the J5 Cypress fixtures.

| State | Paper | Ink | Font 1.0 | Font 1.3 | Result |
| --- | --- | --- | --- | --- | --- |
| Normal saved result | exercised | exercised | exercised | exercised | PASS |
| Insufficient-data saved result | exercised | exercised | exercised | exercised | PASS |
| Both disclosures open, true end-of-scroll | exercised | structure identical | exercised | exercised | PASS |
| Portrait → landscape → portrait | — | exercised | safe-area values sampled | exercised | PASS |
| Hot background/resume | — | exercised | — | exercised | PASS |
| Delete confirmation + hardware-back cancel | — | exercised | — | exercised | PASS |

No state showed horizontal overflow, clipped actions, a missing dock, dock/tab
overlap, or system-navigation overlap. Paper and Ink retained identical
structure. The insufficient-data result retained its de-emphasised nominal
reading and visible uncertainty notices.

### Hardware geometry

At font scale 1.3 with both disclosures open:

- normal: scroll `2132.57 / 2133` CSS px, last advanced item bottom `614.00`,
  dock top `647.90`;
- insufficient: scroll `1834.67 / 1835` CSS px, last advanced item bottom
  `613.90`, dock top `647.90`;
- dock bottom `772.67`, tab-bar top `772.67`.

At font scale 1.0 with both disclosures open:

- normal: scroll `1510.48 / 1511` CSS px, last advanced item bottom `614.21`,
  dock top `647.90`.

Every sample was at the true scroll maximum (within one CSS pixel). The final
content cleared the footer by approximately 34 CSS px; the footer met but did
not overlap the tab bar. Runtime inspection confirmed:

- `.result-dock` is an `ION-FOOTER`;
- computed position is `relative`;
- it is not contained by `ion-content`;
- the footer remains fully inside the viewport;
- the document has no horizontal overflow.

The full-screen content continues to paint beneath the transparent status bar
while scrolling, as before; content remains scrollable and readable. The
blocking bottom relationship is corrected: final content, result footer, tab
bar, and three-button system navigation remain distinct.

### Safe-area, rotation, and resume

The Safe Area plugin, root `--app-safe-area-*` variables, and Ionic
`--ion-safe-area-*` variables agreed exactly:

- portrait: top 38, right 0, bottom 48, left 0 px;
- landscape: top 30, right 48, bottom 0, left 34 px.

In landscape the dock remained inside the app viewport and cleared the tab
bar. Returning to portrait preserved the route and layout. A real Home →
foreground cycle returned `LaunchState: HOT` in 164 ms; the saved-result route,
Ink appearance, synthetic meal, footer, and non-overlap geometry were
preserved.

Opening `Delete saved meal` produced the expected `Cancel` / `Delete`
confirmation. Android hardware Back dismissed the dialog, kept the saved-result
route, and left the synthetic meal persisted; no deletion call was made.

### Independent automated re-check

| Check | Result |
| --- | --- |
| Focused Vitest (`resultPresentation`, `EvidenceRows`, `ResultHero`, `SavedMealDetail`, malformed ID) | PASS — 5 files, 64/64 tests |
| `npx tsc --noEmit` | PASS |
| ESLint on every changed/new TS/TSX path | PASS |
| Cypress `j5-saved-result.cy.ts` | PASS — 21/21 |
| Cypress `saved-detail`, `acute-score`, `manual-meal` | PASS — 18/18 |
| Cypress `campaign-a-layout`, `j4-confirm` | PASS — 8/8 |
| Focused Cypress total | PASS — 6 specs, 47/47 |

The unit run emitted the same documented non-failing Ionic/JSDOM layout stderr
and React `act(...)` warnings around delete-state tests. Cypress emitted only
the existing Browserslist and Node loader/deprecation advisories. The first
aggregate Cypress attempt exceeded the shell's collection timeout after
completing J5 and entering later specs, so it was not counted; every required
spec was then rerun in bounded batches against the same worktree-owned Vite
server. Screenshots, downloads, and videos from these re-checks were routed to
a unique temporary directory outside the repository. Port 5199 was clear after
the owned server was stopped.

### Evidence and privacy

Fourteen final-pass captures were retained and independently inspected:
normal/insufficient, Paper/Ink, font 1.0/1.3, true-bottom disclosure states,
landscape, hot resume, and delete confirmation. Hashes, byte counts, dimensions,
and filenames are in `evidence/EVIDENCE-LEDGER.md`.

The captures contain synthetic meal data plus ordinary status/navigation
chrome only. No notification content, account, telephone number, carrier name,
device serial, Health Connect content, Wi-Fi identity, modem data, real meal,
real photograph, or real health data is retained. No whole-device logcat was
collected.

The device was restored to font scale 1.0, portrait (`user_rotation = 0`) with
auto-rotation enabled (`accelerometer_rotation = 1`). At the close of this
re-verification nothing had been staged, committed, pushed, or PR-created.

## Final Fable product and visual review — 2026-07-26

Independent final product, visual-design, UX, responsive and presentation
review of the completed chassis, conducted read-only against the actual
implementation, the complete J5 CSS section, both reports, every retained
browser capture, and every final-pass corrected device capture. The reviewer
independently recomputed the corrected APK digest
(`0bcd8598d2f23526731533302015ae17d51cbd22a7df150a6a360fc3126bdd6c`,
8,631,515 bytes) and confirmed zero diff across the sealed helpers, API,
stores, types, and backend.

### Verdict

**APPROVE.**

| Dimension | Result |
| --- | --- |
| Product contract | PASS |
| Visual quality | PASS |
| Responsive and accessibility | PASS |
| State coverage | PASS |
| Implementation boundary | PASS |
| P0/P1 findings | None |

Final disposition at review time: **READY FOR COMMIT, PUSH, AND DRAFT PR.**

The review confirmed that the page answers what was saved, the product's
honest conclusion, what evidence contributed, how complete the result is, and
what the user can do next; that the score stays subordinate to the verdict and
never becomes the emotional hero; that the calorie-share bars cannot be read
as score contribution given the visible sentence and the absence of any
percentage; and that the chassis reads as the next Porcelain Journal page
rather than a health dashboard, card stack, or score gauge.

### Non-blocking P2 findings

None of these block J5. Each is recorded for a later slice.

1. Ionic's Material alert renders uppercase blue `CANCEL` / `DELETE`, so the
   destructive action is not visually destructive inside the dialog. This is
   pre-existing app-wide alert chrome; defer to an app-wide system-chrome
   slice.
2. Advanced details may show an empty `FII:` value for unresolved items.
   Preserve and defer under the existing source/copy issues (#47, #105).
3. Scrolled content may paint beneath the transparent status bar. This is
   pre-existing fullscreen chrome behaviour predating J5 and belongs to a
   chrome slice.
4. Future evidence sets could include the calorie-bar explanatory sentence
   within a screenshot crop, and one physical photo-hero capture. Documentation
   polish only; no implementation change is implied.
