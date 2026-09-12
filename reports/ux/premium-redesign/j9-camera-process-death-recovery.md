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

The five-image probe was read back successfully and deleted. No full-size photos, drafts, notes, or fingerprints enter the recovery localStorage marker. No dependency or permanent saved-meal persistence change was introduced.

Lifetime (clarified 2026-09-08): normal resolve/reject, restored consumption, explicit flow exit/discard, and the live expiry timer attempt to clear the nonce and delete the record. Startup rejects records aged at least 15 minutes when parsed and attempts to purge expired/malformed/orphan records. A stopped or suspended app may not execute cleanup until a later startup; storage errors can also prevent cleanup. Application-level deletion does not guarantee when the browser/OS physically reclaims bytes. Clearing the nonce before cleanup prevents replay if IndexedDB deletion fails.

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

## RECOVERY STORAGE PRIVACY ALIGNMENT (2026-09-08)

Scope: disclosure only for the **current implementation** (Ionic/Capacitor
migration compatibility client). No target architecture or behavior change.
Starting branch `codex/j9-hardening-final`, exact HEAD
`1b7f64b118f793827e0438197d927de75370d3b4`. Tracked and staged state was clean;
only historical `j9-baseline-1-device-recheck.md` and `j9-post-stay-navigation.md`
were untracked. Active-task inventory showed no other active task in this
checkout; repeated Git status checks showed no concurrent edits or index lock.
Original copy, copy tests, topology and this report were copied to a temporary
backup before edits. Historical untracked reports remain untouched.

### Source-of-truth persistence inventory

- `frontend/src/utils/cameraRecovery.ts`: IndexedDB database
  `insight-camera-recovery`, schema version 1, object store `pending`, key
  `active`. `getRecoverablePhoto` writes the context once before native launch;
  there is no result-update write. `store.put` replaces this one active record.
  Non-native calls bypass recovery persistence.
- Envelope fields: `version`, `nonce`, `createdAt`, `source`, `flow`, `caller`,
  `destination`, `meal`, `smart`, optional `baseline`. Content-bearing paths:
  `meal.name`, `meal.image`, `meal.items`, `meal.estimate`, optional totals,
  provenance/quality fields and `main_insulin_drivers`; `smart.images`,
  `smart.note`, `smart.error`, `smart.failureKind`; `baseline.fingerprint`.
  The complete `Meal` is copied, not a redacted subset. Its other metadata is
  `id`, `timestamp`, `isAiDraft`, `backend_created_at`, `source_meal_id`,
  `acute_score`, `insulin_load_total`, `kcal_total`, `carbs_total`,
  `protein_total`, `fat_total`, `estimate_quality`, `estimate_status`,
  `calorie_source` (see `frontend/src/types/Meal.ts`).
- `MealItem` content includes `name`, optional `image`, portions (`servingSize`,
  `servingUnit`, `amount`), nutrition (`kcalPerServing`, `carbPerServing_g`,
  `proteinPerServing_g`, `fatPerServing_g`, `satFatPerServing_g`), `gi`, `fii`,
  `source`, `why`, `draftProvenance`, `needsReview.previousName`, and `id`.
  `MealEstimate` carries `estimated_calories`, `estimated_carbs_g`,
  `estimated_fat_g`, `confidence`, `serving_type`, `serving_count`.
- `mealFlowGuard.ts::getDraftFingerprint` serializes image, name, items,
  AI-draft flag, estimate and calorie source into the baseline string (not a
  cryptographic hash); `baseline.mealId` associates it with the draft.
- Full-size prior images can occur in `meal.image`, `smart.images` and the
  baseline, without the saved-meal image-size filter. Both callers pass their
  existing state directly (`AiMealAdd.tsx::handleAddPhoto`,
  `PreviewMeal.tsx::handleTakePicture`). Capture requests base64, quality 90,
  `saveToGallery: false`; recovery performs no additional downscaling.
- Handoff correction: the newly captured JPEG result arrives through the live
  Promise or native restored event. `restoreCameraState` applies it in memory
  after consuming the envelope; this module does not persist the new result,
  EXIF or native event. A later camera launch can snapshot that image as prior
  work. This is not an audit of OS/camera temporary-file retention.
- Recovery localStorage key `insight-camera-pending` holds only the plain
  36-character UUID nonce. No meal, image, note, error or baseline payload is
  written to that key. This claim does not describe all localStorage.
- Cleanup: `getRecoverablePhoto` finally handles live resolve/reject;
  `clearCameraRecovery` handles the active nonce on timer/explicit cleanup;
  Smart Camera cancel/view-leave and Preview discard call it. Native startup
  (`main.tsx::bootstrap` → `bootstrapCameraRecovery`) validates/consumes the
  marker and envelope before rendering; invalid, stale and missing/mismatched
  marker paths attempt removal. Delete failures are tolerated; a consumed
  marker prevents reuse and later startup attempts orphan removal.
- `parseCameraRecovery` rejects age `>= 900000` ms and future timestamps.
  Eligibility is checked when parsed, before the separate 3000 ms result wait;
  it is not rechecked after that wait. The live cleanup timer can be delayed
  by suspension. There is no guaranteed maximum on physical retention.
- Separate storage: `currentMealStore`, `mealEstimateStore`, `pendingSaveStore`
  and restored Smart Camera state have no persist middleware. The camera
  snapshot is the draft-persistence exception; it does not persist the
  separate estimate preview/save workflow. `insight-meals` holds saved history
  (top-level `meal.image` capped at 24,000 characters; quota retry strips it);
  `app-settings` version 1 holds `darkMode`. These stores have no recovery
  15-minute expiry. Backend history and provider uploads are separate flows.

### Existing claims and minimal correction

- Settings → Data & privacy (`SETTINGS_IMAGE_DISCLOSURE`) previously said:
  "Small meal images may also remain in this app’s local storage." This is
  true for the saved-meal image policy but incomplete as the local-image
  disclosure: it omits recovery drafts and full-size prior photos. The same
  existing paragraph now discloses temporary device recovery, its small marker,
  cleanup attempts and approximately 15-minute recovery expiry, separately
  from the unchanged external-provider paragraph.
- This report previously said "deletion occurs on its next launch." That
  overstated successful cleanup and physical erasure. The lifetime paragraph
  above now describes attempts and distinguishes browser/OS reclamation.
- `docs/private-beta-topology.md` omitted recovery storage; its original
  "including full base64 meal photos" and "gender, age, weight, height,
  activity level" inventory also predated the current stores. The inventory
  now distinguishes actual saved-history/settings payloads from recovery.
- README and AI extraction disclosure qualify non-retention as **backend**
  behavior, so no recovery-related contradiction or edit was needed. Campaign
  B's in-memory draft baseline is explicitly dated to `19a690e`; its durable
  artifact statement concerns saved scoring evidence, not camera recovery.
  Historical audits and the approved target architecture were not rewritten.
- `mealDraftUx.ts::getSaveSuccessMessage` contains "The photo was not kept on
  this device, to save storage." Repository-wide caller search found only its
  declaration: it is unused, not an active user-facing disclosure. No unrelated
  dead-code cleanup was made.

### Final claim/evidence matrix

| Claim | Source evidence |
| --- | --- |
| Temporary local draft/full-size image recovery exists | `cameraRecovery.ts::getRecoverablePhoto`, both page callers, `mealFlowGuard.ts::getDraftFingerprint` |
| Local recovery marker contains only nonce | `cameraRecovery.ts` → `localStorage.setItem(CAMERA_RECOVERY_MARKER, nonce)` |
| About 15 minutes means recovery eligibility | `CAMERA_RECOVERY_MAX_AGE_MS`, `parseCameraRecovery`; check occurs before native-result wait |
| Normal and startup cleanup attempts exist | `getRecoverablePhoto` finally, `clearCameraRecovery`, `bootstrapCameraRecovery`, caller cancel/discard/view-leave handlers |
| Recovery is device storage, not a cloud backup/upload | `recoveryRecord` uses IndexedDB; recovery has no network call; AI submission remains in `AiMealAdd.tsx::handleOnSubmit` |
| No exact physical-erasure promise | UI says "attempts to clear" and "Recovery expires"; topology and lifetime text explicitly distinguish byte reclamation |

Risk: disclosure overclaim only; storage, privacy behavior, scoring, backend,
provider, native code and dependencies are unchanged. No new private data was
collected. The three-second late-result P2 remains deferred, along with the
normal Android build, wider J9/accessibility device matrix, recognition
evaluation, scientific validation and native identity work.

### Verification for this disclosure-only change

- Focused Vitest: `src/utils/safetyCopy.test.ts` (74) and
  `src/pages/settings/Settings.test.tsx` (1), **75/75 PASS**. One narrow
  recovery-copy semantic assertion added; existing guards unchanged.
- `npx tsc --noEmit`: **PASS**.
- `npx eslint src/utils/safetyCopy.ts src/utils/safetyCopy.test.ts`: **PASS**.
- `npm run build`: **PASS**; existing stale Browserslist data and >500 kB
  bundle advisories only. No dependencies updated.
- Working and staged `git diff --check`: **PASS**. Existing formatting kept;
  no standalone formatter is configured in the frontend package.
- Host Node 26.5.0: tests used the already documented
  `NODE_OPTIONS=--no-experimental-webstorage`, `VITEST_MAX_THREADS=2`,
  `VITEST_MIN_THREADS=1`; no repository configuration workaround added.
- No Cypress, backend, Rust/science, APK, device or provider checks run for
  this copy-only change. Their historical results above are not new evidence.
- Independent read-only agent review of the staged four-file diff: **PASS,
  no blockers**. Reviewer checked the claims against startup, recovery, both
  callers, stores and types; checks above were run by the primary agent.
