# INSIGHT Consumer UX — Campaign B: Real Corrections, Honest Calculation

**Status:** Sealed implementation contract (v1.0, approved 2026-07-18). The only remaining decision gate is the issue #97 outcome (§8), which blocks Slice B2-2 only. See §10 for the approval record.
**Scope:** Consequential correction (B1) and calculate-before-save (B2). Builds on the shipped Campaign A journey (`insight-ux-v1.md`); supersedes nothing in it except where explicitly stated.
**Companions:** `docs/architecture/campaign-b-correction-and-calculation.md` (architecture contract), `docs/missions/sol-campaign-b.md` (implementation contract).

---

## 1. Problem statement

Campaign A shipped the honest journey shell. Two trust problems remain:

1. **False control.** Some visible "corrections" don't correct anything. The meal-level
   subtype chips change only the display name (disclosed since Campaign A, but disclosure
   is a patch, not a fix). Worse, a *real* correction — renaming a component — silently
   keeps the previous identity's nutrition proposals, so the model combines the new name
   with the old food's numbers.
2. **Forced commitment.** `POST /meals` is the only way to obtain a canonical estimate and
   it persists as a side effect. The user must *save* a meal to *understand* it; "decide
   not to keep it" is a destructive delete after the fact, and the meal has already
   entered History, Recents, and the chronic trend the moment it was scored.

## 2. User mental model (target)

> "I describe the meal. INSIGHT shows what it understood. I fix the facts that are wrong.
> I ask for the estimate. I read it, see how much to trust it, and *then* decide whether
> it belongs in my history."

Two invariants fall out of this:

- **Every edit is either real or labeled.** If a control changes what the model consumes,
  editing it changes the estimate inputs. If it can't, it says so where the user acts.
  If neither is possible, the control does not exist.
- **Nothing is kept until the user keeps it.** Calculation produces an estimate; saving is
  a separate, explicit, reversible-by-not-doing-it decision.

## 3. Correction semantics (B1)

### 3.1 The two-level model

- **Meal level is descriptive.** The meal name and timestamp label the meal for the
  human and are never modelling inputs (the backend models per *item*). The meal photo
  is **recognition input**, not a scoring input: the image bytes never feed scoring or
  travel with calculate/save, but the structured facts the AI reads from the photo —
  components, portions, nutrition proposals, visible preparation — become draft
  modelling inputs subject to review (§3.2). The user reviews those structured facts,
  never "the photo's score". Backend image-retention behaviour is unchanged (images are
  used in memory for extraction only). The UI says the name rule once, plainly, near
  the meal-name field: *"The name is a label. The items below are what the estimate
  uses."*
- **Component (item) level is the model input.** Item name (drives FII resolution and
  mixed-dish decomposition), amount + unit, per-unit kcal/carb/protein/fat/sat-fat, GI,
  and explicit FII (advanced) are the structured facts the backend consumes. Every one of
  these is editable, and editing any of them is consequential by construction because
  calculation always re-reads them.

### 3.2 Decision per correction surface

| Surface | Decision | Class |
|---|---|---|
| Meal name | Keep; labeled descriptive-only | descriptive |
| Meal-level subtype chips (Biryani → Keema…) | **Remove, with no replacement chips of any kind in Campaign B.** A name-only meal chip can never be consequential; the disclosure line was a Campaign A stopgap. Corrections happen through explicit component editing only. | removed |
| Dish identity as model input | The component whose name is the dish (e.g. an item named "chicken biryani") *is* the identity input; correcting it is a component rename. | structured |
| Component name | Keep; consequential; triggers invalidation (§3.3) | structured |
| Portion (amount/unit) | Keep; consequential (already real) | structured |
| Hidden ingredients / preparation fat | "Add something we missed" (explicit component add + edit) is the only mechanism — no quick-add or prefill chips in Campaign B. Preparation that changes the food is expressed in the component name ("fried rice", "roasted potatoes") — guidance copy says so. No preparation coefficient exists or is invented. | structured |
| Nutrition values (per-unit kcal/carbs/fat/sat-fat), GI | Keep in item editor; consequential | structured |
| Explicit FII (advanced) | Keep behind Advanced details with existing disclaimers; the only path to `user_confirmed` FII | structured |
| Meal photo | Recognition input. The image bytes are never a scoring input and never travel with calculate or save; what the AI reads from the photo becomes reviewable structured draft facts (rows above). Backend image retention is unchanged: in-memory extraction only. | recognition input |
| Free-text photo note ("anything the photo can't show") | Pre-recognition input only; after recognition it is not a modelling field. If shown on the confirm screen, it is labeled: *"This note guided recognition. It doesn't change the estimate — the items below do."* | descriptive |
| AI recognition uncertainty | Presented as provenance ("Suggested from your photo") per item, never merged with scientific quality | descriptive |

### 3.3 Invalidation on identity change

When a component's **name** changes (typed in the item editor — the only rename
mechanism in Campaign B):

- Any explicit FII, resolved source, and source explanation carried on that item are
  **cleared** (they described the old identity).
- Carried nutrition proposals (AI-proposed or reused-meal values) are **kept visible but
  marked stale**: *"These values were for '<old name>'. Check they still fit."*
- The item enters a **needs-review** state. Calculation is blocked until the user either
  edits the values or explicitly confirms them ("These still fit"). Silent keeping and
  silent zeroing are both forbidden — zeroing manufactures the exact zero-energy state
  behind issue #97.
- Any previously calculated (unsaved) estimate for the meal becomes stale (§4.4).

### 3.4 Provenance, not trust promotion

Each draft item carries a provenance state: **ai_proposed** → **user_reviewed** (user
edited or confirmed it) or **user_entered** (manual / reuse). Provenance is displayed as
plain language, never as a percentage, and is never sent to the backend as trust.
Nothing is trusted merely because it was read from a photo — image-derived proposals
carry the same ai_proposed status as any other AI output:

- AI-proposed FII is already discarded at the trust boundary and stays discarded.
  Reviewing or confirming an AI item **never** turns AI-proposed values into
  `user_confirmed` FII; only an explicit FII value the user types in Advanced details
  does (existing rule, unchanged).
- The backend keeps deriving `fii_source` itself from what is actually submitted.

### 3.5 Reuse versus editing a recognised draft

- **Previous-meal reuse** (existing `buildDraftFromSavedMeal`): starts from *your own
  saved facts*; FII/source/explanation are stripped and re-derived at calculation.
  Provenance: user_entered. Copy: "Copied from your saved meal — adjust anything that's
  different today."
- **AI-recognised draft:** starts from *a proposal about a photo*. Provenance:
  ai_proposed until reviewed. Copy frames review as the point of the screen.
- Saved meals themselves remain read-only (Campaign A rule); correction of a saved meal
  is done by reusing it into a new draft. There is no edit-in-place of History.

## 4. Calculate / save semantics (B2)

### 4.1 The split

The confirm screen's primary action becomes **Calculate estimate**. It produces a full
canonical result (same numbers, drivers, quality copy, and disclaimers as today's saved
result) **without persisting anything**, rendered on the approved dedicated route
**`/meals/estimate`** — never under `/meals/saved/`. The result screen in this state
offers:

- **Save to History** — the meal becomes a saved meal exactly as today (History, Recents,
  chronic trend).
- **Discard** — nothing was ever stored; confirm dialog, then back to Log Meal.
- **Adjust meal** — back to the confirm screen with the draft intact.

Chosen architecture (see architecture doc §3): a **stateless backend preview endpoint**
sharing the exact scoring code with save. No temporary server drafts, no client-side
scoring, no save-then-delete.

### 4.2 Honesty rules

- An unsaved result is visually and textually distinct: status pill **"Estimate only —
  not saved"** replaces "Saved to history". No "Logged at" line — an unsaved estimate has
  no logged time.
- Unsaved results never appear in Home Recents, History, or trends, and vanish on
  discard without residue.
- The displayed numbers are the backend's canonical output — never a client
  approximation. Saving recomputes server-side and the saved values must equal the
  previewed values for identical inputs (tested; see architecture doc §9).

### 4.3 Editing after calculating

Any change to a structured input (§3.2) after a calculation marks the result **stale**:
*"You changed the meal after this estimate. Recalculate to update it."* Save is disabled
while stale. Save always submits exactly the inputs that produced the shown estimate.

### 4.4 Failure and retry

- **Calculation failure:** curated error ("We couldn't estimate this meal right now"),
  draft fully intact, Try again + Enter manually paths. No partial result shown.
- **Save failure:** the calculated result stays on screen with the error and a Retry
  action; retrying cannot create duplicates (idempotent save, architecture doc §7).
- **Duplicate submission:** double-tap or network retry of Save results in exactly one
  saved meal.

## 5. Complete state journey

```
Log Meal chooser
  ├─ Photo → Smart Camera → AI-recognised draft (items: ai_proposed)
  ├─ Manual → manual draft (items: user_entered)
  └─ Previous meal → reuse draft (items: user_entered, "copied from saved meal")
        ↓ (all three)
Confirm screen  "Did we get your meal right?"
  states: clean draft | dirty draft | item needs-review (post-rename) |
          validation error (empty/unnamed/zero-portion)
  actions: edit meal name (descriptive) · edit/add/remove items (structured) ·
           Calculate estimate · Discard draft
        ↓ Calculate estimate
Calculating (blocking, "Estimating insulin demand…", cancellable back to confirm)
  ├─ failure → curated error on confirm screen (draft intact, retry)
  ├─ insufficient data (per approved #97 semantics) → dedicated outcome, not a
  │    trustworthy-looking score (exact behaviour set by the #97 decision)
  └─ success ↓
Unsaved result — route /meals/estimate — "Estimate only — not saved"
  full canonical presentation (conclusion → score → drivers → quality → limitations)
  actions: Save to History · Adjust meal (back, draft intact) · Discard (confirm dialog)
  edits upstream ⇒ stale-estimate state (Save disabled, Recalculate offered)
        ↓ Save to History
Saving → failure: result retained + Retry (idempotent) | success ↓
Saved result (existing screen/state, "Saved to history", Logged-at appears)
  actions: Check another meal · Done · Delete saved meal
```

**Back navigation & restoration:** hardware/gesture back from the unsaved result returns
to the confirm screen with the draft intact (estimate retained unless inputs change).
Leaving the flow with a dirty draft keeps the existing "Discard this draft?" guard;
leaving with a calculated-but-unsaved result asks: *"This estimate isn't saved. Save it
to History, or discard it?"* Backgrounding and resuming the app restores the same state
(verified natively in Campaign A for drafts; extended to the unsaved-result state).

## 6. Copy intent (wording refinable; meaning fixed)

- Meal-name helper: "The name is a label. The items below are what the estimate uses."
- Needs-review flag: "These values were for '<old name>'. Check they still fit." /
  confirm action: "These still fit".
- Primary action: "Calculate estimate". Unsaved pill: "Estimate only — not saved".
- Stale banner: "You changed the meal after this estimate. Recalculate to update it."
- Discard confirm: "Discard this estimate? Nothing has been saved."
- Save failure: "The estimate is still here. We couldn't save it — try again."
- Reuse origin line: "Copied from your saved meal — adjust anything that's different today."
- Tone rules from `insight-ux-v1.md` §13–14 apply unchanged (no dosing, danger, or
  calibrated-sounding language; recognition vs scientific uncertainty never merged).

## 7. Accessibility and mobile principles

- All new actions (Calculate estimate, Save to History, Discard, Recalculate, "These
  still fit") are full-width labeled buttons with matching accessible names; no
  icon-only affordances.
- Needs-review and stale states are announced via `role="status"`/`aria-live="polite"`,
  are not color-only (icon + text), and are focus-reachable.
- The unsaved-result screen must be distinguishable from the saved screen by text, not
  only styling, for screen-reader users (the status pill text differs).
- Keyboard/IME behaviour, dirty-draft guards, and background/resume state survival must
  hold on native Android (Campaign A QA journeys re-run for the new states).

## 8. Relation to issue #97 (estimate completeness)

Three distinct concepts, never merged:

1. **Source/evidence match quality** — how the FII value for an item was obtained
   (exact/mapped/user-confirmed/fallback/unknown). This is what today's
   `estimate_quality` actually measures.
2. **Input completeness** — whether the inputs the scaling needs (eaten energy; macros
   for fallback paths) were present at all. Today it is unmeasured; its absence is why a
   zero-kcal meal can display "Data quality: High" over a score of 0.
3. **Confidence in the calculated estimate** — the per-item confidence numbers; unchanged
   by this campaign.

Campaign B's position: **resolving #97 is a prerequisite for Slice B2-2** (the
user-facing journey) — B1 and the backend foundation slice B2-1 do not depend on it —
and it is not part of this specification. The unsaved-result screen is exactly the moment the user decides trust;
shipping it while a zero-input meal renders a high-quality label would amplify the
defect. The choice among #97's four options (reject / insufficient-data result / degrade
quality / split the concepts) is a protected estimate-quality-semantics decision needing
scientific + product approval, its own fixtures, and independent review (decision brief:
architecture doc §13). This spec only requires that whatever outcome is approved has a rendered
state in the B2 journey ("insufficient data" in §5) and that no copy in Campaign B
implies input completeness where only source quality is known.

## 9. Explicit non-goals

- No scoring-formula, coefficient, threshold, FII-dataset, or fallback-rule changes.
- No implementation or redefinition of estimate-quality semantics in this campaign
  (that is the separately approved #97 fix).
- No editing of saved meals in place; no server-side drafts; no client-side scoring.
- No quick-rename or quick-add chip affordances — explicit component editing is the
  only correction mechanism in Campaign B.
- No personalised physiology, no clinical interpretation, no calibration claims.
- No new AI extraction behaviour, prompts, or providers; no AI-proposed FII promotion.
- No image upload in calculation or save (images remain client-only, existing policy).
- No package-identity, signing, or store work (issue #96, separate track).
- No multi-user, auth, or sync semantics (single-user private beta unchanged).

---

## 10. Approval

- **Status:** Sealed implementation contract, v1.0, 2026-07-18.
- **Approved decisions:** campaign structure B1 / B2-1 (independent) → issue #97
  prerequisite → B2-2 → B2-3; meal-level subtype chips removed with **no** replacement
  chips; consequential correction via explicit component editing with the §3.3
  invalidation rules; calculate-before-save via the stateless `POST /meals/preview`
  endpoint; unsaved-result route `/meals/estimate`; image semantics per §3.1–§3.2
  (image bytes are recognition input, never scoring input; backend image retention
  unchanged); no new request/item limits introduced by this campaign.
- **Remaining hard gates:** (1) approved and implemented issue #97 outcome before
  B2-2; (2) persistence high-risk process (plan mode + independent review) for the
  idempotency migration inside B2-1; (3) explicit user consent before any
  native-device QA input in B2-3.
- **Prohibited interpretations:** nothing in this document authorizes changes to
  scoring formulas, coefficients, datasets, confidence values, estimate-quality
  semantics, image retention, or scientific copy; silence or ambiguity here is a stop
  condition for the implementer, never an implementation choice.
- **Version/date:** v1.0 — 2026-07-18.
