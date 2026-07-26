# Annotated Journal J5 — merge record

**J5 MERGED TO MAIN — PRODUCT, DEVICE QA, FINAL FABLE REVIEW, EVIDENCE CURATION, EXACT-HEAD CI, AND SQUASH-MERGE GATES COMPLETE.**

## Merge identity

- Pull request: #121
- Reviewed feature head: `d77724981ddab387f49d36d5fb4db822af0800eb`
- Base before merge: `b73766d27fc6fa43f4854b8ffa0671a0d799fed8`
- Merge method: squash
- Resulting `main` commit: `98c4f43e75fb4d140a7033d640b4c81d1ae8924f`
- Squash subject: `feat(journal): add saved result chassis (#121)`
- Merged at: 2026-07-26T17:48:01Z
- Source commits: 2
- Changed files: 50

The squash merge was guarded by the exact reviewed head. No direct commit was made to `main`, no force-push or tag was used, and J6 was not started as part of the merge.

## Exact-head CI

PR CI run 162 (`30212547183`) completed successfully against the exact reviewed feature head `d77724981ddab387f49d36d5fb4db822af0800eb`:

- Frontend: PASS
- Browser (Cypress): PASS
- Backend: PASS
- Rust: PASS

The second source commit, `d77724981ddab387f49d36d5fb4db822af0800eb` (`test(journal): stabilize J5 Cypress CI`), changed only `frontend/cypress/e2e/acute-score.cy.ts`. It replaced an invalid below-the-fold Ionic viewport-occlusion assertion with the specification's existing rendered-element helper. It changed no production code, CSS, reports, evidence, scoring, FII, backend, API, stores, persistence, or scientific behaviour.

## Product and evidence gates

Before packaging and merge, J5 passed:

- the sealed Fable product ruling;
- independent source and scientific-boundary review;
- corrected-APK Samsung SM-M356B QA on Android 16/API 36;
- Paper and Ink at font scales 1.0 and 1.3;
- true end-of-scroll with both disclosures open;
- footer/content/tab/system-navigation separation;
- rotation, hot resume, delete confirmation, and hardware-back cancellation;
- final Fable product and visual review: **APPROVE**;
- P0/P1 findings: none;
- evidence-hash and publication-privacy audits.

The corrected APK used for device QA was not committed:

- SHA-256: `0bcd8598d2f23526731533302015ae17d51cbd22a7df150a6a360fc3126bdd6c`
- Size: 8,631,515 bytes
- Package: `io.ionic.starter`
- Version: 1.0 (`versionCode` 1)

The public evidence retains 11 browser captures, 6 historical blocker-device captures, and 14 final corrected-device captures. All retained hashes and byte counts matched the evidence ledger. Two invalid recovery captures were excluded and deleted before publication. No whole-device logcat, stable ADB serial, personal-device data, machine-local path, APK, Cypress video/download, temporary harness, or secret was committed.

## Scope boundary

J5 remains a presentation-only rebuild of the saved-result route. The production journey remains:

`Confirm → Calculate & save → Saved result`

The merged change introduces no B2 unsaved-estimate flow, J7 ranking, percentile, population comparison, verdict band, diagnostic/treatment language, or per-item insulin-load reconstruction. Evidence bars use stored calorie proportions only and visibly state that they do not represent share of the score.

No scoring, thresholds, formulas, FII resolution, backend, Rust, API contracts, payloads, stores, persistence, telemetry, consent, authentication, privacy behaviour, or Android source/configuration changed.

## Issue state

- #120 closed automatically as completed through the squash merge.
- Roadmap #111 remains open.

This record is documentation-only and changes no implementation, test, evidence artifact, or product behaviour.
