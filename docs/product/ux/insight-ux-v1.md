# INSIGHT Consumer UX v1

**Status:** Approved product specification for the first consumer UX campaign (Campaign A).
**Scope:** Frontend experience only. No backend, scoring, dataset, or scientific-copy changes.
**Companion:** `docs/missions/sol-campaign-a-consumer-meal-journey.md` (implementation contract).

---

## 1. The user problem

The current app exposes internal objects (drafts, items, FII fields, action sheets) instead of the user's goal. The journey today is: Dashboard → unlabeled center icon → a "Meals" reuse list → floating plus → blank "Review Meal" → another plus → AI/Manual action sheet → camera instruction list → AI draft → an overloaded Review Meal screen → save → the user stays on the same screen. Nothing on this path says what the app is for, and the moment of payoff (the estimate) has no dedicated destination.

## 2. The honest product promise

> **Understand and compare the estimated insulin demand of meals.**

One umbrella promise for everyone — weight management, energy, mental wellbeing, metabolic curiosity, or educational meal comparison for people with prediabetes/diabetes. No medical modes, no personalised health claims, no dosing, no diagnosis. The score is a relative, population-level, currently **uncalibrated** estimate, and the UI must never imply otherwise.

## 3. Target mental model

The user thinks: *"I have a meal in front of me. Tell me what you recognised, let me correct the important facts, calculate the estimate, explain what drove it, and let me decide whether to keep it."*

The app's job at every step is to answer exactly one question:

| Step | Question the screen answers |
|---|---|
| Home | "What can I do here, and what have I checked lately?" |
| Log Meal | "How do I describe this meal — photo, typing, or a repeat?" |
| Confirm | "Did INSIGHT understand my meal correctly?" |
| Result | "What is the estimate, why, and how much should I trust it?" |

## 4. End-to-end meal journey

```
Home
→ Check a meal (primary action)
→ Log Meal: Take a photo | Enter manually | Log a previous meal again
→ Confirm what INSIGHT found (edit identity, components, portions)
→ Calculate & save (one action — see §11)
→ Result screen (dedicated destination)
→ Check another meal / back Home
```

Saving always lands on the **result screen**, never back on the editing surface.

## 5. Home states (lifecycle-specific)

The Dashboard route becomes **Home**. The "Check a meal" primary action is always the first element, in every state.

- **No meals:** A welcome card: the promise (one sentence), a large primary **Check a meal** button, and one line of what will happen ("Snap a photo or describe your meal — we'll estimate its insulin demand."). No trend ring, no empty statistics.
- **One or two meals (or fewer than 3 logged days in the last 7):** Primary **Check a meal** action first; recent meals below it; the 7-day trend ring is replaced by a compact line such as "Your 7-day trend appears after you log meals on 3 different days (2 of 3 so far)." This is display gating on existing `logged_days_last_7` coverage metadata only — trend mathematics are untouched.
- **Sufficient history (≥ 3 logged days in the window):** Primary **Check a meal** action first, then the existing trend card (existing math, copy, disclaimers, and accessibility states from `utils/trendDisplay.ts` unchanged), then Recents. Recents items open the read-only saved-meal detail, as today.

## 6. Navigation

Bottom tab bar with **three labeled tabs**:

- **Home** (current Dashboard route)
- **Log Meal** (center; visible text label and accessible name — never an unlabeled icon)
- **History** (list of saved meals; each opens the read-only saved-meal/result view)

**Settings** moves out of the tab bar to a gear icon in the Home header (route unchanged). Rationale: settings is rare; logging is the product; a three-tab bar keeps the center action dominant. History is read-only browsing; creating a new meal never requires passing through it.

## 7. Meal-entry choices (Log Meal)

The Log Meal tab is a chooser, not a list. It directly presents three equally understandable options with one-line explanations:

1. **Take a photo** — "Point the camera at your meal." → Smart Camera.
2. **Enter manually** — "Type the meal and its parts yourself." → confirmation screen with one editable item row ready.
3. **Log a previous meal again** — "Repeat something you've checked before." → a picker of saved meals; choosing one creates a fresh editable draft (via the existing `buildDraftFromSavedMeal` trust boundary) and opens the confirmation screen.

The reuse flow lives *only* behind this explicit choice. History never silently creates drafts.

## 8. Smart Camera

One screen, one job: get a usable photo and hand it to recognition.

- **Capture or upload** (existing up-to-5 image support may remain, presented as "Add another angle" after the first shot).
- **One short optional note field**, in human language: label **"Anything the photo can't show? (optional)"** with a placeholder like "e.g. cooked in butter, brown rice, half portion". The term "Textual Description" is retired everywhere.
- **One explicit primary action:** a full-width labeled **Analyze meal** button (not an icon-only FAB), disabled until at least one image exists.
- **Loading:** blocking indicator with "Reading your meal photo…"; the user can cancel back without residue (existing enter/leave state reset stays).
- **Failure:** keep the curated failure copy (`utils/aiFailureCopy.ts`) with two clear recoveries: **Try again** and **Enter manually instead**. Raw backend/provider error text is never shown.
- **Privacy:** the existing AI-extraction privacy disclosure remains visible before analysis.

## 9. Confirmation hierarchy

The confirmation screen (current `PreviewMeal.tsx`, retitled to answer **"Did we get your meal right?"**) presents, top to bottom:

1. Photo (if any) and **meal name** (editable).
2. **What INSIGHT found:** components/ingredients as plain rows — name, portion with quick adjust — plus "Add something we missed" and remove.
3. **Portion sanity:** the whole-meal estimate card (calories/carbs/fat and the existing mismatch warning) stays in plain language.
4. **Primary action: Calculate & save** (see §11). Secondary: **Discard**.

Ordinary users edit observable facts only: identity, components, portions, missing/hidden ingredients (a note such as "cooked in ghee" is handled by adding a component, not by a science field). **FII, GI, per-serving nutrient densities, source tokens, and confidence values are never primary controls.** They remain available inside the item editor behind an explicit **"Advanced details"** disclosure, collapsed by default, with their existing disclaimers intact.

**Subtype chips (e.g. Biryani → Keema):** today these change only the display name. Campaign A does not implement real semantic correction; until it exists, any name-only control must carry explicit adjacent copy: *"This changes the name only — check the ingredient list below still matches your meal."* A visible correction must never create false control (see §14).

## 10. Result hierarchy

Saving lands on a **dedicated result screen** — the existing canonical saved-meal view (`SavedMealDetail.tsx`), reordered; no competing representation is created. Order:

1. **Human conclusion** — the existing impact-presentation title line.
2. **The estimate** — score ring and existing scale/detail lines, unchanged values.
3. **Main drivers** — existing `main_insulin_drivers` chips and per-item "why" lines.
4. **Estimate quality & limitations** — existing data-quality pill, unknown-item and rough-estimate notices.
5. **What this does not mean** — existing disclaimers: not a measurement, not personal prediction, not dosing or medical advice, reference not yet calibrated.
6. **Next actions** — **Check another meal** (→ Log Meal) and Done/back Home; delete remains available.
7. **Advanced evidence** — per-item FII/GI/source detail behind a collapsed disclosure.

All displayed numbers come from the backend response unchanged. History and Recents open this same screen.

## 11. Calculate/save semantics (Campaign A)

The current backend contract couples scoring and persistence: `POST /meals` is the only way to obtain a canonical score, and it saves. Campaign A works inside that contract:

- The confirmation primary action is honestly labeled **Calculate & save** — the user is told the meal will be kept.
- On success the app navigates to the result screen; **Delete** there is the "decide not to keep it" path, with its existing backend-first integrity.
- **Discard** before calculating clears the local draft only.

**Unresolved for Campaign B:** true calculate-before-save (score preview without persistence) requires either a backend preview endpoint or an approved client-side scoring path. That is an architectural decision requiring explicit approval; Campaign A must not invent it.

## 12. Progressive-disclosure rules

- Layer 1 (always visible): meal identity, components, portions, calories, the estimate, its human meaning, quality label, and disclaimers.
- Layer 2 (one tap, labeled): advanced technical evidence — FII, GI, nutrient densities, source provenance.
- Nothing in Layer 2 is required to complete the journey.
- Disclosure labels say what's inside ("Advanced details"), never "More".
- Recognition/AI uncertainty and scientific-model uncertainty are presented as distinct things and never merged into one number.

## 13. Accessibility & emotional design

- Every actionable control has a visible text label and matching accessible name; no icon-only primary actions.
- Loading, error, and empty states each say what happened and what the user can do next; errors always offer a manual path.
- Trend and score accessibility states must keep distinguishing loading / failed / genuinely-no-data.
- Tone: calm, factual, non-judgmental. No praise or blame for food choices, no urgency, no red-alert styling of scores. The app is a measuring companion, not a coach or a judge.
- The user is always in control: AI output is a proposal ("Did we get this right?"), never a verdict, and manual entry is always one tap away.

## 14. Prohibited interpretations

Never introduce, in copy, color, or iconography:

- traffic-light thresholds, danger labels, "healthy ranges", safe/unsafe framing;
- medical interpretation, diagnosis, dosing, or treatment implications;
- claims of measuring insulin or predicting a personal response;
- calibrated-sounding language ("your score of 62 is high") — the reference is uncalibrated;
- a single merged "confidence %" combining recognition and scientific quality;
- an AI draft styled to look like a canonical scored meal.

## 15. Campaign B boundary (mandatory)

Campaign B, not Campaign A, owns two consequential problems:

1. **Consequential corrections.** Any user correction (subtype chips, ingredient edits meant to change the dish) must either (a) update the structured meal data that feeds modelling, or (b) explicitly state what did not change and what still needs review. Name-only chips that imply semantic correction are a documented defect; Campaign A only adds the honest disclosure (§9), Campaign B must make corrections real or remove the affordance.
2. **Calculate-before-save.** Whether a preview score requires a backend endpoint, and what its retention semantics are, is an open architectural decision (§11). It must be decided explicitly, not implemented silently.

Neither may be partially implemented in Campaign A.
