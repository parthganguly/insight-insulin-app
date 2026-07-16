# Campaign A core consumer journey visual QA

Date: 2026-07-16 (Asia/Calcutta)

## Scope and method

- Worktree: `C:\Users\Parth Ganguly\Documents\Codex\2026-06-21\github-plugin-github-openai-curated-remote\work\insight-insulin-app\.claude\worktrees\agent-a1a3898911460a46a`
- Branch: `worktree-agent-a1a3898911460a46a`
- Baseline HEAD: `35defafc819b08d08f4ab8286bf0f1b127ba1096`
- Browser: Chrome incognito with DevTools docked
- App viewport: exactly `390 x 844` CSS pixels; captured PNGs are `779 x 1687` physical pixels because of device pixel ratio
- Data: synthetic only; no camera permission, real health data, paid AI, or external AI was used
- Scope: core journey only. No app, test, configuration, or script file was edited.

The required architecture, scientific, engineering, audit, validation, UX, mission, test-audit, and Computer Use handoff documents were read before the run. The current Ionic/React client and FastAPI backend were treated as the current behavioral reference, not as the approved target architecture.

## Capability gate

Confirmed before the journey:

- desktop and Chrome were visible and operable through Computer Use;
- the local app could be opened and navigated by clicking and typing;
- Chrome device emulation could be set to and visibly confirm `390 x 844`;
- DevTools viewport screenshots could be captured and saved under the requested report directory;
- Console and Network panels were available for live inspection;
- Preserve log was enabled during the journey and Network could be filtered by request method.

The run was therefore not blocked at the capability gate.

## Baseline repository proof

At baseline, the worktree already contained the Campaign A implementation/test/report changes listed by `git status --short --untracked-files=all`. I did not modify those files. The production-file SHA-256 baseline was recorded before starting the app, and the repository scope guard reported:

```text
Campaign A scope check passed: 27 tracked/untracked changed path(s), no protected paths.
```

`git diff --check` passed, with only the existing line-ending warnings.

## Runtime startup and cleanup

The frontend handoff command started successfully:

```text
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173
```

The literal backend handoff command failed before binding its port:

```text
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
ModuleNotFoundError: No module named 'services'
```

The backend started without a repository change after setting a process-local `PYTHONPATH` to the worktree's `backend` directory and retrying the same Uvicorn target. Both `http://127.0.0.1:8000/docs` and `http://127.0.0.1:5173/` returned HTTP 200 before UI testing.

Only the processes started for this run were stopped. Final listener inspection found nothing listening on ports `8000` or `5173`.

## State-by-state results

| State | Result | Route | Viewport | Screenshot | Observed behavior | Console and network | Defect / severity / category |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Empty Home | Pass | `/dashboard` | `390 x 844` | `screenshots/core/390x844-empty-home.png` | “Check a meal” was the dominant action; the exact honest product promise was visible; no empty-state trend ring/value appeared; Home, Log Meal, History, and Settings were reachable without clipping. | No request failure. | None for this state. |
| Settings reachability | Pass | `/settings` | `390 x 844` | Not captured | Settings opened from the Home header and browser Back returned to Home. | Route transition emitted the recurring `aria-hidden` focus warning. | Medium / accessibility mechanics. |
| Log Meal chooser | Pass | `/log-meal` | `390 x 844` | `screenshots/core/390x844-log-meal-chooser.png` | Direct options appeared in the required order: Take a photo, Enter manually, Log a previous meal again. No History detour was required. | No request failure; route transition emitted the recurring focus warning. | Medium / accessibility mechanics. |
| Manual ordinary confirmation | Partial | `/meals/new` | `390 x 844` | `screenshots/core/390x844-confirm-ordinary.png` | Ordinary identity, component, amount, and unit remained visible while technical fields remained hidden. The captured ordinary state is a fresh editable reuse copy, not the intended three-component fixture. | No POST was made by reuse. | High / fixture conformance and draft integrity; Medium / selected-tab state. |
| Invalid amount feedback | Pass | `/meals/new` | `390 x 844` | Not captured | With a component amount of zero, Calculate & save stayed on the draft and showed: `“New Item” needs an amount greater than 0. Tap the item to set its portion.` No POST occurred. | No POST occurred. | None; understandable inline and toast feedback were both visible. |
| Advanced disclosure | Partial | `/meals/new` | `390 x 844` | `screenshots/core/390x844-confirm-advanced.png` | Advanced details were closed by default. Expansion revealed nutrition, FII, and Glycemic Index fields. Source/density provenance fields were not present in the visible editor. | No request failure; disclosure/modal transitions emitted focus warnings. | Medium / scientific-evidence disclosure gap. |
| Intended synthetic fixture | Fail | `/meals/new` | `390 x 844` | Advanced screenshot shows `olive oil`; no complete-fixture screenshot exists | The first draft reached the requested meal name and the three requested component names; lentils `150 g` and rice `180 g` were visible. The intended olive-oil `10 g` finalization and save were not completed before the draft was lost during a Home-tab transition. | No POST was made for the intended fixture. | High / core journey draft loss and route/view mismatch. |
| Save request | Partial | `/meals/saved/bc91d388-a994-4e00-91a3-d788fb8e6529` | `390 x 844` | `screenshots/core/390x844-canonical-result.png` | Save mechanics worked for a fallback synthetic record (`New Meal`, one `New Item`, amount `150 g`), not for the intended fixture. The route became UUID-backed. | Network filter `method:POST` showed exactly one row named `meals`, status `200`, type `fetch`. No second POST appeared. | High / intended fixture not saved; Medium / console privacy exposure. |
| Canonical result | Pass for mechanics | `/meals/saved/bc91d388-a994-4e00-91a3-d788fb8e6529` | `390 x 844` | `screenshots/core/390x844-canonical-result.png` | Ordering was conclusion, estimate, main drivers, estimate quality and limitations, “What this does not mean”, then lower actions/evidence. The result honestly said “Hard to estimate from this meal” and used fallback language. | No 4xx/5xx or failed request observed. | Low / copy: `Data quality: LowUses...` lacks a separator. |
| History | Pass for saved fallback record | `/meals` | `390 x 844` | `screenshots/core/390x844-history.png` | The record appeared most-recent-first as `New Meal`, `0 kcal`, score `0`. | No failed request observed. | None for mechanics; fixture name/content mismatch is covered above. |
| Reuse saved meal | Pass for mechanics | `/meals/previous` -> `/meals/new` | `390 x 844` | `screenshots/core/390x844-confirm-ordinary.png` | Log Meal > Log a previous meal again listed the record and opened a fresh editable draft labelled `Editable draft — not saved yet`, preserving `New Meal`, one item, and `150 g`. The original history record remained unchanged and no POST occurred. | Preserved Network still contained exactly one POST total. | None for reuse mechanics. |
| Browser Back and hard reload | Pass | `/meals/previous`; `/meals/saved/bc91d388-a994-4e00-91a3-d788fb8e6529` | `390 x 844` | Result screenshot above | Browser Back returned from the reuse draft to the previous-meal picker. The saved UUID route survived `Ctrl+Shift+R`, and the same content reloaded. | After hard reload, Console contained only the React DevTools informational message; no app error appeared. | None for saved-route persistence. |

## Important journey discrepancy

The intended fixture was not the record ultimately saved. While the first manual draft was open, activating the Home bottom tab discarded the populated draft without a confirmation. Browser Back changed the address bar back to `/meals/new` but continued rendering Home. Navigating through Log Meal > Enter manually then created a fresh one-item draft. This is both a test-run limitation and a user-visible data-integrity/routing defect; the report does not treat the fallback record as equivalent to the requested three-component fixture.

## Console and Network evidence

- Network, filtered with `method:POST`, showed exactly one request: `meals`, status `200`, type `fetch`, approximately `0.9 kB`, `78 ms`.
- The response created ID `bc91d388-a994-4e00-91a3-d788fb8e6529`, which matched the saved route.
- No failed request, 4xx response, or 5xx response was observed during the core journey.
- Route, modal, popover, action-sheet, and loading transitions repeatedly emitted Chrome's `Blocked aria-hidden on an element because its descendant retained focus` warning. This was app-generated; the separate DevTools self-XSS paste warning was operator-generated and is not counted as an app defect.
- `PreviewMeal.tsx:117` logged the complete `POST /meals response` object, including meal name and item collection. Only synthetic data was used here, but the same production console behavior could expose private meal data on a real user's device.
- A hard reload of the final saved route cleared the transition warnings; Console then showed only the standard React DevTools development message.

## Defects

1. **High — frontend routing / draft data integrity:** leaving an unsaved manual draft through Home gives no discard confirmation, and browser Back can restore the `/meals/new` URL while Home remains rendered. Re-entering manual flow starts a fresh draft, losing populated work.
2. **Medium — navigation state:** History was highlighted as the selected bottom tab while the manual editor route was `/meals/new`.
3. **Medium — accessibility mechanics:** Ionic transitions repeatedly retain focus inside content being marked `aria-hidden`. This is a concrete browser warning, not a formal accessibility audit.
4. **Medium — privacy:** the full saved-meal response object, including meal name and items, is logged to the browser console from `PreviewMeal.tsx:117`.
5. **Medium — scientific-evidence disclosure:** item Advanced details expose FII and Glycemic Index, but no source/density provenance fields were visible despite the UX specification placing technical source/density evidence in advanced UI.
6. **Medium — developer/runtime startup:** the documented literal backend command fails without a process-local backend `PYTHONPATH`.
7. **Low — result copy:** `Data quality: LowUses rough fallback...` renders without punctuation or whitespace between `Low` and `Uses`.

## Product and scientific questions

- Product: should navigating away from an unsaved manual draft require an explicit discard confirmation, and should browser Back restore the draft view rather than only its URL?
- Product/scientific evidence: which source, source-quality, and density/provenance fields are required in item-level Advanced details for Campaign A?
- No new formula, threshold, DIL/DII, FII mapping, dosage, diagnosis, or personal-response interpretation conflict was observed. The result copy stayed within the documented population-level estimate boundary.

## Screenshot artifacts

- `screenshots/core/390x844-empty-home.png`
- `screenshots/core/390x844-log-meal-chooser.png`
- `screenshots/core/390x844-confirm-ordinary.png`
- `screenshots/core/390x844-confirm-advanced.png`
- `screenshots/core/390x844-canonical-result.png`
- `screenshots/core/390x844-history.png`

All six files are valid PNGs at `779 x 1687` physical pixels, corresponding to the `390 x 844` CSS viewport at device pixel ratio.

## Final repository boundary

The only files created by this run are this report and the six screenshots listed above. No production source, test, configuration, dependency, script, Git index, commit, branch history, GitHub issue, pull request, or release was changed.

Final verification:

- comparison with the captured baseline status showed exactly seven new entries: this report and the six screenshots;
- no baseline status entry disappeared;
- the runtime-created untracked `app.db` was removed;
- `git diff --check` passed, apart from the pre-existing line-ending warnings;
- `scripts/verify-campaign-a-scope.ps1` passed;
- all 12 captured production-file SHA-256 hashes matched baseline;
- `git diff --cached --name-only` was empty;
- branch remained `worktree-agent-a1a3898911460a46a` at `35defafc819b08d08f4ab8286bf0f1b127ba1096`;
- no listener remained on port `8000` or `5173`.
