# Visual-Direction Reassessment — Palette of the Annotated Journal

**Mission:** owner feedback on the implemented J1 screenshots (PR #103).
**Author / decider:** Claude Fable 5 (design authority). **Date:** 2026-07-19.
**Mode:** read-only comparison; no production code, PR #103 content, or
existing constitution documents were edited. All artifacts live under
`reports/ux/premium-redesign/fable-discovery-2-palette/`.

**Input constraint (first-class):** the human owner prefers the clean
white-and-blue character of the pre-redesign app; finds the warm brown/cream
J1 palette too close to an artisanal food journal / recipe app / boutique
wellness diary; likes the serif (Garamond-class) typography; wants premium
Apple-level polish; associates white + blue with freshness, trust,
intelligence, and health technology.

---

## 1. Was brown/cream a positioning mistake?

**Partially — yes, and the discovery record predicted it.**
`final-direction.md` §8 (self-critique, 2026-07-18) states: *"The warm
palette risks reading 'food blog' rather than 'trustworthy instrument' for
the prediabetes-curious segment."* The owner's reaction is that risk
materialising on first contact with real screens.

The error is precisely locatable. The discovery work correctly diagnosed
that the old app lacked warmth, hierarchy, and authorship, and correctly
chose the *journal* metaphor. But it located warmth in the **surface
material** (cream paper, brown ink, amber accent) when the chassis already
supplies warmth through photography, serif typography, and the sentence
voice. Two consequences:

- **Category drift.** Brown-on-cream is the material language of cookbooks,
  menus, and artisanal coffee — adjacent to *food as pleasure*. INSIGHT is
  an honest estimator adjacent to *health understanding*. The palette
  positioned the app one category to the left of its product truth.
- **Metaphor mismatch.** An *annotated* document — a proof, a manuscript
  under review — is white paper, near-black text, and margin notes in a
  pen colour. Brown-on-cream is not what annotation looks like; it is what
  *aged print* looks like. The metaphor itself argues for white paper with
  a blue annotation ink.

What was **not** a mistake: the journal chassis, the hierarchy, the serif
identity voice, the bottom dock, the honesty staging, the dark-mode
architecture, the one-accent law, and the J1 token/engineering structure.
This is a palette-layer error inside a sound direction — and because J1
routed every colour through semantic tokens (verified: zero hex values
outside `tokens.css`), it is exactly the kind of error the architecture
was built to absorb.

## 2. What remains valuable from Annotated Journal

Everything except the hue values:

- the journey staging and screen hierarchy (constitution §6);
- serif identity/conclusions + sans body/controls + tabular data numerals (§3);
- the one-interactive-accent colour law, no colour-coded scores (§2 law);
- surfaces/radii/shadow scale/material discipline (§2.3–2.5 structure);
- motion grammar (§8), component states (§7), accessibility floor (§9);
- copy hierarchy and prohibited patterns (§10–11);
- the tri-state appearance architecture and all J1 chrome/typography code;
- photo-first entries, typographic plates, footnoted honesty;
- the deferred-J7 tick-scale design (works identically in any palette).

## 3. The three treatments

Same J1 screen structures (Home with transitional trend card, Log Meal
chooser, History), 390×844, paper and ink appearances, 18 captures under
`screenshots/`, interactive prototype `prototypes/palette-treatments.html`
(query-addressable: `?t=a|b|c&mode=paper|ink&screen=home|chooser|history`).
Typography held constant across treatments so palette is the only variable.

### A — Warm Annotated Journal (constitution v1.2 values, verbatim)

Cream paper `#f9f6f0`, brown ink `#231d15`, saddle accent `#7a4f1d`;
dark: brown-black with amber accent `#e0ac60`.

- Warmth: best of the three. Distinctiveness: highest.
- Brand meaning: artisanal food journal — confirmed miscue for a
  health-adjacent estimator; the amber-on-brown dark reads candlelit bar.
- Health-tech credibility: weakest. Trust must be carried entirely by copy.

### B — Cool white-and-blue premium instrument

Blue-cast paper `#f3f6f9`, blue-black ink `#10202e`, clear blue accent
`#0f639c`, blue-grey tint fills; dark: navy-black `#0e1319` with sky accent.

- Trust/health-tech credibility: strongest instantly; reads clinical-clean.
- Failure modes: the blue-cast surfaces and blue-tinted fills read
  *corporate health portal* — it drifts back toward the generic look the
  redesign exists to escape; serif type sits oddly on a screen-blue surface
  (serif is a paper artifact, blue-grey is a dashboard artifact); the navy
  dark mode casts blue over future meal photography — the canonical
  appetite-suppressing treatment for food imagery. Distinctiveness: lowest.

### C — Hybrid: "Porcelain journal" (chosen)

Porcelain near-white paper `#fafaf8` (a breath of warmth, not cream), pure
white cards, **neutral** tint fills, warm-black book ink `#1d1d1a`, and one
refined desaturated **printer's-blue** accent `#28577e`; dark: neutral
charcoal `#141619` (neither navy nor brown) with softened blue `#82b4dd`.

- Keeps the annotation metaphor *more* honestly than A: white page, black
  text, blue-pen margin notes.
- Blue carries freshness/trust/intelligence (owner's association) at
  editorial saturation, not portal saturation; surfaces stay neutral so
  serif still reads as print and future food photography sits on
  gallery-neutral ground (white plates flatter food; blue casts don't).
- Dark mode is a calm charcoal reading room, not a bar and not a dashboard.
- Contrast headroom is the best of the three (accent 7.3:1 light, 8.2:1
  dark, vs 4.5:1 for the warm accent).

## 4. Evaluation matrix (1–5, 5 best; my judgment after driving all 18 states)

| Criterion | A warm | B cool | C hybrid |
|---|---|---|---|
| Brand meaning fits product truth | 2 | 4 | **5** |
| Trust at first sight | 2 | **5** | **5** |
| Health-tech credibility | 2 | **5** | 4 |
| Warmth / humanity | **5** | 2 | 4 |
| Readability & contrast headroom | 4 | 4 | **5** |
| Food appeal (photo surfaces, J3+) | 4 | 2 | **5** |
| Premium character (vs "themed") | 3 | 3 | **5** |
| Dark-mode character | 3 | 3 | **5** |
| Accessibility margins | 4 | 4 | **5** |
| Distinctiveness / ownability | **5** | 2 | 4 |
| Consistency with journal interaction model | **5** | 3 | **5** |
| Owner's stated taste | 1 | 4 | **5** |

**Decision: Treatment C.** B wins raw credibility but re-generifies the
app and harms the photographic future; A wins warmth but mispositions the
product and contradicts the owner's taste — a first-class constraint.
C is not a compromise split-the-difference: it is the palette the
*annotation metaphor itself* implies.

## 5. Final palette and typography system (normative values, AA-verified)

WCAG ratios computed 2026-07-19 (`contrast` script; all listed pairs pass
AA ≥ 4.5:1 at text size; UI-component pairs ≥ 3:1 by margin).

### Light — "paper" (porcelain)

| Token | Value | Verified |
|---|---|---|
| `--paper` | `#fafaf8` | — |
| `--raised` | `#ffffff` | — |
| `--tint` | `#f0f2f2` | — |
| `--ink` | `#1d1d1a` | 16.17:1 on paper |
| `--ink-2` | `#54544c` | 7.31:1 on paper |
| `--ink-3` | `#6b6b62` | 5.15:1 paper · 5.38:1 raised · 4.79:1 tint |
| `--line` | `#e3e4de` | — |
| `--accent` | `#28577e` | 7.29:1 on paper; `--accent-ink` on accent 7.33:1 |
| `--accent-ink` | `#f7fbff` | — |
| `--danger` | `#a63c31` | 6.07:1 on paper |

Shadow tints become neutral: raised
`0 1px 2px rgba(28,30,34,.05), 0 6px 22px rgba(28,30,34,.08)`; overlay
`0 18px 48px rgba(28,30,34,.26)`.

### Dark — "ink" (charcoal)

| Token | Value | Verified |
|---|---|---|
| `--paper` | `#141619` | — |
| `--raised` | `#1c1f23` | — |
| `--tint` | `#212429` | — |
| `--ink` | `#ebeae4` | 15.04:1 on paper |
| `--ink-2` | `#b4b3a9` | 8.60:1 on paper |
| `--ink-3` | `#8f9089` | 5.63:1 paper · 5.13:1 raised · 4.83:1 tint |
| `--line` | `#2e3136` | — |
| `--accent` | `#82b4dd` | 8.22:1 on paper; `--accent-ink` on accent 7.19:1 |
| `--accent-ink` | `#0c2438` | — |
| `--danger` | `#dc8b81` | 6.95:1 on paper |

Note: the corrected `--ink-3` values pass AA **on `--tint` in both
appearances**, so the v1.2 caption-on-tint restriction (`--ink-2` required
on tint fills) can be retired with the amendment.

### Typography — unchanged

The owner explicitly likes the serif system; it is untouched: identity
serif stack `"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif`
in its §3 roles only; platform sans for body/controls; tabular numerals for
data; the existing scale. (Recommendation, non-blocking: adopt **EB
Garamond** (SIL OFL) as the licensed bundled identity face in a later
slice — it is the closest open Garamond to the owner's stated taste.)

Token names, radii, spacing, motion, and all non-colour tokens are
unchanged. No new tokens are introduced.

## 6. Exact visual reasons for the decision

1. **The metaphor argues for it.** An annotated manuscript is white paper +
   black text + blue pen. C strengthens the design story A told.
2. **Trust is a first-glance property.** For an insulin-demand estimator,
   the surface must not have to be argued out of "recipe app" before the
   honest copy gets read. White/blue buys that instantly; brown spends it.
3. **Food must stay appetising.** J3+ are photo-led. Neutral-white grounds
   flatter photography; cream tints it sepia; blue-cast (B) kills appetite.
4. **Dark mode character.** Charcoal + soft blue reads calm instrument at a
   restaurant table; amber-on-brown reads mood lighting; navy reads ops
   dashboard.
5. **Serif needs paper, not a portal.** The serif voice the owner likes
   reads as *print* on porcelain white; on B's blue-grey it reads pasted-on.
6. **Accessibility headroom.** Every C pair passes AA with more margin than
   the warm equivalents; the accent nearly doubles its contrast.
7. **Ownability preserved.** Serif identity + sentence verdicts + tick-scale
   + porcelain/printer's-blue is still nobody else's look; B alone would
   have surrendered distinctiveness.

## 7. Disposition of PR #103

**Token-only correction; do not merge as-is; do not supersede.**

- Everything structural in J1 (chrome, tabs, typography roles, tri-state
  appearance contract, `--app-faint` removal, lowercase buttons, tests) is
  correct and unaffected.
- Every colour flows through `frontend/src/theme/tokens.css` (verified —
  no hex/rgba literals in `app.css`, `variables.css`, or the touched TSX).
  The correction is a value swap in that one file (colour + shadow lines),
  plus the constitution amendment below, inside the same PR.
- Merging the warm values first would enshrine a rejected palette in main,
  make the 12 verification captures a false reference, and force a second
  full verification cycle. Correcting in place costs one cycle.

## 8. Smallest safe implementation path

1. Owner ratifies this reassessment (direction decision, one approval).
2. Constitution amendment v2.0 (below) committed on the existing J1 branch
   (the constitution file is already part of PR #103).
3. `tokens.css`: swap the §5 values (colour + shadow tints only; token set,
   type, radii, motion untouched). No TypeScript changes — `appearance.ts`
   is palette-agnostic.
4. Re-run the J1 verification suite: ESLint, tsc, unit (403), build,
   Cypress (41), automated contrast check, and re-capture the 12
   exact-viewport screenshots (Home / chooser / History × 390×844 /
   320×700 × paper / ink).
5. Owner reviews the new captures; PR #103 leaves draft and merges.
6. J2 starts only after merge, per the existing slice rule. The
   final-annotated-journal reference prototype is re-rendered with v2.0
   tokens as a new reference set under this subdirectory before J3 begins
   (one capture session); the warm originals remain as history.

Nothing else moves: no slice scope changes, no journey changes, no J7
unblocking, no photo-persistence change.

## 9. Constitution amendments required (v1.2 → v2.0)

Proposed text; to be applied only after owner ratification (comparison
phase edits nothing):

1. **§2.1 / §2.2 tables** replaced with the §5 values above, including the
   verified ratios and neutral shadow tints (§2.5 values updated to match).
2. **§2.1 v1.2 note** (captions on tint must use `--ink-2`) retired —
   the new `--ink-3` passes 4.5:1 on `--tint` in both appearances.
3. **§1 wording**: "warm paper (light) and warm ink (dark)" → "porcelain
   paper (light) and charcoal ink (dark); warmth lives in typography,
   photography, and voice — never in surface hue." Metaphor line gains:
   "INSIGHT annotates in blue ink on white paper."
4. **§12 note** (precedent: v1.2 R1): the reference prototype and the 42
   warm captures predate v2.0; **the §2 token values govern over the
   prototypes** until the reference set is re-rendered; structural
   comparisons remain binding.
5. **Decision log** (`final-direction.md`): append D8 recording the owner
   feedback, this comparison, and the palette decision — the warm palette
   is superseded, not the direction. (Historical sections stay untouched.)
6. **§3**: optional note naming EB Garamond (OFL) as the licensed-font
   candidate for the identity serif; stack unchanged until adopted.
7. **§11 prohibited patterns**: unchanged — one accent, no colour-coded
   scores, all laws carry over identically.

## 10. Honest limitations

- The 18 captures use a faithful HTML reproduction of the J1 screens, not
  the running app (read-only constraint); pixel-level Ionic differences are
  possible but the token mapping is 1:1.
- Warmth loss on the three J1 screens (no photography yet) is real; it is
  repaid from J3 onward when photos carry the warmth. If, after J3, Home
  feels cold in practice, the sanctioned lever is the paper value (e.g.
  one step warmer within AA), never a return of brown ink or amber accent.
- Emotional readings (bar / dashboard / reading room) are my judgment;
  the owner's reaction to the new captures in step 5 is the check.
