# INSIGHT Premium Redesign — Research and Diagnosis

**Mission:** issue #101. **Author:** Claude Fable 5 (product-design authority for this mission).
**Date:** 2026-07-18. **Baseline:** `main` @ `c7cc714`.
**Data:** synthetic only. No production code was changed; all artifacts live under
`reports/ux/premium-redesign/fable-discovery/`.

This document covers Part 1 of the mission (diagnosis) and the research base used
for every later decision. Evidence classes are labelled throughout:
**[OBSERVED]** (my own runtime observation this mission), **[REPO]** (repository
document/screenshot/code evidence), **[EMPIRICAL]** (published research),
**[PLATFORM]** (platform guidance), **[COMPETITOR]** (observed market pattern),
**[INFERENCE]** (design inference from evidence), **[JUDGMENT]** (my product
judgment). The full source-by-source ledger is in `evidence-manifest.md`.

---

## 1. How the current app was observed

- Backend (FastAPI) and frontend (Vite dev server) were started locally; five
  synthetic meals were seeded through the canonical `POST /meals` endpoint,
  including a mixed South Asian meal (**keema biryani + raita**, 350 g/80 g) to
  exercise decomposition, hidden ingredients, and estimate quality. [OBSERVED]
- The running app was driven in a real Chromium browser (Cypress + Chrome,
  exact-viewport asserted) at **390×844 and 320×700**, capturing: empty Home,
  building-history Home (2 of 3 days), mature Home (45 meals, 5/7 days,
  trend 62), Log Meal chooser, Smart Camera, fresh manual confirmation, item
  editor (with Advanced details expanded), the Campaign B1 needs-review state,
  previous-meal picker, History, Settings, a normal result (score 767,
  quality high), an insufficient-data result (keema biryani, quality low), and
  a simulated large-text (133 %) result. 31 screenshots are preserved under
  `screenshots/current-app/`. [OBSERVED]
- Keyboard-open confirmation, reduced-motion, screen-reader order, and native
  camera behaviour were **not** re-observed this session; for those I rely on
  the Campaign A/B QA reports and code reading, and I say so where it matters.
  No physical device was used; nothing here claims device verification. [REPO]

### Load-bearing runtime facts

1. **Seeded realistic meals score 666–1023** against the "internal reference
   of 100" (keema biryani 1023, dal-rice 953, oats breakfast 767, egg toast
   690, yogurt-potato 666). The score ring caps at 100, so **every realistic
   meal renders an identical, fully-saturated ring**. The one visual element
   given hero treatment encodes nothing. [OBSERVED — consistent with audit
   §10, which measured demo meals at 39–829.]
2. The keema biryani meal returns `estimate_quality: low` and therefore leads
   its own result screen with "Hard to estimate from this meal" — the honest
   copy works, but the payoff moment for the flagship demo meal is a shrug
   plus five caveat paragraphs. [OBSERVED]
3. The normal result screen renders, in order: a four-line epistemic paragraph,
   the meal name, a status pill, item count, timestamp — before any estimate.
   The estimate section then shows the capped ring beside "Score: 767 · above
   internal reference (100)" and another four-line scale explainer. [OBSERVED]
4. The confirmation screen for a fresh manual meal presents "New Item",
   "Draft item — tap to add food details", zero-filled Amount/Serving-size
   fields, and an item editor titled "Edit: New Item" with seven numeric
   inputs. [OBSERVED]
5. Renaming a fresh "New Item" to "keema biryani" triggers the B1 needs-review
   panel citing zeros: "These values were for 'New Item'. … 0 kcal · 0 g
   carbs · …" with a full-width THESE STILL FIT button. Honest, consequential —
   and bewildering as the first correction a new user makes. [OBSERVED;
   the B1 release review records this as a known product-rule gap.]
6. The Home hero is a machined-metal bezel ring showing the 7-day index (62)
   above a five-line disclaimer; "CHECK A MEAL" sits at the very top of the
   scroll, directly under the header, in Ionic's uppercase default. [OBSERVED]
7. Dark mode does not exist (the stored `darkMode` flag is orphaned; audit
   §15 F8). Restaurant/low-light use gets a white screen. [REPO]
8. `--app-faint` (#8a97a5 on white ≈ 2.98:1) is used for timestamps, captions,
   and tab labels — below WCAG AA. [REPO audit §19; visible in my captures.]

---

## 2. Research that changed decisions

Each entry states what it changed. Sources that merely confirmed existing
repository decisions are listed only in the manifest.

1. **Food-journaling burden and abandonment** — Cordeiro et al., CHI 2015
   ("Barriers and Negative Nudges"): logging effort is the dominant
   abandonment driver; users describe entry as "too much effort…tedious";
   photo capture reduces burden; judgmental feedback is a "negative nudge"
   that drives quitting. [EMPIRICAL]
   → Decision: the redesign treats **seconds-to-done and zero shame** as
   hard budget constraints; correction must be optional-by-default (review
   what's wrong, not re-enter everything); no praise/blame framing anywhere.
2. **Human-AI interaction guidelines** — Amershi et al., CHI 2019 (G1/G2:
   make capabilities and limits clear; G9/G10: efficient correction, scope
   services when uncertain; G11: explain why). [EMPIRICAL]
   → Decision: the AI proposal surface must lead with *what was recognised
   and how sure the system is about the observable parts* (components,
   portions), make each fact individually correctable in place, and keep
   "why" one tap away — not a form that happens to contain AI output.
3. **Communicating uncertainty** — van der Bles et al., PNAS 2020 (n=5,780):
   stating uncertainty numerically/plainly reduces confidence in the number
   (appropriately) but does **not** materially erode trust in the source;
   verbal-only hedging inflates perceived uncertainty most. [EMPIRICAL]
   → Decision: honesty should be **structural** — one clear quantified/plain
   statement per screen ("rough estimate — two of four ingredients were
   guesses"), layered detail on demand — instead of five stacked hedge
   paragraphs of equal visual weight. This preserves every sealed meaning
   while ending the anxiety wall.
4. **Diabetes-technology burden and alarm fatigue** — device-burden and CGM
   alarm-fatigue literature (≈56 % of users report moderate-to-extreme
   device burden; alarm fatigue is a leading cause of discontinuation).
   [EMPIRICAL]
   → Decision: the app must never adopt alert aesthetics: no reds, no
   urgency, no "your score is high!" moments. This *ratifies* the repo's
   existing removal of traffic-light tiers and hardens it into a design
   principle with teeth (forbidden patterns list).
5. **Platform guidance — Apple HIG (incl. the 2025 Liquid Glass material
   system) and Android quality/adaptive guidance.** Hierarchy, deference,
   depth; controls as a floating functional layer; automatic
   reduced-transparency/motion/contrast adaptations; Dynamic Type as a
   first-class constraint. [PLATFORM]
   → Decision: adopt the *discipline* (one material system with automatic
   accessibility fallbacks, content-first deference, continuity of shared
   elements) while explicitly **not** copying the glass look — the mission
   forbids an iOS skin, and glass-on-web-views reads as imitation.
6. **One-handed reach** — Hoober's observational research (~49 % one-handed
   use; ~75 % thumb-driven interaction; bottom-centre is the comfort zone).
   [EMPIRICAL]
   → Decision: primary actions live in the bottom third, always; the
   capture path is reachable without grip change. The current top-of-scroll
   "CHECK A MEAL" placement is an ergonomic error, not just a visual one.
7. **Adjacent product pattern** — Undermyfork (photo-first diabetes food
   diary; Instagram-like timeline; praised for empathy and language-free
   visual modality). [COMPETITOR]
   → Decision: the meal photo is the user's memory anchor and the cheapest
   source of emotional warmth; at least one concept must be photo-first, and
   the final direction must decide deliberately what happens for photo-less
   meals.
8. **Fable/Sol workflow lesson** (Theo's Fable-vs-Sol comparison; the
   video/transcript itself is not in the repository — I reviewed secondary
   coverage and state so in the manifest). Fable's strengths: divergence,
   long-context judgment, course correction; Sol's: powering through bounded
   implementation. [INFERENCE from secondary sources]
   → Decision: this mission produces frozen design law plus bounded visual
   slices with stop conditions for Sol; Sol is never asked to invent design.

---

## 3. What already works — and must be preserved

These are Campaign A/B decisions that survive contact with both research and
runtime observation. The redesign keeps their **semantics** untouched (their
visual expression may change):

- **The journey law itself**: Home → Log Meal chooser → Confirm → dedicated
  result; saving lands on the result, never back on the editor. [REPO]
- **Read-only History; reuse only via the explicit "Log a previous meal
  again" choice** (trust boundary `buildDraftFromSavedMeal`). [REPO]
- **The Campaign B correction law**: meal name is a label; component edits
  are consequential; rename invalidates carried evidence and blocks
  calculation until reviewed; provenance in plain language, never a
  percentage. [REPO]
- **Calculate-before-save (B2)**: estimate as a value, "Estimate only — not
  saved", Save to History as an explicit decision. The redesign designs *for*
  this sealed architecture. [REPO]
- **Honest copy inventory** (`safetyCopy.ts`, `acuteScoreDisplay.ts`,
  `insulinImpactPresentation.ts`): every disclaimer meaning, the separation
  of recognition vs scientific uncertainty, the refusal to show a merged
  confidence number, the neutral no-threshold score presentation. [REPO]
- **Labeled buttons, 44 px targets, live-region announcements** added in
  Campaigns A/B. [REPO]
- **The calm, non-judgmental tone.** The words are already right; the visual
  system around them is not. [JUDGMENT]

---

## 4. Diagnosis — why it feels generic and flat

The problems group into six distinct layers. "Too many cards" is a symptom of
layer 2; the causes run deeper.

### 4.1 Product positioning leaks into every screen (product/scientific communication)

The single most damaging fact is **runtime fact #1**: the app's hero artifact
is an absolute-looking number (767, 1023) on a scale whose reference (100) no
real meal lands near, visualised by a ring that is pinned at full for every
realistic meal. The number reads as precise, alarming, and meaningless at the
same time — so the copy has to spend five paragraphs apologising for it.
This is not a styling defect. The product's *actual* strengths today are:

- **relative comparison** between the user's own meals (higher/lower than
  your usual — pure arithmetic on canonical scores);
- **drivers** — which components carry the load (backend-provided);
- **honest quality** — how the estimate was derived (backend-provided).

The UI leads with its weakest artifact and buries its strongest three.
[OBSERVED + INFERENCE]

### 4.2 No information hierarchy — a report, not an answer (content hierarchy)

Every screen is a vertical stack of identical white cards with section-title
headers ("The estimate", "Main drivers", "Estimate quality and limitations")
— the taxonomy of the data model rendered as UI. The result screen answers
"what fields do we have?" not "what should I take away?". Disclaimers sit at
the same visual weight as the answer. The eye has nowhere to land first.
[OBSERVED]

### 4.3 No visual voice (visual styling)

- Default Ionic blue toolbar, uppercase button text, system font at one
  effective weight, white-card-on-grey — the unmistakable look of an
  untouched component library. [OBSERVED]
- Two rings (Home trend, meal score) share one visual language while meaning
  different things; both saturate or mislead (score capped; trend an
  unexplained index). [OBSERVED]
- The single "premium moment" (machined-metal bezel) decorates the weakest
  number in the app. [OBSERVED]
- No dark appearance at all. [REPO]
- Nothing in the app looks like food. The camera is the only surface with
  imagery, and the photo disappears into a thumbnail afterwards. [OBSERVED]

### 4.4 Effort where delight should be (interaction design)

- The confirmation screen is a data-entry form: zero-filled numeric fields,
  "New Item" placeholders, a seven-input editor modal. Research says entry
  burden kills retention; the screen asks "Did we get your meal right?" but
  behaves like "fill in this database row". [OBSERVED + EMPIRICAL]
- The first correction a manual user makes (naming the item) fires a
  needs-review warning about the zeros they never entered — honest by sealed
  rule, bewildering in sequence. [OBSERVED; known B1 gap]
- The camera screen fronts three instruction bullets and a seven-line privacy
  paragraph before the shutter; the one thing the user wants (point, shoot)
  is below the fold of attention. [OBSERVED]
- Primary actions sit at the top of the scroll; the thumb lives at the
  bottom. [OBSERVED + EMPIRICAL]

### 4.5 Service-design gaps (service design)

- The moment of payoff is undifferentiated: high-quality and low-quality
  results, first meal and fiftieth meal, all render the same report. The
  first-ever result — the one chance to teach what INSIGHT is — is identical
  to every later one. [OBSERVED + INFERENCE]
- History is a utility list, not a record the user could feel ownership of;
  Recents on Home duplicates it with the same rendering. [OBSERVED]
- Settings contains a BMR/TDEE calculator unrelated to the journey (audit
  §15) — product-scope noise. [REPO]

### 4.6 Mechanical accessibility debt (accessibility)

Contrast below AA on real text; `aria-hidden` focus retention warnings on
every route transition; no automated a11y checks; no reduced-motion audit of
the ring animations; no dark mode for photosensitive/low-light contexts.
None of this is a redesign question — it is a floor the redesign must set.
[REPO + OBSERVED]

### 4.7 What is *not* wrong

- The journey shape (three tabs, chooser, confirm, result) matches the mental
  model and tested well through two campaigns. Changing the skeleton for
  novelty would be redesign theatre. [JUDGMENT]
- The copy system is unusually honest for the category and is sealed at the
  meaning level; the redesign restructures *where and how much at once*, not
  *what*. [REPO + JUDGMENT]
- The correction semantics (B1) are right. The task is to make them feel like
  care instead of bureaucracy. [JUDGMENT]

### 4.8 Root cause, stated once

INSIGHT was built **inside-out** — data model → endpoints → screens — and
then honestly annotated. Competent engineering, sincere copy, no design
authorship. "Premium" will not come from glass, gradients, or a palette; it
comes from **an opinionated answer to what the user should feel at each
moment**, executed with one typographic voice, one material system, one
motion grammar, and numbers that earn their size. That is what Parts 2–5
construct. [JUDGMENT]

---

## 5. Constraint checklist carried into design

Non-negotiables restated as design inputs (from AGENTS.md, the sealed
Campaign B contracts, and issue #101): relative, population-level,
uncalibrated estimate; no measurement/prediction/diagnosis/dosing framing;
no thresholds, ranges, safe/unsafe, or calibrated-sounding language; no
merged confidence percentage; recognition vs scientific uncertainty always
distinct; backend numbers displayed unchanged; corrections consequential or
labelled; AI output is a proposal; photo bytes never leave the
recognition path; synthetic data only in all artifacts.
