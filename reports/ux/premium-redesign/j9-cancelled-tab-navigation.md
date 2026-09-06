# Cancelled tab navigation repair

Date: 2026-09-06.  
Status: **PASS FOR INDEPENDENT REVIEW — browser/source repair only.**

Starting commit: `3b1cb344cfd3e7a4913525465ae76c729283f9bd` on
`codex/j9-hardening-final`. The repair commit is the single scoped commit that
contains this report; its hash is recorded in the task handoff because a commit
cannot contain its own hash.

This changes only the current Ionic React/Capacitor compatibility client. It
does not complete wider J9 acceptance or authorize release.

## Reproduction and cause

The reduced real-UI sequence was sufficient:

`/ → /dashboard → Log Meal tab → manual meal (quantity 1) → Calculate →`
`Home tab → Stay and save → Adjust`.

On unmodified HEAD, the final URL was `/meals/new`, but the only settled active
outlet page was Dashboard and the editor was hidden. The assertion recorded
`activeEditor:false`, `activeDashboard:true`, and `editorHidden:true`. Before
Adjust, the retained editor DOM still had the same synthetic meal name,
quantity 1, and component ID. Request counts remained one preview and zero
saves. A paired test entering directly at `/log-meal` passed, proving that the
visited Dashboard route identity was the missing precondition.

The source-supported sequence is:

1. Ionic's tab handler selects the destination context and calls
   `handleChangeTab` before React Router knows whether the push will be blocked.
2. `handleChangeTab` copies the previously visited destination route, including
   its ID, into `incomingRouteParams`.
3. The app's `history.block` rejects the push, so `handleHistoryChange` does not
   clear those incoming parameters.
4. Stay dismisses the guard. The next Adjust push is then interpreted through
   the stale existing-ID branch, so the browser location changes while the old
   tab page is published to the outlet.

## Repair selection

The chosen mechanism is prevention at Ionic's public, cancelable
`ionTabButtonClick` event. `MealFlowGuard` captures only guarded tab departures
before Ionic's React tab handler runs, cancels that event, and sends the true
tab destination through the existing `history.push`. The single existing
`history.block` remains the authority that decides and opens the guard. Stay
therefore has no tab transition metadata to undo. Ordinary allowed tab events
continue untouched.

Each existing tab exposes its canonical destination through a
`data-navigation-href` attribute. This is needed because Ionic can emit its
current cached href rather than the tapped root; notably `/meals/estimate`
prefix-matches the History root `/meals`. The previously visited History test
failed against the first candidate for exactly that reason and passed after the
canonical public metadata was used.

Observed state for cancelled Home and History departures:

- Before: `/meals/estimate`, active estimate, app-selected Log Meal tab, one
  preview, zero saves.
- Operation: cancel the guarded tab event, delegate its canonical destination
  to the existing blocker, then choose Stay.
- After Stay: location and history length unchanged, active estimate retained,
  app-selected Log Meal retained, alert dismissed, one preview, zero saves.
- After Adjust: `/meals/new`, exactly one active entered editor, destination tab
  hidden, same meal name/quantity/component identity, and no alert or request.

No public routeInfo inspection API exists. The absence of an Ionic tab change
is established by intercepting before its handler; the active-page, location,
history, selected-tab, alert, and request assertions verify the observable
result.

Rejected alternatives:

- A same-location `history.replace` was not run or implemented. Ionic's
  existing-ID branch copies stale `incomingRouteParams` without replacing its
  ID/pathname from the new browser location, so the flush could publish the
  stale destination as the current route.
- Ionic `selectTab`/reset operations navigate or reset a tab stack; they do not
  cancel the rejected departure and can route to the original tab root.
- Private `IonRouterInner` mutation and node_modules changes were excluded.

## Production and test delta

- `frontend/src/components/MealFlowGuard.tsx`: one capture listener around the
  existing blocker; no second blocker or router state mutation.
- `frontend/src/App.tsx`: canonical destination data on the three existing tab
  buttons.
- `frontend/cypress/e2e/j9-final-hardening.cy.ts`: six cancellation tests for
  cold-start Home, direct-entry control, repeated Stay, visited History,
  Discard and Leave, and ordinary tabs.

The main test also returns from Adjust to the entered estimate. Discard reaches
one active Home page with no second guard, one preview, and zero saves; the
existing destination-bound bypass unit still proves one-shot consumption.

## Verification

All browser runs used Node `22.22.2`, a production Vite preview at
`127.0.0.1:4173`, synthetic data, and no runtime `/src` import.

Red/test-development evidence retained outside the repository:

- Four initial 1-pass/1-fail harness iterations exposed, respectively, a
  non-reflected cold-start aria label, two over-broad chooser readiness
  selectors, and duplicate retained headings. None reached the product
  assertion.
- Correct RED on HEAD: 1/2 passed; cold-start case failed with URL
  `/meals/new`, active Dashboard, hidden editor. Direct `/log-meal` control
  passed.
- First focused green: 2/2 passed.
- First expanded J9 run: 17/20 passed. It exposed missing post-Adjust readiness,
  the History cached-href flaw in the first candidate, and an invalid
  `history.length + 1` assertion at the observed Cypress depth cap.
- Second expanded J9 run: 19/20 passed; the remaining assertion relied on
  Ionic's ambiguous raw `selected` property for a direct nested meal route.
  It was replaced by the app's route-derived selected-tab contract.
- Stable J9 run: 20/20 passed.

Final checks:

- Focused guard units: 3 files, 15/15 tests passed. Existing React `act(...)`
  warnings were retained.
- Focused routed J8/B2: 2 specs, 6/6 tests passed, including stale estimate,
  synthetic recalculation failure, and successful retry.
- Full production-preview Cypress: 18/18 specs, 163/163 tests passed. J7 ran
  once in this full pass and passed 15/15.
- Full frontend unit suite: 60/60 files, 697/697 tests passed. Expected
  synthetic-error logs and existing React/jsdom warnings were retained.
- Standalone TypeScript: passed.
- ESLint: passed.
- Final production build: passed, 321 modules transformed. Entry
  `assets/index-l6sb2YKU.js`, SHA-256
  `DC4E615ABED8C6D9C6913914A6816A08C0C65F185A451326BB90E4D62E7A3912`.
  One read attempted while that same final Vite build was atomically replacing
  `dist` and found no `index.html`; the build then completed normally and the
  completed output was hashed.
- `git diff --check`: passed before report creation; final check is recorded in
  the handoff.

Raw logs, screenshots, pre-edit report snapshots, and patches are under
`C:\Users\Parth Ganguly\AppData\Local\Temp\insight-cancelled-tab-repair-20260906-01`.

Backend, Rust, and scientific suites were **NOT RERUN — UNCHANGED**. No device,
ADB, APK, camera/gallery, provider, dependency, CI, hook, global-setting,
scientific, privacy, recovery, or native-identity action occurred. The prior
device and post-Stay reports remain byte-preserved, untracked, and uncommitted.

## Remaining

- Build a new APK only under separate approval, then repeat the targeted check
  on Samsung SM-M356B.
- Safely discard the existing synthetic device draft under separately approved
  device scope.
- Keep every previously open wider J9, recovery, privacy, recognition,
  scientific-validation, and identity gate open.


---

## 2026-09-06/07 — CANCELLED TAB NAVIGATION — SAMSUNG CONFIRMATION

Status: **BLOCKED — Home → Stay → Adjust and ADB system Back passed;
Discard left an accessibility-hidden outlet after its alert disappeared.**

This is targeted physical evidence for the current Ionic/Capacitor compatibility
client at `9ee0b6743576983453ba666845b9a74343673ccc`, not wider J9 acceptance.
The earlier browser/source repair evidence above remains unchanged. Device work
began September 6; final reporting crossed midnight into September 7 (Asia/Calcutta).

### Preflight and scope

- Branch `codex/j9-hardening-final`; HEAD exactly the accepted repair commit.
- Tracked files and staged contents clean before work. Only the expected
  historical `j9-baseline-1-device-recheck.md` and `j9-post-stay-navigation.md`
  reports were untracked. No concurrent repository writer was observed.
- Assumptions: the approved original native shell remains compatible with the
  unchanged native inputs; the previously used synthetic preview response is
  suitable for navigation/request acceptance. Both boundaries were checked.
- Only this report is appended in the repository. No source, tests, configuration,
  dependencies, native inputs, formulas, datasets, or privacy behavior changed.
  No tests were added to the product. Risks are artifact fidelity, draft loss,
  and confusing a fixture response with scientific validation; fidelity checks,
  synthetic-only input, and the stop rule constrain this run.
- Device was initially absent; the owner connected it after notification.
  Samsung SM-M356B, serial `RZCY22FGP1Z`, Android 16 was then verified.

Evidence directory (`E`):
`C:\Users\Parth Ganguly\AppData\Local\Temp\insight-cancelled-tab-device-20260906-01`.

### Source, production output, and APK

Fresh `npm run build` under Node **22.22.2** passed (321 modules; existing
chunk-size advisory only). All **35** production files are recorded in
`E/reviewed-web-manifest.csv`; entry `assets/index-l6sb2YKU.js` has SHA-256
`DC4E615ABED8C6D9C6913914A6816A08C0C65F185A451326BB90E4D62E7A3912`,
exactly matching the accepted browser evidence. No rebuild retry occurred.

The corrected preservation packer/verifier from
`insight-apk-preservation-20260906-01` was copied outside the repository.
Only the new artifact filename and entry-bundle summary lookup changed in the
packer; the verifier is byte-identical to its previously accepted version.
Original Gradle APK SHA-256 was required and verified:
`FB6F9A32F924F9A13C647015FA8F634C4AC753315830D70CB3940A3CF179A061`.
The META-INF-stripped derivative was not used.

New artifact: `E/artifact/cancelled-tab-9ee0b674-debug.apk`.
APK SHA-256:
`9C5E01E739C3E92E77CFBECA5730F30798BFECD862519A4B936D1688038FF271`.

- Protected non-web/non-signing content: **922/922** paths and uncompressed hashes
  match the original; zero missing, extra, changed, or duplicate paths.
- Compression methods preserved; all **48/48** original non-signing META-INF
  files and both kotlinx.coroutines service descriptors match.
- Exactly **35/35** current web files; no stale web entries.
- Native bridge, plugin metadata, and Capacitor configuration also match current
  local inputs. No server URL override. Package identity `io.ionic.starter`,
  versionCode 1/versionName 1.0, minSdk 23/targetSdk 35 preserved.
- `zipalign -c -v 4` PASS; `apksigner verify` PASS (v1/v2/v3).
  Compatible debug certificate SHA-256:
  `097f30af00f956c0143d5a8ca01d4a5b271c7e3f97126b13b1a9f3826aaf1d9a`.

The exact prepared hash, connected target, and input boundaries were reported
before installation. Owner authorization covered this targeted confirmation.
`adb install -r` returned Success; no uninstall or app-data clearing occurred.
Freshly resolved installed base APK:
`/data/app/~~5y-_vB4oAoPvln_eRb_3dg==/io.ionic.starter-ccdq88hxcqYTLUS2innwpw==/base.apk`.
Its device-side SHA-256 **exactly matches** the new prepared APK.

Normal MainActivity launch created app PID **16329**. The loaded script was
`https://localhost/assets/index-l6sb2YKU.js`; a read-only GET of those served
974,452 bytes reproduced the accepted entry hash. No dev-server or runtime
`/src` entry was used. The initial CDP resource-cache lookup was unavailable
after late attachment; the direct local static-asset read resolved that diagnostic
limitation without a reload or application-state mutation.

### Targeted physical observations

| State/action | URL and entered-page evidence | Requests |
| --- | --- | --- |
| Cold launch | `/dashboard`; Home visible and the sole active page; no draft/recovery prompt. | No preview/save. |
| Real Log Meal → Enter manually | `/log-meal` chooser, then `/meals/new` active editor with blank New Meal/New Item scaffold. | No preview/save. |
| Synthetic input → Calculate once | Exact name `Synthetic cancelled-tab device check 20260906`, amount `1`; `/meals/estimate`, active estimate. | Exactly one preview, quantity 1, HTTP 200; zero saves. |
| Home once | `/meals/estimate`; `This estimate isn't saved`, with Stay/Discard controls. | One preview, zero saves. |
| STAY AND SAVE once, settled | `/meals/estimate`; active estimate, alert dismissed, Log Meal retains app-visible selection. | One preview, zero saves. |
| Adjust once | `/meals/new`; editor is the sole active entered page, `display:flex`, `pointer-events:auto`; Home hidden (`display:none`). Both enabled inputs pass DOM hit testing. | One preview, zero saves. |
| One ADB system Back | `/meals/estimate`; sole active estimate, no wrong outlet/tab or unexpected alert. | One preview, zero saves. |
| Home once → DISCARD AND LEAVE once | `/dashboard`; Home visually entered and hit-testable, alert removed; **outlet remains `aria-hidden=true` and body retains `backdrop-no-scroll` after settling**. | One preview, zero saves. |

The post-Stay editor preserved the exact name, amount **1**, and component ID
`16944efb-15dd-4061-a5a3-4a352030eb0a`. Log Meal remained selected according
to `journey-tab-selected` and visible styling. Ionic's raw `aria-selected`
attributes were not used as the selection authority, consistent with the
accepted browser report. No repeated Adjust tap was needed or sent.

All route Back evidence is explicitly **ADB KEYCODE_BACK**, not gesture or
physical-button coverage. A separate earlier Back event dismissed the confirmed
input keyboard; keyboard-hidden state was checked before the one route Back.
During initial typing the field first read “canceled”; ordinary caret/key input
corrected it to the required “cancelled” before Calculate. No settings changed.

The loopback-only fixture backend reused the prior deterministic success response
(score 67) and has no upstream/provider or persistence path. Its fixed response
item is steamed rice, unlike the manual New Item input, as in prior accepted
fixture evidence. This validates navigation/request behavior, not calculation,
food identification, nutrition, or scientific accuracy. Every request is logged;
only one POST occurred, to `/meals/preview`. There were zero save, extraction,
provider, or deletion requests.

### Discard mismatch and stop

The first post-Discard capture triggered the active-page assertion because
Home's owning `ion-router-outlet` was still `aria-hidden="true"`. A settled
read-only ownership check confirmed it was not just an unfinished transition:
Home itself is visible, has entered-page classes, and receives hit tests, but its
ancestor remains excluded from accessibility. `ion-alert` is gone and
`body.backdrop-no-scroll` remains. Screenshots show the intended Dashboard;
this is **not** a repeat of the old wrong-Home-at-editor-URL failure.
No scroll impairment or subsequent chooser behavior is asserted without testing.

Product inputs stopped at this concrete mismatch. No patch, browser diagnosis,
repeated tap, reload, rebuild, or broader J9 journey followed. The retained
capture and settled diagnostics are sufficient evidence for a separately scoped
follow-up. The recorded active predicate includes ancestor `aria-hidden`, so it
reports no accessibility-active outlet page despite visually entered Home.

No second guard was visible. Discard was invoked through its visible control,
but absence of the synthetic draft through the normal editor and ordinary
subsequent Log Meal chooser behavior are **NOT VERIFIED — stop rule**.
No personal/valuable draft appeared. The older synthetic draft was not visible
on this launch, and no app process existed before installation: its disappearance
cannot be attributed to this install. No explicit old-draft cleanup occurred.

### Evidence, cleanup, and integrity

Key evidence under `E`:

- `preflight.json`, `tracked-before.csv`, `historical-before.csv`, and byte-exact
  `navigation-report-before.md`.
- `production-build.log`, `build-result.json`, full web manifest, preservation
  scripts, `packaging.log`, complete original/candidate archive inventories,
  `content-verification.json`, alignment/signature/package/native checks.
- `installed-artifact.json`, `bundle-verification.json`, `adb-actions.jsonl`,
  `synthetic-network.jsonl`, `request-summary.json`, and `verdict.json`.
- App-only PNG/JSON captures `01` through `12`: particularly
  `07-stayed-on-estimate`, `08-adjust-once-active-editor`,
  `09-after-adb-system-back`, `10-home-discard-guard`,
  `11-discarded-dashboard`, and `12-discard-settled-dashboard`.
- `08-editor-hit-testing.json`, keyboard visibility flags,
  `11-readonly-settled-check.json`, `11-page-ownership.json`, `harness-notes.txt`.
  Capture 11's intended-check name does not claim a passing acceptance result.
- `verify_recorded_evidence.py` checks retained evidence without device input;
  it confirms the two passing branches and the recorded Discard blocker.
- `cleanup.json` and final integrity records.

Task-owned reverse `tcp:8000` and the allocated WebView forward were removed
precisely. Both initial and final mapping lists are empty. Only this task's
synthetic backend PID 25420 was stopped; its listener is closed. Each one-shot
CDP connection closed after its read. The APK stays installed and the app remains
at the observed Dashboard state. No app storage, History, camera/gallery, personal
records, device font/rotation/accessibility settings, or upstream provider was
used or changed. Keyboard diagnostics retain only visibility flags.

All 1,162 tracked files matched preflight before appending this report. The final
integrity check records the report as the only tracked change, with the complete
historical prefix preserved; HEAD and staged contents remain unchanged. Both
historical untracked reports remain byte-identical. No commit, reset, stash,
branch switch, amend, push, or merge occurred. This appendix remains unstaged and
uncommitted for review. No frontend/backend/Rust/scientific suites were rerun;
production build, APK checks, and the requested device assertions are this run's
validation. Required device acceptance is incomplete, so no overall PASS is claimed.

Remaining: resolve the Discard outlet/overlay cleanup mismatch, then finish
synthetic normal-editor cleanup and subsequent chooser confirmation under an
approved follow-up. Wider J9, recovery, privacy, reproducible native build,
recognition, scientific validation, human evaluation, and identity work remain
open. This run does not close the complete physical-confirmation gate for HEAD.


---

## 2026-09-07 — DISCARD OVERLAY LIFECYCLE REPAIR

Status: **PASS FOR INDEPENDENT REVIEW — browser/source repair only.**

Starting commit: `9ee0b6743576983453ba666845b9a74343673ccc` on
`codex/j9-hardening-final`. The repair commit is the single scoped commit that
contains this report; its hash is recorded in the task handoff because a commit
cannot contain its own hash.

This changes only the current Ionic React/Capacitor compatibility client. No
device, APK, provider, dependency, backend, Rust, scientific, privacy, recovery,
or native-identity work was performed.

### Red reproduction and cause

The focused production-preview sequence was:

`cold Dashboard → Log Meal → manual synthetic estimate → Home →`
`Discard and leave`.

On the starting implementation the final diagnostic was:

```text
pathname: /dashboard
enteredHomePages: 1
outletAriaHidden: true
bodyBackdropNoScroll: true
```

The test failed 0/1 on the post-discard shell cleanup assertion while Home was
already the single entered page. The route and visible destination were therefore
insufficient evidence of a usable app shell.

The checked-in installed Ionic source confirms the ordering. A destructive alert
button runs its handler before Ionic Core resumes `dismiss()`. The former handler
synchronously cleared the estimate and current-meal stores, cleared React pending
state, and navigated. That conditionally unmounted `IonAlert`; Ionic React removed
the still-open `ion-alert` node. When Core resumed, `getPresentedOverlays()` could
no longer see the alert, so the last-overlay cleanup did not remove the owning
outlet's `aria-hidden` or `body.backdrop-no-scroll`. Clearing the stores at that
point could also expose the estimate route's invalid-state redirect before the
intended destination was entered.

### Repair and lifecycle ordering

`MealFlowGuard` now holds only a snapshot of the destructive pending navigation
in a `useRef`. The destructive button handler records that intent and returns; it
does not update React state, touch a store, arm a bypass, or navigate.

`ionAlertDidDismiss` takes and clears the ref, then performs exactly one departure
in the experimentally demonstrated order:

1. arm the bypass for the snapshotted destination;
2. clear the estimate;
3. reset the meal draft;
4. clear pending guard state;
5. preserve the original PUSH-versus-REPLACE navigation action.

The intent is cleared on Stay, on a newly blocked departure, after consumption,
and on guard teardown. The existing single blocker and destination-bound one-shot
bypass are unchanged. No delay, second state variable, second blocker, router
mutation, Ionic patch, or App change was added.

### Behavior evidence

- Home Discard: `/dashboard`, one entered Home page, owning outlet accessible,
  body scroll unlocked, no connected alert or presented blocking overlay, one
  preview, zero saves, then ordinary Log Meal → Home navigation passed.
- Previously visited History: Home Stay followed by History Discard reached
  `/meals`, not Home; outlet/body cleanup passed and later Home navigation worked.
- Repeated guard use: after one completed destructive flow, a fresh manual draft
  used Stay without replaying the earlier destructive instruction.
- Stay: cold Home → Stay → Adjust, repeated Stay, and visited-History Stay all
  remained green. The draft identity and values remained intact with one preview
  and zero saves.
- Unit coverage observes that route and draft remain unchanged immediately after
  the destructive handler, then clear/navigate only after mocked didDismiss;
  estimate and meal cleanup each execute exactly once. Existing tests continue to
  prove destination-bound, one-shot bypass consumption.

### Verification

All final browser runs used Node `22.22.2`, Electron 118, and a production Vite
preview at `127.0.0.1:4173` with synthetic data.

- RED focused regression: 0/1 as recorded above. The first launch omitted the
  explicit production base URL and never reached product code; it is retained as
  harness evidence and is not counted as the red reproduction.
- GREEN focused regression: 1/1.
- Focused guard units: 3 files, 15/15 tests passed. Existing React `act(...)`
  warnings remain.
- J9 full spec: 22/22 passed. An earlier 21/22 run exposed one unrelated transient
  History-scroll Back-button lookup; the unchanged test passed on the final rerun.
- Routed J8/B2: 2 specs, 6/6 passed, including stale estimate, recalculation
  failure, and successful retry.
- Full production-preview Cypress: 18/18 specs, 165/165 tests passed. J7 ran once
  in this full pass and passed 15/15.
- Full frontend unit suite: 60/60 files, 697/697 tests passed with the existing
  synthetic-error logs and React/jsdom warnings.
- Standalone TypeScript: passed.
- ESLint: passed.
- Final production build: passed, 321 modules transformed, 35 output files.
  Entry `assets/index-CwEoWPc2.js`, SHA-256
  `FE93B0B29C34346FEFF9F85B6BA33151B7D808DF40EC504ED125FF5EF9192BDC`.
- `git diff --check`: passed.

Raw logs, the red screenshot, and the byte-exact pre-edit report snapshot are in
`C:\Users\Parth Ganguly\AppData\Local\Temp\insight-discard-overlay-repair-20260907-01`.
The complete historical report remains preserved as this section's prefix. The
two historical untracked J9 reports remain outside the commit.

Backend, Rust, and scientific suites were **NOT RERUN — UNCHANGED**.

### Remaining

- Independent Flash review of the actual diff.
- New APK packaging under separate approval.
- Targeted Samsung confirmation of both Home → Stay → Adjust and Home → Discard
  cleanup.
- Wider J9 and every previously open release, recovery, privacy, recognition,
  scientific-validation, human-evaluation, and identity gate.

This PASS is limited to the browser/source lifecycle repair. It is not release or
wider J9 acceptance.
