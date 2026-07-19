# Evidence Manifest — Fable Discovery (issue #101)

**Date:** 2026-07-18. **Author:** Claude Fable 5.
Every load-bearing input to this mission, classified by evidence type.
No real user data, real meal photographs, credentials, or `.env` contents
were used anywhere; all meals are synthetic; all prototype imagery is
CSS/emoji placeholder art explicitly banned from production use.

---

## 1. Runtime evidence (my own observation, this mission)

- Backend (FastAPI, local venv) + frontend (Vite dev server) started
  locally; five synthetic meals seeded via canonical `POST /meals`
  (keema biryani + raita; masoor dal & rice + ghee; oats/milk/banana;
  egg & toast; yogurt & potato). Returned canonical scores 666–1023;
  keema biryani `estimate_quality: low`.
- Browser: Cypress-driven Chrome (exact-viewport 390×844 and 320×700
  asserted by the harness), plus initial raw headless-Chrome captures that
  were **discarded as evidence** after showing Chrome's ~500 px minimum
  window width clipping (recorded here so the artifact set is honest about
  method failures).
- 34 captures preserved: `screenshots/current-app/` (32 state captures plus
  two Cypress failure-frame captures from the manual-confirm journey retry,
  kept for method honesty) — home
  (empty/building/mature), chooser, camera, fresh confirm, item editor
  (+advanced), B1 needs-review, previous picker, history, settings, normal
  result, insufficient result, simulated 133 % large-text.
- Limits: keyboard-open, reduced-motion, screen-reader order, and native
  camera were **not** observed this session (see §6). No physical device was
  used; nothing claims device verification.

## 2. Repository evidence (read, not produced, by this mission)

- Governance: `AGENTS.md`, `CLAUDE.md`.
- Product/journey law: `docs/product/ux/insight-ux-v1.md`,
  `docs/product/ux/insight-ux-campaign-b.md`,
  `docs/missions/sol-campaign-a-consumer-meal-journey.md`,
  `docs/missions/sol-campaign-b.md` (headings),
  `docs/architecture/campaign-b-correction-and-calculation.md`.
- Audits/QA: `reports/project-audit/2026-07-12-insight-comprehensive-audit.md`
  (certified), `reports/ux/campaign-a/fable-final-review.md`,
  `reports/ux/campaign-a/visual-qa-core.md`,
  `reports/ux/campaign-b/b1/implementation-report.md`,
  `reports/ux/campaign-b/b1/fable-release-review.md`.
- Code read directly: `App.tsx`, `Dashboard.tsx`, `SavedMealDetail.tsx`,
  `PreviewMeal.tsx` (excerpts), `LogMealChooser.tsx` (excerpts),
  `theme/app.css`, `theme/variables.css`, `utils/safetyCopy.ts`,
  `utils/acuteScoreDisplay.ts`, `utils/insulinImpactPresentation.ts`.
- Repository screenshots consulted: Campaign A `screenshots/core/*`,
  `fable-final/*`, `final-qa/*`; Campaign B1 evidence PNGs.

## 3. Screenshot evidence produced by this mission

- `screenshots/current-app/` — 34 runtime captures (above).
- `screenshots/concept-{a,b,c,d}-*/` — 22 comparable captures per concept:
  9 states × 2 viewports + alternate appearance (home, estimate).
- `screenshots/final-annotated-journal/` — 42 captures: 13 states × 2
  viewports + 6 dark states + large-text probes.
- All prototype captures made via Cypress+Chrome at asserted viewports
  against a local static server; concept C's confirm/review were recaptured
  after fixing a prototype `hidden`-attribute CSS bug (defect and fix noted
  for honesty).

## 4. External research evidence (with what each changed)

Empirical:

1. Cordeiro et al., *Barriers and Negative Nudges: Exploring Challenges in
   Food Journaling*, CHI 2015 — burden/abandonment; judgment as negative
   nudge. → capture-effort budget; optional-by-default correction; no
   praise/blame.
2. Amershi et al., *Guidelines for Human-AI Interaction*, CHI 2019 —
   G1/G2/G9/G10/G11. → proposal-first confirm surface; in-place correction;
   "why" one tap away.
3. van der Bles et al., *The effects of communicating uncertainty on public
   trust in facts and numbers*, PNAS 2020 — plain/numeric uncertainty
   doesn't materially erode source trust; verbal-only hedging inflates
   perceived uncertainty. → structural honesty; one quality sentence +
   footnoted disclosures instead of stacked hedges.
4. Diabetes device burden / CGM alarm-fatigue literature (Medscape 2025
   survey coverage ~56 % moderate-to-extreme burden; alarm-fatigue reviews,
   e.g. *"Turn It Off!"*, J Diabetes Sci Technol) — → "calm is a safety
   feature" principle; absolute ban on alert aesthetics.
5. Hoober's one-handed-use observational research (~49 % one-handed, ~75 %
   thumb interactions; bottom-centre comfort zone; summarized via secondary
   UX sources) — → bottom dock; shutter placement; top-of-scroll CTA
   diagnosed as ergonomic error.

Platform guidance:

6. Apple Human Interface Guidelines (hierarchy, typography, motion,
   materials incl. 2025 Liquid Glass introduction and its automatic
   reduced-transparency/motion adaptations; accessibility). → material
   discipline with automatic a11y fallbacks; deference; refusal to imitate
   the glass look (mission constraint).
7. Android/Material quality & adaptive guidance (consulted at overview
   level). → nothing platform-blocking in the direction; native slices must
   re-verify ergonomics per platform.

Competitor/observed patterns:

8. Undermyfork (photo-first diabetes food diary; Instagram-like timeline;
   praised for empathy/visual modality). → photo-as-memory-anchor pattern;
   validated the journal chassis.

Workflow lesson:

9. Theo's Fable-vs-Sol comparison — **the video/transcript itself was not
   found in the repository and was not directly supplied**; I reviewed
   secondary written coverage only, and state that plainly. Lesson applied:
   Fable owns divergence/judgment and frozen design law; Sol receives
   bounded slices with stop conditions (`sol-implementation-slices.md`).

## 5. Design inference vs product judgment (labelled throughout the docs)

- Inference (from evidence): capped-ring illegibility; report-not-answer
  hierarchy diagnosis; effort/payoff inversion at confirm; ergonomic cost of
  top-placed CTAs.
- Judgment (mine, as design authority): journal metaphor choice; serif
  voice; warm palette; rejecting instrument/conversation/ledger as chassis
  while grafting their best elements; "deliberately ordinary" list.

## 6. Known gaps and honest limitations

1. Theo video/transcript reviewed only via secondary coverage (above).
2. No physical-device verification; one-handed and low-light claims are
   geometry + literature-based inference.
3. Keyboard-open confirmation, reduced-motion behaviour, and screen-reader
   order were designed for (constitution §8–9) but not runtime-verified this
   session; prototypes encode reduced-motion CSS but it was not exercised.
4. Large-text evidence uses a 133 % root-scale simulation, not platform
   Dynamic Type.
5. Prototype "photos" are emoji/CSS plates — a deliberate synthetic-data
   choice; the constitution bans them from production.
6. The empty-Home runtime state was produced via synthetic intercepted
   responses (empty backend list), not a wiped database.
7. Concept prototypes stub some tertiary interactions (settings, delete,
   item-editor internals in concepts B–D) — stated in-file; the final
   prototype covers the full core journey interactively.
8. The alarm-fatigue "56 %" figure comes from press coverage of a survey,
   not a primary paper I read end-to-end; it changes tone policy, not any
   scientific claim.
9. Cypress viewport screenshots capture the visible viewport (~625 px height
   in headless Chrome windows); full-page scroll content was verified by
   scrolled captures where it mattered (result-normal-bottom).
