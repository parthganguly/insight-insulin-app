# INSIGHT BASELINE 1 RESULT

Date: 2026-09-05. **BLOCKED — candidate checkpointed; test-only repair is not verified.**
Scope: current Ionic/Capacitor implementation (compatibility client during migration).
No target native implementation or scientific validation is claimed.

## Repository and recovery snapshot

- Canonical repository: `C:\Users\Parth Ganguly\Documents\Codex\2026-06-21\github-plugin-github-openai-curated-remote\work\insight-insulin-app`.
- Branch: `codex/j9-hardening-final` throughout.
- Historical base / starting HEAD: `56e218be6ef3386de473754e9f49ac4680ca7d45`.
- Baseline checkpoint / final HEAD: `3a0763a4ad609d65b3064b7f9aede49112a98d87`,
  `Checkpoint J9 hardening and camera recovery candidate`.
- Initial state: 10 staged paths, 8 unstaged paths, 2 untracked candidate files;
  all 20 belonged to existing J9/recovery work. No unrelated staged content or
  concurrent candidate changes were observed. Both initial diff checks passed.
- Every proposed delta and new file was inspected; explicit paths were staged.
  No credentials, real imagery, private payloads, databases, or build outputs
  were included. This checkpoint records an **unaccepted candidate**.
- Remaining changes: the affected J8 spec and this report, intentionally
  uncommitted. No verified-repair commit was created; no push, PR, or merge.

Before changing the index, the 20 original candidate files were copied and
hash-verified outside the repository at
`C:\Users\Parth Ganguly\AppData\Local\Temp\insight-baseline-1-20260905-01`
(called `E` below). Original staging is recoverable from `staged.patch`,
`unstaged.patch`, `initial-status.txt`, and `candidate/`.

| Snapshot file | SHA-256 |
| --- | --- |
| `candidate-sha256.csv` (20 original file hashes) | `5E509BF2E0B1644A1D0D6544C0EC4AA5FE8833C29F60C09CDB80D5E288B10A2D` |
| `protected-sha256.csv` (267 source/test/configuration hashes) | `BB2602229EB840037C6CF528DC865469DE0A684DCAD5DDDB29DB30D06FD20302` |
| `staged.patch` | `E21BAF1E7B4B76C0A4E3F4B43555E286329EBECB9289927654C2FA3551ECF735` |
| `unstaged.patch` | `C82DB7E4CC27BE7BD821081C76339255E672C2D411764A8D6731E00B745D8B03` |

Relevant candidate production-file SHA-256 values (original working-file bytes,
including original line endings):

| File under `frontend/src/` | SHA-256 |
| --- | --- |
| `components/MealFlowGuard.tsx` | `46428FE8914247C3BEF201E3F3BF59219F198E6B497FCD5E8188ABFC1DB56699` |
| `main.tsx` | `620A1576A44771AC2C62EFA2AEB63360A8AB9AAB8A98DF344F6A29A1B0A2554F` |
| `pages/meal/AiMealAdd.tsx` | `A954489D98C11C698D2F32B862187AD58F1F1FD028B6499394A481D524FE4469` |
| `pages/meal/MealEstimate.tsx` | `BEC592ABFF9AE80B7557FF8B21C59BDD91B43064412F6177A863574E4B5A1A51` |
| `pages/meal/PreviewMeal.tsx` | `4891C314B3F0606635D6A301883145E04C981AD5C625E8AE4765319100E93DDF` |
| `pages/meal/SavedMealDetail.tsx` | `D1253CE9D8021097E9575AD120D10F5F5D49B40EA5664B401AC0496C53640E75` |
| `pages/settings/Settings.tsx` | `AC59C1948CECEEEAE5F895E5C33FD9541D3DA712100B92D59374DB3C21ED884A` |
| `theme/app.css` | `72E679C81FBF2839E65BFBF9D4A22CDD1199767DCD05B41C5B11DB54E9C6D277` |
| `utils/cameraRecovery.ts` | `3CDD1EF7D483139CBFAF06EE5DC7A3CF6CAF1FD888A825C7C01BF718B7D1176E` |
| `utils/mealFlowGuard.ts` | `D28C1D9EDEF90671B55AEF235A6958418DC00EE7F5442A8F4C4B5125D839F363` |

## Reproduced failure and origin

Fresh production build, own Vite preview on `127.0.0.1:5173`, Cypress's unchanged
`http://localhost:5173` base URL. Port 5173 was free before startup; strict-port
startup and the listener PID confirmed ownership. No old dev server was used.
HTTP inspection found the built `/assets/index-BuOvSATb.js`, no `/@vite/client`,
and `text/html` (SPA fallback) for `/src/stores/currentMealStore.ts`.

Baseline J8: **4 passed, 1 failed**:
`TypeError: Failed to fetch dynamically imported module: http://localhost:5173/src/stores/currentMealStore.ts`.
The failure screenshot shows the fresh active estimate, score 67 and
**Save to History**; the attempted import failed before stale-state assertions.
Evidence: `E/j8-before.log`, `E/preview-proof.log`, and the failed-test screenshot
under `E/repro-screenshots/j8-estimate-porcelain.cy.ts/`.

This is **candidate-introduced**, not a committed-base source-import defect.
`git show 56e218b:frontend/cypress/e2e/j8-estimate-porcelain.cy.ts` contains the
original Adjust/edit/Back sequence. That spec last changed in `23780d8` (#131).
`git log --all -S '/src/stores/currentMealStore.ts' -- frontend/cypress/e2e/j8-estimate-porcelain.cy.ts`
found no introducing commit before checkpointing. The original working diff
replaced the UI sequence with the source import alongside J9's change from
`router.push('/meals/new', 'back')` to `router.goBack()` for Adjust. The likely
motivation was to bypass the now-invalid old sequence; Git cannot establish
the exact time, author, or intent of that uncommitted edit. The recovery report
already recorded its dev/preview difference; those counts remain historical.

## Attempted repair and authorization blocker

Only `frontend/cypress/e2e/j8-estimate-porcelain.cy.ts` was edited. The attempt
uses the existing manual-entry journey, Adjust, actual amount editing from
1 to 2, and browser Forward. It reuses `shouldBeRendered` and existing native
Ionic/DOM scrolling patterns; no support helper was changed.

The exact amount assertion passes. Forward changes the URL to
`/meals/estimate`, but the **active visible page is the Log Meal chooser**.
The assertion for `.ion-page:not(.ion-page-hidden) ion-content.estimate-page`
fails. Evidence: `E/j8-verified.log` and its failed-test screenshot under
`E/j8-verified-screenshots/j8-estimate-porcelain.cy.ts/`.

Installed `@ionic/react-router` 8.5.8 explains the mismatch:
`dist/index.js:674` treats browser `POP` as Back when the current route has
`pushedByRoute`; it selects `findLastLocation(currentRoute)`. At review that
predecessor is the chooser. At line 699 the existing predecessor's route
identity is used rather than the browser's Forward destination. Thus the URL
alone is insufficient. The existing J9 stale test passes but does not assert
the active estimate page; it cannot certify this stricter journey. Transition
timing may explain its temporary visible-footer success and needs independent
investigation, not an added sleep or forced interaction to obtain a pass.

The normal editor's Calculate action creates a new estimate on success and
stays in review on failure; it does not expose the prior stale result as an
active page. Adjust and the hero Back control use the same back-navigation
mechanism. Reloading/deep-linking an estimate loses its foreground-only state.
No supported replacement for the claimed normal journey was established.
Repairing routing, changing the product path, or asserting an inactive result
would cross the task boundary. Implementation stopped here.

All required assertions remain in the attempted test: material edit, prior
score 67, rendered stale notice, primary Recalculate, no ordinary Save, retained
result after failed recalculation, curated retry copy, and no raw synthetic
diagnostic. It also checks the recalculation request's quantity is 2 and that
editing alone did not trigger another preview. **Assertions after the active
page failure were not reached; they are not reported as passing coverage.**
No test, timeout, retry, coverage gate, or acceptance criterion was removed or
weakened. No production store import or application test hook was introduced.

Blocked attempt: `E/blocked-attempt.patch`, SHA-256
`29402EF1A3A9091935EB026C9731AB527C5ED1B938597260F84C5DD8E104A8B8`.
Current J8 file SHA-256:
`C4A78615AE3F52F02131FBEA90B80213784AE0BE241CBA732A0403E23ACAB486`.

## Commands and actual verification

All frontend commands run from `frontend/`, with process-local PATH prepended
by `C:\Users\Parth Ganguly\AppData\Local\insight-tools\node22`.
Node **22.22.2**, npm **10.9.7**, Cypress package/binary **13.17.0**, headless
Electron **118 / 27.3.10** (embedded Node 18.17.1), Vite **5.2.14**, Vitest
**0.34.6**, TypeScript **5.8.3**. Installed versions checked against lockfile.
CI specifies Node 22, a production build, preview on port 5173, and Cypress.
No runtime, dependency, lockfile, CI, or global configuration was changed.

Server command: `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5173 --strictPort`.
For the table, `CYP` means `node node_modules/cypress/bin/cypress run`.
Every run uses only `--config "screenshotsFolder=<E>/<run>-screenshots"`
to retain separate evidence; the base URL, retry/timeouts and video configuration
are unchanged. Logs are stored under `E` using the names below.

| Command / evidence | Actual result |
| --- | --- |
| `npm.cmd run build` — `build-before.log` | PASS, fresh baseline production bundle |
| `CYP --spec cypress/e2e/j8-estimate-porcelain.cy.ts` — `repro-invocation-error.log` | Invocation mistake: unquoted space in screenshot path caused EPERM creating `C:\Users\Parth`; 0/5, no screenshots. Corrected the command, not the test. |
| Same spec, correctly quoted screenshot path — `j8-before.log` | Baseline 4/5; dynamic source import fails |
| Same spec — `j8-after.log`, `j8-final.log` | Each 4/5: review heading above retained scroll; Cypress scrollIntoView does not reach Ionic shadow scroller |
| Same spec — `j8-scroll.log` | 4/5: clear normalizes empty amount to 0; typing yielded 20. Replaced with existing select-all input pattern, preserving exact expected value 2. |
| Same spec — `j8-verified.log` | 4/5: amount 2 confirmed; active estimate absent after Forward, chooser visible |
| `CYP --spec 'cypress/e2e/j9-final-hardening.cy.ts,cypress/e2e/campaign-b2-estimate.cy.ts'` — `j9-b2.log` | PASS 15/15: J9 14, B2 1 |
| `CYP` — `full-preview.log` | FAIL 155/157, 18 specs, zero pending/skipped, 3m53s; J8 active-page mismatch and unchanged J7 focus assertion |
| `CYP --spec cypress/e2e/j7-saved-result-interpretation.cy.ts` — `j7-isolated.log` | FAIL 14/15; same focus assertion reproduced without editing J7 |
| `node node_modules/typescript/bin/tsc --noEmit` — `typecheck.log` | PASS |
| `npm.cmd run lint` — `lint.log`, `lint-final.log` | PASS twice, including final attempted spec |
| `npm.cmd run test.unit -- --run` — `unit.log` | PASS 697/697, 60 files, 137.45s; process-local `VITEST_MAX_THREADS=2`, `VITEST_MIN_THREADS=1`, normal file isolation |
| `npm.cmd run build` — `build-final.log` | PASS; 35/35 output files byte-identical to the baseline build |
| `git diff --check`, `git diff --cached --check` | PASS, including final attempted spec; only existing LF/CRLF conversion advisories |

All reruns and intermediate failures above are retained; no failed run is
presented as a pass. Counts are measured, not forced to historical targets.
Totals remain 697 unit tests and 157 Cypress tests; the focused browser total
is 15 because the existing B2 case is included alongside J9's 14. Unit stderr
contains existing React act/jsdom navigation and synthetic error-path messages;
the run exited successfully with no failed tests. Worker bounds match the prior
recovery report's supported Vitest setup; no Node 26 workaround was added.
Build/Cypress emitted existing large-bundle, stale Browserslist, and Node loader
advisories. No package or warning configuration was changed.
No separate formatter is configured for this Cypress file; repository tabs and
existing style were retained and checked by ESLint/diff hygiene.

The full run's additional J7 failure is `keeps the normalization transparent
only in the deep disclosure`: `expected '<summary>' to be 'focused'` after the
existing 400 ms wait. Its screenshot and failure log are preserved under
`E/full-preview-screenshots/j7-saved-result-interpretation.cy.ts/` and
`E/full-preview.log`. J7 was not edited by this task. One isolated rerun
(`E/j7-isolated.log`) reproduced the same failure, 14/15. It is an additional
unresolved verification blocker outside the authorized file surface; no fix or
timeout change was attempted.

Backend/Rust: **NOT RERUN — UNCHANGED**. Source, fixtures, dependencies, and
execution configuration have no baseline or historical-base delta. Prior
evidence only: [Camera recovery report](j9-camera-process-death-recovery.md),
backend 98/98, internal consistency 6/6 with current golden export, Rust 211/211
with fmt/clippy clean. These are not newly executed passes or physiological
validation.

## Integrity, remaining gates, and review handoff

Production-source delta from checkpoint: none. All 267 recorded protected
file hashes match, covering frontend source and tests, native files, backend,
Rust, and selected dependency/configuration files. Scoring/data/fixtures,
recovery storage and deadlines, privacy copy, Android/native behavior, and
existing J9 work are unchanged. `focusManagerPriority` remains absent.
All **35/35 production output files are byte-identical**, including the main
bundle `index-BuOvSATb.js`, SHA-256
`57C19361D7CD0598E7EDCCB60D0516C23A5D7C2866A34BDD6CD10557A93F8634`.
Evidence: `E/bundle-before-sha256.csv`, `E/bundle-final-sha256.csv`, and
`E/integrity-final.log`. Generated evidence stays outside the repository;
`frontend/dist` is the ordinary ignored build output. No unexpected repository
files remain. The owned preview PID 24500 was stopped after verification;
no unrelated process was stopped.
Device actions and paid-provider calls: **NO**. No plugin installation/update,
hook reconfiguration, model council, toolchain install, or global changes.

Remaining gates: recovery three-second deadline/late results; privacy disclosure
alignment with temporary full images/drafts; gallery process recreation;
reproducible Android build; remaining Samsung accessibility/responsive checks;
real recognition evaluation; human meal-camera testing; physiological model
validation; native identity #96. The newly observed Forward/active-page mismatch
and reproducible J7 focus failure also need separately authorized investigation.
No gate is closed here.

Review the preserved candidate separately with
`git diff 56e218be6ef3386de473754e9f49ac4680ca7d45 3a0763a4ad609d65b3064b7f9aede49112a98d87`.
The exact baseline-to-attempt diff is
`git diff 3a0763a4ad609d65b3064b7f9aede49112a98d87 -- frontend/cypress/e2e/j8-estimate-porcelain.cy.ts`
(also saved and hashed above). The report is untracked and read separately.
Try to disprove the blocker with a supported normal UI journey that returns to
an active, visible stale estimate after a material edit, without source imports,
router/store mutation, transition races, or hidden-page assertions. Reconcile
the J9 passing footer check with the settled chooser screenshot before accepting
any repair. No independent review has been commissioned by this task.


---

## 2026-09-05 — bounded repair decision and verified result

**PASS FOR INDEPENDENT REVIEW — repair slice only.** The historical BLOCKED
record above is preserved verbatim. This appendix records the subsequently
authorized decision and new verification; it does not retroactively turn earlier
failures into passes. Scope remains the current Ionic compatibility client.

### Decision and checkpoints

Restore the accepted B2/J8 contract:
**Estimate → Adjust → edit meal → Back → active stale estimate → Recalculate.**

The constant-browser-history requirement is explicitly withdrawn: its candidate
navigation change removed the estimate entry needed by the accepted journey.
Only the historical Adjust call was restored:
`router.goBack()` → `router.push("/meals/new", "back")`.
No flow redesign, new control, focus/routing infrastructure, or target-native
implementation was introduced.

Three consecutive Adjust/Calculate cycles measured **29 → 31 → 33 → 35**
in the focused recheck, isolated J9/B2, and full suite. This is **+2 entries per
cycle in these trials**, not a demonstrated bound. The absolute starting length
reflects the browser run. History growth remains deferred, not eliminated or fixed.

- Starting branch: `codex/j9-hardening-final`; checkpoint:
  `3a0763a4ad609d65b3064b7f9aede49112a98d87`.
- Initial index empty; only the expected attempted J8 repair and untracked
  baseline report were present. No concurrent writer or unrelated change observed.
- Repair A: `c96159b61e4e588ca03342a6b2d81aae6568d14c`,
  `Restore accepted Adjust and stale-estimate journey`. Only MealEstimate,
  J8, J9, and the existing support helper were staged, after focused checks passed.
- Repair B: the commit containing this appendix and J7 readiness correction.
  Obtain its exact SHA with
  `git log -1 --format=%H -- reports/ux/premium-redesign/j9-baseline-1.md`;
  the final handoff also supplies it. No blanket staging or history rewrite.

New evidence is outside the repository at
`C:\Users\Parth Ganguly\AppData\Local\Temp\insight-baseline-1-bounded-20260905-01`
(called `R` below). Both initially dirty files were copied byte-for-byte into
`R/before/` and hash-verified before editing. Old evidence remains intact.
The original report's 14,767 bytes are preserved as this file's prefix.

| Preservation evidence | SHA-256 |
| --- | --- |
| `R/before-sha256.csv` | `5D0850EA2AC89847162AE9D7C14042C16DFD326F825A3510CD214C7B63F1054C` |
| Original J8 file | `C4A78615AE3F52F02131FBEA90B80213784AE0BE241CBA732A0403E23ACAB486` |
| Original report | `4748DF1136C9C1E46CFEB3E839E9B7F3672A7B5D63F2485ABB0947DFCE8C0BEC` |
| `R/protected-before-sha256.csv` | `4900C3E8F3C2EBAF6A364886F9F1C78E2A4405D04E7FDC38B6B1A3E376886BB1` |

### J8 red/green and J9 settled-page evidence

Before the production rollback, the strengthened J8 journey rejected the
candidate: the UI amount changed exactly from 1 to 2, but Back remained at
`/meals/new` behind **“This estimate isn't saved”** instead of entering the
estimate. `R/j8-before.log` records 4/5, with its failure screenshot under
`R/j8-before-screenshots/`. This is distinct from the older import/Forward failures.

After the rollback, J8 passes all five cases. The repaired case proves the entered
estimate retains score 67 with rendered stale copy, footer Recalculate, no normal
Save, and no unintended alert. Editing alone leaves preview-request count at one.
A synthetic 500 recalculation sends quantity 2, retains score 67, renders curated
retry copy, and never renders the raw diagnostic. Successful retry again sends
quantity 2, renders score 83, removes stale/error state and Recalculate, and
restores enabled Save. Stale/failure screenshots remain under each run directory.
No browser-Forward workaround, application-store/router mutation, or runtime
`/src` import remains in the repaired journey.

The former J9 case could observe the outgoing estimate footer during teardown
without proving a settled destination. Replacement cases check entered pages:
repeated cycles preserve meal name/amount, preview quantity, active fresh result,
Save, and absence of unintended alerts; edit/Back verifies retained stale output
and Recalculate, then quantity 2 and fresh state. J8's failure/retry suite is not
duplicated. History is recorded to `<screenshotsFolder>/j9-history-depths.json`,
not compared with an invented limit. Unrelated J9 assertions remain unchanged.

One narrowly reusable read-only helper was added to existing `insightStubs.ts`.
It requires the expected URL, exactly one matching owning page, connection,
visibility, no hidden/invisible state, no `aria-hidden=true`, interaction unblocked,
and only that active direct-child page in its own outlet. Installed Ionic source
supports this: `@ionic/core/dist/collection/utils/transition/index.js` removes
invisible/pointer-blocking state after transition; `@ionic/react-router/dist/index.js`
hides the outgoing view after the awaited outlet commit. This excludes incoming
incomplete and outgoing teardown states without global outlet checks, fixed
delays, new hooks, or application focus changes.

### J7 readiness and five outcomes

Only the deep-disclosure case replaces its candidate-added 400 ms sleep with
`getEnteredPage("/meals/saved/j7-normal-137", "ion-content.result-page")`.
Original score/content assertions and
`.focus().should("be.focused").click()` remain, scoped to that owning page.
The necessary network wait remains; no focus logic, retries, or timeouts changed.

Each trial ran the entire existing 15-test J7 spec, without filtering/configuration
changes or dependencies. Trial 1 was its portion of the combined focused run;
the other four were separate sequential invocations.

| Trial | Evidence under R | Focus/disclosure case | Whole J7 spec |
| --- | --- | --- | --- |
| 1 | `focused.log` | PASS, 1186 ms | 15/15 |
| 2 | `j7-repeat-2.log` | PASS, 1262 ms | 15/15 |
| 3 | `j7-repeat-3.log` | PASS, 1312 ms | 15/15 |
| 4 | `j7-repeat-4.log` | PASS, 1197 ms | 15/15 |
| 5 | `j7-repeat-5.log` | PASS, 665 ms | 15/15 |

Five passes are repeatability evidence, not a zero-flakiness guarantee.
J7 also passed 15/15 in the full suite.

### Commands, counts, and retained failures

Commands ran from `frontend/` with process-local PATH prepended by
`C:/Users/Parth Ganguly/AppData/Local/insight-tools/node22`.
Node 22.22.2, npm 10.9.7, Cypress 13.17.0, headless Electron 118 / 27.3.10,
Ionic React Router 8.5.8, Vite 5.2.14, Vitest 0.34.6, TypeScript 5.8.3.
Ponytail Full is session-only: minimal implementation, full verification;
no global/default/plugin changes.

Server:
`node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5173 --strictPort`.
Port ownership was verified; no old dev server was used. Cypress retained
`http://localhost:5173`. HTTP checks confirmed 200, the rebuilt asset, no dev client.

`CYP` below means `node node_modules/cypress/bin/cypress run`.
Each invocation adds only
`--config "screenshotsFolder=<R>/<run>-screenshots"`; names match the log stem.
The complete spec arguments are:

- J8: `cypress/e2e/j8-estimate-porcelain.cy.ts`.
- J7: `cypress/e2e/j7-saved-result-interpretation.cy.ts`.
- J9/B2: `cypress/e2e/j9-final-hardening.cy.ts,cypress/e2e/campaign-b2-estimate.cy.ts`.
- Combined: `cypress/e2e/j8-estimate-porcelain.cy.ts,cypress/e2e/j9-final-hardening.cy.ts,cypress/e2e/campaign-b2-estimate.cy.ts,cypress/e2e/j7-saved-result-interpretation.cy.ts`.
- Recheck: `cypress/e2e/j8-estimate-porcelain.cy.ts,cypress/e2e/j9-final-hardening.cy.ts,cypress/e2e/campaign-b2-estimate.cy.ts`.

| Actual command | Evidence under R | Actual result |
| --- | --- | --- |
| `npm.cmd run build` | `build-before.log` | PASS, fresh goBack candidate |
| `CYP --spec '<J8>'` | `j8-before.log` | Expected FAIL 4/5, amount 2 then Back exit guard |
| `npm.cmd run build` | `build-restored.log` | PASS, restored Adjust build |
| `CYP --spec '<Combined>'` | `focused.log` | 34/35: J8 5/5, J9 13/14, B2 1/1, J7 15/15; new Calculate selector matched host and inner button |
| `CYP --spec '<Recheck>'` | `focused-recheck.log` | 19/20: J8 5/5, J9 13/14, B2 1/1; untouched History Back selector missing |
| `CYP --spec '<J7>'`, four separate invocations | `j7-repeat-2.log` through `j7-repeat-5.log` | Each PASS 15/15; all outcomes above |
| `CYP --spec '<J9/B2>'` | `j9-b2-isolated.log` | PASS 15/15 |
| `CYP` | `full-preview.log` | PASS 157/157, 18 specs, 4m14s, zero pending/skipped |
| `npm.cmd run test.unit -- --run` | `unit.log` | PASS 697/697, 60 files, 208.39s; process-local `VITEST_MAX_THREADS=2`, `VITEST_MIN_THREADS=1`, normal isolation |
| `node node_modules/typescript/bin/tsc --noEmit` | `typecheck.log`, `typecheck-final.log` | PASS both |
| `npm.cmd run lint` | `lint.log`, `lint-final.log` | PASS both |
| `npm.cmd run build` | `build-final.log` | PASS; 35/35 output files match the repaired build used for Cypress |
| `git diff --check`, `git diff --cached --check` | Explicit staging/final checks | PASS; LF/CRLF advisories only |

The new Calculate selector was narrowed to
`ion-button[aria-label='Calculate estimate']`, preserving a single-element
assertion and ordinary click. No multiple/forced-click workaround was added there.
The unrelated History case was **not edited**: it failed once finding its Back
selector, but passed in the initial combined run, isolated J9/B2, and full suite.
Its failure log/screenshot remain under `R/focused-recheck*`. No root cause or
flakiness fix is claimed; independent review should consider this caveat.
All failed attempts remain recorded.

Durable counts remain J8 5, J9 14, J7 15, Cypress 157, unit 697. Two superseded
J9 cases were replaced, J8 extended through successful retry, and J7 assertions
preserved. No tests/coverage were deleted or skipped. No formatter is configured
for these files; existing tabs/style were retained and ESLint/diff hygiene checked.
Existing bundle/Browserslist/loader and unit synthetic-error/React act/jsdom
warnings remain unsuppressed.

Backend/Rust/scientific: **NOT RERUN — UNCHANGED**. Source, dependencies, fixtures,
and configuration have no delta. Prior evidence only:
[Camera recovery report](j9-camera-process-death-recovery.md), backend 98/98,
internal consistency 6/6 with golden export, Rust 211/211 with fmt/clippy clean.
These are not newly executed passes or physiological validation.

### Integrity and remaining review gates

Exactly one production line differs from 3a0763a: the authorized Adjust rollback.
The protected manifest now covers 268 tracked files because the checkpoint includes
the previously untracked Settings test; 267 remain byte-unchanged and only
MealEstimate differs. Existing J9/recovery code, guards, save ownership,
idempotency, deadlines, stores, scoring, datasets, backend/Rust, privacy copy,
native files, dependencies, and CI/configuration remain intact.
Evidence: `R/protected-final-sha256.csv`, `R/integrity-final.log`.

New production asset: `index--ckxPnFd.js`, SHA-256
`DAB245A33D9C828085E038B45E1F069689013146003E03E1155CD4DC243F3AB1`.
`R/bundle-restored-sha256.csv` and `R/bundle-final-sha256.csv` match for all
35 files. This differs from the historical candidate: the old installed APK/hash
is **not** acceptance evidence for repaired source. Only ignored web build output
was generated. Owned preview PID 17544 was stopped after verifying its executable
and exact command.

No push, PR, merge, reset, stash, amend, branch deletion, Android rebuild/install,
device/camera action, paid-provider call, plugin installation/update, hook
reconfiguration, or global-default change occurred. Browser data and responses
were synthetic. Independent review has not been commissioned here.

The next reviewer must inspect the actual two repair diffs and retained failures.
The later targeted physical recheck must cover:

- Adjust → edit → Back → active stale result;
- recalculation failure and successful retry;
- hardware Back and draft preservation.

Other gates remain open: recovery three-second deadline/late results; privacy
alignment with temporary full images/drafts; gallery process recreation;
reproducible Android build; remaining Samsung accessibility/responsive checks;
real recognition evaluation; human meal-camera testing; physiological model
validation; native identity #96. History growth and the untouched History-test
intermittency remain disclosed limitations. This PASS accepts only the repair
slice for independent review, not merge, release, or scientific validation.
