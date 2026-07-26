# Annotated Journal J5 — evidence ledger

Every artifact below was produced in the J5 worktree from the working tree
described in `../implementation-report.md`, and was visually inspected before
being retained. The evidence remained uncommitted throughout engineering,
independent review, device QA, and final Fable review; packaging began only
after every required gate passed.

## Provenance

- Producer: `frontend/cypress/e2e/j5-saved-result.cy.ts`
- Runner: Cypress 13.17.0, Chrome 150 headless
- Viewports: 390×844 unless the filename says otherwise
- Appearance: encoded in each filename (`-paper` / `-ink`)
- Data: synthetic meals constructed inside the spec; the "photo" is an inline
  SVG data URI. No real user data, no real health data, no real meal photograph.
- Capture method: `cy.get("ion-app").screenshot(...)` — app viewport only,
  never the whole desktop.

## Browser captures

| SHA-256 | Bytes | File |
| --- | --- | --- |
| `4abafb0b34bbf89cdcefc8d7c502398e1303f638b31ffae94f0d63c1f5719b5c` | 79957 | `browser/result-delete-confirm-paper.png` |
| `d3bff5e9fb88a54faf9ef7c69db44526be9cb0303766045bb17bf576b14db5ac` | 43050 | `browser/result-disclosures-open-paper.png` |
| `0f2b254d814fcfa809fc0ca65796b5b0bed3b2a4fc93a252e82a952a6a5c2fe5` | 44627 | `browser/result-evidence-rows-paper.png` |
| `cf7b4b2c5df6b7cd5b282846cc35900c303ebe63a40e4832d7cec32fb66f9076` | 57877 | `browser/result-insufficient-ink.png` |
| `6ee575f314b9c62a02c91f405c2ffa9c486a9bb9766a8e4f1869a976c84b22e9` | 60668 | `browser/result-insufficient-paper.png` |
| `84cd40f075497f8d4678ca13da9f359bd1b55df86f2e54cc146f3f5e5a137dfe` | 67015 | `browser/result-large-text-paper.png` |
| `4134d15a6e6037e6873cecc62be44ab334819b446ae6c7d1e0406cf006eae439` | 57327 | `browser/result-long-name-320x700-paper.png` |
| `3f111cd7076dd549aed0bd9595eeb0438079ee88efc320f92e465bb3fa4fea26` | 61630 | `browser/result-normal-photo-ink.png` |
| `2ecdf5ee965fc37d625c108b7b98bd26d139f7d81349fd8ee39a2d8dfbe31a3b` | 64415 | `browser/result-normal-photo-paper.png` |
| `a42458b920c92fabe19d22a2adc9bb3d006bd8d248ea392d406843a867fa8b8c` | 63097 | `browser/result-normal-plate-paper.png` |

## What these artifacts do and do not prove

They prove browser rendering of the J5 chassis at the stated viewports,
appearances and text scale, including the insufficient-data variation, both
disclosures open, and the destructive confirmation.

They do **not** prove anything about physical-device behaviour. They are
desktop-Chrome captures at emulated viewport sizes: they carry no evidence
about Android safe areas, the fixed dock versus system navigation, rotation,
hot resume, or Android font-scale relaunch.

## Android build artifact (built, not device-tested)

- Path: `frontend/android/app/build/outputs/apk/debug/app-debug.apk` (not committed)
- Size: 8,585,176 bytes
- SHA-256: `ca293d1b75aa57926be0e0715046c1abc2af747547e2df3df5484c080a524d7a`
- Package: `io.ionic.starter`, version `1.0` (`versionCode` 1)

This hash records exactly which build the outstanding device gate should be run
against. The APK was **not** installed and **not** exercised on hardware.

## Physical device evidence

**None.** `adb devices` reported no attached device throughout this work, so
the Samsung SM-M356B matrix was not run. No device artifact exists, and
therefore no whole-device logcat, ADB serial, carrier identifier, Health
Connect activity, or other personal-device material is present anywhere in this
tree.

## Independent Terra verification — 2026-07-26

- Every retained browser artifact was opened and visually reviewed; all ten
  SHA-256 values and byte counts match the on-disk PNGs.
- The captures self-prove their labelled normal photo/plate, insufficient,
  Paper/Ink, evidence, disclosure, delete, long-name, and large-text browser
  states. They do not prove Android safe areas, system navigation, rotation,
  hot resume, or Android font-scale behavior.
- A fresh focused Cypress run passed 45/45 tests on the six required specs
  against a Vite server owned by this worktree on `127.0.0.1:5199`. Fresh
  screenshots went only to a unique temporary folder; retained evidence was
  not overwritten.
- `adb devices -l` again returned no device. No Samsung screenshot, UI dump,
  serial, whole-device logcat, or other device artifact was collected.
- The authoritative result is **DEVICE QA BLOCKER**, not ready for final Fable
  review.

## Samsung device follow-up — 2026-07-26

Device: SM-M356B, Android 16 / API 36, three-button navigation. The exact
verified APK (`ca293d1b75aa57926be0e0715046c1abc2af747547e2df3df5484c080a524d7a`,
8,585,176 bytes, `io.ionic.starter` 1.0 / versionCode 1) was installed.

Retained inspected synthetic captures:

| SHA-256 | Bytes | File |
| --- | ---: | --- |
| `fbdecff32d933d1b18772026a33f39aa41b481a7ebe79df232d58e208c4979d2` | 249728 | `device/samsung-sm-m356b-normal-paper-font-1.0.png` |
| `e0bbb7c09f0a3e3cb88ea42a037088a3e3686c7c58912c1a18d2c5629383aec4` | 247118 | `device/samsung-sm-m356b-normal-ink-font-1.0.png` |
| `66a16e12035de8a9729ad307f85818cdc13c42a228f5b8d100d4e7bafe907e3a` | 253594 | `device/samsung-sm-m356b-insufficient-paper-font-1.0.png` |
| `f87ac769d548d2a8da735f536c8ed144ac2fe42b5bf3ffc21f5c36e966954676` | 249058 | `device/samsung-sm-m356b-insufficient-ink-font-1.0.png` |
| `3888ff1892f930ac40d691d97fa7c9b2fe5e2c6d5d8ef97e644dfc39e15a3ccf` | 247469 | `device/samsung-sm-m356b-normal-paper-font-1.3.png` |
| `f96dae3a69e32d0cb298b9e9cfdb98a18aa1ca737262053510e3199420314519` | 231370 | `device/samsung-sm-m356b-insufficient-paper-font-1.3.png` |

All captures were inspected before retention and contain only synthetic meal
content plus ordinary status/navigation chrome; no serial, notification text,
account, telephone, carrier identity, Health Connect, Wi-Fi, or modem data is
retained. The scroll/disclosure state revealed the blocking dock failure:
`.result-dock` is absolutely positioned and disappears visually on scroll.

## Bounded Android dock correction — 2026-07-26 (Opus)

### New browser capture

| SHA-256 | Bytes | File |
| --- | ---: | --- |
| `ed94e3fea0f6d8252c9494c1f659781a872286b14fb29400d9389bb1e551062c` | 40501 | `browser/result-corrected-dock-font-1.3-disclosures-open-paper.png` |

Produced by the "dock persistence under tall content" test in
`frontend/cypress/e2e/j5-saved-result.cy.ts`, Chrome 150 headless, 390x844,
synthetic meal, against a Vite server owned by this worktree on port 5199.

**What it proves:** the corrected dock is rendered and anchored at the bottom
of the viewport, above the app tab bar, at 133% root text with both
disclosures open, while tall content scrolls beneath it.

**What it does not prove:** the end-of-scroll state. Cypress re-establishes the
Ionic scroll position when it captures, so the image is a mid-scroll view.
That the final content clears the dock is proven by the spec's geometric
assertion and by measurement (`ion-content` bottom 648 px, dock top 648 px,
last advanced item bottom 614 px, `--offset-bottom: 196px`), not by this PNG.
It also proves nothing about Android: it is a desktop-Chrome capture.

### Blocker evidence preserved

Terra's six SM-M356B captures under `device/` are unchanged by this
correction. Re-verified after the correction:

| SHA-256 | File |
| --- | --- |
| `3888ff1892f930ac40d691d97fa7c9b2fe5e2c6d5d8ef97e644dfc39e15a3ccf` | `device/samsung-sm-m356b-normal-paper-font-1.3.png` |
| `f96dae3a69e32d0cb298b9e9cfdb98a18aa1ca737262053510e3199420314519` | `device/samsung-sm-m356b-insufficient-paper-font-1.3.png` |

All ten previously retained browser captures are likewise unchanged; their
hashes still match the table above.

### Superseded and current APKs

| Role | SHA-256 | Bytes |
| --- | --- | ---: |
| Blocker (Terra-tested, superseded) | `ca293d1b75aa57926be0e0715046c1abc2af747547e2df3df5484c080a524d7a` | 8,585,176 |
| Corrected (built, **not installed**) | `0bcd8598d2f23526731533302015ae17d51cbd22a7df150a6a360fc3126bdd6c` | 8,631,515 |

Both `io.ionic.starter`, version `1.0`, versionCode 1. The corrected APK is the
artifact Terra's device re-verification must target.

### Device evidence from this correction

**None.** The Samsung SM-M356B dropped off ADB partway through the correction
and did not return, so the corrected APK was never installed and no spot-check
capture exists. No whole-device logcat, ADB serial, notification, account,
carrier, Health Connect, modem or Wi-Fi material entered the tree; the single
ADB device listing consulted during preflight was redacted before display and
never written to a file.

Android font scale was left at **1.3** on the handset — it was set for the
intended spot-check and could not be restored before the disconnection.

## Final independent corrected-APK device evidence — 2026-07-26

The corrected APK was installed and independently proven byte-identical to the
local build:

- Package: `io.ionic.starter`, version `1.0`, versionCode 1
- Local and installed SHA-256:
  `0bcd8598d2f23526731533302015ae17d51cbd22a7df150a6a360fc3126bdd6c`
- APK bytes: 8,631,515
- Device: Samsung SM-M356B, Android 16 / API 36, three-button navigation

All final-pass captures use the synthetic J5 Cypress fixtures. Every file was
opened and visually inspected before retention.

| SHA-256 | Bytes | Dimensions | File |
| --- | ---: | --- | --- |
| `74b2e13569faf8c7547080d9f9b41b99408753126bfe7eebea36bd1c80cb32e4` | 241830 | 1080x2340 | `device/samsung-sm-m356b-corrected-delete-confirm-ink-font-1.3.png` |
| `13e3f15b3b0aa694efb5bc8db4c88752a515671916fc7a1e425350d55977afa8` | 263994 | 1080x2340 | `device/samsung-sm-m356b-corrected-insufficient-ink-font-1.0-top.png` |
| `36583242fd95e19e147e3221ed4da4097330e5e0953949534a4108083715becc` | 248804 | 1080x2340 | `device/samsung-sm-m356b-corrected-insufficient-ink-font-1.3-top.png` |
| `9229b01df7f3d1d8ebed2c63cdae765cc305acad35221b315b00f66b9abf1da6` | 271182 | 1080x2340 | `device/samsung-sm-m356b-corrected-insufficient-paper-font-1.0-top.png` |
| `31c2357574bb9c4cb0fd22fae6425456ef21ae4368eff0b8d0791d560cf2f2c0` | 231202 | 1080x2340 | `device/samsung-sm-m356b-corrected-insufficient-paper-font-1.3-disclosures-bottom.png` |
| `af4fb45512260808969977f1cd355a3cdc40f9125b07351d7d8c8d753a16aa84` | 252230 | 1080x2340 | `device/samsung-sm-m356b-corrected-insufficient-paper-font-1.3-top.png` |
| `dcbbd06a93ffaeb8b947e4f23895cf0062039c49aaccf6dba2654da4191296a0` | 270927 | 1080x2340 | `device/samsung-sm-m356b-corrected-normal-ink-font-1.0-top.png` |
| `fc9168839665191656331bd5f32325132a4b660c77499954ab2e14fbe89736c9` | 258904 | 1080x2340 | `device/samsung-sm-m356b-corrected-normal-ink-font-1.3-hot-resume.png` |
| `73aa972607ae4700db98f921ba1866d01c38ff01ee2c6ccaf6736fccad1c79fe` | 112235 | 2340x1080 | `device/samsung-sm-m356b-corrected-normal-ink-font-1.3-landscape.png` |
| `4ffd28486fdc70eaa8644f902534339ba8565054ff7fb0d547f7ee94d89eaba8` | 260418 | 1080x2340 | `device/samsung-sm-m356b-corrected-normal-ink-font-1.3-top.png` |
| `ae896b5d104647837861be60c4e127ad6cd3cef1874a340e840593762ee23ac0` | 179359 | 1080x2340 | `device/samsung-sm-m356b-corrected-normal-paper-font-1.0-disclosures-bottom.png` |
| `d37296f99c444680f088e3df9c31f47ef80d580931528dd39a72e268bbc1eae7` | 276457 | 1080x2340 | `device/samsung-sm-m356b-corrected-normal-paper-font-1.0-top.png` |
| `7d2f29803e7973899966ae4b96f2a2472bba7bf8af4b33df295fdbf740380f71` | 193137 | 1080x2340 | `device/samsung-sm-m356b-corrected-normal-paper-font-1.3-disclosures-bottom.png` |
| `eb363b959e5ab8b35f0de801fdd1077aa3ecb7c9104f90e456d8cda71e332c70` | 262402 | 1080x2340 | `device/samsung-sm-m356b-corrected-normal-paper-font-1.3-top.png` |

### What the final-pass artifacts prove

- normal and insufficient states render in Paper and Ink at font scales 1.0
  and 1.3;
- the corrected footer remains visible above the tab bar and three-button
  system navigation;
- true end-of-scroll states keep the final advanced item above the footer;
- landscape, hot resume, and delete confirmation remain usable;
- Android hardware Back cancels deletion without removing the synthetic meal.

Geometric measurements and safe-area values are recorded in
`../implementation-report.md`. The device was restored to font scale 1.0,
portrait, with auto-rotation enabled.

### Recovery residue excluded from final evidence

Two unledgered `postfix` device captures existed during the recovery pass. They
were never valid final evidence: one showed the corrected saved-result footer
but carried no independently recorded provenance or geometry trace, and the
other showed Home rather than the labelled saved-result bottom state.

**Both were excluded from final evidence and deleted before publication.** No
claim in this ledger or in `../implementation-report.md` depends on them: the
corrected footer's behaviour is established by the fourteen final-pass
`corrected-*` captures above, together with the recorded geometry and
safe-area measurements.

All retained final-pass images contain synthetic meal content and ordinary
status/navigation chrome only. No notification content, account, telephone
number, carrier name, serial, Health Connect content, Wi-Fi identity, modem
data, real meal, real photograph, or real health data is present. No
whole-device logcat was collected.
