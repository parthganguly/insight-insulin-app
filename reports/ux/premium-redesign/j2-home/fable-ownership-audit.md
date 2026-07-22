# Fable ownership audit — PR #106 (issue #110)

Date: 2026-07-21
Author: Claude Fable 5
Branch: `sol/annotated-journal-j2-home`
Baseline audited: `ca26fb69c12f2d7930df76f61bd092b78ea753bd` (the PR head named in issue #110), captured on a clean worktree before any edit.

## 1. Commit-by-commit provenance

| Commit | Author of record | Actual origin | Content |
| --- | --- | --- | --- |
| `377a963` feat: rebuild Home as Porcelain Journal | parthganguly (no co-author trailer) | Sonnet implementation under the issue #104 contract, after Fable's C1–C4 + C3-a review corrections | All J2 production code, unit/Cypress tests, implementation report §§1–10 |
| `b1c27be` Document physical Android QA findings | parthganguly (no co-author trailer) | Sonnet-era QA documentation | Implementation report §11 (physical QA FAIL record) **plus the accidental `reports/beta-readiness/2026-07-11-core-functionality-audit-final.md`** |
| `ca26fb6` fix: correct Porcelain typography (issue #108) | parthganguly, Co-Authored-By Claude Fable 5 | Fable-authored end to end | Typography correction, `typography-108.cy.ts`, startup-policy regex fix, typography report + committed device evidence |
| `8cdd0b9` Remove accidental beta-readiness report from J2 | Fable (this audit) | Fable | Scope cleanup (§4) |
| (this audit's ownership commit) | Fable | Fable | Rewrites R1–R6 below + this report |

## 2. File-by-file decisions

Every meaningful choice in the PR was re-derived from the v2.0 design constitution, the final direction (incl. D8), the Slice J2 contract, the reference prototype (`final-annotated-journal.html`), and the rendered browser/device evidence — not from my earlier review verdicts. Where I preserve, it is because the code is the implementation I would author against those sources; most of the visual system is a direct transcription of my own prototype (plate 2.6 rem italic monogram with the 14 % dashed ring, 7 rem/5.6 rem entry media heights, 9 rem empty plate, 1.18 rem serif entry titles, daybreak rule treatment, 0.86 rem trend sentence, dock 56 px primary, 340 px density break) with three deviations I verified are correct: solid dock instead of the prototype gradient (constitution §2.5 bans surface gradients), weight-400 folio italic (my issue #108 device diagnosis), and sealed-copy coverage wording instead of the prototype's "You've logged…" paraphrase (C1; §10 sealed-strings law).

### PRESERVE — I would author the same solution

| Area | Decision grounds |
| --- | --- |
| `Dashboard.tsx` — hydration + chronic-metrics effects | Inherited from pre-J2 main unchanged; behaviour law, not J2 authorship |
| `Dashboard.tsx` — trend derivation and staging | Sealed helpers (`trendDisplay`, `homeMealJourney`) used verbatim; loading/failed/no-data ARIA distinctions preserved exactly (§9) |
| `Dashboard.tsx` — screen order masthead → folio → annotation → entries → dock | Constitution §6.1–6.3, normative order |
| `Dashboard.tsx` — `role="img"` + `trendAriaLabel` on the sentence only; gloss and footnote as ordinary text | Preserves the sealed trend announcement contract while keeping the gloss/footnote separately readable (C2, §9) |
| `Dashboard.tsx` — collapsed `<details>` footnote "What this doesn't mean" carrying `CHRONIC_TREND_DISCLAIMER` byte-for-byte | §10: full sealed disclaimers in exactly one footnote disclosure; §6.7's footnote pattern; 44 px summary target (C3/C3-a) |
| `Dashboard.tsx` — empty state (plate `Ins.`, promise headline, two-line what-happens, boundary note) | Verbatim from my prototype's empty Home |
| `Dashboard.tsx` — `aria-label` on Settings and **Check a meal** buttons duplicating the visible text | Initially classified REWRITE (redundant label); reversed on evidence: the sealed Campaign A navigation test queries the primary action by label, and the explicit label keeps the accessible name stable across Ionic's shadow/scoped rendering modes. Visible text still matches the name (label-in-name holds), so the duplication is contract-bearing, not vestigial |
| `JournalEntryCard.tsx` — `IonItem button` → `/meals/saved/:id`; `aria-labelledby` name+meta; empty-alt photo; `aria-hidden` plate | Read-only recents law (issue #89) + C4 accessible-name ruling |
| `TypographicPlate.tsx` + monogram helper | Exact §5 treatment; deterministic initials match the prototype (`Et`, `Yp`, `Ins.`) |
| `journalPresentation.ts` — folio line, part-of-day mapping, Today/Yesterday/weekday labels, adjacent-day grouping that never reorders the canonical store array | Matches prototype states; ordering law sealed |
| `app.css` — all J2 additions incl. #108 corrections | Token-only styling; prototype-exact dimensions; §2.3 gutters below 340 px; solid dock; my own #108 rules |
| Removal of hero/ring/journey-cue/`home-primary-action` CSS; retention of `.recent-card`/`.empty-state-card`/`.section-label`/`.disclaimer-note` (used by History/PreviousMealPicker/SavedMealDetail/PreviewMeal) and `.CircularProgressbar` (AcuteScoreProgressbar on result screens, outside J2) | Verified by usage search; no dashboard residue remains on Home, and nothing still-used was deleted |
| All J2 unit tests, `home-journal.cy.ts` matrix/long-name/footnote specs, `dashboard-smoke`/`trend-coverage` updates, `typography-108.cy.ts`, `startupPolicy` `(?<!\d)50px` narrowing | Assert the sealed semantics and the design law I would test; the latter two are Fable-authored already |
| `typography-108` report + committed before/after device evidence | Fable-authored under issue #108 |

### REWRITE — implemented in this audit

| ID | Change | Why |
| --- | --- | --- |
| R1 | Meal-title heading `h2` → `h3` in `JournalEntryCard` (+ CSS selector + three Cypress selector updates) | Day groups are `h2` sections; entry titles belong one level below so the document outline reads day → meals. The flat h2/h2 outline was the one place the markup did not match the hierarchy the design states |
| R2 | Restored the issue #89 product-law comment (read-only saved detail vs. reuse-as-draft) onto `JournalEntryCard` | The law lived on the deleted `MealCard`; the constraint is invisible from the code alone and must not be lost |
| R3 | Dropped the unused `home-journal-page` class from `IonPage` | Dead hook: no CSS or test referenced it |
| R5 | `setupTests.ts`: synchronous `IntersectionObserver`/`IntersectionObserverEntry` stubs (entry exposes `isIntersecting` as a prototype getter, which `ion-img` requires) | Fixes the real CI failure on this branch's last two runs: jsdom has no IntersectionObserver, so `ion-img` arms a 200 ms `setTimeout` fallback that can fire after a test file's environment is torn down and crash the run as an unhandled error (observed from `AiMealAdd.campaignA.test.tsx`). Same pattern as the existing `requestIdleCallback` shim beside it |
| R6 | Implementation report: duplicated "## 6" heading renumbered to §12, stale "uncommitted, awaiting re-review" status corrected, §11's QA FAIL annotated as the issue #107 defect fixed by PR #109, §13 cross-reference added | The report is committed evidence; its structure and status must be truthful for a reader of the final PR |

R4 (removing the duplicated button `aria-label`s) was implemented, falsified by the sealed Campaign A test contract, and reverted — recorded here because issue #110 asks for the actual decisions, including reversed ones. The final code keeps the labels deliberately.

### REMOVE

| ID | Item | Finding |
| --- | --- | --- |
| X1 | `reports/beta-readiness/2026-07-11-core-functionality-audit-final.md` | **How it entered:** the file is the issue #76 core-functionality audit (2026-07-11, `main` at `6ab4ab4`) and existed only as an *untracked* working-tree file, recorded as such (`?? reports/beta-readiness/`) in the implementation report's own §6 status. Commit `b1c27be` swept it into the branch by accident. It is not on `main` and was repeatedly excluded from the J2 boundary. Removed from tracking in `8cdd0b9`; the local file remains on disk untracked, restoring its exact pre-J2 state. It does not belong to the base branch and does not belong to J2 |

### DEFER

| Item | Where it belongs |
| --- | --- |
| Obsolete ring-geometry clauses inside the sealed `CHRONIC_TREND_DISCLAIMER` and trend ARIA label | Issue #105 (Amendment T1) — requires human/scientific sign-off; `safetyCopy.ts` and `trendDisplay.ts` untouched here |
| Tick-scale, verdict bands, cold-start rule | J7 (human disposition) |
| Photo persistence beyond existing `meal.image` | Explicit deferral in the constitution |
| J3/J4/J5/J6/J8/J9 surfaces | Their own slices |

## 3. Exact rewrites made in this audit

Production: `frontend/src/components/JournalEntryCard.tsx` (h3 + law comment), `frontend/src/pages/dashboard/Dashboard.tsx` (dead class removed), `frontend/src/theme/app.css` (`.journal-entry-caption h3` selector).
Tests: `frontend/src/setupTests.ts` (IntersectionObserver stub), `frontend/cypress/e2e/home-journal.cy.ts`, `frontend/cypress/e2e/typography-108.cy.ts` (h3 selectors).
Reports: `implementation-report.md` (R6), this file.
No scientific, persistence, API, store, navigation, or sealed-copy change anywhere in the audit pass; `tokens.css` untouched.

## 4. Scope cleanup

The only scope defect found in the complete PR diff was X1 above. The final PR file list (§8) contains no `.claude/`, no `reports/beta-readiness/`, and no other accidental file. `git diff --check` is clean.

## 5. Before/after evidence

- Baseline: `ca26fb6` captured as the audited state (all findings above reference it).
- The R1 heading change is visual-noop by design: the `h3` carries the identical `.journal-entry-caption` type treatment (serif 1.18 rem/600). Exact-size Cypress captures for empty/building/mature × paper/ink × 390×844/320×700, the 320 px long-name state, and the expanded-footnote state were regenerated on the final head via `home-journal.cy.ts` and `typography-108.cy.ts` (gitignored canonical paths listed in the implementation report §5) and inspected; hierarchy, wrapping, dock, and tab bar match the pre-audit captures.
- Committed device evidence for typography (issue #108) is unchanged and remains valid: no rule it verifies was altered (the h3 selector change carries the identical declarations).

## 6. Automated verification (final head)

| Check | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run test.unit -- --run` | PASS — 40 files, 461/461 |
| `npm run build` | PASS (pre-existing large-chunk warning only) |
| `npx cypress run` (complete suite) | PASS — 9 specs, 60/60 |
| `git diff --check` | PASS |

Note on the unit suite: while the build and Cypress ran concurrently on this Windows machine, `startupNative.test.tsx` (an issue #107 test, untouched by this PR) intermittently exceeded its 5 s timeout under load. It passes in isolation in ~2.4 s, reproduces identically with my `setupTests.ts` change reverted (so the flake is environmental, not introduced here), and the final quiet-machine run above passed 461/461 with no exclusions.

## 7. Physical-device verification

Full gate run 2026-07-21 on Samsung SM-M356B (RZCY22FGP1Z, Android 16/API 36, 1080×2340, 420 dpi override, three-button navigation, 90 % text scale) against a debug APK built from the final audited code (web assets rebuilt, `cap sync`, `gradlew assembleDebug`). Backend was a local synthetic stub over `adb reverse tcp:8000` (only `/meals` → `[]` and `/metrics/chronic`); lifecycle states and appearances were seeded through the WebView DevTools socket (`localStorage`), never with real data. **All checks passed:**

| Check | Result |
| --- | --- |
| Cold launch (`pm clear` → `am start -W`, screen-recorded, frame-analyzed) | PASS — splash cross-fades directly into the correctly inset Home; no black window, no status-bar overlap, no top-inset shift (the pre-#107 defect recorded in the implementation report §11 is gone under J2) |
| Empty / building / mature × paper / ink | PASS — all six combinations rendered and screenshotted; building shows the sealed 3-day gating line with no trend sentence; mature shows `5 of 7 days logged · 7-day index 62` with `role="img"` and the sealed ARIA label |
| Typography on final head | PASS — folio `NotoSerif` italic weight 400; meal titles serif 600 on the new `h3`; day breaks `h2` italic; masthead sans; long biryani name wraps in three lines without clipping at 90 % and 130 % scale |
| Heading outline (R1) | PASS — on-device DOM shows `h2` day breaks, `h3` titles, zero residual `h2` titles |
| Collapsed/expanded footnote | PASS — native tap opens it; full sealed disclaimer readable; dock and tab bar unobscured |
| Fixed dock and tab bar vs. system navigation | PASS — dock stays above the tab bar, tab bar above three-button navigation, during scroll and after resume |
| Scroll | PASS — momentum scroll moves content behind the fixed chrome; no horizontal overflow (`scrollWidth <= innerWidth` verified) |
| Settings navigation | PASS — real tap → `/settings`, correct safe areas, Android back returns to Home |
| Saved-meal navigation | PASS — real tap on the low-quality entry → read-only `/meals/saved/mature-long` (`Meal result`, `Saved to history`, sealed insufficient-data framing); back preserves the journal |
| Landscape / portrait return | PASS — centered column, chrome intact, display-cutout side inset respected; portrait restores 411×891 |
| Background/resume | PASS — hot resume in 69 ms with route, entries, and trend state intact |
| Text scaling | PASS at the device's 90 % baseline and at 130 % (root 20.8 px): no overflow, wrapping intact, dock visible; restored to 90 % after |
| Jank/flicker | PASS — frame analysis of the cold-launch recording shows a monotonic splash→content transition with no black frames and no layout shift |

Evidence (gitignored per repo convention): `frontend/cypress/screenshots/j2-home-device-qa-110/` — six lifecycle×appearance captures, expanded footnote, Settings, saved detail, landscape, post-scroll, post-resume, 130 %-scale capture, cold-launch recording and key frames. Device state was fully restored (font scale 0.9, auto-rotate, stay-awake off, `pm clear`, forwards removed).

## 8. Exact final PR file list

```text
frontend/cypress/e2e/dashboard-smoke.cy.ts
frontend/cypress/e2e/home-journal.cy.ts
frontend/cypress/e2e/trend-coverage.cy.ts
frontend/cypress/e2e/typography-108.cy.ts
frontend/src/components/JournalEntryCard.test.tsx
frontend/src/components/JournalEntryCard.tsx
frontend/src/components/TypographicPlate.tsx
frontend/src/pages/dashboard/Dashboard.trendCoverage.test.tsx
frontend/src/pages/dashboard/Dashboard.tsx
frontend/src/setupTests.ts
frontend/src/startupPolicy.test.ts
frontend/src/theme/app.css
frontend/src/utils/journalPresentation.test.ts
frontend/src/utils/journalPresentation.ts
reports/ux/premium-redesign/j2-home/fable-ownership-audit.md
reports/ux/premium-redesign/j2-home/implementation-report.md
reports/ux/premium-redesign/typography-108/report.md
reports/ux/premium-redesign/typography-108/evidence/device-before/* (12 files)
reports/ux/premium-redesign/typography-108/evidence/device-after/* (12 files)
```

## 9. Ownership statement

I re-derived every meaningful choice in this PR from the design constitution, the slice contract, my reference prototype, and the rendered browser and device evidence, and I changed what did not match my own judgment. What remains is preserved because I independently endorse it — most of the visual system is my own prototype transcribed, and the sealed-semantics staging is the one I would design — not because I previously approved it as a reviewer. The final branch reflects my own implementation judgment.

## 10. Gate status at report time

- Scope cleanup, rewrites, lint, TypeScript, unit suite, build, complete Cypress suite, `git diff --check`, and exact-size lifecycle captures: complete on the final head.
- Physical SM-M356B gate: **passed** on the final audited code (§7). The web assets installed on the device were built from the exact working tree of the final commit; CI on the pushed head is the remaining green-check requirement before the PR may leave draft, per the issue #110 stop/merge rule.
