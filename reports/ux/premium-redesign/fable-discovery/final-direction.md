# Final Direction — "Annotated Journal"

**Mission:** issue #101, Part 4 decision. **Decider:** Claude Fable 5
(product-design authority for this mission; decision not delegated).
**Date:** 2026-07-18.
**Prototype:** `prototypes/final-annotated-journal.html` ·
**Screenshots:** `screenshots/final-annotated-journal/`.

---

## 1. The direction in one paragraph

INSIGHT becomes an **annotated meal journal**: the meal — its photograph when
one exists, its typographic identity when not — is always the page, and
INSIGHT writes calm, honest margin notes about it. The estimate is presented
the only way an uncalibrated relative score can be presented truthfully:
as a position **among your own logged meals** on a quiet tick-scale, followed
by *what drove it* (share-of-load evidence rows with plain provenance) and
*how much to trust it* (one plain quality sentence, full disclaimers as
designed footnotes one tap away). The voice is sentence-first — the app
speaks in short humane statements, never in database field names. Primary
actions live in a bottom thumb dock. Two first-class appearances: warm paper
(light) and warm ink (dark).

## 2. Decisive reasons

1. **It stages the product's real strengths.** Runtime observation proved the
   absolute score is illegible (every real meal 666–1023 against "reference
   100"; the ring always saturated). The journal frame makes
   *self-comparison* — the only claim the science currently supports — the
   native mental model, and the tick-scale (from Concept B) renders it
   without thresholds, colours, or false calibration.
2. **It buys warmth without buying dishonesty.** Photography and serif voice
   give the emotional quality every current screen lacks, while the sentence
   verdict + one quality line + footnoted disclaimers implement structural
   honesty (van der Bles: plain uncertainty does not erode source trust;
   stacked verbal hedging does inflate perceived uncertainty).
3. **It survives the real meal.** Bottom dock, two taps to shutter, dark
   appearance for restaurants, interruption-safe states designed (draft,
   unsaved estimate, stale estimate) — matching Hoober reach data and the
   sealed B2 state law.
4. **It respects every sealed boundary by construction.** The layout gives
   the sealed copy *places* (verdict, quality line, footnotes, provenance
   labels) instead of deleting or rewriting their meanings; recognition
   provenance ("Suggested from your photo") and scientific quality ("Data
   quality: Low…") live in visibly different systems.
5. **It is ownable.** Warm paper + serif annotations + tick-scale + plate
   photography is not Apple's glass, not Material, not any competitor's
   look; it can become INSIGHT's own design language.

## 3. What was borrowed from rejected concepts

| From | Element now canonical in the final direction |
|---|---|
| B — Instrument | The comparative tick-scale (dots = your meals, needle = this estimate, min/max labelled, no colour semantics, uncapped) |
| C — Conversation | Sentence-first verdicts; the review question voice ("…were for the old name. Do they still fit?"); the honest low-data tone |
| D — Ledger | Share-of-load evidence rows with per-item provenance; disclaimers as designed footnotes; tabular numerals for all data |

## 4. What stays deliberately ordinary

Three-tab labeled bar; plain Settings; plain chooser; ordinary toasts;
system keyboards and pickers; standard back behaviour. No parallax, no
glass, no gamification, no mascot, no animation flourishes.

## 5. Screen-level shape (full law in `design-constitution.md`)

- **Home** = today's journal page: date folio in serif, one-line trend
  sentence (index number small and inline, never a ring), photo-led entries,
  bottom dock with **Check a meal**.
- **Log Meal** = three plain choices.
- **Smart Camera** = full-bleed viewfinder, bottom shutter, optional note
  pill, privacy disclosure collapsed but present, one labeled **Analyze
  meal** action; failure state offers **Try again** / **Enter manually
  instead**.
- **Confirm** = photo hero + sheet asking "Did we get your meal right?";
  meal name with the sealed label-helper; component cards (name, provenance,
  portion steppers); "Add something we missed — oil, ghee, sides…";
  Advanced details collapsed; needs-review card in the C voice;
  **Calculate estimate** in the dock.
- **Estimate (unsaved)** = photo hero + status pill "Estimate only — not
  saved" + name + verdict sentence + quality line + tick-scale + reference
  footline + evidence rows + footnotes; dock: **Save to History** /
  Adjust / Discard. Stale state disables Save with the sealed stale banner.
- **Result (saved)** = same layout with "Saved to history" pill, logged
  time, **Check another meal** primary, Done/Delete secondary.
- **Insufficient-data** = same chassis; verdict becomes "*Hard to estimate*
  from this meal."; nominal reading de-emphasised inside a "What we could
  read" note; no tick-scale prominence (a rough number must not get a
  precise-looking position).
- **History** = the journal itself: day-broken photo entries, read-only.

## 6. Open product / architecture questions — disposition recorded

> **Human disposition, 2026-07-18 (PR #102):** Annotated Journal approved as
> the authoritative direction; constitution approved; slices J1–J6 and J9
> authorized. Items 1–3 below are **deferred as J7** (no implicit
> implementation anywhere); item 4 **deferred** (existing photo behaviour +
> typographic-plate fallback is the boundary); item 5 **preserved** (trend
> semantics unchanged; presentation only per J2); item 6 **kept separate**;
> J8 stays blocked until the approved Campaign B2 architecture exists.
> Per-item outcomes are annotated inline.

1. **Relative-position presentation.** *(Disposition: deferred — J7.)*
   The tick-scale performs client-side
   arithmetic on canonical scores (min/max/position among the user's saved
   meals). It introduces no thresholds and no new score semantics, but it is
   a *new presentation of score meaning* — under AGENTS.md that needs
   explicit product + scientific sign-off (and a decision on the cold-start
   rule below). **No backend change is required.**
2. **Cold-start rule for the scale.** *(Disposition: deferred — J7.)*
   With < 3 saved meals the strip is
   statistically meaningless. Proposed: show it only from the 3rd saved meal
   (mirroring the trend-gate precedent); before that, the verdict sentence
   carries the screen alone. Needs product approval.
3. **Verdict sentence bands.** *(Disposition: deferred — J7; the
   constitution's §6.7-interim hierarchy applies meanwhile, using the
   existing `insulinImpactPresentation` titles as the verdict line.)*
   "asks more / about as much / less … than most
   meals you log" is a tercile statement over the user's own history —
   again pure client arithmetic, again a semantics addition needing the same
   sign-off. Fallback if refused: verdict states quality + drivers only.
4. **Photo persistence.** *(Disposition: deferred. Existing photo behaviour
   plus the typographic-plate fallback is the implementation boundary.)*
   The journal look leans on photos; today images are
   client-only with a localStorage size cap (audit §17). The direction works
   with typographic plates as the fallback, but a deliberate on-device photo
   store (still never uploaded at calculate/save) would strengthen History.
   That is a privacy-adjacent persistence change → separate approved design.
5. **Trend surface.** *(Disposition: semantics preserved in full;
   presentation may change only as allowed by J2.)*
   This mission inherits the existing 7-day index as a
   one-line sentence. Whether the index itself survives (audit §10 shows it
   rewards sparse logging) is a scientific/product question explicitly out
   of scope here.
6. **The B1 placeholder-rename gap** *(Disposition: kept separate from this
   redesign.)* (renaming fresh "New Item" fires
   needs-review about zeros) remains a sealed-law follow-up; the new voice
   softens it but does not fix the rule.

## 7. Decision log

- **D1 (research phase):** Rejected leading with any absolute-score
  visualisation after live seeding showed 666–1023 readings against
  reference 100 — no styling can save a saturated gauge. → tick-scale +
  sentence verdict.
- **D2 (divergence):** Built journal / instrument / conversation / ledger as
  the four maximally-separated directions the research supported; no prior
  assistant suggestion ("Quiet Intelligence", glass cards, specific palettes)
  was used as a seed.
- **D3 (convergence):** Chose A as chassis over B despite B's stronger score
  module — warmth beats authority for this consumer promise; grafted B's
  module instead.
- **D4:** Rejected C as paradigm (localisation/scaling) while canonising its
  voice; this was the closest call and is revisitable if the app ever
  becomes single-locale.
- **D5:** Kept the journey skeleton (tabs, chooser, confirm, result)
  unchanged — Campaign A/B law is sound; the redesign re-stages it.
- **D6 (self-critique pass):** Verified every sealed copy meaning has a
  home in the final prototype; checked 320×700, dark, large-text (133 %),
  and long-German-string states render without loss (screenshots captured);
  confirmed no traffic-light, threshold, or merged-confidence pattern
  appears anywhere in the four concepts or the final.
- **D7 (2026-07-18, human disposition on PR #102):** Annotated Journal and
  the constitution approved; J1–J6 and J9 authorized; J7 (tick-scale,
  cold-start rule, verdict bands) deferred with an explicit ban on implicit
  implementation inside other slices; photo persistence deferred; trend
  semantics preserved (J2 presentation-only); B1 rename gap kept separate;
  J8 blocked until B2. Consequence codified as constitution §6.7-interim:
  the result screens' verdict-weight line is the existing
  `insulinImpactPresentation` title until J7 is approved — and the
  insufficient-data verdict ("Hard to estimate from this meal") is existing
  sealed helper output, not a J7 element, so it ships with J5. Fable
  consistency check: the disposition contradicts nothing in this document
  or the constitution; the only ambiguity it created (what leads the result
  screen without J7) is resolved by §6.7-interim. Constitution bumped to
  v1.1 (disposition record only, no design change).

## 8. Self-critique (what could still be wrong)

- The serif voice could age into twee if applied beyond its roles; the
  constitution therefore restricts serif to identity + verdict lines only.
- Emoji-composed plates are prototype stand-ins; the real app must use real
  user photos and the typographic plate — never emoji food. Recorded as a
  prohibited pattern.
- The warm palette risks reading "food blog" rather than "trustworthy
  instrument" for the prediabetes-curious segment; the evidence layer
  (tabular numerals, provenance rows) is the counterweight and must not be
  softened during implementation.
- All ergonomic claims about one-handed use are inference from viewport
  geometry + published reach research, not device-verified; first native
  build must re-test on hardware.
