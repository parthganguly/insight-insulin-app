# J4 confirm evidence ledger

**J4 SAFE-AREA FIX, INDEPENDENT DEVICE QA, AND FABLE VISUAL REVIEW COMPLETE — UNCOMMITTED, READY FOR COMMIT, PUSH, AND DRAFT PR.**

All meal content is synthetic. This ledger separates final self-proving post-fix evidence, historical blocker evidence, and historical diagnostic evidence.

This repository is public. Nine raw evidence originals containing whole-device logs or the stable ADB hardware serial were privately archived outside the repository and replaced here by provenance-linked sanitized derivatives. Private raw originals are immutable and preserved by SHA-256; public evidence consists of sanitized derivatives. Full provenance, hashes and methods are in `privacy-sanitization-manifest.md`.

## Browser matrix

Each browser directory contains these eight intentional PNGs: `ordinary.png`, `needs-review.png`, `corrected.png`, `advanced-expanded.png`, `long-text.png`, `empty-draft.png`, `loading.png`, and `failure.png`.

| Probe | Theme | Directory | PNG count | Pixel dimensions |
| --- | --- | --- | ---: | --- |
| Standard | Paper | `browser/390x844/paper` | 8 | 390x844 |
| Standard | Ink | `browser/390x844/ink` | 8 | 390x844 |
| Narrow | Paper | `browser/320x700/paper` | 8 | 320x700 |
| Narrow | Ink | `browser/320x700/ink` | 8 | 320x700 |
| 133% text scale | Paper | `browser/390x844-text133/paper` | 8 | 390x844 |
| 133% text scale | Ink | `browser/390x844-text133/ink` | 8 | 390x844 |

The loading XML proves only that the CTA is disabled. The loading screenshot proves the visible label: `Estimating insulin demand…`. Android uiautomator does not prove `aria-busy` or visible browser text.

## Corrected APK and physical device

Device: Samsung SM-M356B, Android 16/API 36, three-button navigation.

| Field | Value |
| --- | --- |
| Package | `io.ionic.starter` |
| Version | `1.0` / code `1` |
| Corrected APK SHA-256 | `5822751155e66de718ada6fd0be1290ef9ab8bce2e50260bca9e4f116f9d7a05` |
| Previous blocker APK SHA-256 | `AE6D258AE9108EF7183AFEACD3EB1761A346B3A3310816183F95B2DA490A6990` |
| Installation proof | ADB streamed install returned `Success`; package update time was `2026-07-25 18:20:23` |

Device and install proof files are published as redacted derivatives, with the stable ADB serial replaced by `DEVICE_SERIAL_REDACTED` and all other content verbatim:

- `device/device-session-proof-redacted.txt`
- `device/apk-install-proof-redacted.txt`

The corrected hash differs from the blocker hash. The APK was built from the current uncommitted worktree after passing TypeScript, focused lint, focused startup tests, full unit tests, relevant Cypress, production build, and `git diff --check`.

## Final self-proving post-fix evidence

### Stationary `1.0 → 1.3` Android font relaunch

- `rotation-p0/postfix-stationary-font-1.0-to-1.3-no-rotation-2026-07-25-run1-redacted.json`
- `rotation-p0/postfix-stationary-font-1.0-to-1.3-no-rotation-2026-07-25-run1-app-scoped-lifecycle-extract.txt`
- `rotation-p0/postfix-stationary-font-1.0-to-1.3-no-rotation-2026-07-25-run1-1s.png`
- `rotation-p0/postfix-stationary-font-1.0-to-1.3-no-rotation-2026-07-25-run1-final-portrait.png`

Protocol: portrait locked; font scale initially 1.0; cold launch; font changed to 1.3; then no rotation, background/resume, manual resize, or app interaction. Samples use read-only Chrome DevTools Protocol plugin and computed CSS-variable reads. The JSON identifies device/API/package/version/corrected APK hash and includes all four sides, viewport, lifecycle navigation state, actual timing, and the protocol restrictions.

| Nominal check | Actual completed | Plugin bottom | Root bottom | Ionic bottom |
| ---: | ---: | ---: | ---: | ---: |
| Initial | 462.335 ms | 48px | 48px | 48px |
| 250 ms | 929.032 ms | 0px | 0px | 0px |
| 500 ms | 1,196.693 ms | 0px | 0px | 0px |
| 750 ms | 1,463.674 ms | 0px | 0px | 0px |
| 1 s | 1,701.106 ms | 0px | 0px | 0px |
| 1.5 s | 3,724.502 ms | 48px | 48px | 48px |
| 2.5 s | 3,979.389 ms | 48px | 48px | 48px |
| 3 s | 4,254.318 ms | 48px | 48px | 48px |
| 5 s | 5,203.730 ms | 48px | 48px | 48px |
| 10 s | 10,263.466 ms | 48px | 48px | 48px |

A short all-zero state while the recreated Android window inset was unavailable is acceptable. The first observed correct plugin/root/Ionic agreement after the all-zero interval was 3,724.502 ms host elapsed, with document performance time 3,443.5 ms. The finite ladder recovered without any lifecycle recovery event, and values remained stable at all later samples. The 1 s and final portrait screenshots show no visible Android-navigation or fixed-dock/tab-bar overlap.

### Final font-1.3 rotation set

The required final self-identifying font-1.3 set is:

- `rotation-p0/clean-font-1.3-run3.json`
- `rotation-p0/clean-font-1.3-run4-redacted.json`
- `rotation-p0/clean-font-1.3-run5-redacted.json`

Runs 4 and 5 are post-fix corrected-APK runs at explicit font scale 1.3. Each records an initial portrait baseline, portrait-to-landscape and landscape-to-portrait samples, four-side plugin/root/Ionic values, actual timing, device/API/package/version/APK hash, and no-background/resume statement. All samples agree.

### Separate post-fix font-1.0 control

- `rotation-p0/clean-font-1.0-postfix-run4-redacted.json`

This control records the same complete portrait-to-landscape-to-portrait four-side agreement on the corrected APK.

### Manual regression captures

Self-proving visual captures:

- `rotation-p0/postfix-hot-resume-font1.png`
- `rotation-p0/postfix-paper-dashboard-font1.png`
- `rotation-p0/postfix-ink-dashboard-font1.png`

Manual QA found correct hot-resume behavior, Paper appearance, Ink appearance, no Android-system-navigation overlap, no tab-bar/dock overlap, and no new visible startup flash attributable to the settle ladder. These three captures visually support those statements.

Retained but **not self-proving** keyboard captures:

- `rotation-p0/postfix-manual-keyboard-open.png`
- `rotation-p0/postfix-manual-keyboard-dismissed.png`

Manual keyboard behavior was reported as passing during physical QA. Despite their file names, both images are Home/dashboard captures and neither visibly contains the Android IME or the manual-entry screen. They therefore do not visually prove keyboard-open layout, keyboard-dismiss recovery, or dock recovery after keyboard dismissal, and must not be cited as such. The dismissed-state capture does show a correct dock with no system-navigation overlap, and the resize-driven safe-area synchronization path covers the behavior structurally; neither replaces a correctly framed capture. This is a non-blocking P2 evidence limitation. A correctly framed keyboard-open/dismiss recapture on the manual-entry screen may be added later; it is not required for J4 merge approval.

## Historical blocker evidence

The previous APK had a persistent stationary mismatch and visible overlap. These blocker artifacts remain retained. Their raw originals are immutable and privately preserved; the lifecycle capture is published as its app-scoped derivative:

- `rotation-p0/stationary-font-1.0-to-1.3-no-rotation-settle-2026-07-25-run1.json`
- `rotation-p0/stationary-font-1.0-to-1.3-no-rotation-settle-2026-07-25-run1-app-scoped-lifecycle-extract.txt`
- `rotation-p0/stationary-font-1.0-to-1.3-no-rotation-settle-2026-07-25-run1-final-portrait.png`

On the blocker APK, plugin bottom reached `48px` while root and Ionic stayed `0px` through the final 10,219.017 ms sample. The mismatch persisted for at least 9,325.438 ms from its first observed mismatch. The old final screenshot visibly shows the application dock/tab bar overlapping Android’s three-button navigation. No post-fix claim may imply this defect never existed.

## Historical diagnostic and non-final evidence

Old clean font-1.3 runs 1 and 2 are retained diagnostics; they are not part of the final self-proving 1.3 set because they lack sufficient self-identifying metadata. Old clean font-1.0 runs 1, 2, and 3 are retained historical controls. The previous live font-change diagnostic is retained but non-final:

- `rotation-p0/dynamic-font-1.0-to-1.3-after-relaunch.json`
- `rotation-p0/dynamic-font-1.0-to-1.3-app-scoped-lifecycle-extract.txt`
- `rotation-p0/dynamic-after-relaunch-portrait.png`

That old dynamic probe showed the mismatch could be corrected by rotation; it did not prove stationary self-recovery. The unretained `clean-font-1.3-raw.json` must not be implied to exist.

## Evidence privacy sanitization

Final pre-commit review found two classes of material that must not be published from this public repository: unfiltered whole-device `adb logcat` output in the three lifecycle captures, and the stable ADB hardware serial in two device-proof text files and four primary JSON evidence files. Roughly 95% of each raw lifecycle log was unrelated personal-device activity — a third-party messaging application, other installed applications, Health Connect traffic, carrier MCC/MNC identifiers, Wi-Fi byte counters, modem timings, and battery/keyguard/AOD state.

All nine raw originals were archived privately outside this repository, verified byte-identical by SHA-256, removed from the public tree, and replaced by derivatives under new, distinct filenames. The absolute private path is intentionally omitted here because it is machine-local.

| Public derivative (under `evidence/`) | Replaces | Method |
| --- | --- | --- |
| `rotation-p0/postfix-stationary-...-run1-app-scoped-lifecycle-extract.txt` | postfix stationary lifecycle logcat | app-scoped filtering; carrier/serial redaction |
| `rotation-p0/stationary-...-settle-...-run1-app-scoped-lifecycle-extract.txt` | blocker stationary lifecycle logcat | app-scoped filtering; carrier/serial redaction |
| `rotation-p0/dynamic-font-1.0-to-1.3-app-scoped-lifecycle-extract.txt` | dynamic diagnostic lifecycle logcat | app-scoped filtering; carrier/serial redaction |
| `device/device-session-proof-redacted.txt` | `device/device-session-proof.txt` | serial redaction only |
| `device/apk-install-proof-redacted.txt` | `device/apk-install-proof.txt` | serial redaction only |
| `rotation-p0/postfix-stationary-...-run1-redacted.json` | postfix stationary run JSON | serial redaction + provenance object |
| `rotation-p0/clean-font-1.0-postfix-run4-redacted.json` | font-1.0 post-fix control JSON | serial redaction + provenance object |
| `rotation-p0/clean-font-1.3-run4-redacted.json` | font-1.3 run 4 JSON | serial redaction + provenance object |
| `rotation-p0/clean-font-1.3-run5-redacted.json` | font-1.3 run 5 JSON | serial redaction + provenance object |

Every numeric value, timing, result field, APK identity, device model and API level survives intact. Each redacted JSON was parsed and machine-compared against its original, confirming the only differences are the `device.serial` value and the appended `privacySanitization` object, with top-level key order unchanged. The lifecycle extracts preserve original timestamps and ordering and prove only the app process/activity lifecycle, the `MainActivity` configuration relaunch, and app-scoped window/inset events; the safe-area numeric proof lives in the redacted JSONs and the unmodified PNG screenshots. Only stable hardware serials and unrelated device activity were excluded, and no J4 claim rests on either.

This curation changed no implementation file, test, or result. Automated validation, physical QA, and Fable's APPROVE verdict and merge readiness are unchanged. Per-file byte counts, line counts and both hashes are in `privacy-sanitization-manifest.md`.

## Fable visual and product review

Fable's final read-only product, visual-design, and UX review returned verdict **APPROVE** and final disposition **READY FOR COMMIT, PUSH, AND DRAFT PR**. No P0 or P1 product, visual, responsive, safe-area, keyboard, resume, loading, failure, empty-state, Paper, or Ink defect was found. The keyboard-evidence limitation recorded above was Fable's P2 evidence finding; the remaining P2 items (meal-name clipping without ellipsis, empty-draft CTA visual state, `Amount` truncation at 133% text scale) are deferred cosmetic polish and do not block merge.

## Preservation boundary

Before QA, SHA-256 values for all 83 pre-existing files under this evidence directory were recorded. After QA, every protected hash remained identical. Only new uniquely named post-fix evidence files were added. During QA, no existing raw evidence was overwritten, edited, deleted, renamed, truncated, appended to, or regenerated.

A separate, later pre-publication privacy step removed nine raw originals from this public tree after archiving them privately, byte-identical and SHA-256-verified. That step did not edit, overwrite, truncate or regenerate any raw original: each was preserved intact outside the repository and replaced here by a derivative under a new, distinct filename. No original public filename was reused. All other evidence — every PNG, XML, and the remaining JSON files — is unchanged. Provenance and hashes are in `privacy-sanitization-manifest.md`.

Terra changed no production code, frontend tests, backend code, Android source, stores, APIs, scientific scoring, persistence, privacy behavior, or existing raw evidence. No files were staged, committed, pushed, merged, tagged, or published.
