# Annotated Journal J4 — Confirm as annotated review implementation report

**J4 SAFE-AREA FIX, INDEPENDENT DEVICE QA, FABLE VISUAL REVIEW, AND PUBLIC-EVIDENCE CURATION COMPLETE — DRAFT PR #118 UNDER FINAL MERGE REVIEW.**

All engineering and review gates completed before packaging. The work was committed as `9d9b5eb250e739e6964155711c35b928538bc13b` on branch `sol/annotated-journal-j4-confirm` and opened as draft pull request #118 against `main`. No merge has occurred and `main` was not directly modified.

J4 is a presentation-only change to the **current Ionic React/Capacitor implementation**. It is not a target-native component. This report records the post-fix implementation, independent automated validation, and physical-device evidence. It does not claim scientific validation or change scientific behavior.

## Scope and behavior

J4 changes the confirm-route presentation only. It does not change scoring, FII resolution, API contracts, stores, payloads, persistence, correction rules, validation, navigation, consent, telemetry, image retention, or product/research data separation.

The retained journey is:

`Confirm → Calculate & save → Saved result`

No estimate-only, save-later, stale-estimate, or recalculation path was added. J4 adds a cover-photo hero, raised journal sheet, confirmation question, visible needs-review cards, component articles, item totals, an overlay editor, and a fixed safe-area dock. Existing save, payload, POST, response mapping, store, and saved-result behavior remains in the established sequence.

## Safe-area correction

The prior Android APK had a real stationary font-scale relaunch defect. On Samsung SM-M356B, Android 16/API 36, three-button navigation, a `1.0 → 1.3` Android font-scale change could relaunch the activity/WebView, after which the SafeArea plugin reported bottom `48px` while root `--app-safe-area-bottom` and mapped `--ion-safe-area-bottom` remained `0px` beyond 10 seconds. Its retained final screenshot shows visible fixed-dock/tab-bar overlap with Android navigation.

The old blocker evidence is retained. Its raw original is immutable and privately preserved; the public repository carries the sanitized derivative (see "Evidence privacy sanitization" below):

- `evidence/rotation-p0/stationary-font-1.0-to-1.3-no-rotation-settle-2026-07-25-run1.json`
- `evidence/rotation-p0/stationary-font-1.0-to-1.3-no-rotation-settle-2026-07-25-run1-app-scoped-lifecycle-extract.txt`
- `evidence/rotation-p0/stationary-font-1.0-to-1.3-no-rotation-settle-2026-07-25-run1-final-portrait.png`

The old blocker APK SHA-256 was:

`AE6D258AE9108EF7183AFEACD3EB1761A346B3A3310816183F95B2DA490A6990`

Opus implemented a bounded native-startup SafeArea re-query ladder in the current Ionic/Capacitor compatibility implementation. It re-reads the existing SafeArea plugin at fixed delays of 150, 400, 800, 1500, and 2500 ms. The source is native-only, finite, cancellable, deduplicates unchanged four-side CSS values, rejects stale asynchronous responses, and is disposed by its returned teardown. Browser/PWA continues to use the CSS `env(safe-area-inset-*, 0px)` fallback.

Terra independently audited the actual diff and confirmed one source applies each accepted distinct result exactly once to all four `--app-safe-area-*` variables. Ionic remains structurally mapped from those variables. The source contains no Samsung/API-specific branch, hard-coded inset workaround, forced rotation, reload, or visual padding workaround.

## Independent automated validation

All listed checks were run after the correction on the then-uncommitted worktree, which is the same tree later committed as `9d9b5eb`:

| Check | Result |
| --- | --- |
| Focused startup tests with `NODE_OPTIONS=--no-experimental-webstorage` | PASS — 43/43 tests, 4 files |
| `npx tsc --noEmit` | PASS |
| Focused ESLint for `main.tsx` and the three startup test files | PASS |
| Full unit suite with `NODE_OPTIONS=--no-experimental-webstorage` | PASS — 488/488 tests, 44 files |
| Cypress `j4-confirm.cy.ts` and `manual-meal.cy.ts` | PASS — 9/9 tests, 2 specs |
| `npm run build` | PASS |
| `git diff --check` | PASS |
| Capacitor sync and debug APK assembly | PASS |

Build emitted existing non-blocking Browserslist and chunk-size advisories. Unit output contained existing expected warning/error-path logs but no failing test.

## Corrected APK and installation

The exact current worktree was built with `npx cap sync android` followed by `./gradlew assembleDebug`. No Android source or generated configuration remained modified in Git after build.

- APK: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
- Size: 8,882,265 bytes
- Package: `io.ionic.starter`
- Version: `1.0` (`versionCode` 1)
- SHA-256: `5822751155e66de718ada6fd0be1290ef9ab8bce2e50260bca9e4f116f9d7a05`
- Installation: ADB streamed installation returned `Success`; package metadata recorded update time `2026-07-25 18:20:23`.

The corrected APK hash differs from the retained blocker APK hash.

## Post-fix stationary font-relaunch proof

Terra independently ran the stationary protocol on the corrected APK, Samsung SM-M356B / API 36, portrait locked, three-button navigation, initial font scale 1.0, changing to 1.3. After the font change, no rotation, background/resume, manual resize, or application interaction occurred. Read-only Chrome DevTools Protocol queries sampled plugin insets and computed root/Ionic variables; screenshots were collected passively.

Evidence:

- `evidence/rotation-p0/postfix-stationary-font-1.0-to-1.3-no-rotation-2026-07-25-run1-redacted.json`
- `evidence/rotation-p0/postfix-stationary-font-1.0-to-1.3-no-rotation-2026-07-25-run1-app-scoped-lifecycle-extract.txt`
- `evidence/rotation-p0/postfix-stationary-font-1.0-to-1.3-no-rotation-2026-07-25-run1-1s.png`
- `evidence/rotation-p0/postfix-stationary-font-1.0-to-1.3-no-rotation-2026-07-25-run1-final-portrait.png`

The initial 1.0 baseline agreed at top/bottom `38px`/`48px` across plugin, root, and Ionic. A short all-zero post-relaunch interval occurred while the Android window inset was not ready. Once the plugin reported bottom `48px` again, root and Ionic agreed at the same completed sample. The first observed plugin-correct/root-Ionic-correct sample was 3,724.502 ms host elapsed; its document performance time was 3,443.5 ms. The timing is conservative because initial DevTools target reattachment delayed the first completed host sample. Agreement remained stable at later 2.5 s, 3 s, 5 s, and 10 s nominal checks. No recovery event was required. Visual inspection of the 1 s and final portrait screenshots found no system-navigation or dock/tab-bar overlap.

## Post-fix regression evidence

The final self-identifying font-1.3 proof set is:

- `evidence/rotation-p0/clean-font-1.3-run3.json`
- `evidence/rotation-p0/clean-font-1.3-run4-redacted.json`
- `evidence/rotation-p0/clean-font-1.3-run5-redacted.json`

Runs 4 and 5 were captured on the corrected APK at explicit font scale 1.3. Each records initial portrait baseline, portrait-to-landscape samples, landscape-to-portrait samples, plugin/root/Ionic values for all four sides, actual timing, device/API, APK hash, and no-background/resume statement. Every recorded value agrees.

The separate post-fix font-1.0 control is:

- `evidence/rotation-p0/clean-font-1.0-postfix-run4-redacted.json`

It likewise records complete four-side agreement throughout portrait-to-landscape-to-portrait rotation.

Additional post-fix visual evidence:

- `evidence/rotation-p0/postfix-hot-resume-font1.png`
- `evidence/rotation-p0/postfix-paper-dashboard-font1.png`
- `evidence/rotation-p0/postfix-ink-dashboard-font1.png`
- `evidence/rotation-p0/postfix-manual-keyboard-open.png`
- `evidence/rotation-p0/postfix-manual-keyboard-dismissed.png`

Terra observed correct rotation recovery, hot resume, Paper appearance, Ink appearance, and no Android-system-navigation/tab-bar overlap. The two startup screenshots show no newly visible startup flash attributable to the finite settle ladder.

Manual keyboard behavior was reported as passing during physical QA. However, the two retained keyboard-named images are **not self-proving keyboard evidence**: both are Home/dashboard captures and neither visibly contains the Android IME or the manual-entry screen. They must not be cited as visual proof of keyboard-open layout, keyboard-dismiss recovery, or dock recovery after keyboard dismissal. The dismissed-state capture does show a correct dock and no system-navigation overlap, and the resize-driven safe-area synchronization path covers the behavior structurally, but neither substitutes for a correctly framed capture. This is a non-blocking P2 evidence limitation. A correctly framed keyboard-open/dismiss recapture on the manual-entry screen may be added later; it is not required for J4 merge approval.

## Evidence classification

Final self-proving evidence is the corrected stationary probe, font-1.3 runs 3/4/5, and the separate post-fix font-1.0 control. The older blocker evidence is historical evidence showing the actual prior failure; its raw original is immutable and privately preserved, and the public tree carries its sanitized derivative. Old clean font-1.3 runs 1/2 and old clean font-1.0 runs 1/2/3 are retained as historical controls or diagnostics, not replacements for the final self-proving post-fix set. The old dynamic font-change evidence is diagnostic only; it must not be represented as proof that the earlier stationary defect never existed.

## Scope exception

Issue #117 allowed a narrower, presentation-only file set. During mandatory Samsung QA a real persistent Android safe-area initialization defect was discovered after a stationary font-scale activity relaunch. Correcting it required expanding scope beyond the original list to:

- `frontend/src/main.tsx`;
- focused startup safe-area regression tests;
- existing Cypress specifications whose selectors or regression assertions had to follow the J4 structure.

The expansion was independently audited and device-validated. It changed no scoring, FII resolution, API contracts, stores, payloads, persistence, backend behavior, privacy behavior, or scientific claims. Issue #117 itself was not modified.

## Evidence privacy sanitization

`parthganguly/insight-insulin-app` is a public repository. Final pre-commit review of the evidence tree found material that must not be published:

- the three lifecycle captures were unfiltered whole-device `adb logcat` output rather than app-scoped logs, roughly 95% of which was unrelated personal-device activity — a third-party messaging application, other installed applications, Health Connect traffic, carrier MCC/MNC identifiers, Wi-Fi byte counters, modem timings, and battery/keyguard/AOD state;
- the stable ADB hardware serial of the QA handset appeared in two device-proof text files and in four primary JSON evidence files.

Nine raw originals were copied to a private archive outside this repository, verified byte-identical by SHA-256, and then removed from the public tree. Each was replaced by a public derivative under a new, distinct filename: three `-app-scoped-lifecycle-extract.txt` files, two `-redacted.txt` device proofs, and four `-redacted.json` evidence files. No original public filename was silently overwritten. Every path, byte count, line count, private raw SHA-256, public derivative SHA-256, and sanitization method is recorded in `evidence/privacy-sanitization-manifest.md`. The absolute location of the private archive is intentionally omitted from all reports because it is machine-local.

What the public evidence still contains is unchanged in substance. The redacted JSONs preserve schema version, run identifier, device model, API level, font scale, package and version, corrected APK SHA-256, timing, lifecycle state, plugin/root/Ionic inset values for all four sides, viewport, protocol restrictions, rotation samples, and result fields; each differs from its original only in the `device.serial` value and an appended `privacySanitization` provenance object, verified by machine comparison. The PNG screenshots are unmodified. The lifecycle extracts preserve original timestamps and ordering and establish only the app process/activity lifecycle, the `MainActivity` configuration relaunch, and app-scoped window/inset events; they were never the source of a numeric safe-area value.

Only stable hardware serials and unrelated device activity were excluded, and no J4 product claim depends on either. This curation changed no implementation file, no test, and no result. The automated validation above, the physical QA outcome, and Fable's APPROVE verdict and merge readiness are unchanged.

Two packaging corrections were applied after the first pushed head and are recorded in the manifest. First, `artifacts.lifecycleLogcat` in the stationary run JSON — and in the historical blocker JSON, which contains no serial and was never redacted — pointed at the removed raw logcat filenames; both pointers were redirected to the published app-scoped extracts, so no public artifact reference names an unpublished file. No timing, inset, protocol, result, APK, device-model, API, viewport or lifecycle value changed in either. Second, terminal whitespace emitted by Android logging was stripped from line endings in the three extracts so the published tree satisfies `git diff --check`; every retained line, its ordering, timestamps, tags, substantive text and redactions are unchanged. The extracts are therefore deliberately not byte-identical to their raw originals at line endings, while the byte-identical originals remain privately preserved. All affected public SHA-256 values were recalculated.

Evidence status after curation:

- **private raw originals** — immutable, byte-identical, preserved outside the repository, identified by SHA-256;
- **public evidence** — provenance-linked sanitized derivatives with normalized line endings, each recording the SHA-256 of the private original it derives from.

## Fable visual and product review

Fable performed the final read-only product, visual-design, and UX review of the J4 Confirm experience and the post-fix physical-device evidence.

- Verdict: **APPROVE**
- Final disposition: **READY FOR COMMIT, PUSH, AND DRAFT PR**

Fable found no P0 or P1 product, visual, responsive, safe-area, keyboard, resume, loading, failure, empty-state, Paper, or Ink defect. Product contract, visual quality, responsive and state coverage, and physical-device behavior each passed.

Fable's concrete findings were the keyboard-evidence limitation recorded above plus deferred cosmetic polish, none of which blocks merge:

- P2 — keyboard-named screenshots are not self-proving keyboard evidence (recorded above).
- P2 — meal-name clipping without ellipsis at 320 px width and 133% text scale.
- P2 — empty-draft `Calculate & save` renders at full strength while the sheet asks for an item first; this is retained pre-existing behavior outside J4's presentation-only scope.
- P2 — `Amount` field label truncates to `Amo…` at 133% text scale.

## Change boundary

All test and device-capture meal content was synthetic. Terra created new QA evidence only and updated this report plus `evidence/README.md`; Terra did not edit production code, frontend tests, Android source, backend code, scoring, persistence, privacy behavior, or existing raw evidence. At the time of that QA no files had been staged, committed, pushed, merged, tagged, or published; packaging happened later, in commit `9d9b5eb` and draft PR #118, and no merge or tag has occurred since.
