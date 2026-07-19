# INSIGHT Design Principles

**Mission:** issue #101, Part 2. **Author:** Claude Fable 5. **Date:** 2026-07-18.

Eight durable principles specific to INSIGHT. Each states what it governs and
what it **forbids**. They apply to every concept in Part 3 and bind the final
design constitution. They do not alter any sealed scientific, privacy, or
journey semantics — they govern how those semantics are *staged*.

---

## P1 — The meal is the hero; the app is the caption

*Governs: information hierarchy, use of food photography, emotional tone.*

Every surface that has a meal puts the meal first — its photo when one
exists, its name and identity when not — and renders INSIGHT's analysis as
an annotation *about* the meal, not a report the meal is buried inside.
Photo-less meals get first-class typographic identity, never a broken-image
placeholder.

**Forbids:** burying the meal name below explainer paragraphs; photo as an
optional thumbnail on the result; decorating with generic icons where food
identity could stand; empty-image placeholders for manual meals.

## P2 — One first glance per screen

*Governs: information hierarchy, screen structure, copy hierarchy.*

Each screen answers exactly one question (Campaign A law), and the answer
must be legible in the **first glance** — one dominant element, one
subordinate layer, everything else behind labeled disclosure. If two elements
compete for first, the screen is wrong.

**Forbids:** stacks of equal-weight cards; two ring-gauges on one screen;
section headers that name database fields ("The estimate") instead of
answering the user's question; disclosure labels that don't say what's
inside.

## P3 — Numbers must earn their size

*Governs: score presentation, colour, typography of data.*

A number may be displayed large only if the user can *do* something with it —
compare it, act on it, or trust it. INSIGHT's absolute score is uncalibrated,
so it never leads alone: the leading artifact is **relative** (position among
the user's own logged meals) and **explanatory** (drivers). The raw score
stays visible, mid-size, labeled as an estimate against an uncalibrated
reference. Gauges that saturate are lies by geometry.

**Forbids:** hero-size raw scores; rings/dials capped below real values;
percentage-shaped presentations of non-percentages; implying the reference
line is a target or a norm; any threshold, band colour, or "healthy range".

## P4 — Honesty is structural, not appended

*Governs: uncertainty and evidence, scientific communication, copy hierarchy.*

Uncertainty is expressed first by *what is rendered*: estimate framing in
the title, quality stated in one plain sentence next to the result, per-item
provenance at the point of the item, full disclaimers in **one** consistent,
readable place per screen (not sprinkled), and complete evidence one labeled
tap away. Recognition uncertainty and scientific quality remain visually and
verbally distinct systems.

**Forbids:** more than one full-width disclaimer block per screen at answer
weight; repeating the same hedge in three places; merged confidence
percentages; calibrated-sounding phrasing; hiding sealed disclaimers
entirely (they move, they never vanish).

## P5 — Correction is conversation repair, not data entry

*Governs: human-AI correction, confirmation surfaces, forms.*

The confirm screen reads as "here's what INSIGHT understood" — recognisable
components in human language with visible provenance — and correcting any
observable fact (identity, portion, missing ingredient) is a single direct
manipulation on that fact. Technical fields (FII, GI, densities, sources)
stay behind the existing labeled Advanced disclosure. Needs-review states
speak about *the food*, never about the database row.

**Forbids:** zero-filled numeric forms as the default view; "New Item"
placeholders reaching users' eyes; seven-field modals as the primary edit
path; correction affordances that don't change modelling inputs (unless
explicitly labeled, per sealed law).

## P6 — Calm is a safety feature

*Governs: emotional tone, colour, motion, feedback, empty/error states.*

INSIGHT sits adjacent to a domain saturated with alarm fatigue. The app
never alarms, praises, blames, gamifies, or urges. Colour is reserved:
one accent for interaction, neutral ink for data, **no red/amber/green
meaning on any score**, and destructive-action red only on explicit delete.
Errors state what happened and the next step, in the same calm voice.

**Forbids:** streaks, confetti, badges; red styling of scores or quality;
urgency copy ("act now", exclamation marks); praise or moralising of food
choices; error states that dead-end or leak backend text.

## P7 — Built for a hand holding a fork

*Governs: layout, reach, motion, interruption, real-meal context.*

The journey is used standing, one-handed, around cooling food, in variable
light. Primary actions live in the bottom third of the screen; the capture
path is ≤ 2 taps from cold start with no grip change; every flow survives
interruption (drafts and unsaved estimates persist per sealed B2 law); dark
appearance is first-class for restaurants; motion is short (≤ 350 ms),
purposeful, and fully replaced under reduced-motion.

**Forbids:** primary actions at the top of a scroll; instructional walls
before the shutter; flows that lose state on backgrounding; animation as
decoration; light-only design.

## P8 — One material, one voice, every state designed

*Governs: materials and depth, typography, visual character, empty/loading/
error/insufficient-data/mature states, accessibility.*

One surface system (base → raised → overlay, one radius family, one shadow
scale, both appearances), one typographic voice (a single family pairing
with a real scale, tabular numerals for data), one motion grammar. Every
state — empty, first-use, loading, error, insufficient-data, mature history,
large text — is explicitly designed in that same system. Accessibility is
the floor: AA contrast everywhere, visible labels, 44 px targets, text scale
to 133 % without loss, reduced-motion and reduced-transparency variants
defined at the token level.

**Forbids:** card-on-card nesting; per-screen ad-hoc styles; uppercase
default button text; sub-AA contrast tokens (the current `--app-faint` dies);
spinner-only loading; any state left to component defaults.

---

### How the principles resolve tensions

- **P1 vs P4:** the meal leads, but quality framing ("rough estimate") sits
  in the same first glance when quality is low — honesty outranks glamour.
- **P3 vs sealed copy:** the relative-position presentation is *additional
  client-side arithmetic on canonical scores* (like sorting History). It
  requires explicit product sign-off before implementation — recorded as an
  open question in `final-direction.md` — and until granted, prototypes
  label it "among your logged meals", never percentile/target language.
- **P5 vs B1 law:** invalidation-on-rename is sealed and right; the
  principle governs its *voice* (talk about the food) and its *placement*
  (inline at the item), not its semantics.
