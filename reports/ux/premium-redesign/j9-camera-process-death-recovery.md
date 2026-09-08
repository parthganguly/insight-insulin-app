# J9 CAMERA PROCESS-DEATH RECOVERY RESULT

Date: 2026-09-05. Current Ionic/Capacitor implementation (migration compatibility client), Samsung SM-M356B / Android 16. This does not implement the target native client.

## STATUS

PASS — all four required Camera process-death lifecycle cases. Ready to resume the wider J9 physical matrix. This is not an AI-recognition or release/CI-green verdict; the production-preview test qualification below remains explicit.

## ROOT CAUSE

Existing omission: no frontend `appRestoredResult` listener and no durable external-activity context. Android can kill INSIGHT while Samsung Camera is foregrounded. The original Promise, React state, Zustand draft and Ionic stack disappear. The restored native result therefore reached an app which defaulted to Home.

Installed App 7.0.1 `AppPlugin.load()` calls `notifyListeners(..., true)`. Capacitor retains the result until the first listener is registered, removes its retained arguments, then delivers them. Physical logcat confirmed both initial retention and delivery to the startup listener.

## RESTORED PAYLOAD

Physically observed success, before implementation, with PID `8935 → 10728`:

```json
{
  "pluginId": "Camera",
  "methodName": "getPhoto",
  "success": true,
  "data": {
    "format": "jpeg",
    "base64String": "[835884 characters; image deliberately omitted]",
    "exif": "[native object; private metadata deliberately omitted]"
  }
}
```

Exact top-level keys: `pluginId`, `methodName`, `success`, `data`.
Exact data keys: `format`, `base64String`, `exif`.
`error`, `path`, `webPath`, and `saved` were absent, not false or empty.

Physically observed cancellation, with PID `10728 → 11172`:

```json
{
  "pluginId": "Camera",
  "methodName": "getPhoto",
  "success": false,
  "error": { "message": "User cancelled photos app" }
}
```

Cancellation had no `data` field. Types and native source were read from installed `@capacitor/app` and `@capacitor/camera` 7.0.1.

## RECOVERY DESIGN

Envelope: version, nonce, creation time, Camera source, flow, destination, logical caller, complete meal draft, Smart Camera images/note/error state, and existing discard-guard baseline. The baseline preserves existing dirty-draft decisions; the guard's decision rules do not change.

Storage mechanism: one temporary IndexedDB `pending/active` record in `insight-camera-recovery`. Only the 36-character nonce is written to localStorage (`insight-camera-pending`). The write transaction must complete before Camera opens. Storage failure prevents external launch and follows existing curated failure handling.

Measured sizes:

| Case | Serialized size |
| --- | ---: |
| Direct draft, note, caller and guard context | 548 characters |
| Existing review photo plus prior Smart Camera photo and draft | 1,674,941 characters |
| Real WebView IndexedDB probe: five synthetic images | 4,179,562 bytes |

The five-image probe was read back successfully and deleted. No full-size photos, drafts, notes, or fingerprints enter localStorage. No dependency or permanent saved-meal persistence change was introduced.

Lifetime: clear nonce and delete the record after normal resolve/reject, restored consumption, or explicit flow exit/discard. Records expire after 15 minutes; active-process expiry clears them, and next bootstrap purges expired/malformed/orphan records. An app that is not running cannot execute physical deletion; deletion occurs on its next launch. Clearing the nonce before cleanup prevents replay if IndexedDB deletion fails.

Stale prevention: schema, timestamp, route/caller, draft and known optional-field validation; nonce match; consume once before applying. Missing/corrupt metadata never fabricates a draft from an orphan photo.

Startup: register the one Camera/getPhoto-only listener before async inset work, then resolve recovery before rendering Ionic. Insets and recovery run concurrently.

Bounded missing-result behavior: wait up to three seconds for the native event, then restore valid pre-activity work once with existing failure semantics and consume the record. Events later than this cutoff are ignored. This is a documented limit, not a Capacitor timing guarantee. In the successful physical runs, the event was already retained and delivered approximately 274–367 ms after native emission.

## CALL SITES

| Caller | Route at launch / restored destination | Preserved work | Cancellation |
| --- | --- | --- | --- |
| Smart Camera from chooser | `/meals/new/ai` | Complete current draft, photos, note, chooser caller | Same camera page; Cancel returns `/log-meal` |
| Smart Camera from existing review | `/meals/new/ai` | Edited draft including review photo/items, camera photos/note, review caller | Same camera page; Cancel returns `/meals/new` |
| Preview Add a photo | `/meals/new` | Complete draft and discard baseline | Same review and draft, matching existing silent cancellation behavior |
| Smart Camera Photos | `/meals/new/ai` | Same context as Camera source | Same curated Smart Camera handling |

Gallery limitation: installed Camera 7.0.1 registers the photo-picker callback dynamically rather than through Camera's saved `@ActivityCallback`. A picker result is therefore not guaranteed after process recreation. The envelope still protects pre-picker work through the bounded missing-result fallback. This pass does not claim physical recovery of a newly selected gallery image; normal gallery behavior is covered by browser regression.

## IMPLEMENTED

- Shared native `getRecoverablePhoto` boundary around both Smart Camera sources and Preview capture.
- Early startup listener and validated, consumable recovery state.
- Restored Smart Camera photos/note survive its first Ionic entry reset; caller identity survives the missing route stack.
- Preview receives the returned image directly without going through Smart Camera.
- First capture preserves a note typed before launch, correcting the previous unconditional note reset.
- Existing dirty-draft baseline survives recreation, including cancellation.
- Storage failures and malformed optional fields have targeted regressions; cleanup failure cannot suppress a valid recovered result.

Independent read-only review found and verified corrections for dirty-guard reset, deletion-failure loss, malformed optional fields, and callback-side IndexedDB exceptions. Final review reported no remaining confirmed source blockers, with the timing limit above explicitly retained.

## NORMAL CAMERA PATH

Normal live-process handlers still apply photos and perform their existing navigation. A real secondary warm capture retained PID `15329` and its note. Focused J9 browser navigation passed 14/14. The intentional note-preservation correction is described above.

## PROCESS-DEATH TESTS

| Case | Before → after PID | Observed outcome |
| --- | --- | --- |
| Direct Smart Camera | `13844 → 15329` | `/meals/new/ai`, returned image 845,835 data-URI characters, note preserved, no discard prompt, record consumed |
| Secondary Smart Camera | `15329 → 16772` | Prior camera image 828,279 characters plus new image 823,223; note preserved; Cancel returned to edited review with original 845,835-character review photo and component |
| Preview Add photo | `16772 → 17514` | `/meals/new`, edited name and amount `2` preserved, new image 815,675 characters, no Smart Camera detour or discard prompt |
| Camera cancellation | `17514 → 18788` | `/meals/new/ai`, note and curated cancellation copy restored; Cancel returned to review with amount `2` and its 815,675-character image intact |

For each case the old process was absent while Camera remained foregrounded; a new PID started after Camera returned. Logcat recorded `Firing restored result`, retention without a listener, and subsequent delivery to the registered listener.

Physical input qualification: the phone lay on the desk and returned nearly blank rear-camera images. These are valid only for external Activity, process-death, non-empty payload and state/route restoration evidence. They do **not** prove successful food recognition. The direct Analyze→review continuation used a stubbed synthetic response, proving application navigation only; no AI-recognition pass/failure is claimed. A recognizable synthetic/test food image in the rear-camera field of view is required for later real extraction acceptance.

## STATE PRESERVATION

Draft, prior camera image, separate review image, new capture, textual note and logical caller were physically verified. The restored secondary review still presented its existing discard prompt when Home was selected. After tests, the synthetic draft was explicitly discarded. A cold launch returned `/dashboard`, with zero pending IndexedDB records and no localStorage recovery nonce. No stale camera journey replayed.

## AUTOMATED VERIFICATION

| Check | Final result |
| --- | --- |
| Lint | PASS |
| TypeScript | PASS |
| Production build | PASS; existing bundle-size warning |
| Full unit | 697/697, 60 files |
| Focused lifecycle/application | 48/48, including 29 recovery tests |
| Focused J9 Cypress, production preview | 14/14 |
| Full Cypress, Vite dev | 157/157, 18 specs |
| Backend required suite | 98/98 |
| Internal scientific validation | 6/6; golden fixture export current |
| Rust required suite | 211/211; fmt and clippy clean |
| Working and staged diff checks | PASS |

Environment qualification: host Node 26 exposes experimental web storage that conflicts with this repository's jsdom. Unit runs use `NODE_OPTIONS=--no-experimental-webstorage`; no dependency/config changes were made. One heavily concurrent full run timed out in an existing browser-Back unit case. A single-thread attempt produced duplicate-DOM/test-isolation failures and was stopped. The final complete run used the installed Vitest's supported `VITEST_MAX_THREADS=2` and `VITEST_MIN_THREADS=1`, retaining normal file isolation and unchanged assertions/timeouts; all 697 tests passed.

Production-preview Cypress: 156/157. The existing uncommitted J8 stale-state test imports `/src/stores/currentMealStore.ts`, which is available on Vite dev but not production preview. Its source was preserved. Focused J9 production-preview Cypress: 14/14. Full dev-server Cypress: **157/157 across 18 specs**. This distinction must not be reported as a clean full production-preview run.

## ARTIFACT

APK: `C:\Users\Parth Ganguly\AppData\Local\Temp\insight-j9-recovery-02f6b4428f81457a81e925cec878bfb7\j9-recovery-debug.apk`

APK SHA-256: `658B8568E8E10F8409F44C54B0DD1CA022FC13FD2358994929A13767513C1480`

Bridge SHA-256: `0521300C862B01B96CAD3627333BBC95626EFADF152587D9C8476D3CE75722C6`

Bundle: `assets/public/assets/index-BuOvSATb.js`

Bundle SHA-256: `57C19361D7CD0598E7EDCCB60D0516C23A5D7C2866A34BDD6CD10557A93F8634`

Same previously validated faithful artifact method: replace only web assets in the known-good native APK and re-sign with the existing debug identity. Verified all 874 preserved native entries byte-for-byte, every packaged web asset against the current production build, Camera registration, and APK signature schemes v1/v2/v3. The APK pulled back from the device has the exact same SHA-256. Native manifest, DEX, resources and bridge were preserved.

## PROTECTED AREAS

Science, FII, B2/J7/J8 decisions, backend, Rust, database, identity #96, Camera permissions, AndroidManifest and Capacitor dependencies are unchanged. The existing discard-guard baseline is recovered without changing its decision rules. Photos and private drafts are temporary, local, and not logged by the new code.

## REPOSITORY

Branch: `codex/j9-hardening-final`.
HEAD: `56e218be6ef3386de473754e9f49ac4680ca7d45`.
Existing uncommitted J9 changes preserved. Recovery changes are uncommitted; relevant files were staged for independent review. No commit, push or merge performed.

Files changed by this repair: `frontend/src/utils/cameraRecovery.ts`, its test, `frontend/src/main.tsx`, `AiMealAdd.tsx` and its Campaign A test, `PreviewMeal.tsx`, its navigation-guard test, `frontend/src/utils/mealFlowGuard.ts`, `frontend/src/components/MealFlowGuard.tsx`, and this report. Other existing dirty files were not changed by this repair.

## J9 PHYSICAL MATRIX

**READY TO RESUME FULL J9 PHYSICAL MATRIX.** All four requested lifecycle blocker cases passed. The wider physical matrix has not resumed.

## RECOMMENDATION

Resume the wider J9 physical matrix on this verified installed APK. Use recognizable synthetic/test food images for any real successful-extraction acceptance; desk captures remain lifecycle-only evidence. Before calling production-preview CI green, separately resolve the existing J8 dev-only test dependency. Retain the documented native-result timing and photo-picker limits when assessing broader device coverage.

## LATE RESTORED RESULT CONTRACT (P2, ACCEPTED)

Appended 2026-09-08 after independent Omen review and Opus 5 adjudication. This refines, and does not alter, the bounded missing-result paragraph in RECOVERY DESIGN above. Historical sections are unchanged.

- `CAMERA_RECOVERY_WAIT_MS` (3000 ms) is INSIGHT application policy for how long startup recovery waits for a retained native result. It is NOT a Capacitor timing guarantee.
- Capacitor App 7.0.1 retention guarantees that an already-emitted restored result is kept until the first listener registers and is then delivered. It does NOT bound when the native side completes or emits the restored Camera result; no documented or source-level maximum delivery time exists.
- A legitimate `Camera/getPhoto` restored result can therefore arrive after the deadline. The current implementation intentionally ignores it: the listener is disarmed before the deadline fallback restores, so a late result causes no second restore, no second navigation, and no stale-state resurrection.
- Consequence: the newly captured photo is lost for that session, while all pre-camera work (draft, prior photos, note, caller, discard baseline) is restored exactly once with curated camera-failure copy. There is no dead-end and no overwrite of work created after startup recovery.
- Severity: P2 — a bounded product risk. Accepted for now; this behavior is not claimed ideal.
- A future repair must not simply increase the timeout: no known bound justifies waiting arbitrarily long at startup. Any late-result repair must consume a late result without overwriting work created after startup recovery (apply only the missing photo; never re-run whole-state restoration).
- Regression test: `frontend/src/utils/cameraRecovery.test.ts`, "ignores a valid restored result arriving after the recovery deadline completes". It models the disputed ordering — listener registered → deadline wins → recovery completes → valid matching result arrives late — and asserts single restore to the correct destination, no new photo, curated failure copy, consumed envelope and marker, no second navigation, and preserved post-recovery user state.
