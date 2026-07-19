# Annotated Journal J2 — Home implementation report

Date: 2026-07-19
Branch: `sol/annotated-journal-j2-home`
Contract: GitHub issue #104
Implementation state: corrected and uncommitted, awaiting Fable re-review

## 1. Summary

J2 restages the current Ionic React/Capacitor Home implementation as Fable's Porcelain Journal without changing its data, persistence, navigation, lifecycle, trend, or scientific semantics. Home now has a folio heading, empty/building/mature journal states, day-broken read-only saved-meal entries, existing-photo presentation with a deterministic typographic fallback, a visible Settings action, and a fixed **Check a meal** dock. The circular trend ring and its Dashboard dependency were removed; the existing uncapped value, coverage, loading/failure/no-data distinctions, sealed explanatory copy, and accessible label remain authoritative.

The allowed-file boundary was sufficient. No production file outside the J2 grant was required. Related Home unit/Cypress tests and this contract-required evidence report are the only evidence/test additions outside the production-file list.

### Fable review verdict and bounded correction pass

Fable's independent review on issue #104 returned **CHANGES REQUIRED**. Empty and building states were approved. The mature state and two accessibility details were blocked on four bounded corrections, all now applied:

- **C1:** removed only the added `You've logged ` connective prefix. The mature sentence now renders the sealed coverage and value as `5 of 7 days logged · 7-day index 62`; neither helper was edited.
- **C2:** moved `role="img"` and the unchanged `trendAriaLabel` from `.home-trend-annotation` to `.home-trend-sentence`. The gloss and footnote remain separate ordinary accessible text.
- **C3:** placed the byte-for-byte `CHRONIC_TREND_DISCLAIMER` inside a native, initially collapsed `<details class="home-trend-footnote">` with the exact summary `What this doesn't mean`. Its token-based disclosure treatment is 160 ms, with a reduced-motion override.
- **C4:** removed the card-level `aria-label` and bound `aria-labelledby` to the rendered meal heading and metadata. The resulting accessible name contains the meal name, estimate, and `Data quality` wording; decorative images remain empty-alt and typographic plates remain `aria-hidden`.

### Fable correction C3-a

Fable found that the collapsed trend-footnote summary used a 28 px minimum height, below the required 44 px touch target. The correction is exactly `min-height: 28px` → `min-height: 44px` on `.home-trend-footnote summary` in `frontend/src/theme/app.css`. No spacing rebalance, redesign, or other production change was made. The computed CSS minimum is now 44 px; the rendered summary therefore meets the at-least-44 px target.

## 2. Exact changed files

Production files within the J2 grant:

- `frontend/src/pages/dashboard/Dashboard.tsx`
- `frontend/src/theme/app.css`
- `frontend/src/components/JournalEntryCard.tsx` (new)
- `frontend/src/components/TypographicPlate.tsx` (new)
- `frontend/src/utils/journalPresentation.ts` (new pure presentation helpers)

Related tests/evidence expressly required by issue #104:

- `frontend/src/pages/dashboard/Dashboard.trendCoverage.test.tsx`
- `frontend/src/components/JournalEntryCard.test.tsx` (new)
- `frontend/src/utils/journalPresentation.test.ts` (new)
- `frontend/cypress/e2e/dashboard-smoke.cy.ts`
- `frontend/cypress/e2e/trend-coverage.cy.ts`
- `frontend/cypress/e2e/home-journal.cy.ts` (new)
- `reports/ux/premium-redesign/j2-home/implementation-report.md` (new)

## 3. Acceptance evidence

| Contract requirement | Evidence | Result |
| --- | --- | --- |
| Start from latest `origin/main` after PR #103 | `HEAD`, `origin/main`, and merge-base all resolve to `67e004f607a3787b2b3a9a3fd46201c523f56cea` (`Annotated Journal J1: token foundation and app chrome (#103)`) | Pass |
| Preserve Home hydration and lifecycle law | Existing hydration tests pass; `resolveHomeLifecycleState` is imported and unchanged; empty/building/mature Cypress states pass | Pass |
| Preserve trend gating, values, coverage, strings, meanings, and ARIA distinctions | `trendDisplay.ts`, `homeMealJourney.ts`, and safety-copy helpers were not edited; 15 Dashboard trend unit tests and 9 trend Cypress tests pass | Pass |
| Remove circular Home trend ring, not its meaning | Dashboard no longer imports or renders `CircularProgressbar`, `getTrendRingValue`, `.hero-ring`, or `.hero-bezel`; mature state renders the inline value and existing status/boundary copy | Pass |
| Remove hardcoded `#8a97a5` from `Dashboard.tsx` | `rg -n "#8a97a5" frontend/src/pages/dashboard/Dashboard.tsx` returns no match | Pass |
| Preserve tab name **Home** | `App.tsx` was not edited; existing Campaign A navigation tests and Cypress Home-tab assertions pass; the Home toolbar title remains `Home` | Pass |
| Empty state follows Fable | Porcelain/ink typographic plate, approved promise/explanation/boundary, fixed primary action; paper and ink captures at both viewports | Pass |
| Building-history state follows Fable | Folio, sealed 3-day gating line, day-broken entries, photo/fallback evidence; both themes and viewports | Pass |
| Mature-history state follows Fable | One-line trend sentence, existing gloss and boundary, journal entries, no ring; both themes and viewports | Pass |
| Recents preserve order and open saved detail read-only | Presentation grouping never sorts the canonical store array; cards route to `/meals/saved/:id`; existing recents test plus new card test pass | Pass |
| Existing photo behavior plus typographic fallback | `meal.image` is used unchanged when present; `TypographicPlate` is deterministic when absent; five component tests pass | Pass |
| No critical truncation / no horizontal overflow | Long meal name and metadata assertions pass at 320×700; all 14 Home Cypress tests run `assertNoHorizontalOverflow()` | Pass |
| Settings remains plainly visible | Visible `Settings` label and icon route to `/settings`; asserted in all 12 matrix captures | Pass |
| Porcelain Journal paper/ink tokens only | J2 CSS consumes J1 semantic tokens; no gradient, glass, blur, or new palette decision was introduced | Pass |

## 4. Verification outputs

All commands ran from `frontend/` unless stated otherwise.

| Command | Result |
| --- | --- |
| `npm run lint` | Pass, exit 0 |
| `npx tsc --noEmit` | Pass, exit 0 |
| `npm run test.unit -- --run` | Pass: 35 files, 420 tests |
| `npm run build` | Pass: 301 modules transformed; production bundle built in 21.72 s |
| `npx cypress run` | Pass: 9 specs, 55 tests, 0 failures; Electron 118 headless; 1:21 |
| `npx cypress run --headed --browser chrome --spec cypress/e2e/home-journal.cy.ts` | Pass: 14 tests, 6 replacement/supplemental screenshots; the five requested C3-a captures refreshed at their exact target dimensions |
| `git diff --check` (repository root) | Pass, no whitespace errors |

Non-failing output retained for honesty: Vitest emits existing expected error-path logs and React `act(...)` warnings in unrelated tests. Vite/Cypress report the existing stale Browserslist database and Vite's existing large-chunk warning. Cypress also warns that its Windows trash helper cannot remove older screenshot runs; the J2 spec uses canonical filenames with `overwrite: true`, and the canonical files below were independently dimension-checked. Two headed Chrome aggregate attempts exposed unrelated intermittent failures: `manual-meal.cy.ts` first failed 2 tests and immediately passed 5/5 in isolation; a later run had one Campaign B1 failure. The untouched standard headless complete suite then passed all 55/55, and the headed Home evidence run passed 14/14.

## 5. Screenshot evidence and findings

Canonical files are under the gitignored Cypress evidence directory. Every listed file was checked as exactly the named dimensions.

| State | 390×844 paper | 390×844 ink | 320×700 paper | 320×700 ink | Visual finding |
| --- | --- | --- | --- | --- | --- |
| Empty | `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/390x844/home-empty-paper.png` | `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/390x844/home-empty-ink.png` | `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/320x700/home-empty-paper.png` | `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/320x700/home-empty-ink.png` | Fable hierarchy preserved; copy wraps in full; plate, Settings, dock, and Home tab remain visible |
| Building | `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/390x844/home-building-paper.png` | `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/390x844/home-building-ink.png` | `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/320x700/home-building-paper.png` | `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/320x700/home-building-ink.png` | Gating sentence is intact; day rules, synthetic photo, and fallback plate render without horizontal overflow |
| Mature replacement | `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/390x844/home-mature-paper-corrected.png` | `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/390x844/home-mature-ink-corrected.png` | `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/320x700/home-mature-paper-corrected.png` | `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/320x700/home-mature-ink-corrected.png` | No doubled `logged`; sentence and one-line gloss remain visible; sealed disclaimer is collapsed behind the designed summary; no horizontal overflow |

C3-a refreshed and inspected only the following requested evidence:

- `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/390x844/home-mature-paper-corrected.png`
- `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/390x844/home-mature-ink-corrected.png`
- `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/320x700/home-mature-paper-corrected.png`
- `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/320x700/home-mature-ink-corrected.png`
- `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/320x700/home-mature-footnote-expanded-paper-corrected.png`

The collapsed paper and ink compositions remain calm at both sizes. The 44 px summary target adds only the required interactive height; it does not disturb hierarchy or introduce horizontal overflow. In the expanded 320×700 paper capture, the complete sealed text remains readable and unobscured, while the fixed **Check a meal** dock and complete tab bar remain correctly positioned. Paper and ink appearances remain stable.

Additional long-name proof:

- `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/320x700/home-mature-long-name-paper-corrected.png` — exactly 320×700; the full synthetic long meal name and metadata wrap without ellipsis or horizontal overflow.

Supplemental expanded-footnote proof:

- `frontend/cypress/screenshots/home-journal.cy.ts/j2-home/320x700/home-mature-footnote-expanded-paper-corrected.png` — exactly 320×700; the full sealed disclaimer is readable after native-summary activation, with the fixed **Check a meal** action and complete tab bar visible and unobscured.

Only synthetic meals and an inline synthetic SVG were used. No real health data or real photographs appear in tests or evidence.

## 6. Working-tree and changed-file proof

Final `git status --short` is reproduced below. `.claude/` and `reports/beta-readiness/` were present before J2 and were not read, edited, or adopted by this implementation.

```text
 M frontend/cypress/e2e/dashboard-smoke.cy.ts
 M frontend/cypress/e2e/trend-coverage.cy.ts
 M frontend/src/pages/dashboard/Dashboard.trendCoverage.test.tsx
 M frontend/src/pages/dashboard/Dashboard.tsx
 M frontend/src/theme/app.css
?? .claude/
?? frontend/cypress/e2e/home-journal.cy.ts
?? frontend/src/components/JournalEntryCard.test.tsx
?? frontend/src/components/JournalEntryCard.tsx
?? frontend/src/components/TypographicPlate.tsx
?? frontend/src/utils/journalPresentation.test.ts
?? frontend/src/utils/journalPresentation.ts
?? reports/beta-readiness/
?? reports/ux/premium-redesign/j2-home/
```

J2-owned changed-file proof (excluding the two pre-existing untracked areas):

```text
frontend/cypress/e2e/dashboard-smoke.cy.ts
frontend/cypress/e2e/home-journal.cy.ts
frontend/cypress/e2e/trend-coverage.cy.ts
frontend/src/components/JournalEntryCard.test.tsx
frontend/src/components/JournalEntryCard.tsx
frontend/src/components/TypographicPlate.tsx
frontend/src/pages/dashboard/Dashboard.trendCoverage.test.tsx
frontend/src/pages/dashboard/Dashboard.tsx
frontend/src/theme/app.css
frontend/src/utils/journalPresentation.test.ts
frontend/src/utils/journalPresentation.ts
reports/ux/premium-redesign/j2-home/implementation-report.md
```

## 7. Protected-boundary verification and risk summary

- Classification: this is a **current implementation** presentation change. It is not the target Kotlin/Rust architecture and does not claim to be.
- Scientific: no score, FII, insulin-load, DIL/DII, rolling trend, threshold, fallback, confidence, or quality semantics changed. Existing helpers remain authoritative. Scientific golden fixtures were not required because scoring was not touched.
- Lifecycle/data: no API, store, persistence, hydration, database, export, or synchronization implementation changed.
- Navigation: the three-tab structure and **Home** name are unchanged. Journal entries keep the existing read-only saved-detail route.
- Privacy: fixtures are synthetic; no telemetry, retention, consent, image persistence, or real user data behavior changed.
- Security/cryptography: no authentication, key management, storage encryption, provider routing, or other security-sensitive file changed.
- Design: all presentation choices come from Fable's constitution, final direction including D8, J2 slice, prototype, screenshots, and palette reassessment. No J7 tick-scale, verdict band, or cold-start semantics were introduced.
- Review: because Home trend presentation is scientifically sensitive, Fable must review the actual uncommitted diff and screenshots before any commit, push, or PR. No commit, push, or PR was created.

## 8. Accessibility correction findings

- The existing trend ARIA label is now exposed only by the sentence/value element. Focused tests retain the mature, loading, unavailable/failure, and confirmed insufficient-history distinctions.
- The one-line gloss remains separately visible and discoverable as document text.
- The footnote summary is a native keyboard-operable control, visible while collapsed, has a computed 44 px minimum touch target, and receives an explicit token-coloured `:focus-visible` outline. The sealed disclaimer is hidden by default and becomes separately readable when `open`.
- The journal entry has no overriding `aria-label`. Its computed accessible name is sourced by `aria-labelledby` from the rendered meal name and metadata and includes the estimate plus `Data quality` wording. Empty-alt photos and `aria-hidden` plates do not pollute that name.

## 9. Honest deviations and unresolved items

- The `agent-browser` executable required by the browser-verification skill was not available in this workspace. The fallback was the repository's installed Cypress 13.17.0 running in Chrome 150, with exact element captures and explicit pixel-dimension validation. This is a tooling deviation, not a product deviation.
- The sealed chronic-trend disclaimer still contains its inherited sentence explaining that the former ring geometry capped at 100. It now appears only after footnote activation. Fable explicitly deferred that obsolete wording to Amendment T1 / issue #105 with human/scientific sign-off; issue #105 was not implemented, and neither protected helper was edited.
- Cypress's Windows trash helper could not clean older ignored screenshot artifacts. The canonical evidence paths are overwritten deterministically and are the paths reviewed above; older suffixed ignored files are not implementation changes.
- The browser and build warnings listed in section 4 remain unresolved because dependency refresh and bundle splitting are outside J2.

## 10. Stop boundary

J2 implementation, C1–C4 plus C3-a corrections, and replacement evidence are complete in the uncommitted working tree. Work stops here for final Fable sign-off. Amendment T1 / issue #105, J3, J4, J6, J7, J8, J9, photo-persistence changes, architecture migration work, and all other slices were not started. `safetyCopy.ts` and `trendDisplay.ts` are untouched. No files are staged, and no commit, push, or pull request has been made.
