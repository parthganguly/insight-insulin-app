# Paper native navigation contrast repair

**Current status: PASS — the device continuation below closes the Paper
native-navigation blocker and completes the stopped J9 appearance branch.**
The initial BLOCKED run is preserved below as historical evidence.

Status: **BLOCKED — portrait repair passes; landscape setup mismatch triggered the stop rule.**

Final commit: none. The requested checkpoint requires complete device acceptance.

Starting HEAD: `ed5a3b3a0608340590c1c19cf37cfd8bc6969db7`.
Branch: `codex/j9-hardening-final`. This is a repair to the current Ionic/Capacitor
compatibility client, not expansion of the deferred native target.

## Prior evidence and scope

The historical Samsung matrix is preserved at
`C:\Users\Parth Ganguly\AppData\Local\Temp\insight-j9-matrix-c26a06b658a3449bb70ee80b618a155e\J9-ACCESSIBILITY-SAMSUNG-MATRIX.md`.
Its Paper landscape Settings failure stopped Paper Home/estimate and explicit
Ink acceptance. The supplied request establishes the forensic cause: runtime
Settings updates status icons but never navigation icons. Source inspection
agrees. The separately named Gemini review was not located; its supplied
mechanism is not represented here as a newly performed forensic review.

## Production delta and ownership

- `frontend/android/app/src/main/java/io/ionic/starter/NavigationBarPlugin.java`:
  local Capacitor `NavigationBar.setAppearance({ lightNavigationBars: boolean })`.
  Missing/non-boolean values reject. The AndroidX navigation appearance setter
  runs on the main thread and resolves after application.
- `frontend/android/app/src/main/java/io/ionic/starter/MainActivity.java`:
  registers the plugin before `BridgeActivity.onCreate` creates the bridge.
- `frontend/src/App.tsx`: resolved Paper sends true; resolved Ink sends false,
  including System. Calls are native Android only; rejection is caught.
- `frontend/src/App.test.tsx`: runtime intent and failure/browser regression checks.

The installed Capacitor Android version is 7.4.1. Its public `registerPlugin`
adds to the bridge builder; `PluginCall.getBoolean` accepts only Boolean values.
The existing StatusBar plugin demonstrates public main-thread dispatch.
Runtime status icons remain owned by `@capacitor/status-bar`; runtime navigation
icons belong to the new local plugin. Existing MainActivity startup, splash
exit, and configuration paths continue to synchronize both using the effective
`window.__APP_APPEARANCE`. No main.tsx change, new startup polling, dependency,
navigation color, edge-to-edge, scientific, persistence, or privacy change.

## Automated RED/GREEN and review

Before production edits, App tests failed in both System resolutions because
no navigation intent was emitted; the rejection test also failed because no
bridge call existed (3 failed / 3 passed). After implementation, a mock-reset
problem was corrected by restoring its promised result before each test.
Final focused appearance/App/Settings run: 17/17 passed. Scoped ESLint passed;
TypeScript and production build passed. Existing bundle-size and stale
Browserslist warnings remain. No new native test framework was added.

Independent read-only agent review of the actual staged four-file diff found
no actionable issues: registration, strict boolean validation, UI-thread
dispatch, resolved appearance, and status/startup ownership checked.

## Evidence location

Build logs and targeted physical captures:
`C:\Users\Parth Ganguly\AppData\Local\insight-build-evidence\2026-09-09-paper-navigation`.

Preflight matched expected HEAD, clean tracked/staged files, and the two
historical untracked reports. No concurrent writer was observed. Samsung
SM-M356B `RZCY22FGP1Z` was authorized; font 1.0, auto-rotate 1, user rotation 0,
actual portrait, three-button navigation mode 0, System resolving to Ink,
and empty forward/reverse mappings. Historical report hashes were recorded.

## Remaining gates

Recognition evaluation, scientific validation, native identity, and deferred
late-result P2 remain separate. This task does not approve a wider release.

## Build and installed identity

Node 22.22.2; existing installed dependencies; normal `npm run build` →
`npx cap sync android` → `gradlew assembleDebug --no-daemon`. Oracle JDK 21,
Android SDK `C:\ansdk`, process-local
`JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:\insight-nio-900b3acf`.
Gradle passed (247 tasks, 27 executed). No repacking/preserved-shell workflow.

- Bundle: `assets/index-i22jeT3M.js`.
- Bundle SHA256: `14E89C5C8D5FBEFCDE0C431AB0D54C5250ABCEEC1E72D675A4432264827AC8AD`.
- APK: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.
- APK and pulled installed base.apk SHA256:
  `59C7B3647E1C09DD590F893B67932B09E32995E6618E8CDDC8BEA8D1F7A9194E`.
- Package `io.ionic.starter`, versionCode 1 / versionName 1.0, minSdk 23,
  targetSdk 35. Debug certificate SHA256
  `097f30af00f956c0143d5a8ca01d4a5b271c7e3f97126b13b1a9f3826aaf1d9a`.
- apksigner v1/v2 verification and zipalign passed. Standard META-INF v1
  coverage warnings were retained in signature.txt; APK v2 verification passed.
- `adb install -r` succeeded; no uninstall or data clear. Live WebView fetched
  the above bundle and independently returned the matching SHA256.

## Targeted physical results and stop

| Case | Result | Evidence |
|---|---|---|
| Cold System (resolves Ink) | PASS, light native status/navigation icons | 01-cold-system |
| Portrait 1.0 System | PASS, selected System, effective Ink | 02-portrait-system |
| Portrait 1.0 Paper | PASS, dark status and Back/Home/Recents icons immediately after real radio tap | 03-portrait-paper |
| Portrait 1.0 Ink | PASS, light status/navigation icons after real radio tap | 04-portrait-ink |
| Portrait 1.0 System return | PASS, effective Ink retained | 05-portrait-system-return |
| Landscape 1.3 setup | BLOCKED: actual portrait, user_rotation read back 0 | 06-landscape-system; landscape-setup-mismatch.txt |

Paper's app window reports hexadecimal `apr=18`, containing light-status 0x8
and light-navigation 0x10. Ink/System-Ink windows omit `apr` (zero appearance
flags). Native screenshots confirm the icon contrast; the aggregate is recorded
as evidence rather than hardcoded as the product contract.

After setting font scale 1.3, accelerometer_rotation 0, and user_rotation 1,
the captured app was Home in portrait (411×891), and the OS reported
user_rotation 0 / USER_ROTATION_LOCKED. Font scaling recreated the activity
and returned to Home. The file named 06-landscape-system is explicitly a
failed setup capture, not evidence of landscape acceptance. No claim is made
about the cause of the rotation-setting mismatch. The run stopped here;
no orientation retry, production patch, or navigation-mode change followed.

Landscape System/Paper/Ink, Paper rotation persistence, Ink rotation,
cold explicit Paper/Ink, Paper Home/estimate, and remaining explicit Ink
surface cases are **NOT RUN**. Portrait success alone does not close the
historical landscape blocker or the stopped appearance branch.

## Requests, cleanup, and integrity

The loopback synthetic backend recorded three empty GET /meals responses,
**zero previews, zero saves, zero deletes, zero provider requests**. No
camera/gallery use, no draft creation, no meal-data mutation. It was stopped.
Original System appearance (effective Ink), font 1.0, and user rotation 0 were
restored. The first auto-rotate restoration read back 0; cleanup reapplied
the original value separately. Final verification is recorded in cleanup.json.
Forward/reverse mappings were removed, restoring their original empty state.
The verified APK remains installed.

The four production/test files are staged for review; this report is the only
new repository report. Both historical untracked reports remain separate and
unchanged. No commit, amend, push, merge, or unrelated source change. Scoped
diff whitespace checks pass. Device acceptance remains incomplete.

## 2026-09-09 device continuation — PASS

This continuation changed no production/test source, rebuilt nothing, and
installed nothing. Branch and starting HEAD remained exactly as recorded above;
the existing four-file staged repair plus report were the only tracked changes.
The installed base.apk was pulled again and matched SHA256
`59C7B3647E1C09DD590F893B67932B09E32995E6618E8CDDC8BEA8D1F7A9194E`.
The live WebView fetched `assets/index-i22jeT3M.js` and returned SHA256
`14E89C5C8D5FBEFCDE0C431AB0D54C5250ABCEEC1E72D675A4432264827AC8AD`.
No repeat of the already-passed portrait 1.0 matrix was performed.

### Setup and restoration authority

Actual preflight: font 1.0, accelerometer_rotation 1, user_rotation 0,
WindowManager rotation 0 / USER_ROTATION_FREE, navigation mode 0, System
resolving to Ink, empty ADB mappings. All were restored after acceptance.

Set font_scale 1.3 separately and let configuration recreation settle. Confirmed
font 1.3 and responsive, complete Home document before requesting rotation.
Read `adb shell wm help`, which documents
`user-rotation [-d DISPLAY_ID] [free|lock] [rotation]`.
Then `adb -s RZCY22FGP1Z shell wm user-rotation lock 1` succeeded.
Before product input, all three agreed: WM rotation 1 / ROTATION_90,
native screenshot 2340×1080, CSS viewport 891×411 at DPR 2.625.
This resolves the previous setup issue without a product change.

### Targeted acceptance

Evidence is in the `continuation` subdirectory of the evidence location above.
Each accepted capture includes JSON state, native PNG, and app-window dump.

| Case | Result | Capture |
|---|---|---|
| Landscape 1.3 System | PASS, selected System/effective Ink, light native icons | 02-landscape-system |
| Landscape 1.3 Paper | PASS, dark status and Back/Home/Recents, Paper background | 03-landscape-paper |
| Landscape 1.3 Ink | PASS, explicit Ink, light status/navigation icons | 04-landscape-ink |
| Paper landscape → portrait → landscape | PASS, selected/effective Paper and dark icons persisted | 05 / 06 / 07 |
| Ink landscape → portrait | PASS, light native icons persisted | 04 / 08 |
| Explicit Ink Home | PASS | 09-ink-home |
| Explicit Ink estimate | PASS, synthetic score 67, zero saves | 11-ink-estimate |
| Paper Home | PASS | 12-paper-home |
| Paper estimate | PASS, synthetic score 67, zero saves | 13-paper-estimate |

Every Paper app-window capture contains both light-status 0x8 and
light-navigation 0x10 (`apr=18` in hexadecimal). Ink/System-Ink omit both
bits. Native screenshots were visually inspected and agree with the flags.
All 11 accepted captures have one active direct outlet page, accessible
outlet, unlocked body, and no presented overlay. Orientation dimensions were
checked against the intended state. No stale Ink native state appeared.
`verify.py` provides the runnable offline structural/flag/request check;
`verification.json` records PASS. Its initial request assertion omitted the
legitimate empty GET /meals caused by cleanup recreation; this evidence-only
assertion was corrected without repeating any device case.

An initial Settings selector from the previous run had no matching aria-label
after recreation; it emitted no input. The observed Settings class was then
used. Capture 10-ink-estimate is an editor setup capture: the first Calculate
input had zero amount and emitted no request. After entering the required
amount 1, capture 11 is the accepted Ink estimate. Neither setup observation
is represented as a failed product appearance case or a retry of such a case.

### Request integrity and cleanup

Reused the existing deterministic loopback fixture with two synthetic manual
drafts, one per estimate appearance. Totals: **2 previews (both 200), 0 saves,
0 provider calls, 0 deletes, 0 camera/gallery actions**; two OPTIONS preflights
and one empty GET /meals also occurred. No real data or scientific validation
claim. Both task-created drafts were discarded via ordinary UI solely to
change appearance/clean up; the Stay/Adjust/Back regression sequence was not
repeated. The initial owner's empty meal state was preserved.

Restored System through the real radio; restored font 1.0 and waited for
recreation; `wm user-rotation free` restored the original policy. Final
verification: accelerometer_rotation 1, user_rotation 0, WM rotation 0 and
USER_ROTATION_FREE, native capture 1080×2340, CSS 411×891, effective Ink.
Capture 14-cleanup and cleanup-orientation.txt preserve the final state.
Task backend PID 27508 was stopped; forward/reverse mappings returned to empty.
APK remains installed; no data clear, navigation-mode change, or reinstall.

### Checkpoint and gate ruling

**PASS: the Paper native-navigation blocker is closed and the stopped J9
appearance branch is complete within the requested Samsung scope.** This
continuation does not claim a new cold explicit Paper/Ink test, a full J9 rerun,
cross-device qualification, scientific validation, or wider release approval.
Recognition evaluation, scientific validation, native identity, and the
deferred late-result P2 remain separate.

One scoped local commit contains the original four repair files and this
report. The two historical untracked reports remain unchanged and excluded.
No amend, push, or merge. Prior source/build checks and independent staged-diff
review remain applicable because the production/test patch did not change.
