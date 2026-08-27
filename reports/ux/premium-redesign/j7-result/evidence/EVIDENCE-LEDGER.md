# J7 Evidence Ledger — Saved-Result Interpretation

**Slice:** Annotated Journal J7 (issue #125)
**Branch:** `codex/j7-saved-result-contract`
**Base:** `4beb62f3875050800d50136e9c3d8918c219ccd1`
**Captured:** 2026-08-27 from the local J7 Vite build on
`http://127.0.0.1:5173`, after the Chrome Cypress acceptance run.
**Automated spec:**
`frontend/cypress/e2e/j7-saved-result-interpretation.cy.ts` (14/14 passing).
**Exact-dimension capture:** agent-browser 0.35.0 against the same local build.

## Scope of this evidence

The retained browser captures show saved-result hierarchy, copy, appearance,
text scaling, narrow layout, and landscape recovery using synthetic records.
They complement the Cypress assertions that check semantic and layout
conditions at the same viewports. The separate `evidence/device/` captures
were made from the installed J7 Android WebView build on a physical Samsung;
browser images are not relabelled as device evidence.

## Privacy statement

Every meal, item name, score, timestamp, and source value is synthetic. The
hero uses the existing typographic plate; there are no real photographs. No
health record, account, notification text, telephone number, device serial,
carrier name, or unrelated application content appears in any capture. The
physical screenshots contain ordinary Android status/navigation icons,
including time, battery, and network type. Every retained image was opened and
visually inspected.

## Retained captures

All files live in `evidence/browser/`.

| # | Filename | SHA-256 | Bytes | Dimensions | State |
|---|---|---|---:|---|---|
| 1 | `normal-paper-390x844.png` | `EB3F714B30644EEF8C1828BD7395FE39C4B11977A35C9CDA5C8F0AC08B9C37C6` | 44212 | 390x844 | Paper, normal, score 137, 100% text |
| 2 | `hard-paper-390x844.png` | `8EE567322B876A26D1355BD01E4F6AE8ACC417642D2D923885BDD113561868DF` | 45547 | 390x844 | Paper, hard-to-estimate low quality, 100% text |
| 3 | `normal-ink-390x844.png` | `2307135A279D988341B88B0918913F676140ACAB5751BEE27F8B51E4903C7D91` | 43311 | 390x844 | Ink, normal, score 767, 100% text |
| 4 | `hard-ink-390x844.png` | `277B992D37B4AAEA9E8D20BFD7E8336C5270828A98BBDD2E702EB67BBA7856D8` | 45683 | 390x844 | Ink, hard-to-estimate unknown quality, 100% text |
| 5 | `normal-1200-long-name-paper-320x700.png` | `7844F148B53BC71A8FEA755C9F5ED92861A79F6B28EFE7BBC00FF0B100A0A126` | 38024 | 320x700 | Paper, score 1200, long title, narrow portrait |
| 6 | `normal-paper-390x844-text-133.png` | `36B48122F7A1069ED8FB5E2B9D3BD5DABA077BADB8F0AA8CC693D8E69F0AD79F` | 45292 | 390x844 | Paper, normal, score 767, 133% root text |
| 7 | `hard-ink-390x844-text-133.png` | `5A349FE3B3203E05074D211EF48AF4EEE37561520E3C047A1C3EBFF1F779CE45` | 49126 | 390x844 | Ink, hard-to-estimate, 133% root text |
| 8 | `normal-ink-landscape-844x390.png` | `D0FCBADE1C7330B6407AA5D1A7B532FC17D8F6723493604CD53389914B781C8B` | 23355 | 844x390 | Ink, score 767, landscape recovery after scrolling to score |
| 9 | `normal-1200-long-evidence-paper-320x700.png` | `FD72A6154F85DA01A99A54076F5A2A224F4C1A2043812C7EABFEE9CF9F9E054C` | 30892 | 320x700 | Paper, score 1200, long title and evidence-row name, scrolled narrow portrait |

## Inspection record

### #1 and #3 — normal Paper/Ink

Both appearances preserve the same anatomy and wording. `Estimated meal
insulin demand`, the model-derived explanation, `Relative score: N`, and the
non-claim boundary appear without a ring, reference marker, category colour,
or alarm treatment. The start of `How this estimate was built` is visible at
390x844. The captures do not prove disclosure text below the fold; Cypress and
unit tests cover it.

### #2 and #4 — hard-to-estimate Paper/Ink

The hard state is primary, the explanation is limited to model coverage, the
unknown item is named, and the estimate-building section begins above the
dock. No prominent partial number is shown. The images do not prove the
partial-output boundary inside closed Advanced details; automated tests expand
and assert that content.

### #5 — long name, 320x700, score 1200

The long synthetic name wraps instead of truncating or causing horizontal
overflow. The anchored dock remains intact. The primary score is below the
initial fold because the long title consumes the available height; Cypress
asserts that the page scrolls and that score 1200 uses the same neutral
semantics as smaller values.

### #6 and #7 — 133% text

Normal and hard states remain legible without horizontal overflow at 133%
root text. Content can move below the fold, while the dock stays anchored and
the page remains scrollable. These browser captures do not claim Android
platform font-scale behaviour; physical captures D2–D4 separately cover the
Samsung WebView at Android font scale 1.3.

### #8 — landscape recovery

After scrolling, `Relative score: 767` is painted above the anchored dock and
the page has no horizontal overflow. Cypress separately asserts that the score
rectangle enters the viewport and clears the dock. This is browser landscape
evidence only.

### #9 — long evidence row, 320x700

The long synthetic item name wraps within its evidence row without truncation,
overlap, or horizontal overflow. The mapped-food handling sentence remains
attached to the correct row, the calorie-only bar remains subordinate, and the
anchored dock stays intact. This scrolled capture complements #5, which shows
the long meal title at the top of the same narrow case.

## Automated semantic coverage associated with the captures

- Scores 50, 100, 137, 767, and 1200 share one neutral primary treatment.
- The normalization disclosure is closed initially, keyboard focusable, and
  states the modelled-load 30 to relative-score 100 mapping truthfully.
- Every canonical provenance source is described as a software action.
- Stored legacy `why` and `Main drivers` content is not rendered.
- Low and unknown quality suppress the primary score; finite partial output is
  confined to Advanced details.
- The dangerous old unknown-item wording is absent.
- J5 delete/dock/saved-result and J6 History-to-result regressions pass.

## Physical-device evidence

All files below live in `evidence/device/`. They were captured on a Samsung
SM-M356B running Android 16 / API 36 from the isolated QA package
`io.ionic.starter.j7qa`. The package contained only two synthetic records and
was uninstalled after the smoke. The device's original font and rotation
settings were restored.

| # | Filename | SHA-256 | Bytes | Dimensions | State |
|---|---|---|---:|---|---|
| D1 | `samsung-normal-paper.png` | `4158870F6FB264C97C0B055191BA1355274E9520727991909B1B361C43884007` | 247322 | 1080x2340 | Paper, normal score 767, native portrait |
| D2 | `samsung-hard-ink-font-130.png` | `DF0E4CA5A778512E3A9253562587BA3DFB8C9E1C0F6778CF4C9612A73010CE0D` | 245084 | 1080x2340 | Ink, hard-to-estimate primary state, Android font scale 1.3 |
| D3 | `samsung-hard-ink-font-130-evidence.png` | `302949651C7DE3FEB73E745C677534308281277D351EA332ACD1474509F0EB84` | 224880 | 1080x2340 | Ink, hard evidence rows and closed disclosures, font scale 1.3 |
| D4 | `samsung-hard-ink-font-130-advanced.png` | `F1E45111B3EB34A17380700BBF2432460CE398ACF2DF865128F334EA0AA1D4D7` | 226220 | 1080x2340 | Ink, opened Advanced partial output and complete-meal boundary, font scale 1.3 |
| D5 | `samsung-normal-ink-landscape.png` | `AAE34B03D8E3EE2234ABBB1C858F964038E21D648EB80AD94CFFD490B908E5C8` | 96212 | 2340x1080 | Ink, normal landscape top and anchored actions |
| D6 | `samsung-normal-ink-landscape-score.png` | `E4F06A8A0960A52DB24A8B0EF267BA9F66DB552068EEB9082033053A6D020069` | 122698 | 2340x1080 | Ink, normal landscape scrolled to score, boundary, and evidence |

### D1 — normal Paper

The physical WebView shows `Relative score: 767` neutrally, with the visible
non-claim boundary, beginning of the evidence section, and intact anchored
dock. Runtime inspection also confirmed the expected heading and the absence
of old reference/drivers language and any score visualization.

### D2 and D3 — hard Ink at 130% platform font scale

The hard state remains primary with the missing synthetic item named and no
prominent score. At the evidence position, long copy and both evidence rows
remain legible without horizontal overflow; the calorie-only bars stay
subordinate. `How this score works`, `What this doesn't mean`, and `Advanced
details` are still closed, while the dock remains usable.

### D4 — Advanced partial output

Opening Advanced details reveals `Relative score: 1023` only beneath `PARTIAL
MODEL OUTPUT`. The adjacent sentence explicitly limits it to items the current
model could estimate and says it is not a complete-meal estimate. This partial
number never appeared in the hard state's primary presentation.

### D5 and D6 — physical landscape recovery

The top capture shows the page and anchored actions after rotation. The
scrolled capture paints `Relative score: 767`, the non-claim boundary, and the
first evidence row above the dock. Runtime inspection measured an 891x411 CSS
viewport and a matching 891-pixel document width, so no horizontal overflow
was present.

### Physical interaction checks not encoded by a still image

- The normalization disclosure was keyboard-focusable and opened to the
  modelled-load 30 to relative-score 100 mapping, the non-health meaning, and
  the statement that scores can exceed 100.
- Advanced details was closed initially in the hard state before D4.
- HOME then app resume reported Android `LaunchState: HOT` and preserved the
  normal saved-result route.
- The test APK was 8,580,869 bytes with SHA-256
  `3C137D05BB37C7CF445E473B670C986D6559E48BF172BABD835CD1AFE2F0199B`.
