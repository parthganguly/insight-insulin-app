# B2-3 RESULT

PASS

## J8 COMMIT TESTED

Branch: `codex/j8-unsaved-estimate-porcelain`

Commit: `57b17cb6c9417f522e85258c5c47fefa9b6f6084`

## DEVICE

Model: Samsung SM-M356B

Serial: `RZCY22FGP1Z`

Android: 16

API: 36

Screen: 1080x2340 physical; 2340x1080 landscape

Density: 450 dpi physical; 420 dpi override

Font scale: 1.0 and 1.3 tested; restored to 1.0

## ACCEPTANCE MATRIX

Cold launch: PASS — exact APK launched with `LaunchState: COLD`; no blank route, broken footer, or stale overlay.

Resume: PASS — unsaved estimate survived ten seconds backgrounded and returned `HOT` with its score and Save action intact.

Primary journey: PASS — manual synthetic meal calculated without persistence, produced the J8 unsaved result, saved once, reached canonical J7 saved result, and appeared once in History.

Fresh Back: PASS — Android Back returned from the fresh estimate to the intact editable draft inside the meal flow; no History write, trap, or broken route. A later attempt to leave the dirty flow showed the unsaved-estimate stay/discard guard.

Stale: PASS — changing amount from 2 to 3 retained the old result and score, showed `This estimate describes the meal before your changes. Recalculate before saving.`, removed Save, and placed `Recalculate` in the same footer slot.

Recalculate: PASS — successful recalculation updated 260 kcal to 390 kcal and restored `Save to History` without persisting.

Recalc failure: PASS — stopping only the isolated backend produced `Couldn't update this estimate. Try again.` while retaining the old score, stale framing, and Recalculate action; no insufficient-data substitution or Save action appeared.

Saving lifecycle: PASS — Save was followed immediately by Home/background and a HOT foreground resume; the canonical saved result appeared with the same 390 kcal / relative score 1027 answer. Backend access evidence contained exactly one successful `POST /meals`.

Pending-save navigation: AUTOMATED-ONLY — the physical save completed too quickly to capture a pending navigation state deterministically. Passing coverage: `PendingSaveBanner.test.tsx`, `mealFlowGuard.test.ts`, `MealEstimate.test.tsx`, and `mealSaveCoordinator.test.ts`.

Case B: AUTOMATED-ONLY — no safe deterministic physical timing window. Passing `mealSaveCoordinator.test.ts` covers material edits, rename, lost-route ownership, no bypass/navigation authority, and protection of a newer estimate.

Ambiguous/retry: AUTOMATED-ONLY — not forced physically because doing so would add timing/proxy machinery and contaminate the one-record acceptance history. Passing `MealEstimate.test.tsx` and `mealSaveCoordinator.test.ts` cover truthful ambiguous copy, same frozen request/id retry, and duplicate prevention semantics.

Paper: PASS — fresh unsaved result physically captured; long title, result hierarchy, contrast, Adjust, disclosures, and footer are readable without color-only meaning.

Ink: PASS — fresh unsaved result physically captured with the same checks.

Large text: PASS — native font scale 1.3 physically exercised on fresh and stale states; long title wraps, the result scrolls to all disclosures, and the footer remains separate and usable. Restored to 1.0.

Landscape: PASS — fresh estimate physically rotated to 2340x1080; content scrolls independently and the sibling footer remains visible, separated, unobscured, and usable.

Rotation/resume: PASS — estimate -> landscape -> scroll -> background -> HOT foreground -> portrait retained the current estimate and correct Save action without duplicate pending UI, route corruption, save, or recalculation.

## HISTORY INTEGRITY

Before: 0 backend meals; calculation and recalculation left it at 0.

After: 1 backend meal and one visible physical History record.

Duplicate meals: 0.

Preview/chronic contamination observed?: No. Preview made no meal row; the only successful persistence request was one `POST /meals`. Chronic metrics read the saved row only after Save.

## EVIDENCE

All paths are relative to `reports/b2-3-device-evidence/`.

- Device/build/install record: `DEVICE.md`
- Cold launch: `01-cold-launch-ink.png`
- Fresh Ink portrait: `02-fresh-j8-ink-portrait.png`
- Fresh Android Back to preserved draft: `03-fresh-back-adjust-preserved.png`
- Unsaved HOT resume: `04-unsaved-warm-resume-ink.png`
- Stale/Recalculate: `05-stale-recalculate-ink.png`
- Recalculation failure: `06-recalculation-failure-ink.png`
- Landscape estimate: `07-landscape-estimate-ink.png`
- Landscape scrolled/footer proof: `07-landscape-estimate-scrolled-ink.png`
- Rotation/resume portrait: `08-rotation-resume-portrait-ink.png`
- Canonical saved result after Save/background: `09-saved-result-after-background.png`
- History with exactly one record: `10-history-exactly-one-ink.png`
- Fresh Paper portrait: `12-fresh-j8-paper-portrait.png`
- Large native text: `13-large-native-text-paper.png`
- Large native text/disclosures/footer: `14-large-native-text-bottom-paper.png`
- Large native text stale state: `15-large-native-text-stale-paper.png`
- Read-only UI hierarchy diagnostics: paired `*-ui.xml` files in this directory.

## CODE CHANGES DURING B2-3

None. Only this evidence directory was created.

## TESTS AFTER ANY REPAIR

No repair was made.

Targeted automated-only regression command:

```powershell
$env:NODE_OPTIONS='--no-experimental-webstorage'; npm run test.unit -- --run src/utils/mealSaveCoordinator.test.ts src/utils/mealFlowGuard.test.ts src/utils/mealEstimateWorkflow.test.ts src/pages/meal/MealEstimate.test.tsx src/pages/meal/PreviewMeal.navigationGuard.test.tsx src/components/PendingSaveBanner.test.tsx src/stores/mealEstimateStore.test.ts
```

Result: PASS — 7 files, 59 tests.

Node 26's experimental global Web Storage caused two initial harness-only runs to fail before DOM tests at `localStorage.clear()`. Passing the one-command compatibility flag to all Vitest workers restored jsdom's test-local storage. No repository repair was made.

## PROTECTED AREAS

Backend/science/idempotency/ownership/store semantics untouched. No production file changed, including backend, Rust, database/migrations, formulas, FII data/fallbacks, estimate status/quality, preview/save endpoints, client request identity/fingerprinting, `mealEstimateStore`, `pendingSaveStore`, Case A/Case B ownership, or J7 saved-result semantics.

## RESIDUAL RISKS

- Pending-save navigation, Case B/newer-foreground protection, and ambiguous retry were not physically reproduced because the isolated local save completed before a stable pending state could be observed. Current targeted automated coverage passed.
- The build has no active appearance toggle; Paper required changing only INSIGHT's app-local debug preference. It was restored to system-following behavior.

## READY FOR SETTINGS / IDENTITY?

YES
