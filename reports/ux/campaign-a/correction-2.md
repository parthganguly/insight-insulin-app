# Campaign A correction 2: Smart Camera stale recovery message

Date: 2026-07-16  
Scope: current Ionic React/Capacitor compatibility implementation  
Route: `/meals/new/ai`

## Defect

The final-QA evidence showed valid selected images while the earlier camera/no-photo recovery message remained visible. Camera and gallery operations may overlap: a valid image can be added before an earlier camera promise rejects, allowing the later rejection to restore a contradictory camera failure.

## Correction

`AiMealAdd` now enforces that a camera failure is not visible while at least one valid image exists. If a camera failure arrives after an image, the stale camera error and its failure kind are cleared. This prevents the message from reappearing when another image is added or when one image is removed.

Analysis failures remain distinct and are not suppressed by this rule. The correction does not change privacy copy, AI behavior, API contracts, the five-photo limit, image retention, backend behavior, or scientific behavior.

## Regression coverage

The focused component test now covers:

1. camera cancellation and curated recovery copy;
2. successful gallery recovery and immediate removal of the camera message;
3. enabled Analyze meal after recovery;
4. a delayed camera rejection arriving after a second gallery image;
5. two images followed by removal of one, with Analyze still enabled;
6. removal of the final image returning to the normal empty state;
7. suppression of raw camera detail.

## Visual recheck

A generated synthetic meal photograph—brown rice, roasted vegetables, tofu, and lemon—was used. It contains no person, real health data, branding, text, or identifying detail. Earlier screenshot-as-meal attempts and an accidentally reached analysis-failure state were discarded and are not treated as evidence.

The scoped local flow passed at both requested viewports:

- trigger camera cancellation/no-photo recovery;
- choose the synthetic meal image from the camera's photo picker;
- confirm the camera message disappears and Analyze meal enables;
- add the same meal as a second angle;
- remove one image;
- confirm one thumbnail remains, Analyze remains enabled, and no camera/no-photo message reappears.

Evidence:

- [`390x844-camera-images.png`](screenshots/correction-2/390x844-camera-images.png) — 390 x 844.
- [`320x700-camera-images.png`](screenshots/correction-2/320x700-camera-images.png) — 320 x 700.
- [`synthetic-meal-fixture.png`](screenshots/correction-2/synthetic-meal-fixture.png) — synthetic QA fixture.

## Console and Network

- No uncaught exception or raw Capacitor/browser/provider error was visible in the corrected flow.
- No contradictory camera/no-photo recovery message remained after selection or removal.
- The visual harness made only localhost application requests; no Analyze meal or Try again action was invoked and no paid/external AI request was made.
- The separate, accidentally reached curated analysis-failure state was reset and excluded from correction evidence.

## Verification

| Check | Result |
| --- | --- |
| Focused `AiMealAdd.campaignA.test.tsx` | PASS — 1 file, 8 tests |
| Full frontend unit suite | PASS — 28 files, 365 tests |
| TypeScript `npx tsc --noEmit` | PASS |
| ESLint | PASS |
| Production build | PASS |
| Scoped visual browser check | PASS — 2/2 viewport cases |

The full unit suite retains existing expected mocked-failure logs and unrelated React `act(...)` warnings. The production build retains the existing stale Browserslist-data and large-chunk advisories.

## Risk summary

This is a small current-client presentation/state correction. No scientific formula, nutrition input, recognition result, backend contract, privacy disclosure, storage behavior, or retention rule changed. The principal regression risk—late camera rejection after gallery success—is explicitly covered by the strengthened component test.
