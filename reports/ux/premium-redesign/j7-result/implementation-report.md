# J7 Implementation Report — Frozen Saved-Result Interpretation Contract

**Status — 2026-08-27:** frontend implementation, automated verification,
browser acceptance, retained browser evidence, and physical Samsung acceptance
are complete. The J7 build passed on a Samsung SM-M356B running Android 16 in
an isolated QA application ID. The phone's font and rotation settings were
restored and the synthetic-only QA package was removed after the smoke run.

## 1. Issue and authority

- Issue: #125 — https://github.com/parthganguly/insight-insulin-app/issues/125
- The attached J7 contract and the live issue body were checked and matched.
- The repository's required architecture, scientific, engineering, audit,
  validation-plan, and validation-gate documents were read before editing.
- The work is a bounded change to the **current implementation / compatibility
  client** (Ionic React/Capacitor). It does not claim that the target native
  Android/Rust architecture exists.

## 2. Branch and base

- Branch: `codex/j7-saved-result-contract`
- Worktree: `work/insight-insulin-app-j7`
- Base: `4beb62f3875050800d50136e9c3d8918c219ccd1`, equal to
  `origin/opus/annotated-journal-j6-history` when the worktree was created.
- No commit, remote branch, pull request, merge, or issue edit was created.

The pre-existing checkout named for J7 was based on an older J3 commit and
contained unrelated untracked material. It was left untouched; this isolated
worktree was created from the accepted J6 branch instead.

## 3. Current behaviour implemented

### Normal saved result

- The result heading is neutral: `Estimated meal insulin demand`.
- The primary reading is `Relative score: N` for every finite normal score.
- The visible and accessible boundary says the reading is not a percentage,
  target, health category, bodily measurement, or personal-response
  prediction.
- Scores 50, 100, 137, 767, and 1200 receive identical semantics. There is no
  high/low category, alarm treatment, score ring, progress-bar role, or
  above/below-reference language.
- The deterministic value is unchanged. J7 changes only its saved-result
  presentation.

### Scale disclosure

- `How this score works` is closed by default and keyboard focusable.
- It truthfully discloses that modelled load 30 maps to relative score 100,
  that this is internal normalization, and that 100 is not healthy, typical,
  recommended, maximum, or biological.
- It explicitly says scores can exceed 100.

### Provenance and evidence

- `What drove it` / `Main drivers` and causal contributor ranking were removed
  from the saved result.
- `How this estimate was built` preserves stored item order and describes
  software handling only:
  - `user_confirmed`: `Value you entered`
  - `exact_fii`: `Matched in INSIGHT’s current food table`
  - `mapped_fii`: `Estimated using a similar food`
  - `macro_fallback`: `Used a fallback estimate`
  - `unknown`: `Not estimated in this version`
- Stored legacy `why` strings are not rendered as authority.
- The optional bars are labelled as calorie share only and explicitly not as
  relative-score share.

### Hard-to-estimate path

- Canonical low or unknown estimate quality keeps `Hard to estimate from this
  meal` primary.
- Missing item names are stated explicitly outside disclosures.
- The page does not claim unknown items add zero or that real insulin demand
  may be higher.
- A finite partial calculation is available only inside closed `Advanced
  details`, labelled `Partial model output`, with a complete-meal boundary.
- The primary hard state contains no prominent numeric score.

### Preserved behaviour

- J5 page structure, hero/plate, status, metadata, anchored dock, Done/Delete,
  Check another meal, delete confirmation, and read-only routing remain.
- J6 History continues to open the canonical saved result.
- Paper and Ink use the same structure and wording.
- No current-meal draft is created by reading a saved result.

## 4. Scope confirmation

No backend, Rust, API contract, schema, formula, scoring, persistence,
encryption, telemetry, research, consent, or J6 History semantics were changed.
No formula version, dataset version, golden scientific fixture, or migration
changed. All test and evidence data is synthetic.

## 5. Changed implementation and test surfaces

Production:

- `frontend/src/pages/meal/SavedMealDetail.tsx`
- `frontend/src/components/EvidenceRows.tsx`
- `frontend/src/utils/acuteScoreDisplay.ts`
- `frontend/src/utils/insulinImpactPresentation.ts`
- `frontend/src/utils/safetyCopy.ts`
- `frontend/src/theme/app.css`

Tests and evidence:

- focused unit tests beside the utilities and components above;
- saved-result, Dashboard recents, and save-to-result integration tests;
- `frontend/cypress/e2e/j5-saved-result.cy.ts` regression expectations;
- older directly relevant saved-detail, acute-score, Campaign A layout, and
  manual-save Cypress expectations updated to the same J7 contract;
- new `frontend/cypress/e2e/j7-saved-result-interpretation.cy.ts`;
- this report and `evidence/EVIDENCE-LEDGER.md` with nine browser PNGs and six
  physical-device PNGs.

## 6. Verification

Final clean results:

| Check | Result |
|---|---|
| `npm run lint` | pass |
| `npx tsc --noEmit` | pass |
| `NODE_OPTIONS=--no-experimental-webstorage npm run test.unit -- --run` | 49 files, 591 tests passed |
| focused J7-related unit run | 7 files, 198 tests passed |
| `npm run build` | pass; existing bundle-size and stale Browserslist advisories only |
| J7 Cypress, Chrome | 14/14 passed |
| directly relevant legacy Cypress specs | 22/22 passed across saved-detail, acute-score, Campaign A layout, and manual-meal |
| J5 saved-result Cypress regression | 21/21 passed on final clean rerun |
| J6 History/picker Cypress regression | 26/26 passed |
| `git diff --check` | recorded after final documentation/review pass |

The first full-unit invocation inherited Node 26's experimental web-storage
mode and failed because JSDOM `localStorage` was unavailable. The repository's
established `--no-experimental-webstorage` setting was then applied and the
complete suite passed. A concurrent lint/build attempt also briefly exposed a
transient Vite timestamp file to ESLint; the standalone `npm run lint` rerun
passed. Neither was a product-code failure.

Browser verification also confirmed that the app loaded without a framework
error overlay, exposed the expected navigation, and logged no browser error.
The only console warning was the expected synthetic local fallback while the
FastAPI server was not running.

## 7. Visual acceptance

The Cypress spec verifies Paper, Ink, 390x844, 320x700, 100% and 133% text,
normal and hard states, scores 137/767/1200, long meal and evidence-row names,
horizontal overflow, and landscape recovery. Nine exact-dimension viewport captures were then made from the same
local build with synthetic records and visually inspected. See
`evidence/EVIDENCE-LEDGER.md`.

The captures show neutral typography at all score sizes, no semantic score
colour, no overflow, readable hard-state copy, and an intact anchored dock.
The retained Samsung captures separately verify the same contract in Android
WebView at native portrait, 130% platform font scale, and landscape.

## 8. Physical Samsung acceptance

- Device: Samsung SM-M356B, Android 16 / API 36, attached and authorized as an
  ADB `device`.
- `npx cap sync android` completed. `gradlew.bat --no-daemon assembleDebug`
  then passed with JDK 21 after using the short host temp directory `C:\jtmp`;
  the earlier loopback error did not recur.
- To avoid reading or modifying the existing INSIGHT installation, the debug
  APK was rebuilt with a temporary `applicationIdSuffix ".j7qa"`. The suffix
  was immediately reverted in the working tree before testing.
- Installed QA package: `io.ionic.starter.j7qa`.
- APK: 8,580,869 bytes; SHA-256
  `3C137D05BB37C7CF445E473B670C986D6559E48BF172BABD835CD1AFE2F0199B`.
- Only two synthetic local saved meals were seeded inside that isolated
  package: one normal result and one canonical unknown-quality hard result.

The physical smoke passed:

| Check | Result |
|---|---|
| Paper, normal score 767 | neutral heading and score; non-claim boundary and evidence visible; old reference/drivers semantics absent; dock intact |
| Scale disclosure | keyboard-focusable; opens to the normalization mapping, non-health meaning, and scores-over-100 statement |
| Ink, hard result at Android font scale 1.3 | hard state remains primary; unknown item named; no primary score; Advanced details closed initially; evidence and dock readable |
| Advanced details | opens to partial score 1023 only under `PARTIAL MODEL OUTPUT`, with the complete-meal limitation |
| Landscape recovery | 891×411 CSS viewport; score, boundary, evidence, and dock present; document width equals viewport width with no horizontal overflow |
| Lifecycle | HOME then resume reported `LaunchState: HOT` and preserved `/meals/saved/j7-device-normal` |

Initial device settings were `font_scale=1.0`, automatic rotation enabled, and
`user_rotation=0`. Those exact values and portrait orientation were restored.
The QA package was then uninstalled successfully and its WebView debug forward
removed. No real meal, photo, health record, account data, notification
content, device serial, or carrier name was read or retained. See the device
table and visual inspection notes in `evidence/EVIDENCE-LEDGER.md`.

## 9. Risk summary

- **Scientific:** presentation copy is safety-sensitive, but formulas, inputs,
  outputs, thresholds, and canonical quality gating were not altered.
- **Privacy:** evidence and tests use synthetic meals and typographic plates;
  no real photos or private data were used.
- **Accessibility:** the score is one neutral labelled group, visible and ARIA
  meanings agree, legacy ring/reference semantics are absent, and disclosures
  are native keyboard-operable `details` elements.
- **Regression:** delete, dock, routing, save-to-result, Paper/Ink, narrow/large
  text, and J6 History-to-result paths are covered by passing tests.
- **Residual:** this is a bounded smoke on one Samsung/Android/WebView
  configuration, not exhaustive device-matrix coverage. The status and
  navigation bars in physical screenshots contain only ordinary system
  time/battery/network-type icons; no notification text or identifier appears.

## 10. Independent review

A different agent performed the required read-only review of the settled
actual implementation diff after the stale Cypress expectations and
long-evidence-row case were corrected. It reported no remaining P0–P3
findings. The reviewer independently confirmed the scientific and scope
boundaries, canonical quality gating, provenance wording, accessible score
semantics, J5/J6 regressions, and browser evidence hashes/dimensions. A final
read-only evidence/documentation audit after the Samsung run also reported no
P0–P3 findings. It matched all six device image hashes, sizes, and dimensions;
matched the APK hash and byte count; confirmed the restored device settings,
removed QA package, empty WebView forwards, and clean Android git scope; and
found the physical, privacy, scientific, and scope claims supported by the
retained artifacts and repository state.
