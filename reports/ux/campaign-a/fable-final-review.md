# Campaign A — Fable final independent release review

Date: 2026-07-16
Reviewer: Claude Fable 5 (independent release captain; did not inherit prior verdicts)
Worktree: `.claude/worktrees/agent-a1a3898911460a46a`
Branch: `worktree-agent-a1a3898911460a46a`
Reviewed commit: `57b3d96` (PR #95) plus the corrections in this pass
Data: synthetic only; no real health data, meal photographs, or paid AI calls.

## Independent release verdict

**Merge-ready after the narrow corrections applied in this pass.** Before this
pass the honest verdict was **not merge-ready**, for one reason no earlier
report caught: the repository's own required CI browser job — Browser
(Cypress) — was failing on PR #95 (4 of 6 specs, 9 tests), because the
existing e2e smoke suite still drove the pre-Campaign-A UI. `AGENTS.md`
forbids merging while required CI checks fail, and every prior QA pass ran
only the unit suite, TypeScript, ESLint, and the build. With the Cypress
suite aligned to the approved Campaign A journey, the two known presentation
defects fixed, and all checks green, Campaign A is a coherent, honest,
mobile-first consumer journey that deserves to merge.

### Journey assessment (independent, evidence-based)

- **Mental model and coherence.** Home / Log Meal / History answer exactly
  the questions UX v1 assigns them. The chooser presents the three entry
  modes directly; History is read-only; reuse lives only behind the explicit
  "Log a previous meal again" option. Verified in code, unit tests, prior
  screenshots, and my own browser runs.
- **Route and draft-state integrity.** The dirty-draft leave guard,
  route-derived selected tab, and save-replaces-draft navigation hold up: a
  failed save stays on the editable draft; a successful save lands on the
  canonical `/meals/saved/:id` result (asserted end-to-end in a real browser
  in this pass).
- **Honesty.** Result values, quality labels, drivers, and disclaimers render
  from the backend response and existing helper modules unchanged; the
  subtype chips carry the name-only disclosure; recognition and scientific
  uncertainty stay separate. No calibrated-sounding, medical, or
  traffic-light framing anywhere in the changed surfaces.
- **Consumer feel.** Home, chooser, camera, and result screens read as a
  consumer app. The one remaining "developer form" residue — the broken
  portion stack and the run-together driver text — is exactly what this pass
  fixed.

## Defects fixed in this pass

1. **Required CI browser job failing (merge blocker, previously unreported).**
   `frontend/cypress/e2e/dashboard-smoke.cy.ts`, `manual-meal.cy.ts`,
   `saved-detail.cy.ts`, and `trend-coverage.cy.ts` asserted the retired UI
   ("Dashboard" title, Meals-tab FAB draft entry, "Meal actions"/"Save meal"
   FABs, old result heading, ungated low-coverage trend ring). All four are
   updated to drive the approved Campaign A journey and to mirror the
   already-approved unit-test expectations (`Dashboard.trendCoverage.test.tsx`,
   `homeMealJourney.test.ts`). Protected trend guarantees were preserved in
   e2e form: loading/failed/confirmed-zero announcements stay distinct, the
   uncapped >100 index case is untouched, and the anti-zero-fill guard
   ("same per-logged-day value, only coverage changes") moved from 1-of-7 to
   3-of-7 — the display gate's minimum — with a new test asserting the ring
   is replaced by the building-history line below the gate.
2. **`.portion-adjust-row` had no layout styles** — the minus, amount, plus,
   and unit controls rendered as a broken vertical stack (tiny "−", full-width
   Amount, tiny "+", full-width Unit) on every component card. `app.css` now
   lays the row out as a grid: one coherent line at 390×844; at ≤340px the
   unit picker drops to its own row while the steppers stay beside the
   amount. Steppers are ≥44×44 CSS px. Quantity behaviour (±0.5 steps,
   typed amounts, validation) is unchanged — only presentation.
3. **`.result-driver-chips` had no layout styles** — multiple drivers
   concatenated into unreadable run-together text ("lentilsriceolive oil" in
   the correction-1 evidence). They now render as wrapping pill chips using
   the app's existing pill idiom and tokens; backend text, order, and count
   are unchanged (asserted byte-for-byte in the new spec).
4. **New regression spec** `frontend/cypress/e2e/campaign-a-layout.cy.ts`
   guards both repaired layouts at 390×844 and 320×700 with a real
   three-component draft and a synthetic three-driver result: grid layout,
   ≥44px steppers, no row overflow, flex-wrap chips, no chip collisions, no
   horizontal page scroll — and captures the release evidence screenshots.

## Defects observed and intentionally not fixed

- **Blocked live-QA states** (AI loading/cancel/retry live run, biryani
  subtype live adjacency, live trend-lifecycle seeding, native Android
  camera, keyboard/reduced-motion instrumentation): all remain covered by
  automated component tests with mutation-verified sensitivity (8/8). These
  are verification gaps, not observed defects; none is a Campaign A code
  defect I could fix without new fixtures/infrastructure. See gap table.
- **Save-success wording** ("…is shown above") reads slightly oddly as a
  transient toast on the result screen. Copy is factually correct on that
  screen; changing approved copy is not a layout correction. Not fixed.
- **Pre-existing React `act(...)` warnings and expected mocked-failure logs**
  in the unit suite; **Browserslist-age and chunk-size advisories** in the
  build. Pre-existing, non-blocking, unchanged.
- Many Campaign A class names (e.g. `result-section`, `confirmation-*`)
  carry no dedicated CSS but compose `app-card`/`disclaimer-note`/element
  defaults and render correctly in evidence; adding rules for them would be
  speculative cleanup. Only the two visibly broken classes were styled.

## Automated results (this pass, in `frontend/`)

| Check | Result |
| --- | --- |
| Focused Cypress spec `campaign-a-layout.cy.ts` | PASS — 4/4 |
| Full Cypress browser suite (production build via `vite preview`, as CI runs it) | PASS — 7 specs, 39/39 |
| Full frontend unit suite (`npm run test.unit -- --run`), single run | PASS — 28 files, 365 tests |
| TypeScript (`npx tsc --noEmit`) | PASS |
| ESLint (`npm run lint`, includes the cypress specs) | PASS |
| Production build (`npm run build`) | PASS (existing advisories only) |
| `git diff --check` | PASS (existing line-ending notices only) |
| `scripts/verify-campaign-a-scope.ps1` | PASS — 12 changed paths, no protected path |

## Visual evidence (real Chromium against the production preview build)

Saved under `reports/ux/campaign-a/screenshots/fable-final/`:

| File | Shows |
| --- | --- |
| `390x844-confirmation-three-components.png` | Three synthetic components (150 g / 180 g / 10 g); each portion row reads as one control (− · amount · + · unit); Calculate & save / Discard hierarchy; labeled bottom navigation; no horizontal overflow. |
| `320x700-confirmation-three-components.png` | Narrow stacking rule: steppers beside the amount, unit on its own row; controls touchable; no overflow. |
| `390x844-result-three-drivers.png` | Result "Main drivers": three backend driver strings as wrapping chips (2 + 1), consistent spacing, per-item why-lines below, bottom navigation visible. |
| `320x700-result-three-drivers.png` | Chips wrap one per line, readable, no collisions or overflow at the narrow viewport. |

All four were captured by the committed spec, so the evidence is reproducible
(`npx cypress run --spec cypress/e2e/campaign-a-layout.cy.ts`).

## Remaining verification gaps and whether each blocks merge

| Gap | Coverage that exists | Blocks merge? |
| --- | --- | --- |
| Live AI analysis (loading, cancel, retry, raw-error suppression) — no local/mock recognition path; paid calls prohibited | `AiMealAdd.campaignA.test.tsx` (8 tests, mutation-verified); curated-copy unit suite | No — automated coverage is behavioural and the boundary is component-local; live proof needs a mock-provider fixture (Campaign B-adjacent infrastructure). |
| Live biryani subtype-chip adjacency | `PreviewMeal.campaignA.test.tsx` asserts chips + adjacent disclosure | No — same fixture dependency; the honesty line itself is mutation-guarded. |
| Live trend lifecycle seeding (1/3, 2/3, ≥3, loading, failed) | `Dashboard.trendCoverage.test.tsx`, `homeMealJourney.test.ts`, plus the updated `trend-coverage.cy.ts` now covering 0/1/3/4/7 logged days **in a real browser** | No — this pass materially narrowed the gap; only backend-seeded (non-intercepted) data remains unexercised. |
| Native Android camera/photo-picker | Browser-level camera fallback QA (final-qa, correction-2) | No — Capacitor-native behaviour is outside the web release surface; must precede any store/device release. |
| Keyboard focus order, reduced motion, formal contrast | Role/name assertions in unit suite; no formal audit | No — no observed defect; a formal accessibility audit remains scheduled work. |
| Destructive delete live re-check | Cypress `saved-detail.cy.ts` covers backend-first delete success/failure/cancel in a real browser | No — automated browser coverage exists; the earlier "awaiting confirmation" manual check is superseded. |

## Scientific and protected-boundary confirmation

- No file under `backend/`, `crates/`, or `rust/` changed; scope guard passed.
- Protected modules (`api.ts`, `safetyCopy.ts`, `acuteScoreDisplay.ts`,
  `insulinImpactPresentation.ts`, `fiiTrustBoundary.ts`, `trendDisplay.ts`,
  both stores) untouched.
- No formula, threshold, mapping, fallback rule, confidence/quality
  semantics, disclaimer, or scientific claim changed. The CSS change is
  presentation-only; the spec changes assert existing approved copy and
  values (scores 42/63/189, quality labels, driver strings, disclaimers)
  byte-for-byte against synthetic fixtures.
- Trend mathematics and `trendDisplay.ts` semantics unchanged; the e2e
  updates encode the already-approved display gating, and keep the
  loading/failed/confirmed-zero screen-reader distinctions and the uncapped
  >100 index guard.
- AI trust boundary untouched: no recognition, extraction, or
  `buildDraftFromSavedMeal` behaviour changed.

## Process finding for future campaigns

Every prior Campaign A report validated "all checks" without running
`npm run test.e2e` / `npx cypress run`, while CI ran it and failed. Release
checklists for this repository should treat the CI check list on the PR —
not a locally chosen subset — as the definition of "all checks".
