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
