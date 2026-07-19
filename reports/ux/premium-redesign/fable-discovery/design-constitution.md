# INSIGHT Design Constitution — Annotated Journal v2.0

**Mission:** issue #101, Part 5. **Author:** Claude Fable 5.
**Date:** 2026-07-18 (v1.1 same day; v1.2 amendment 2026-07-19;
v2.0 palette amendment 2026-07-19).
**Status:** **approved as the
authoritative design direction by human disposition on PR #102
(2026-07-18)**, with the deferrals recorded below; **visual palette
superseded by the human-ratified Porcelain Journal system on 2026-07-19**
(decision record:
`../fable-discovery-2-palette/palette-reassessment.md`). Frozen design law
for implementation slices J1–J6 and J9.
Reference prototype: `prototypes/final-annotated-journal.html` (interactive,
state-addressable); reference screenshots: `screenshots/final-annotated-journal/`.

Scope note: this constitution governs **presentation and interaction staging
only**. It changes no scientific formula, no estimate-quality semantics, no
privacy behaviour, no API, and no sealed Campaign A/B journey law. The
product-semantics additions it anticipated (tick-scale, verdict-sentence
bands, cold-start rule) are **[DEFERRED — J7]** by the human disposition:
they are not approved, not scheduled, and **no part of them may be
implemented implicitly inside any other slice**. Photo-persistence changes
are likewise deferred: existing photo behaviour plus the §5 typographic
plate is the implementation boundary. §6.7-interim below defines the
authoritative result hierarchy while the deferral stands.

Changes v1.0 → v1.1 (disposition record only; no design change):
status line; `[NEEDS SIGN-OFF]` markers replaced with `[DEFERRED — J7]`;
new §6.7-interim; §13 rewritten to reflect the disposition.

Changes v1.1 → v1.2 (J1 visual-review corrections R1–R2 of 2026-07-19;
accessibility correction, **not** a new visual direction):

- **R1:** light `--ink-3` corrected `#7d7364` → `#756b5c`. The old value
  measured 4.32:1 on `--paper`, below the AA floor the token row itself
  declares. Dark `--ink-3` is unchanged. Verified ratios recorded in §2.1.
  The reference prototype and the 42 reference screenshots predate v1.2 and
  still carry the old light value; **for this one token the constitution
  value governs over the prototype** (see §12 note).
- **R2:** the J1 allowed-file boundary is extended to
  `frontend/src/stores/settingsStore.ts` for the tri-state appearance
  contract (§2.2-a below). The scope grant itself is recorded in
  `sol-implementation-slices.md` (Slice J1 amendment), which owns slice
  scope. J1 still stops before J2.

Changes v1.2 → v2.0 (Porcelain Journal palette; human-ratified
2026-07-19 after review of the implemented J1 screenshots; **a palette
correction, not a new direction** — comparison evidence in
`../fable-discovery-2-palette/`):

- **§1** gains the warmth law: warmth lives in typography, photography,
  and voice — never in surface hue.
- **§2.1 / §2.2** colour tables replaced with the Porcelain Journal
  values (porcelain paper / warm-black ink / printer's-blue accent;
  neutral-charcoal / softened-blue dark). All pairs AA-verified
  2026-07-19 (`../fable-discovery-2-palette/contrast-verification.js`).
- **§2.5** light shadow tints neutralised (warm brown casts retired).
- The v1.2 caption-on-tint restriction is **retired**: the v2.0
  `--ink-3` passes 4.5:1 on `--tint` in both appearances.
- **§12** reference-capture override extended: §2 token values govern
  over all pre-v2.0 (warm) prototypes and captures until re-rendered.
- Unchanged: every other section — typography roles and scale, spacing,
  radii, materials, iconography, photography/plates, screen hierarchy
  (§6 incl. §6.7-interim), states, motion, accessibility floor, copy
  hierarchy, prohibited patterns, all J7/J8 deferrals, and the sealed
  Campaign A/B boundaries.

---

## 1. Product metaphor and emotional target

INSIGHT is an **annotated meal journal**: the meal is the page; INSIGHT
writes calm, honest margin notes — **in blue ink on white paper**, the way
an annotated document actually looks: porcelain paper (light), charcoal
ink (dark), one printer's-blue accent. Emotional target, in order: **calm →
understood → quietly confident**. Never: judged, alarmed, gamified, sold to.

**Warmth law (v2.0):** warmth comes from typography, photography, and
voice — never from brown or cream surface hue. Surfaces stay porcelain /
charcoal so that trust reads instantly and food photography supplies its
own warmth.

## 2. Design tokens

Implementation note: tokens are CSS custom properties; Ionic variables map
onto them. Values are normative; ±5 % is implementer latitude except where
marked exact. All text/background pairs listed meet WCAG AA (4.5:1; large
text 3:1) — verify at build time with automated contrast checks.

### 2.1 Colour — light ("paper", porcelain — v2.0)

| Token | Value | Role |
|---|---|---|
| `--paper` | `#fafaf8` | app background (porcelain near-white) |
| `--raised` | `#ffffff` | cards/sheets |
| `--tint` | `#f0f2f2` | subtle fills (bars, typographic plates) |
| `--ink` | `#1d1d1a` | primary text (16.2:1 on paper) |
| `--ink-2` | `#54544c` | secondary text (7.3:1) |
| `--ink-3` | `#6b6b62` | captions/labels — minimum 4.5:1; never below (v2.0 verified: 5.15:1 on `--paper`, 5.38:1 on `--raised`, 4.79:1 on `--tint`) |
| `--line` | `#e3e4de` | hairlines, borders |
| `--accent` | `#28577e` | the one interactive accent (buttons, needle, links) — printer's blue (7.29:1 on paper) |
| `--accent-ink` | `#f7fbff` | text on accent (7.33:1 on accent) |
| `--danger` | `#a63c31` | destructive actions ONLY (delete); never scores (6.07:1 on paper) |

v2.0 note: the v1.2 caption-on-tint restriction is **retired** — `--ink-3`
now passes 4.5:1 directly on `--tint` in both appearances, so captions may
sit on tint fills. The general AA law (all pairs ≥ 4.5:1 text / 3:1 large
text, verified at build time) stands unchanged.

### 2.2 Colour — dark ("ink", neutral charcoal — v2.0)

Neither navy nor brown: a neutral charcoal reading surface with a softened
blue accent. Verified 2026-07-19: `--ink` 15.0:1, `--ink-2` 8.6:1,
`--ink-3` 5.63:1 on `--paper` (5.13:1 on `--raised`, 4.83:1 on `--tint`);
`--accent` 8.22:1 on `--paper`; `--accent-ink` 7.19:1 on `--accent`;
`--danger` 6.95:1 on `--paper`.

| Token | Value |
|---|---|
| `--paper` | `#141619` |
| `--raised` | `#1c1f23` |
| `--tint` | `#212429` |
| `--ink` | `#ebeae4` |
| `--ink-2` | `#b4b3a9` |
| `--ink-3` | `#8f9089` |
| `--line` | `#2e3136` |
| `--accent` | `#82b4dd` |
| `--accent-ink` | `#0c2438` |
| `--danger` | `#dc8b81` |

### 2.2-a Appearance selection contract (v1.2, per J1 review R2)

- The appearance preference is **tri-state**: `darkMode: boolean | null` in
  the existing settings store, **default `null` = follow the operating-system
  preference** (`prefers-color-scheme`); `true` = explicit dark override;
  `false` = explicit light override. The override persists.
- **Compatibility is mandatory:** previously persisted boolean values must
  continue to load unchanged and keep their meaning as explicit overrides.
  No migration may reinterpret or discard them; only a store where the
  preference was never set reads as `null`.
- The obsolete `ion-palette-dark` classList side effect in `toggleDarkMode`
  is removed; the constitution's root-class mechanism is the only appearance
  switch. No other settings-store behaviour may change.

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
- Shadow scale (exact, v2.0 — neutral tint, warm casts retired): raised =
  `0 1px 2px rgba(28,30,34,.05), 0 6px 22px rgba(28,30,34,.08)`; overlay =
  `0 18px 48px rgba(28,30,34,.26)`. Dark-mode shadows are black-based and
  unchanged: raised = `0 1px 2px rgba(0,0,0,.45), 0 8px 28px rgba(0,0,0,.5)`;
  overlay = `0 18px 48px rgba(0,0,0,.5)`.
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
   sentence **[DEFERRED — J7]** → quality sentence → tick-scale
   **[DEFERRED — J7]** → reference footline (sealed meaning: internal
   reference 100, uncalibrated, compare meals with each other) → "What
   drove it" evidence rows (serif item, share %, provenance why-line,
   hairline bar) → footnotes disclosure "What this doesn't mean" (sealed
   disclaimers verbatim) → dock: **Save to History** / Adjust meal /
   Discard. **Stale:** banner (sealed meaning) + Save disabled.

   **§6.7-interim — result hierarchy while J7 is deferred (normative for
   J5, and for J8 whenever it unblocks, until J7 is approved):** the
   verdict-weight slot is filled by the **existing
   `insulinImpactPresentation` title**, styled as the verdict line
   ("Relative insulin-demand score" for scored meals; "*Hard to estimate*
   from this meal." for insufficient-data — the latter is existing sealed
   helper output and is **not** part of the J7 deferral). Its description
   text and the quality sentence follow; then the reference footline
   (existing `acuteScoreDisplay` meanings, score number in mid-size
   tabular numerals — never hero-size); then evidence rows and footnotes
   as above. **No tick-scale, no dots/needle, no "more / about as much /
   less than most meals you log" phrasing, no percentile, position, or
   ranking language of any kind may appear anywhere in the app until J7
   is separately approved and implemented.** Reference-screenshot
   comparisons for J5 exclude the two deferred modules; everything else
   in the reference states is binding.
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

v2.0 note (supersedes the v1.2 single-token note): the reference prototype
and all 42 captures predate the Porcelain Journal palette and render the
superseded warm values throughout (including the pre-R1 light `--ink-3`).
**For every colour token and shadow tint, the §2 values govern over the
prototypes and captures** until the reference set is re-rendered under
v2.0 tokens (scheduled before J3 begins). Structure, hierarchy, spacing,
states, and copy in the reference states remain fully binding. The
palette-true captures for the J1 screens are
`../fable-discovery-2-palette/screenshots/` (treatment `c-*`), with the
comparison method in `../fable-discovery-2-palette/palette-reassessment.md`.

## 13. Latitude vs Fable approval

**Implementer latitude (Sol):** exact pixel spacing within ±4 px; wrapping
behaviour of long strings; Ionic component substitutions that preserve
look/roles; platform-conventional back/edge gestures; ordering of CSS;
splitting tokens into files.

**Requires Fable approval before deviation:** anything in §11; token values
beyond ±5 %; typography roles; screen hierarchy order (§6, including
§6.7-interim); score/scale presentation; any new copy that touches
scientific meaning; motion beyond §8; adding imagery sources; dark-mode
value changes.

**Human disposition of 2026-07-18 (PR #102) — binding:**

- **Authorized:** slices J1–J6 and J9 under this constitution.
- **Deferred — J7 (do not build, in whole or in part, inside any slice):**
  comparative tick-scale, cold-start rule, and verdict bands
  ("more / about as much / less than most meals you log"). §6.7-interim
  governs the result screens meanwhile.
- **Deferred — photo persistence:** existing photo behaviour + the §5
  typographic-plate fallback is the boundary; no new photo store.
- **Preserved:** seven-day trend semantics in full; presentation may change
  only as allowed by slice J2 (sentence rendering of existing values,
  gating, copy meanings, and ARIA distinctions unchanged).
- **Separate:** the B1 placeholder-rename gap remains a sealed-law product
  follow-up outside this redesign.
- **Blocked:** J8 until the approved Campaign B2 architecture exists.
