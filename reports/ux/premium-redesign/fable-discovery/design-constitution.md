# INSIGHT Design Constitution — Annotated Journal v1.0

**Mission:** issue #101, Part 5. **Author/approver:** Claude Fable 5.
**Date:** 2026-07-18. **Status:** frozen design law for implementation.
Reference prototype: `prototypes/final-annotated-journal.html` (interactive,
state-addressable); reference screenshots: `screenshots/final-annotated-journal/`.

Scope note: this constitution governs **presentation and interaction staging
only**. It changes no scientific formula, no estimate-quality semantics, no
privacy behaviour, no API, and no sealed Campaign A/B journey law. Where it
depends on a product-semantics addition (tick-scale, verdict sentence), that
dependency is flagged **[NEEDS SIGN-OFF]** per `final-direction.md` §6 and must
not be implemented before approval.

---

## 1. Product metaphor and emotional target

INSIGHT is an **annotated meal journal**: the meal is the page; INSIGHT
writes calm, honest margin notes. Emotional target, in order: **calm →
understood → quietly confident**. Never: judged, alarmed, gamified, sold to.

## 2. Design tokens

Implementation note: tokens are CSS custom properties; Ionic variables map
onto them. Values are normative; ±5 % is implementer latitude except where
marked exact. All text/background pairs listed meet WCAG AA (4.5:1; large
text 3:1) — verify at build time with automated contrast checks.

### 2.1 Colour — light ("paper")

| Token | Value | Role |
|---|---|---|
| `--paper` | `#f9f6f0` | app background |
| `--raised` | `#fffefb` | cards/sheets |
| `--tint` | `#f1ece1` | subtle fills (bars, typographic plates) |
| `--ink` | `#231d15` | primary text (12.9:1 on paper) |
| `--ink-2` | `#5d5446` | secondary text (6.5:1) |
| `--ink-3` | `#7d7364` | captions/labels — minimum 4.5:1; never below |
| `--line` | `#e7dfd2` | hairlines, borders |
| `--accent` | `#7a4f1d` | the one interactive accent (buttons, needle, links) |
| `--accent-ink` | `#fff8ec` | text on accent |
| `--danger` | `#a13a30` | destructive actions ONLY (delete); never scores |

### 2.2 Colour — dark ("ink")

| Token | Value |
|---|---|
| `--paper` | `#181410` |
| `--raised` | `#211c16` |
| `--tint` | `#241f18` |
| `--ink` | `#f0e8db` |
| `--ink-2` | `#bfb29e` |
| `--ink-3` | `#94897a` |
| `--line` | `#342d24` |
| `--accent` | `#e0ac60` |
| `--accent-ink` | `#241708` |
| `--danger` | `#d98a80` |

**Colour law:** exactly one accent. No red/amber/green anywhere near scores,
quality, trend, or provenance. Quality and provenance are typographic, never
chromatic. The retired `--app-faint` (#8a97a5) is banned.

### 2.3 Spacing & layout grid

- Base unit **4 px**; standard steps 4/8/12/16/20/24/32.
- Screen gutter: **18–20 px** at ≥ 360 px width; **14–16 px** below 340 px.
- Single-column layout only; content max-width 560 px centred on wide/desktop.
- Bottom dock safe-area padded (`env(safe-area-inset-bottom)`); the real
  device inset replaces the current hardcoded `paddingTop: 50px` (audit F7).

### 2.4 Radii & shape

- Cards/entries **20 px**; inner cards & panels **14 px**; small notes **9 px**;
  pills & primary buttons **999 px** (full round); sheets **22 px** top only.
- One radius family; no per-screen inventions; no sharp-cornered content
  surfaces except full-bleed photography.

### 2.5 Material, blur, shadow, border

- Three surfaces only: **base** (`--paper`), **raised** (`--raised` + border
  `--line` + shadow), **overlay** (sheet/modal, same as raised + heavier
  shadow + top handle).
- Shadow scale (exact): raised = `0 1px 2px rgba(58,46,28,.06), 0 6px 22px
  rgba(58,46,28,.09)`; overlay = `0 18px 48px rgba(58,46,28,.28)`. Dark mode
  equivalents per prototype.
- **No backdrop blur, no glass, no gradients on surfaces** (photo scrims are
  the single exception: linear black scrims over photos for chrome
  legibility, 40–78 % opacity). Reduced-transparency setting ⇒ scrims become
  solid fills.
- Cards never nest inside cards. Evidence rows use hairlines, not boxes.

## 3. Typography

- **Display/identity ("the journal voice"):** a humanist old-style serif.
  Implementation stack until a licensed font is chosen:
  `"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif`.
  Roles (exhaustive): folio headings, meal names, verdict sentences,
  component names, day-breaks (italic), empty-state headline. **Nowhere else.**
- **Body/controls:** platform sans (`"Segoe UI"`/SF/Roboto per platform).
- **Data:** tabular numerals (`font-variant-numeric: tabular-nums`) for every
  number; scores never letter-spaced or oversized.
- Scale (rem; root 16 px): folio 1.85 / estimate name 1.65 / verdict 1.28 /
  confirm question 1.5 / component name 1.1 / body 1.0 / secondary 0.86 /
  caption 0.78–0.72 (captions never below 0.72rem ≈ 11.5 px).
- Line-height ≥ 1.45 body, ≥ 1.15 display. Sentence case everywhere;
  **uppercase only** for the small tracked kicker labels; never on buttons.
- All sizes in rem; layout must survive 133 % root scaling (verified in
  `*-large-text` screenshots) and platform Dynamic Type equivalents.

## 4. Iconography

- Minimal, stroke-consistent icon set; every actionable icon has a visible
  text label or (chrome-only: back/close) an accessible name + 44 px target.
- No emoji as UI. No filled colourful icon families. The tab bar uses small
  glyphs above labels; the shutter is the only large iconic control.

## 5. Photography & plates

- Meal photos render **full-bleed** in entry cards (7rem), confirm hero
  (10.5rem), estimate hero (11.5rem); crop `cover`, focal centre; corners per
  container. Text never overlays photos except top-chrome buttons on scrims.
- **Photo-less meals get the typographic plate:** `--tint` field, dashed
  ring, serif italic monogram of the meal's initials. Never a broken-image
  glyph, never stock imagery, **never emoji food** (prototype emoji plates
  are stand-ins only).
- Photos remain client-side recognition inputs per sealed law; nothing in
  this constitution changes retention or transmission.

## 6. Screen-by-screen hierarchy (normative order)

Reference states in the final prototype are the authority when prose is
ambiguous. All sealed copy meanings render verbatim from existing helpers.

1. **Home (mature):** masthead → serif folio (day/part-of-day) → one-line
   trend sentence with inline small index + one-line gloss (no ring, no
   card) → day-broken photo entries (name, time · estimate · quality word,
   optional note line) → dock (**Check a meal** + tabs).
2. **Home (empty):** typographic plate → promise headline (sealed copy) →
   two-line what-happens + one-line boundary note → dock.
3. **Home (building):** folio → sealed coverage line ("…3 different days —
   N of 3 so far") → entries → dock.
4. **Log Meal:** folio question → three plain choices (sealed titles +
   one-liners) → dock tabs.
5. **Smart Camera:** viewfinder → top: framing hint + Cancel → bottom stack:
   collapsed privacy disclosure (sealed copy inside) → optional note field
   (sealed label) → library / shutter / add-angle → **Analyze meal**
   (disabled until an image exists). Loading replaces button text
   ("Reading your meal photo…"). Failure: curated card with **Try again** /
   **Enter manually instead**; raw errors never shown.
6. **Confirm:** photo hero + back → sheet: kicker "Draft — not saved" →
   "Did we get your meal right?" → meal-name field + sealed name-helper →
   (needs-review card when applicable, C voice, actions **Edit values** /
   **These still fit**) → component cards (serif name, provenance line,
   stepper portion row, collapsed Advanced details containing
   nutrition/GI/FII/source with their disclaimers) → "Add something we
   missed — oil, ghee, sides…" → whole-meal totals line → dock:
   **Calculate estimate** primary, Discard draft text-button.
7. **Estimate (unsaved):** photo hero + Adjust/Close → sheet: pill
   "Estimate only — not saved" → serif meal name → meta line → verdict
   sentence **[NEEDS SIGN-OFF]** → quality sentence → tick-scale
   **[NEEDS SIGN-OFF]** → reference footline (sealed meaning: internal
   reference 100, uncalibrated, compare meals with each other) → "What
   drove it" evidence rows (serif item, share %, provenance why-line,
   hairline bar) → footnotes disclosure "What this doesn't mean" (sealed
   disclaimers verbatim) → dock: **Save to History** / Adjust meal /
   Discard. **Stale:** banner (sealed meaning) + Save disabled.
8. **Result (saved):** identical chassis; pill "Saved to history"; logged
   time in meta; dock: **Check another meal** / Done / Delete
   (confirm dialog; backend-first integrity unchanged).
9. **Insufficient-data result:** verdict "*Hard to estimate* from this
   meal."; quality sentence with the improvement hint; "What we could read"
   note carrying the de-emphasised nominal reading; **no tick-scale**;
   evidence rows with reduced-opacity bars; footnotes include the
   unknown-items notice when applicable.
10. **History:** folio + read-only explainer → day-broken entries → dock.
    Reuse never starts here except via Log Meal chooser (sealed law).

## 7. Component states

Every interactive component defines: default / pressed (scale .985 or
opacity .85) / disabled (45 % opacity + `aria-disabled`) / focus-visible
(2 px accent outline, 2 px offset) / loading (label swap, never spinner-only).
Cards pressed: none (whole-card buttons use ripple-free opacity). Steppers
repeat on long-press. Disclosures (`details`) animate height ≤ 250 ms.

## 8. Motion

- Durations: micro (press, fades) 120–180 ms; screen transitions 250–350 ms;
  nothing exceeds 350 ms.
- Easing: standard `cubic-bezier(0.2, 0, 0, 1)`; no bounces, no springs on
  data.
- Continuity: the meal photo is the shared element camera → confirm →
  estimate → history entry (crossfade+scale acceptable on web; native uses
  shared-element transitions).
- The tick-scale needle may settle once (≤ 300 ms) on first render.
- `prefers-reduced-motion`: every transition and the needle settle replaced
  by instant state changes (already encoded in prototypes). No autoplaying
  motion ever.

## 9. Accessibility floor (blocking, not aspirational)

- Contrast: AA minimum for all text including captions; automated check in CI.
- Touch targets ≥ 44×44 px including inline text buttons (padding, not size).
- Visible labels on all primary actions (sealed rule); icons `aria-hidden`
  beside labels.
- Focus order follows the §6 hierarchy top-to-bottom; sheets trap focus;
  route changes move focus to the screen heading (fixes the observed
  `aria-hidden` retained-focus warnings).
- Status changes (needs-review, stale, save feedback) use `role="status"` /
  `aria-live="polite"`, text + icon, never colour-only.
- Text scales to 133 % without clipping or loss (verified in prototype);
  Dynamic Type / font-scale on native.
- The tick-scale carries a full text `aria-label` (value, range, meaning) —
  the visual is redundant with text, per prototype.
- Screen-reader phrasing for score/trend keeps the sealed distinct
  loading / failed / no-data announcements.

## 10. Copy hierarchy

Voice: short declarative sentences; the app describes, never commands,
praises, or warns. Per screen: **one** verdict-weight statement, **one**
quality sentence, provenance at point of item, full sealed disclaimers in
exactly one footnote disclosure. Sealed strings render verbatim from their
existing helper modules; new connective copy follows this voice and must not
introduce forbidden framings.

## 11. Prohibited patterns (hard law)

Traffic-light or any colour-coded score/quality; rings or gauges that cap
below real values; merged confidence percentages; hero-size raw scores;
"healthy/safe/danger" framing; calibrated-sounding copy; red on anything but
delete; streaks/badges/confetti/praise; glass/backdrop-blur surfaces;
card-in-card nesting; uppercase button text; icon-only primary actions;
emoji as content or food imagery; disclaimers stacked at answer weight or
repeated on one screen; serif outside its §3 roles; spinner-only loading;
raw backend error text; any new threshold, range, or score interpretation.

## 12. Reference states

`screenshots/final-annotated-journal/` — 42 captures: 13 states × 2
viewports (390×844, 320×700) + dark variants (home, confirm, estimate,
estimate-low, camera, history) + large-text probes (confirm, estimate).
The interactive prototype is clickable through the whole journey including
camera→confirm→estimate→save, needs-review resolution, stale estimate, and
camera failure.

## 13. Latitude vs Fable approval

**Implementer latitude (Sol):** exact pixel spacing within ±4 px; wrapping
behaviour of long strings; Ionic component substitutions that preserve
look/roles; platform-conventional back/edge gestures; ordering of CSS;
splitting tokens into files.

**Requires Fable approval before deviation:** anything in §11; token values
beyond ±5 %; typography roles; screen hierarchy order (§6); score/scale
presentation; any new copy that touches scientific meaning; motion beyond
§8; adding imagery sources; dark-mode value changes; the cold-start rule
once signed off.

**Blocked pending human sign-off (do not build):** tick-scale, verdict
sentence bands, photo persistence change, any trend redefinition
(`final-direction.md` §6).
