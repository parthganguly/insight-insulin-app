# J4 evidence privacy-sanitization manifest

## Purpose

`parthganguly/insight-insulin-app` is a **public** repository. Final pre-commit
review of the J4 evidence tree found two classes of material that must not be
published:

1. **Whole-device lifecycle logs.** The three lifecycle captures were unfiltered
   `adb logcat` output, not app-scoped. Roughly 95% of their content was
   unrelated personal-device activity — a third-party messaging application,
   other installed applications, Health Connect traffic, carrier MCC/MNC
   identifiers, Wi-Fi byte counters, modem timings, and battery/keyguard/AOD
   state.
2. **A stable hardware identifier.** The persistent ADB serial of the physical
   QA handset appeared in two device-proof text files and four primary JSON
   evidence files.

Neither class is required to prove any J4 claim. This document records the
curation applied so every public artifact remains provenance-linked to its
private original.

This is pre-publication privacy curation. It is **not** a change to the
implementation, the automated test results, the physical QA outcome, or the
review verdict.

## Method

- Each raw original was copied to a private archive outside this Git repository
  and verified byte-identical by SHA-256 before the public copy was removed.
- Each raw original was then removed from the public evidence tree.
- Each public derivative was written under a **new, distinct filename**. No
  original public filename was silently overwritten.
- Lifecycle logs became `-app-scoped-lifecycle-extract.txt`: only lines directly
  naming `io.ionic.starter` or `VRI[MainActivity]` were retained; lines naming
  any package outside the J4 app and the Android platform namespaces were
  dropped, as were cross-package visibility tags and unrelated device
  telemetry; carrier MCC/MNC and hardware serials were redacted inside retained
  lines. Original timestamps and line ordering are preserved verbatim, and no
  line was reworded, reordered, merged or synthesized.
- Device proof text files became `-redacted.txt`: the serial value was replaced
  with `DEVICE_SERIAL_REDACTED` and every other line is verbatim.
- JSON evidence became `-redacted.json`: the single `device.serial` value was
  replaced with `DEVICE_SERIAL_REDACTED` and a top-level `privacySanitization`
  object was appended recording the private raw SHA-256. Each derivative was
  parsed and machine-compared against its original to prove no other field,
  value, key order, number, boolean or timestamp changed.

## Private originals and public derivatives

### Lifecycle logs

| Former public path (under `evidence/`) | Raw bytes | Raw lines | Private raw SHA-256 |
| --- | ---: | ---: | --- |
| `rotation-p0/postfix-stationary-font-1.0-to-1.3-no-rotation-2026-07-25-run1-lifecycle-logcat.txt` | 815,838 | 4,893 | `8f2cee1ca7e870299d1865c6a1dd4d6f43e8161458088cad5e66435938dfd339` |
| `rotation-p0/stationary-font-1.0-to-1.3-no-rotation-settle-2026-07-25-run1-lifecycle-logcat.txt` | 938,721 | 6,206 | `a714615f3a42bfc24b278cac440814433fd830c204e71e5a986c484ec6f59fe5` |
| `rotation-p0/dynamic-font-1.0-to-1.3-lifecycle-logcat.txt` | 17,788 | 80 | `3559ae913eac206e107d53b0687237c914ee75a3bc8f507110af6620e20ae5eb` |

| Public derivative (under `evidence/`) | Bytes | Lines | Retained/raw | Public SHA-256 |
| --- | ---: | ---: | ---: | --- |
| `rotation-p0/postfix-stationary-font-1.0-to-1.3-no-rotation-2026-07-25-run1-app-scoped-lifecycle-extract.txt` | 77,078 | 253 | 225/4,893 | `0f0869dc0f91835ea073b7ba4afc7ea56ab6beb849360de6ab9481da9c4718ec` |
| `rotation-p0/stationary-font-1.0-to-1.3-no-rotation-settle-2026-07-25-run1-app-scoped-lifecycle-extract.txt` | 56,050 | 222 | 194/6,206 | `33d162b9dacf37e6e5016062ad52c97d789e27059d58e1f2064737128f8e727c` |
| `rotation-p0/dynamic-font-1.0-to-1.3-app-scoped-lifecycle-extract.txt` | 12,594 | 63 | 35/80 | `55fa78db0ce53b6301d4075a118111a15a3d4585706ae68a31bca7855100a43b` |

Sanitization method: app-scoped line filtering plus carrier/serial redaction, as
described above. Retained line counts exclude each extract's provenance header.

### Device proof text

| Former public path (under `evidence/`) | Raw bytes | Raw lines | Private raw SHA-256 |
| --- | ---: | ---: | --- |
| `device/device-session-proof.txt` | 1,009 | 31 | `da1bbd0945480818b5784d15dd522d9f161d5a7cc16962e1cfab43f346aa4e82` |
| `device/apk-install-proof.txt` | 529 | 18 | `0551a24c1edd8234605f1f2eaf23b05685d8fd029001b3ac89bd245f08244832` |

| Public derivative (under `evidence/`) | Bytes | Lines | Public SHA-256 |
| --- | ---: | ---: | --- |
| `device/device-session-proof-redacted.txt` | 1,380 | 38 | `3b6ffb87f5160b64ff33f04d81322eadf2f67e39c5c2378c5c5552fc0dba6f2e` |
| `device/apk-install-proof-redacted.txt` | 897 | 25 | `5b57f42e492179e112629fdb1261c52224c7368d29cb4dba98e9c4b014f41c8a` |

Sanitization method: stable ADB serial replaced with `DEVICE_SERIAL_REDACTED`;
all other content verbatim. Byte/line growth is the added provenance header.

### JSON evidence

| Former public path (under `evidence/`) | Raw bytes | Raw lines | Private raw SHA-256 |
| --- | ---: | ---: | --- |
| `rotation-p0/postfix-stationary-font-1.0-to-1.3-no-rotation-2026-07-25-run1.json` | 12,378 | 467 | `7cabed7d5efc93685e270fc467027a52a3348a932709abdc8f96884b04cd4b0d` |
| `rotation-p0/clean-font-1.0-postfix-run4.json` | 10,139 | 372 | `8288a8d6310e3f72ed69c08273c6676b757bccdefe5b9806915859dec56fe0a3` |
| `rotation-p0/clean-font-1.3-run4.json` | 10,128 | 372 | `3e84e63bb82e909ac1dc4fe54d7ff20fd2571b3c6e008e67e6e3cfd7d13475f0` |
| `rotation-p0/clean-font-1.3-run5.json` | 10,117 | 372 | `266d8520aa2a60fa841f792416d20cae86ccdfd2808e3ba956543a647e42e429` |

| Public derivative (under `evidence/`) | Bytes | Lines | Public SHA-256 |
| --- | ---: | ---: | --- |
| `rotation-p0/postfix-stationary-font-1.0-to-1.3-no-rotation-2026-07-25-run1-redacted.json` | 12,626 | 472 | `3e0c6986dea5311931f352487c9641c0871d47d2540bbd57de734bac99598237` |
| `rotation-p0/clean-font-1.0-postfix-run4-redacted.json` | 10,387 | 377 | `120555e14e22966cdde0758ebfe577b341aa2cf67a9a5376b4600cefae7b6167` |
| `rotation-p0/clean-font-1.3-run4-redacted.json` | 10,376 | 377 | `c38772ed071b85504e6d52ee8ada5033d2c9bae615c7e3f154f8095cdce28d1f` |
| `rotation-p0/clean-font-1.3-run5-redacted.json` | 10,365 | 377 | `1ca83788aaeea0b245efe2a8235061b5d702878fe1982f4fd587287e0e5fe677` |

Sanitization method: `device.serial` replaced with `DEVICE_SERIAL_REDACTED`; a
top-level `privacySanitization` object appended carrying the private raw
SHA-256. Every derivative was parsed and machine-compared against its original;
the comparison confirmed no other difference and unchanged top-level key order.

## Statements

- The nine private raw originals are preserved **byte-identically** outside this
  repository. Each archive copy was verified against its source by SHA-256
  before the public copy was removed.
- The absolute path of the private archive is **intentionally omitted** from
  this manifest and from every report, because it is a machine-local location.
- The public derivatives retain **all load-bearing J4 evidence**. For the JSON
  set that means schema version, run identifier, device model, API level, font
  scale, package and version, corrected APK SHA-256, timing, lifecycle state,
  plugin/root/Ionic inset values for all four sides, viewport, protocol
  restrictions, rotation samples, and result fields — all unchanged.
- The excluded material — unrelated third-party application activity, Health
  Connect traffic, carrier and Wi-Fi/modem telemetry, battery and keyguard
  state, and the stable ADB serial — is **irrelevant to every J4 product
  claim**. No conclusion in the implementation report or evidence ledger rests
  on any of it.
- The **safe-area numeric proof remains fully intact** in the redacted JSON
  files and in the PNG screenshots, which are unmodified. The redacted JSONs
  still carry every plugin/root/Ionic inset value and every timing sample.
- The **lifecycle extracts prove only** the relevant app process/activity
  lifecycle, the `MainActivity` configuration relaunch, and app-scoped
  window/inset events. They are supporting evidence; they are not the source of
  any numeric safe-area value.
- This curation is **pre-publication privacy work only**. It does not change the
  implementation, the 488/488 unit results, the 43/43 focused startup results,
  the 9/9 Cypress results, the TypeScript/lint/build results, the physical QA
  outcome, or the review verdict.

## Evidence status after curation

- **Private raw originals:** immutable and preserved outside the repository,
  identified here by SHA-256.
- **Public evidence:** provenance-linked sanitized derivatives, each recording
  the SHA-256 of the private original it derives from.
