# Campaign A — Native Android QA (first on-device validation)

- **Date:** 2026-07-17
- **Tester:** Claude Code (Fable 5), single agent, sequential, observation-first
- **Baseline:** `main` @ `19a690e` — "Campaign A: complete the consumer meal journey (#95)".
  PR head `96b4336` was squash-merged; its tree hash (`d36e6ba6`) is identical to HEAD's
  tree, so HEAD contains exactly the reviewed content.
- **Scope:** Installed native Android app via ADB. Not the Vite browser build.
- **Campaign B:** not started.

## Device

| Field | Value |
|---|---|
| Serial | RZCY22FGP1Z |
| Manufacturer / model | Samsung SM-M356B (Galaxy M35 5G) |
| Android / API | Android 16, API 36 |
| Screen | 1080×2340 @ 450 dpi (override 420), portrait, punch-hole cutout |
| Navigation mode | 3-button (`navigation_mode=0`) |
| Type | Physical device, USB, secure keyguard enabled |

## Build & install

| Field | Value |
|---|---|
| Commands | `npm run build` → `npx cap sync android` → `gradlew assembleDebug` |
| APK | `frontend/android/app/build/outputs/apk/debug/app-debug.apk`, 8,565,401 bytes |
| Package ID | `io.ionic.starter` (still Capacitor starter default — release blocker noted below) |
| Version | versionName 1.0, versionCode 1; minSdk 23, target/compile SDK 35; Capacitor 7.4.1 |
| Signing | debug keystore |
| Build time | ~7 s incremental (247 tasks, 21 executed) |
| Install | Prior dev install (2025-08-31) had an incompatible signature → **user approved** uninstall + fresh install. `adb install` succeeded; `pm` shows lastUpdateTime 2026-07-17 14:22:35; launch activity resolves to `io.ionic.starter/.MainActivity`. |

## Backend link

- Local FastAPI via `.venv` uvicorn on `127.0.0.1:8000` (localhost only, no LAN/tunnel).
- `adb reverse tcp:8000 tcp:8000` (evidence: `UsbFfs tcp:8000 tcp:8000`); app default
  URL `http://127.0.0.1:8000` reached the dev backend with **no source changes**.

## Results

| # | Journey | Result |
|---|---|---|
| 6 | Cold launch, Home renders, correct foreground activity (pid 17098), no crash/ANR | **Pass** |
| 6 | Status/nav bars, insets, bottom tabs not overlapped (3-button nav) | **Pass** |
| 7A | Home ↔ Settings, hardware Back returns to Home | **Pass** |
| 7A | Log Meal shows Photo / Manual / Previous; History read-only list | **Pass** |
| 7B | Keyboard on meal-name, amount (numeric), Advanced-details fields; field stays visible; Save/Done/Remove not permanently covered; scroll works with keyboard open; Back dismisses keyboard; draft intact | **Pass** |
| 7C | Dirty draft + hardware Back → explicit "Discard this draft?" dialog; Stay preserves all names/amounts/units; second Back + Discard lands on Log Meal chooser with draft cleared (verified by re-entry) | **Pass** |
| 7C | Same via Home tab tap: dialog appears; Stay preserves; Discard lands on Home | **Pass** |
| 7D | Background 10 s (Home key) with dirty 3-item draft → resume: route + all values intact | **Pass** |
| 7D | Background 10 s from saved Meal result → resume: identical result screen | **Pass** |
| 7D | Screen-off/on cycle | **Blocked** — device has a secure keyguard; resume requires user auth, excluded by task rules |
| 7E | Calculate & save: exactly **one** `POST /meals` in backend access log; canonical result renders with cautious language; meal in History; History detail read-only (Done / Check another / Delete only) | **Pass** |
| 7E | Previous-meal reuse creates fresh editable draft ("Editable draft — not saved yet", new timestamp); saving it creates a **new** meal; original unchanged (verified via API: 2-item original + 3-item copy) | **Pass** |
| 7F | Smart Camera → real system camera intent; synthetic dark-frame photos only; thumbnail renders; second angle added; one removed with no stale "no photo" message; background/resume with image state intact | **Pass** |
| 7F | Camera permission denial | **Not testable** — app delegates to the system camera intent, which never presents a runtime CAMERA permission prompt, so there is no denial path to exercise in this flow |
| 7G | Rotation (no manifest lock): landscape renders correctly (content column, tabs full-width, photo state kept), back to portrait clean; no crash/duplicate/modal break. Device auto-rotate settings restored afterwards | **Pass** |

## Phase 8 — native diagnostics (filtered logcat, 260k lines)

- FATAL EXCEPTION / ANR for app process: **0**
- WebView crashes, JS console errors, activity-recreation loops, process deaths: **none**
- Failed backend requests from the app: **none** (all `/meals`, `/metrics/chronic` → 200)
- Benign notes (app pid 17098):
  - `Keyboard.getResizeMode` → `UNIMPLEMENTED` once at startup (known Capacitor Android gap)
  - `Camera.getPhoto` → "User cancelled photos app" ×3 (deliberate QA cancels)
  - `E Capacitor: Couldn't save last Camera's Plugin getPhoto call` ×2 on background —
    state nevertheless restored correctly on resume
- `FirebaseSessions` DNS errors in the log belong to **other processes** (different PIDs);
  INSIGHT contains no Firebase.
- Excerpts: `logcat-filtered-excerpts.txt` (no personal data, tokens, or full payloads).

## Defects & observations (no Campaign-A native defect found)

| # | Severity | Type | Finding |
|---|---|---|---|
| 1 | High (release blocker, pre-existing, out of Campaign A scope) | Product/config | Package ID is still `io.ionic.starter` and versionName/Code are starter defaults. Must be finalized before any store distribution; changing it later orphans installed users. **Not fixed** — identifier changes are a product decision, reported per observation-first rule. |
| 2 | Low (observation) | Scoring display | The synthetic draft (no nutrition details entered) produces Score 0 / kcal 0 with `estimate_quality: high` on the first save (2-item) while the 3-item save correctly shows the "Hard to estimate / Data quality: Low" framing. The 2-item case took the `exact_fii` path with 0 kcal inputs. Whether score-0-with-high-quality on zero-energy items deserves a caution banner is a **scientific/product semantics question** — reported, not touched (protected area). |
| 3 | Low (tooling, not app) | Lint config | `npm run lint` picks up generated `frontend/android/app/build/**/native-bridge.js` and reports 1 error/2 warnings there; CI is unaffected (no android/ build outputs present). Consider ignoring `android/app/build/**` in `eslint.config.js`. Not changed during observation pass. |
| 4 | Info | Working tree | `frontend/android/app/capacitor.build.gradle` and `capacitor.settings.gradle` show as modified with an **empty content diff** (LF→CRLF from `cap sync` on Windows). Left untouched. |

## Evidence

- Report: `reports/ux/campaign-a/android-native/native-qa.md` (this file)
- Screenshots (9 curated of 41 captured): `reports/ux/campaign-a/android-native/screenshots/` —
  see `evidence-manifest.md` for the retained/excluded list and rationale.
  The 32 non-curated screenshots and the screen recording
  (`qa-native-journey.mp4`, 2.65 MB) are retained locally outside Git in
  `../insight-insulin-app-qa-archive/campaign-a-android-native/`.
- Logcat excerpts: `reports/ux/campaign-a/android-native/logcat-filtered-excerpts.txt`
- Reverse-mapping evidence: recorded above; mapping removed at cleanup

## Cleanup status

- Logcat capture stopped; backend stopped; `adb reverse` mapping removed.
- Device temp recording (`/data/local/tmp/qa-native-journey.mp4`) deleted.
- No new photos in device DCIM (captures stayed app-private); nothing else touched.
- App **not** uninstalled; package data **not** cleared.
- **Synthetic-meal cleanup completed 2026-07-17 (evening session):** with the
  device idle and explicit user approval, the local backend and `adb reverse`
  were temporarily restored and the two synthetic `QA Synthetic lentil rice bowl`
  meals (backend ids `81f3e45f…` 3-item, `a9dfc455…` 2-item) were deleted through
  the visible app UI (History → meal → "Delete saved meal" → confirm). Verified:
  History no longer lists them and `GET /meals` returns 0 matching records
  (40 pre-existing demo/synthetic meals untouched). Backend stopped, reverse
  mapping removed, device returned to its home screen, all ADB input stopped.
  No other app or record was touched.

## Verdict

No Campaign-A native defect was found: launch, navigation, keyboard, dirty-draft
guards, background/resume, single-request save, read-only history, previous-meal
reuse, camera/gallery state, and rotation all behave correctly on Android 16.
No code was changed; no commit, push, PR, or branch was created.
