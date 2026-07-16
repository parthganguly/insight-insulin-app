# Campaign A correction 1

Date: 2026-07-16  
Scope: current Ionic React/Capacitor implementation only  
Fixture: synthetic `Synthetic lentil rice bowl`; lentils 150 g, rice 180 g, olive oil 10 g

## Defects fixed

- Added an Ionic dirty-draft leave guard. Stay preserves the full draft, explicit Discard clears it, save bypasses the warning, and browser Back keeps the URL and rendered page synchronized.
- Derived the selected journey tab from the route: Log Meal owns `/log-meal`, `/meals/new`, `/meals/new/ai`, and `/meals/previous`; History owns `/meals` and `/meals/saved/:id`.
- Kept Advanced details closed initially and made the item editor compact and touchable at 390 × 844 and 320 × 700, with Done primary and Remove Item destructive/secondary.
- Removed full successful `POST /meals` response logging.
- Added the missing separator between data-quality label and explanation.
- Released focus before Ionic route/overlay transitions to avoid the focused-descendant `aria-hidden` warning.
- Corrected the local backend handoff command to use a process-local backend `PYTHONPATH`, and verified `/docs` on `127.0.0.1:8000` returned HTTP 200.
- During live verification, corrected two additional result-state defects: save now replaces the draft with the saved-result route rather than using a cross-tab root transition, and repeated result explanations use unique React keys.

No backend scoring, FII data, API contract, estimate-quality meaning, chronic calculation, persistence contract, Rust, privacy, consent, telemetry, or image-retention behavior changed.

## Automated verification

| Check | Result |
| --- | --- |
| Focused correction tests | PASS — 36/36 before final live checks |
| Full frontend suite (single requested run) | PASS — 28 files, 363 tests |
| Final navigation/save focused tests | PASS — 9/9 |
| Final saved-result focused tests | PASS — 12/12 |
| TypeScript | PASS — `npx tsc --noEmit` |
| ESLint | PASS — zero lint errors |
| Production build | PASS — 298 modules transformed |

Build output retained the existing informational Browserslist-age and large-chunk advisories. Some existing tests print React `act(...)` diagnostics and an intentional failed-delete-path error; the relevant assertions pass and no test is suppressed.

## Computer Use verification

| State | Viewport | Result |
| --- | --- | --- |
| Dirty draft → Home → Stay | 390 × 844 | PASS — Ionic alert shown; all names and portions preserved |
| Dirty draft → Home → Discard and leave | 390 × 844 | PASS — Home rendered and draft cleared |
| Exact manual confirmation | 390 × 844 | PASS — exact name, 3 components, and requested portions |
| `/meals/new` journey tab | 390 × 844 | PASS — Log Meal selected |
| Advanced closed/item editor | 390 × 844 | PASS — no overlap; fields and both actions reachable |
| Exact manual confirmation | 320 × 700 | PASS — content remains usable and Log Meal remains selected |
| Advanced closed/item editor | 320 × 700 | PASS — stacked Done/Remove hierarchy, no overlap |
| Save | 390 × 844 | PASS — one `POST /meals`, HTTP 200, canonical ID `1e69e7ba-2bee-4da6-bd01-98afd48e0116` |
| Saved route/result | 390 × 844 | PASS — `/meals/saved/1e69e7ba-2bee-4da6-bd01-98afd48e0116`; Meal result rendered; History selected |
| Result quality copy | 390 × 844 | PASS — `Data quality: Low. Uses rough fallback...`; no `LowUses` concatenation |

The saved response was not logged. After clearing Console and reloading the corrected result page, Console contained only the React DevTools development notice: no full response object, private meal payload, duplicate-key error, or focused-descendant `aria-hidden` warning. Network, filtered to POST after clearing, showed one `meals` fetch with status 200.

## Evidence

- `reports/ux/campaign-a/screenshots/correction-1/390x844-draft-leave-guard.png`
- `reports/ux/campaign-a/screenshots/correction-1/390x844-manual-confirmation.png`
- `reports/ux/campaign-a/screenshots/correction-1/390x844-advanced-closed.png`
- `reports/ux/campaign-a/screenshots/correction-1/320x700-manual-confirmation.png`
- `reports/ux/campaign-a/screenshots/correction-1/320x700-advanced-closed.png`
- `reports/ux/campaign-a/screenshots/correction-1/390x844-saved-result.png`

Chrome captured device-pixel-ratio 2 images: the 390 × 844 viewport files are 780 × 1688 pixels and the 320 × 700 viewport files are 640 × 1400 pixels.

## Risk and unresolved items

- Scientific risk: none; no formula, threshold, mapping, fallback, confidence, score, DIL/DII, or rolling-trend behavior changed.
- Privacy/security risk: low; only a synthetic local fixture was used, no image was attached, and no response payload was printed to Console.
- Compatibility risk: low; changes are limited to current frontend navigation, presentation, focus lifecycle, and regression coverage plus handoff documentation.
- No correction-scope blocker remains. Existing build advisories and test-only `act(...)` diagnostics are recorded above and were not caused by the corrected product flows.
