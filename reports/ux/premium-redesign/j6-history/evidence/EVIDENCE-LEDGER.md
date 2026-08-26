# J6 Evidence Ledger — History and Previous Meal Picker

**Slice:** Annotated Journal J6 (issue #123).
**Branch:** `opus/annotated-journal-j6-history`.
**Base:** `e80c00d1c8cf0635f7128731827d26d0493d0032`.
**Captured:** 2026-07-27, Chrome 150.0.7871.182 (headed), Cypress 13.17.0,
against a dedicated Vite dev server on `http://localhost:5206` started from the
J6 worktree and verified to serve this branch before the run.
**Partially recaptured:** 2026-07-29, same browser and spec, on a dedicated
server on `http://localhost:5208` from this worktree, after the bounded
action-line and empty-state correction (implementation report §27). Seven of the
fifteen rows carry new hashes; each such row says so.
**Spec:** `frontend/cypress/e2e/j6-history-picker.cy.ts`.
**Physical acceptance captured:** 2026-08-26 on a real Samsung SM-M356B,
Android 16 / API 36, using accepted APK `0B29929A…`; see the current physical
device section at the end of this ledger and implementation report §28.

## Scope of what this evidence is

These are browser captures of the J6 presentation under synthetic data. They
show layout, hierarchy, copy, grouping, appearance handling, and the presence
or absence of specific affordances at the stated viewports.

**What this browser evidence does not prove by itself:**

- It does **not** prove Android WebView behaviour. The J5 slice established
  that a defect can survive browser evidence and still appear on the device
  (the dock projection that only broke inside the Samsung WebView).
- It did **not**, when captured, replace the Samsung SM-M356B matrix required by
  the sealed Fable ruling. That later matrix is independently recorded in the
  physical-device section below; these browser pixels are not reclassified as
  device evidence.

## Privacy statement

Every capture uses synthetic, demo-shaped meals created inside the spec. The
only "photograph" is an inline SVG data URI drawn by the spec itself — an
abstract plate shape, not a real meal photo. No real user data, health data,
meal photograph, account, notification, telephone number, device serial,
carrier identifier, or unrelated application content appears in any image.
Each file below was opened and visually inspected before being retained; the
inspection result is recorded per row.

## Retained captures

All fifteen files live in `evidence/browser/`.

| # | Filename | SHA-256 | Bytes | Dimensions | Viewport | Appearance | State |
|---|---|---|---|---|---|---|---|
| 1 | `history-populated-paper-390x844.png` | `2892A31D9A083C60B31A2F36817FD2C088424677B848ED1C7F54034B050FBC9F` | 65448 | 390x844 | 390x844 | paper | History, four meals across three days |
| 2 | `history-populated-ink-390x844.png` | `5B81C44F8B4F4D7B2A6A6947754902F093994CC6C4EE82AD1A0187BB8B5C2BE6` | 64629 | 390x844 | 390x844 | ink | History, same data as #1 |
| 3 | `history-populated-paper-320x700.png` | `9B44D09D01D0CA131463CFE5B68E40A26D35642D31B167AB370BA5EF1C9C9F3C` | 55906 | 320x700 | 320x700 | paper | History at the narrow viewport |
| 4 | `history-three-day-groups-paper.png` | `E6A3EAF71196871EAF440994549FA034FD74B3D8642AA04ACE8004F67B720D54` | 65476 | 390x844 | 390x844 | paper | Today / Yesterday / dated groups together |
| 5 | `history-mixed-photo-plate-paper.png` | `9648B3A24FE4607D5493674D1576F3A368AE6D95F9EFCBB4FE74D0CD7B8A5EA3` | 70065 | 390x844 | 390x844 | paper | Photo entry above a typographic-plate entry |
| 6 | `history-empty-paper.png` | `6815333C9607B2F402A321A4470BE7BD85D8F46407C86EC10D76036CDDD4C9EE` | 21044 | 390x844 | 390x844 | paper | History empty state — **recaptured 2026-07-29** after the empty-state centring correction |
| 7 | `history-long-name-133-paper.png` | `09C5B16D259285EF297D25619CDF3E9913973ACA1145AF38FD029B2B240A578E` | 61613 | 320x700 | 320x700 | paper | Long meal name at 133% root text |
| 8 | `history-bottom-scroll-paper.png` | `1FEF8A9498C32128555CC318D09D6A4D33BEEF4D656157D5201C4FCA5FFE77C2` | 67426 | 390x844 | 390x844 | paper | History scrolled to true bottom |
| 9 | `picker-populated-paper-390x844.png` | `95CF4FF7A6506904E6664A778AA9838CA7C3BF66A88E0042F58D54E2A8CA650D` | 72270 | 390x844 | 390x844 | paper | Picker, same four meals — **recaptured 2026-07-29** after the action-line accent correction |
| 10 | `picker-populated-ink-390x844.png` | `30B8398C66EC3017A46B5B8AC14BAE86CCFEB83DD091D3352373F228A4AD96BF` | 71830 | 390x844 | 390x844 | ink | Picker, same data as #9 — **recaptured 2026-07-29** after the action-line accent correction |
| 11 | `picker-populated-paper-320x700.png` | `47D669C21358D92D19238EE8637466957AC9232DE232971E3BAF1D0D323667D2` | 58776 | 320x700 | 320x700 | paper | Picker at the narrow viewport — **recaptured 2026-07-29** after the action-line accent correction |
| 12 | `picker-empty-paper.png` | `0BF1BC2F15E975769E7C03D7C91F0966C05375EFCA7C3183263BD8A376E878BE` | 29228 | 390x844 | 390x844 | paper | Picker empty state — **recaptured 2026-07-29** after the empty-state centring correction |
| 13 | `picker-long-name-133-paper.png` | `B048F9AA86B2BF6C7FA505884493C736B44FC98152A2C81A38EAF4D459CC6063` | 67429 | 320x700 | 320x700 | paper | Long meal name at 133% root text |
| 14 | `picker-action-line-paper.png` | `808D72E62D661FA1EC0DBBDEDC3DF38C15B11184F1B3237493AB13E58542966B` | 16037 | 339x233 | 390x844 | paper | Close crop of one entry showing the action line — **recaptured 2026-07-29** after the action-line accent correction |
| 15 | `picker-bottom-scroll-paper.png` | `14ABA3DD482156E43999FD9F34C6C5A425CE5067B9AEE0395901A257C396CC90` | 64313 | 390x844 | 390x844 | paper | Picker scrolled to true bottom — **recaptured 2026-07-29** after the action-line accent correction |

Row 14 is an element capture (one entry card) because a close crop is the point
of that image; every other row is a real viewport capture at its stated size.

## What each capture proves, and what it does not

**#1 / #2 — History, paper and ink.** Toolbar title `History`; folio heading
`Meal journal`; the read-only explainer; the `Today` day break; entry cards
carrying photo or plate, serif meal name, and the sealed meta line
(`8:15 AM · estimate 189 · Data quality: High`). No score ring, no calorie
figure, no action line. Paper and ink differ only in token values — the
structure, order, and wording are identical. They do **not** prove scroll
behaviour below the fold or WebView rendering.

**#3 / #11 — 320x700.** Both folios hold their hierarchy at the narrow
viewport with the reduced gutters, no horizontal overflow, and meal names
wrapping rather than truncating. They do **not** prove behaviour at other
widths or under Android font scaling.

**#4 — three day groups.** `Today`, `Yesterday`, and a dated label
(`Thursday, July 23`) all visible in one viewport, in store order, each with
its own hairline rule. Proves grouping is display-only over existing
timestamps. It does **not** prove grouping across a month or year boundary.

**#5 — mixed photo and plate.** A photo entry and a plate entry render with
the same card geometry, so a photo-less meal is not visually second class. It
does **not** prove behaviour for a broken or oversized image.

**#6 / #12 — empty states.** Recaptured 2026-07-29. The sealed strings render as
a **centred** journal-voice block on a bounded 300px measure, with the folio
heading still present above it and left-aligned, 44px of separation between them,
and the explainer correctly absent. No entries, no action line, no card, plate,
illustration or button, and no invented loading or error UI. The versions
retained before 2026-07-29 were left-aligned and top-anchored, 20px below the
folio — the second defect this correction fixed. They do **not** prove the
difference between "no meals" and "backend unreachable" — by design, since the
sync fails soft and J6 adds no error state.

**#7 / #13 — long name at 133% text.** A 77-character meal name wraps across
five lines with no clipping, no ellipsis, and no horizontal overflow. In #13 the
wrapped name pushes the metadata to the fold and the **action line sits below
it**, so this capture does *not* show the action line — an earlier version of
this row wrongly claimed it did. The action line under a long name is proven
instead by the device cell
`pixel8-api36-j6-picker-paper-font-1.3-long-name-action-accent-corrected.png`,
at real Android font scale 1.3. Neither browser capture proves Android font
scaling, which is a device-matrix requirement. Both files are retained from the
2026-07-27 run: the correction of 2026-07-29 changes nothing visible in them.

**#8 / #15 — true bottom scroll.** The last entry of the last day group is
fully painted above the tab bar. Proves the bottom padding and safe-area
allowance clear the dock in the browser. This is the exact class of claim the
J5 slice found could still fail inside the Android WebView, so it does **not**
substitute for the device check.

**#9 / #10 — picker, paper and ink.** Toolbar title `Choose a previous meal`
with a painted back arrow; folio heading `Log a previous meal again`; the
selection explainer; per-entry metadata of time and calories
(`8:15 AM · 400 kcal`) with **no** score, quality, or estimate text; and the
`Use as new draft` action line on every entry. They do **not** prove the reuse
mechanics themselves — those are pinned by the unit and Cypress assertions, not
by a picture.

**#14 — action line crop.** Recaptured 2026-07-29. The action line is legible at
caption size **in the appearance accent**, inside the caption block, clearly
separated from the metadata line above it, with no second interactive control in
the card. Pixel sampling of this file measures the action line at `#28577E`
(Paper `--accent`) against a metadata line at `#6B6B62` (`--ink-3`); the Ink
capture #10 measures `#82B4DD` against `#8F9089`. The version of this file
retained before 2026-07-29 showed the action line at `--ink-3`, identical to the
metadata — the defect this correction fixed — and the earlier wording of this
row asserting an accent treatment was measurably false of that file.

## Note on capture method

Two states were initially captured as oversized element screenshots and were
rejected on inspection: Cypress stitches those by scrolling, and against
Ionic's fixed inner scroll container that produced a duplicated day heading and
a tab bar baked into the middle of the image. They were re-captured as genuine
viewport screenshots with the dataset and scroll position chosen so the named
subject actually fits on screen, and the spec now asserts that fit rather than
assuming it.

The picker captures also revealed that `ion-icon` sizes its host before the
arrow glyph is fetched, so an early capture showed an empty back control
(verified by pixel sampling: 116 arrow pixels in paper, 0 in ink). The spec now
waits for the glyph itself; both appearances were re-verified at 116 pixels
each after the fix.

## Independent Terra Pixel 8 API 36 emulator acceptance — 2026-07-28

Independent acceptance used a **Pixel 8 API 36 emulator**, not a physical Samsung or other OEM device. All retained artifacts contain synthetic fixture data only.

### APK versioning

- **Current APK:** `0B29929AAC558106B5AC28D4FF26693D5A0D6AA1A7BE434B71BB62B3C218034C` — 8,584,770 bytes; `io.ionic.starter`; versionName `1.0`; versionCode `1`; built 2026-07-29 from the action-line/empty-state correction; installed-binary equality verified.
- **Superseded APK:** `A80D4403059F6761CBF670F8E3E6592D3B7701CEF8E8D8AFD5136271356C986F` — 8,582,819 bytes. Carries the uncorrected action line. Retained only for cells the correction does not touch, and for audit history.
- **Superseded APK:** `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` — retained only for unaffected portrait/interaction acceptance and audit history.
- **Initial defect APK:** `3808D4A66030F88FCE23ADED1A7ECFEFCFB4868A039ACF82FA539C8D495F5716` — diagnostic provenance only.
- The retained directory contains **24** artifacts: the 19 recorded at the 2026-07-28 closeout, plus the 5 captured on 2026-07-29 for the bounded action-line/empty-state correction. An earlier closeout summary stated 20 of the first set, but no twentieth file was present; this ledger records the files that actually exist and does not invent or reconstruct missing evidence.
- The 2026-07-29 correction changes `.journal-entry-caption p.journal-entry-action` and `.journal-empty-state` only. It therefore affects **every populated Picker cell in both orientations** — the action line's colour and its 6px separation, which also changes card height and so true-bottom geometry — and both empty states. It does not affect History entry cards, which have no action line, and it does not touch the `min-width: 768px` shell path corrected on 2026-07-28.

### Mutually exclusive artifact counts

- Implementation re-acceptance — current APK `0B29929A…` (2026-07-29 correction): **5**
- Terra acceptance — cell unaffected by the 2026-07-29 correction, retained from an earlier APK: **5**
- Terra acceptance — shell/measure claim current, action-line pixels superseded: **2**
- Terra acceptance — navigation claim current, action-line pixels superseded: **1**
- Superseded by the 2026-07-29 action-accent correction: **3**
- Superseded Terra landscape acceptance (2026-07-28 startup-policy correction): **2**
- Opus implementation diagnostic: **5**
- Sanitized lifecycle proof: **1**
- Generated/non-acceptance artifact: **0**
- **Total retained artifacts: 24**

These counts are mutually exclusive and were tallied from the Classification
column of the catalogue below, not asserted independently of it.

### Complete emulator artifact catalogue

| File | Classification | APK provenance | SHA-256 | Bytes | Dimensions | Route/state | Appearance | Font scale | Orientation | Cell proved | Limitation | Privacy |
|---|---|---|---|---:|---|---|---|---|---|---|---|---|
| `pixel8-api36-j6-history-ink-font-1.3-landscape-startup-policy-corrected-terra.png` | Terra acceptance — shell/measure only, action-line pixels superseded | `A80D4403059F6761CBF670F8E3E6592D3B7701CEF8E8D8AFD5136271356C986F` | `29BD070F92BCC8069509B19388D712BCC98001B4F709ACB46B9E9CA3E9E69D0B` | 100671 | 2400×1080 | `/meals` | Ink | 1.3 | Landscape | History landscape shell, centred reading measure, gutters and overflow | Independent emulator acceptance of the shell and centred reading measure on APK `A80D4403…`; not physical OEM validation; superseded for action-line colour by the 2026-07-29 captures | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-history-ink-font-1.3-landscape.png` | Superseded Terra landscape acceptance | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` | `1ED8305B9CD0F7F65D743AD30647E7FAC90FA7D5BD85B1C9CCBE486F2EAF4843` | 148375 | 2400×1080 | `/meals` | Ink | 1.3 | Landscape | History landscape shell, centred reading measure, gutters and overflow | Superseded by current-APK corrected landscape acceptance; retained for audit history only | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-history-ink-font-1.3-long-name.png` | Terra acceptance — unaffected cell retained from superseded APK | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` | `3C359A1F3A5F251EDBF8CDC403043BC3828826131D71DB89CC616DACAAF8B905` | 253947 | 1080×2400 | `/meals` | Ink | 1.3 | Portrait | Long synthetic meal name wraps without clipping | Retained because the state shown is unaffected by either 2026-07-29 corrected selector: populated History renders no action line, and the empty-state block does not render while entries exist. Captured on superseded APK `EBAD4E38…`; not rerun on the current APK `0B29929A…` | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-history-ink-landscape-defect.png` | Opus implementation diagnostic | `3808D4A66030F88FCE23ADED1A7ECFEFCFB4868A039ACF82FA539C8D495F5716` | `C8453FA5EB66B85D03BF1047DB612BD2FFDA3BE6713F4D01A82544EDAB1B6808` | 98858 | 2400×1080 | `/meals` | Ink | 1.3 | Landscape | History landscape shell, centred reading measure, gutters and overflow | Implementation diagnostic/self-verification; not independent Terra acceptance | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-history-ink-landscape-repaired-long-name.png` | Opus implementation diagnostic | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` | `0CBD299337D6EA3944DD41C86D26C080B34A58F1385DC898DDC6E9A605B625D9` | 126560 | 2400×1080 | `/meals` | Ink | 1.3 | Landscape | Long synthetic meal name wraps without clipping | Implementation diagnostic/self-verification; not independent Terra acceptance | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-history-ink-landscape-repaired.png` | Opus implementation diagnostic | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` | `F699C222F831F5E8124C730A3FD008376EDADC82B94008AFC2A6C112654D7CC4` | 91683 | 2400×1080 | `/meals` | Ink | 1.3 | Landscape | History landscape shell, centred reading measure, gutters and overflow | Implementation diagnostic/self-verification; not independent Terra acceptance | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-history-ink-landscape-safearea-corrected.png` | Opus implementation diagnostic | `A80D4403059F6761CBF670F8E3E6592D3B7701CEF8E8D8AFD5136271356C986F` | `7CC5931CEE44DFD25EFDCEC4D48D7D80C6FB575C5A8CD1D6F36D9A3976B12870` | 132697 | 2400×1080 | `/meals` | Ink | 1.3 | Landscape | History landscape shell, centred reading measure, gutters and overflow | Implementation diagnostic/self-verification; not independent Terra acceptance | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-history-paper-font-1.3-long-name.png` | Terra acceptance — unaffected cell retained from superseded APK | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` | `2136B5D746CC7742EA3A2EF0B61B35AA8E295AFD7E96B55590885C10A8F1CECE` | 247578 | 1080×2400 | `/meals` | Paper | 1.3 | Portrait | Long synthetic meal name wraps without clipping | Retained because the state shown is unaffected by either 2026-07-29 corrected selector: populated History renders no action line, and the empty-state block does not render while entries exist. Captured on superseded APK `EBAD4E38…`; not rerun on the current APK `0B29929A…` | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-history-to-saved-result-ink-font-1.3.png` | Terra acceptance — unaffected cell retained from superseded APK | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` | `7C004AC0B808C0ADF2B37C8B3CC6C4EFF49672E1A166724F5DFAFD20852B43A8` | 280147 | 1080×2400 | `/meals` → canonical `/meals/saved/:id` | Ink | 1.3 | Portrait | History opens canonical saved result without mutation | Retained for the unchanged History → canonical saved-result navigation claim: neither 2026-07-29 corrected selector changes that route or its destination, and the states shown carry neither affordance — populated History has no action line and no empty-state block. Captured on superseded APK `EBAD4E38…`; not rerun on the current APK `0B29929A…` | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-picker-draft-hardware-back-ink-font-1.3.png` | Terra acceptance — navigation claim only, action-line pixels superseded | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` | `A3FECF8CDFE3118BA122923DC5D2F050321BB2BAD112A4DE2B77744C0105E047` | 262930 | 1080×2400 | `/meals/new` → `/meals/previous` via one Android Back | Ink | 1.3 | Portrait | One real Android Back returns to Picker without writes | Retained for the Android Back navigation claim only; its Picker action lines are pre-correction and are not current action-line evidence | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-picker-draft-hot-resume-am-start.txt` | Sanitized lifecycle proof | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` | `AE31B5CEC64029EF0DA0C7056BABF34D3BD00E54CD1BE36C145AE022BD7D199E` | 216 | Not applicable | Editable `/meals/new` draft; Home/background → HOT resume | Not encoded | Not encoded | Lifecycle text | `LaunchState: HOT`; existing task brought to foreground after background interval | Text lifecycle proof only; paired screenshot carries visual state | Sanitized lifecycle fields only; no stable serial, account, health, contact or unrelated-app data |
| `pixel8-api36-j6-picker-draft-hot-resume-ink-font-1.3.png` | Terra acceptance — unaffected cell retained from superseded APK | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` | `1A6C4818EC8FA001641F38DDBF7F68E867E930DE79702861F24AC57E371B848B` | 239293 | 1080×2400 | Editable `/meals/new` draft; Home/background → HOT resume | Ink | 1.3 | Portrait | Picker-created draft survives HOT resume | Retained **only** for the unchanged draft-lifecycle/HOT-resume claim: the editable `/meals/new` draft screen lies outside both 2026-07-29 corrected selectors. Any pre-correction Picker action-line styling appearing anywhere in this capture is superseded by the 2026-07-29 correction and is **not** current visual action-line evidence. Captured on superseded APK `EBAD4E38…`; not rerun on the current APK `0B29929A…` | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-picker-ink-font-1.3-landscape-startup-policy-corrected-terra.png` | Terra acceptance — shell/measure only, action-line pixels superseded | `A80D4403059F6761CBF670F8E3E6592D3B7701CEF8E8D8AFD5136271356C986F` | `EF3C03957BD5293C147C8AFB29D8B55BBF2F6A723DCE1E5AEE389357FF10D5EA` | 131612 | 2400×1080 | `/meals/previous` | Ink | 1.3 | Landscape | Picker landscape shell, centred reading measure, Back/action line and overflow | Independent emulator acceptance of the shell and centred reading measure on APK `A80D4403…`; not physical OEM validation; action line shown at `--ink-3` and superseded by the 2026-07-29 correction — the corrected landscape state is evidenced by computed-style measurement in `implementation-report.md` §27.11, while the visible corrected action line is carried by `pixel8-api36-j6-picker-paper-font-1.3-long-name-action-accent-corrected.png`, `pixel8-api36-j6-picker-ink-font-1.3-action-accent-corrected.png` and `pixel8-api36-j6-picker-ink-font-1.3-true-bottom-action-accent-corrected.png` | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-picker-ink-font-1.3-landscape.png` | Superseded Terra landscape acceptance | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` | `65D0E5033ED04D142472243FACB4EB6E822BBA58C62FB401B9C3864A27F08D90` | 106593 | 2400×1080 | `/meals/previous` | Ink | 1.3 | Landscape | Picker landscape shell, centred reading measure, Back/action line and overflow | Superseded by current-APK corrected landscape acceptance; retained for audit history only | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-picker-ink-font-1.3-painted-back.png` | Superseded by the 2026-07-29 action-accent correction | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` | `1B19BB8A6B22C174939C6B1E74C149DA832C5441A6874EB049D4C1636EAC7914` | 239207 | 1080×2400 | `/meals/previous` | Ink | 1.3 | Portrait | Picker Back glyph is painted and readable | Superseded by the 2026-07-29 action-accent correction; retained for audit history only | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-picker-ink-font-1.3-true-bottom.png` | Superseded by the 2026-07-29 action-accent correction | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` | `F4828A60BA6E0F25D56B812B49649702E9D810D9299C67506F1B0B63FD9BD365` | 232224 | 1080×2400 | `/meals/previous` | Ink | 1.3 | Portrait | Real Ionic scroll element reaches true bottom with tab clearance | Superseded: card height changed with the 6px action margin, so its true-bottom geometry no longer describes the shipped build | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-picker-ink-landscape-safearea-corrected.png` | Opus implementation diagnostic | `A80D4403059F6761CBF670F8E3E6592D3B7701CEF8E8D8AFD5136271356C986F` | `DA17587C26A5488834243E2A9124EFEC10D686048E405863C0F0E63F15EEB3C8` | 132160 | 2400×1080 | `/meals/previous` | Ink | 1.3 | Landscape | Picker landscape shell, centred reading measure, Back/action line and overflow | Implementation diagnostic/self-verification; not independent Terra acceptance | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-picker-paper-font-1.3-long-name.png` | Superseded by the 2026-07-29 action-accent correction | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` | `31ABD12E172FED7D6F75A01D51FEEF67104EB671266F8232DEF0FD9C3150BE6C` | 229888 | 1080×2400 | `/meals/previous` | Paper | 1.3 | Portrait | Long synthetic meal name wraps without clipping | Superseded by the 2026-07-29 action-accent correction; retained for audit history only | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-picker-to-editable-draft-ink-font-1.3.png` | Terra acceptance — unaffected cell retained from superseded APK | `EBAD4E38BFD74EA2B26FDE967BEA6D925575A0604D2BA4C018A652C0EB10207F` | `D516B46023A60C65E9E66E82BDBD5A67DCA93D6ECE9F9F54864B21EE8CCD2741` | 235433 | 1080×2400 | `/meals/previous` → editable `/meals/new` | Ink | 1.3 | Portrait | Picker creates editable draft while preserving source | Retained **only** for the unchanged Picker → editable-draft navigation and source-preservation claim: the destination draft screen lies outside both 2026-07-29 corrected selectors. Any pre-correction Picker styling — including action-line pixels — appearing in this capture is superseded by the 2026-07-29 correction and is **not** current visual action-line evidence. Captured on superseded APK `EBAD4E38…`; not rerun on the current APK `0B29929A…` | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-history-ink-font-1.3-landscape-action-accent-corrected.png` | Implementation re-acceptance — current APK (2026-07-29 correction) | `0B29929AAC558106B5AC28D4FF26693D5A0D6AA1A7BE434B71BB62B3C218034C` | `FA33899F06DF491615F8973AD4037DA57E2CEC86D435514D2E05ABA5A8601851` | 100903 | 2400×1080 | `/meals` | Ink | 1.3 | Landscape | History landscape shell, centred 560px reading measure, balanced 18/18px gutters, first entry card geometry inside the centred column, and no horizontal overflow. At 915x412 with font scale 1.3 the viewport ends inside the first card's image band, so the caption block and read-only semantic details are not visible in this capture | Implementation self-verification on a Pixel 8 API 36 emulator; not independent Terra acceptance and not physical OEM validation. **Not visual proof of the read-only semantic details.** Zero action lines, no kcal, zero rings and five saved-result links were verified by runtime DOM inspection recorded in `implementation-report.md` §27.11, not by these pixels | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-picker-ink-font-1.3-action-accent-corrected.png` | Implementation re-acceptance — current APK (2026-07-29 correction) | `0B29929AAC558106B5AC28D4FF26693D5A0D6AA1A7BE434B71BB62B3C218034C` | `EA8503ED36C839D4CE621660C552FA689E00D5B93E623929892BED68BBE24442` | 247531 | 1080×2400 | `/meals/previous` | Ink | 1.3 | Portrait | Action line resolves to Ink `--accent` `rgb(130,180,221)`, distinct from `--ink-3` metadata, 6px separation, Back glyph painted, no nested control | Implementation self-verification on a Pixel 8 API 36 emulator; not independent Terra acceptance and not physical OEM validation | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-picker-ink-font-1.3-landscape-action-accent-corrected.png` | Implementation re-acceptance — current APK (2026-07-29 correction) | `0B29929AAC558106B5AC28D4FF26693D5A0D6AA1A7BE434B71BB62B3C218034C` | `D64695966ECCEBA96A52F8B89440CF208474B63A7ECCAADDF85B3D41B0FA8A40` | 132670 | 2400×1080 | `/meals/previous` | Ink | 1.3 | Landscape | Full-width application shell; centred 560px reading measure; balanced 18/18px gutters; painted Back control at x=54, clear of the cutout; first entry card's geometry inside the centred column; no horizontal overflow. At 915x412 with font scale 1.3 the viewport ends inside the first card's image band, so the caption block is not in frame: no meal name, no metadata line, no action line and no long-name wrapping are visible in this capture | Implementation self-verification on a Pixel 8 API 36 emulator; not independent Terra acceptance and not physical OEM validation. **Not visual proof of the action line.** The action-line colour (Ink `--accent` `rgb(130,180,221)`, distinct from `--ink-3` metadata) and its 6px `margin-top` for this exact 915x412 / font-scale-1.3 landscape runtime state were verified by computed-style measurement recorded in `implementation-report.md` §27.11, not by these pixels. Visible corrected action-line evidence is carried by the current-APK portrait captures instead | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-picker-ink-font-1.3-true-bottom-action-accent-corrected.png` | Implementation re-acceptance — current APK (2026-07-29 correction) | `0B29929AAC558106B5AC28D4FF26693D5A0D6AA1A7BE434B71BB62B3C218034C` | `A13B1EB1344EEB5F46426101D8AA422795EAC8C60B37061FF65BCEE359F1E27E` | 231843 | 1080×2400 | `/meals/previous` | Ink | 1.3 | Portrait | Real Ionic scroll element reaches true bottom (residual 0.667px) with recomputed clearances — last card 62.04px, last action line 76.80px — after the 6px margin changed card height | Implementation self-verification on a Pixel 8 API 36 emulator; not independent Terra acceptance and not physical OEM validation | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |
| `pixel8-api36-j6-picker-paper-font-1.3-long-name-action-accent-corrected.png` | Implementation re-acceptance — current APK (2026-07-29 correction) | `0B29929AAC558106B5AC28D4FF26693D5A0D6AA1A7BE434B71BB62B3C218034C` | `32DEBF95A168D90F00955ADA933EB66668AF68F9E834F0C4BEAB5254E1351CFA` | 263947 | 1080×2400 | `/meals/previous` | Paper | 1.3 | Portrait | 120-character name wraps to 5 lines unclipped with the action line fully inside the card in Paper `--accent` `rgb(40,87,126)` | Implementation self-verification on a Pixel 8 API 36 emulator; not independent Terra acceptance and not physical OEM validation | Synthetic fixture data only; no real health, account, contact, notification, serial or unrelated-app content |

### Lifecycle proof

`pixel8-api36-j6-picker-draft-hot-resume-am-start.txt` is sanitized, hashes to `AE31B5CEC64029EF0DA0C7056BABF34D3BD00E54CD1BE36C145AE022BD7D199E`, is 216 bytes, and contains `LaunchState: HOT`. It contains lifecycle fields only.

### Acceptance interpretation

- The five `action-accent-corrected` captures are the only authoritative evidence for the current APK `0B29929A…` in the cells they cover: Picker Paper portrait long-name, Picker Ink portrait, Picker Ink true bottom, Picker Ink landscape and History Ink landscape.
- The two `startup-policy-corrected-terra` captures were the authoritative landscape acceptance for APK `A80D4403…`. They remain valid evidence of the **shell and reading-measure** correction, but their Picker action-line pixels are pre-accent and are superseded by the 2026-07-29 correction. The corrected landscape runtime state (accent colour, 6px margin, at 915x412 / font scale 1.3) is evidenced by computed-style measurement in `implementation-report.md` §27.11; the corrected action line is **visibly** shown only by the current-APK portrait captures — `pixel8-api36-j6-picker-paper-font-1.3-long-name-action-accent-corrected.png` (Paper portrait, long name), `pixel8-api36-j6-picker-ink-font-1.3-action-accent-corrected.png` (Ink portrait) and `pixel8-api36-j6-picker-ink-font-1.3-true-bottom-action-accent-corrected.png` (Ink true bottom). `pixel8-api36-j6-picker-ink-font-1.3-landscape-action-accent-corrected.png` does not show the caption block and is not visual action-line proof.
- `pixel8-api36-j6-picker-ink-font-1.3-painted-back.png`, `…-true-bottom.png` and `pixel8-api36-j6-picker-paper-font-1.3-long-name.png` are superseded by their `action-accent-corrected` counterparts: each shows the action line at `--ink-3`.
- `pixel8-api36-j6-picker-draft-hardware-back-ink-font-1.3.png` ends on the Picker list, so its action-line pixels are pre-correction. It is retained for its **navigation** claim only — one real Android Back returns to the Picker without writes — and is **not** current action-line evidence.
- `pixel8-api36-j6-history-to-saved-result-…`, `…-picker-to-editable-draft-…`, `…-picker-draft-hot-resume-…` and the History long-name portrait cells remain accepted unchanged: History has no action line, and the draft, saved-result and lifecycle screens are outside both corrected selectors.
- Opus defect, repair, and safe-area-correction captures are diagnostics and are not counted as independent Terra acceptance.
- The five 2026-07-29 captures are **implementation self-verification**, not independent Terra acceptance.
- The browser and emulator artifacts above do not prove physical Samsung or
  broader OEM-specific behaviour. The separate current-APK physical Samsung
  catalogue below proves the bounded SM-M356B matrix only; it is not a claim
  about other OEMs.

## Physical Samsung SM-M356B acceptance — 2026-08-26

### Device and accepted binary

- One attached physical Samsung SM-M356B, Android 16 / API 36, 1080×2340,
  physical density 450 dpi with 420 dpi override.
- Fresh install after explicit removal of the prior package and data.
- Package `io.ionic.starter`, version `1.0` / code 1, minSdk 23, targetSdk 35.
- Local and pulled installed APK both hash to
  `0B29929AAC558106B5AC28D4FF26693D5A0D6AA1A7BE434B71BB62B3C218034C`
  and contain 8,584,770 bytes locally.

### Privacy and capture classification

All artifacts below are **physical Samsung acceptance evidence** for the
accepted APK. Each PNG was opened and visually inspected before retention. The
app contains five synthetic meals only; its sole image-like fixture is a drawn
inline SVG plate, with the remaining plates typographic. No real health data,
meal photograph, account, contact, notification content, device serial,
carrier identifier, or unrelated application content appears. Generic Android
status/navigation chrome is present. The lifecycle text is deliberately
sanitized. Runtime inspection was package-specific and no unrelated personal
data was inspected.

### Complete retained physical-device catalogue

All 19 files live in `evidence/physical-samsung-sm-m356b/`.

| # | File | SHA-256 | Bytes / dimensions | Route/state | Appearance / scale / orientation | Claim and explicit limitation |
|---:|---|---|---|---|---|---|
| 1 | `history-ink-font-1.0-portrait.png` | `9CE7E15DEE987CC85BDC843F08DD059F01289A45E3F3B42700849C75961F892E` | 242701 / 1080×2340 | `/meals`, populated History | Ink / 1.0 / portrait | Visible journal hierarchy and read-only cards; above-fold state only |
| 2 | `history-ink-font-1.3-landscape.png` | `D8974971BD874FD288189810BBC281719D3E6B446FA013AFACA3AE9E81BF85BB` | 111723 / 2340×1080 | `/meals`, populated History | Ink / 1.3 / landscape | Full-width shell, centred measure, cutout safety and no overflow; caption is below this short viewport and semantic counts come from runtime inspection |
| 3 | `history-ink-font-1.3-portrait.png` | `136102F43205F8B3C67D28899EB2ADE2CF05DC03B0F785CB1A3A5770A6382ED7` | 241227 / 1080×2340 | `/meals`, populated History | Ink / 1.3 / portrait | Long synthetic name wraps unclipped and hierarchy remains readable; not true-bottom evidence |
| 4 | `history-ink-font-1.3-true-bottom.png` | `B53B706041599A99778742BCAFD4075A2A7A405439354314101C66F7785AC0BF` | 221876 / 1080×2340 | `/meals`, true bottom | Ink / 1.3 / portrait | Final card visibly clears tabs and has no picker action; exact clearance comes from paired runtime measurement |
| 5 | `history-paper-font-1.0-portrait.png` | `03C1C271D77850C7CD21A18E6D12C980453293511370E67ED5168991C8BB6A4C` | 240038 / 1080×2340 | `/meals`, populated History | Paper / 1.0 / portrait | Visible journal hierarchy and read-only cards; above-fold state only |
| 6 | `history-paper-font-1.3-landscape.png` | `E596C31E79007FC15E5BF22CA553A63EEE564755336704F3BF13501947A423D7` | 111476 / 2340×1080 | `/meals`, populated History | Paper / 1.3 / landscape | Full-width shell, centred measure, cutout safety and no overflow; caption is below this short viewport and semantic counts come from runtime inspection |
| 7 | `history-paper-font-1.3-portrait.png` | `40B082830C2ABF061B2947D0765F32E781D6974C10CD1A24C9680AF6BE2F7FBD` | 240560 / 1080×2340 | `/meals`, populated History | Paper / 1.3 / portrait | Visible journal hierarchy and wrapping at enlarged text; not true-bottom evidence |
| 8 | `history-to-saved-result-ink-font-1.3.png` | `20B80B9BB2C565C9FA9830B389775ADA5A8B23F1D8B220186A6ABFAEA9D1875A` | 251626 / 1080×2340 | `/meals/saved/j6-long`, saved result | Ink / 1.3 / portrait | Visible canonical saved-result destination; no-mutation/no-write claim comes from paired runtime comparison |
| 9 | `picker-draft-hot-resume-ink-font-1.3.png` | `ADB33356A4D9E41D1ECF53A58F4F75689B68BB6DB8DCE7D703877F3CC3767D5B` | 217482 / 1080×2340 | `/meals/new`, resumed editable draft | Ink / 1.3 / portrait | Same editable draft visibly survived resume; HOT classification comes from artifact #19 and no-write claim from runtime comparison |
| 10 | `picker-draft-system-back-ink-font-1.3.png` | `E263CF1DF5E61651BDC360111CA398A097FE50CDFA70BF04072EACA2230C032E` | 248594 / 1080×2340 | `/meals/previous`, after Android Back | Ink / 1.3 / portrait | Picker visibly restored after one system Back; no-write/source identity comes from runtime comparison |
| 11 | `picker-ink-font-1.0-portrait.png` | `8351F2D65DE4147EBC0CCD5F136404E29CF024BAA16428025CEA05B924FD9BB8` | 258521 / 1080×2340 | `/meals/previous`, populated picker | Ink / 1.0 / portrait | Painted Back, kcal metadata, exact accent action and single-target cards; above-fold state only |
| 12 | `picker-ink-font-1.3-landscape.png` | `7A77745FD9F02208A80A828F0BE3ABBF51E658245CB8A634D3C18A931048FDB2` | 142463 / 2340×1080 | `/meals/previous`, populated picker | Ink / 1.3 / landscape | Full-width shell, centred measure, Back/cutout safety and no overflow; caption is below frame, so action styling is runtime—not pixel—proof |
| 13 | `picker-ink-font-1.3-portrait.png` | `BB4678BD00045F873DAFD36C340F0DB77DF7B4324CEFD94C7C533BCB5AA09BA3` | 248921 / 1080×2340 | `/meals/previous`, populated picker | Ink / 1.3 / portrait | Exact action line visibly distinct from metadata with enlarged text; not true-bottom evidence |
| 14 | `picker-ink-font-1.3-true-bottom.png` | `8AA5FEF862D6E6B31B141EE5764DFE22590A3320BA8E0E9C63857719C94AD0C5` | 202009 / 1080×2340 | `/meals/previous`, true bottom | Ink / 1.3 / portrait | Final accent action visibly clears tabs; exact clearance comes from paired runtime measurement |
| 15 | `picker-paper-font-1.0-portrait.png` | `1F58DB6320DDA59C549FA06A13926E91CADF82BB1687E36E5507932A67AE4CAE` | 255570 / 1080×2340 | `/meals/previous`, populated picker | Paper / 1.0 / portrait | Painted Back, kcal metadata, exact accent action and single-target cards; above-fold state only |
| 16 | `picker-paper-font-1.3-landscape.png` | `CD8696DFBA68D2E23F0441756ADC535D7230C4C288B954078930292EDC95BA00` | 141687 / 2340×1080 | `/meals/previous`, populated picker | Paper / 1.3 / landscape | Full-width shell, centred measure, Back/cutout safety and no overflow; caption is below frame, so action styling is runtime—not pixel—proof |
| 17 | `picker-paper-font-1.3-portrait-long-name.png` | `ED81F88CF78D1E6CE8B5D72203C6D24FF504B1CF874AB73B323F336691822C75` | 246860 / 1080×2340 | `/meals/previous`, long-name picker | Paper / 1.3 / portrait | Long synthetic name wraps without clipping; this viewport does not prove true bottom |
| 18 | `picker-to-editable-draft-ink-font-1.3.png` | `E8AF11FB1C080D31EDCE3BAE9BF97EF180454E862EC94615EC67C0C89D1A7163` | 217467 / 1080×2340 | `/meals/new`, editable unsaved draft | Ink / 1.3 / portrait | Visible `DRAFT — NOT SAVED` destination and editable fields; source preservation/no-write comes from runtime comparison |
| 19 | `picker-draft-hot-resume-am-start.txt` | `59C1D609C4A18CB048B5D939595DAD714F9B114B9505B9C297947F6560FEBF0B` | 507 / n/a | `/meals/new`, background → foreground | Not encoded | Sanitized `Status: ok`, `LaunchState: HOT`, state/storage/write result; lifecycle text only, paired with #9 for visual state |

### Runtime measurements paired with the captures

- Landscape CSS viewport: 891×411; app/header/tab bar 891.43px; reading
  scroller 560px; cards x=183.71, width 524px, centre offset about 0.21px;
  Back control x=38, 48×48; no horizontal overflow.
- History true bottom: `scrollTop=958.095`, maximum 958px (0.095px rounding),
  last-card/tab clearance 85.98px, zero actions.
- Picker true bottom: `scrollTop=1176`, maximum 1176px, last-card/tab
  clearance 85.19px and last-action/tab clearance 99.95px.
- Picker affordances: exactly five `Use as new draft`, five kcal lines, zero
  nested interactive descendants; Paper action/metadata colours
  `rgb(40,87,126)` / `rgb(107,107,98)`, Ink
  `rgb(130,180,221)` / `rgb(143,144,137)`, 6px action separation.
- History semantics: zero action lines, kcal picker metadata, score rings, or
  reuse/edit wording; all five cards link to canonical saved-result routes.

### Interaction and restoration interpretation

History-to-result, picker-to-editable-draft, HOT resume, and Android Back all
preserved the byte-exact serialized source meal data and produced zero non-GET
requests. The original font scale (`1.0`), automatic rotation
(`accelerometer_rotation=1`), and rotation (`user_rotation=0`) were restored
and verified. The app was force-stopped and the package-specific ADB forward
was removed. The accepted test package remains installed with the matching APK
hash.

The landscape PNGs end in the first image band at the short 411px viewport, so
they are visual proof of the full-width shell, centred reading column, cutout
safety, Back control, and overflow result—not of the below-fold caption. Exact
runtime DOM/computed-style measurements prove the action-line hierarchy in that
same landscape state; portrait and true-bottom PNGs provide its visible proof.
This acceptance is bounded to the named physical SM-M356B, not broader OEM
certification.
