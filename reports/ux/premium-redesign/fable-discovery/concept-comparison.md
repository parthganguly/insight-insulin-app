# Concept Comparison — Four Divergent Directions

**Mission:** issue #101, Parts 3–4. **Author:** Claude Fable 5. **Date:** 2026-07-18.

Four materially different interactive directions were built for the same core
journey (Home → Log Meal chooser → Smart Camera → Confirm → Canonical result →
History), each as a self-contained interactive prototype under `prototypes/`,
each with synthetic data (keema biryani included in every one), states
addressable by URL hash, both 390×844 and 320×700, and a second appearance
where the concept supports it. Screenshots: `screenshots/concept-*/`.
None was pre-named or pre-selected from earlier assistant suggestions.

---

## The four concepts

### A — Field Journal (`a-field-journal.html`, light + dark)

- **Central idea:** the meal is a journal entry — the photo is the page, and
  INSIGHT's analysis is the annotation written beneath it.
- **Intended emotional effect:** warmth, memory, ownership; food feels loved
  rather than measured.
- **Why it fits INSIGHT:** the product's real payoff is *understanding your own
  meals over time* — a journal is the honest container for an uncalibrated,
  relative instrument; it makes comparison-with-yourself the native frame.
  Photography gives the emotional warmth the current app entirely lacks (and
  adjacent products prove users love — Undermyfork pattern).
- **Spatial organisation:** photo-led vertical pages; content sheet overlaps
  the photo; bottom thumb-dock carries the primary action and quiet nav.
- **Typography:** serif display voice (Iowan/Palatino class) for identity and
  conclusions; humanist sans for controls and captions.
- **During a real meal:** two taps to camera, shutter bottom-centre,
  one-handed; the dark appearance suits restaurants.
- **Major risks:** photo-less meals must be designed deliberately (solved in
  prototype with typographic plates); serif voice must stay disciplined or it
  drifts into lifestyle-blog softness; warm palette must keep AA contrast.
- **Accessibility:** strong reach ergonomics; serif at small sizes needs care
  (kept to display roles only); photo-over-text avoided (text never sits on
  photos except the top chrome buttons with scrims).
- **Implementation complexity: medium.** Card/list restructuring, photo hero
  treatment, token overhaul; no new data demands beyond what the backend
  already returns.

### B — Instrument (`b-instrument.html`, dark + light)

- **Central idea:** INSIGHT is a fine measuring instrument — an engraved,
  dark gauge panel with tabular numerals and honest scale markings.
- **Intended emotional effect:** competence, calm authority; "a serious tool,
  not a toy".
- **Why it fits INSIGHT:** the product is literally an estimator; the
  instrument frame makes *relative reading* (a needle among your meals' dots)
  the native score presentation — the most honest visualisation any concept
  produced. Tabular monospace numerals give data a voice without inflating
  its certainty.
- **Spatial organisation:** stacked panels; readings; bottom dock.
- **During a real meal:** excellent in low light (dark-first); bottom action;
  minimal reading required for capture.
- **Major risks:** emotionally cold for energy/wellbeing users; nothing looks
  like food; instrument vocabulary ("readings", "panel") is cosplay that
  could erode rather than build trust; dark-first default is a bold bet for a
  broad consumer base; the light face is derivative.
- **Accessibility:** dark-first needs a rigorous light equivalent; monospace
  small caps at small sizes borderline; needle/dot encoding needs text
  equivalents (provided).
- **Implementation complexity: medium.** Mostly token + component work; the
  scale component is new but simple.

### C — Conversation (`c-conversation.html`, light + dark)

- **Central idea:** every screen is a short stack of humane sentences; the
  facts inside the sentences are the controls (tap a highlighted fact to
  correct it). Not a chat UI — no bubbles, no persona bot.
- **Intended emotional effect:** feeling understood; low anxiety; correction
  feels like conversation repair, not bureaucracy.
- **Why it fits INSIGHT:** the AI boundary law says recognition is a
  *proposal* — a sentence ("This looks like keema biryani — about 350 g…")
  renders a proposal more honestly than a form does. Amershi G1/G2/G9
  (communicate capability, correct efficiently) are embodied rather than
  annotated. Its insufficient-data state ("Honestly? This one was hard to
  estimate.") is the most emotionally intelligent of the four.
- **Spatial organisation:** typographic statement stacks; controls inline.
- **During a real meal:** fastest comprehension of what the app thinks;
  reading long sentences one-handed while eating is more demanding than
  glancing at a list.
- **Major risks:** sentence-UI scales poorly to 5+ component meals; grammar-
  dependent layout is a localisation trap (fill-in-the-blank order varies by
  language); a whole app of prose fatigues; flirts with a "companion persona"
  the product deliberately doesn't have.
- **Accessibility:** large type is excellent; inline tappable facts need
  careful focus order and 44 px hit areas (padded in prototype); screen-reader
  phrasing is naturally good because the UI *is* sentences.
- **Implementation complexity: high** for full fidelity (inline editable
  tokens inside localized sentences); low if only the voice is adopted.

### D — Ledger (`d-ledger.html`, light + dark)

- **Central idea:** every meal is an entry in a beautifully-set evidence
  ledger — hairline rules, aligned columns, footnoted provenance, a quality
  seal. The app shows its work.
- **Intended emotional effect:** trust through legibility; the quiet
  confidence of a well-set document.
- **Why it fits INSIGHT:** the scientific-boundary rules *are* footnotes at
  heart; a ledger makes provenance (`exact / mapped / rough`) a first-class
  visual system; share-of-load columns present drivers more honestly than
  chips; typography alone produces premium at zero material cost.
- **Spatial organisation:** ruled document; no cards at all.
- **During a real meal:** dense; reads better after the meal than during it;
  capture path fine but characterless.
- **Major risks:** emotionally dry; "ENTRY No 47" bureaucratic; editorial
  hairline style reads more like print than a native app; the poorest food
  warmth of the four.
- **Accessibility:** high-contrast by nature; hairline rules need minimum
  weights in dark; dense rows need generous line heights (provided).
- **Implementation complexity: low-medium.** Mostly CSS/typography; the
  share-of-load table is trivial.

---

## Comparison against explicit criteria

Scores are my judgment after driving all four prototypes at both viewports
(screenshots in the concept folders). 1–5, 5 best. The criteria derive from
the design principles (P1–P8) and the mission's product truths.

| Criterion | A Journal | B Instrument | C Conversation | D Ledger |
|---|---|---|---|---|
| First-glance clarity of payoff (P2/P3) | 4 | **5** | 4 | 4 |
| Honest uncertainty presentation (P4) | 4 | 4 | **5** | **5** |
| Correction as care, not form (P5) | 4 | 3 | **5** | 3 |
| Emotional warmth / consumer appeal (P1/P6) | **5** | 2 | 4 | 2 |
| Calm; no alarm aesthetics (P6) | **5** | 4 | **5** | 4 |
| Real-meal ergonomics (P7) | **5** | 4 | 3 | 3 |
| Distinctiveness as INSIGHT's own language | **5** | 4 | 4 | 4 |
| Localisation & scaling robustness | 4 | 4 | 2 | 4 |
| Dark/low-light quality | 4 | **5** | 3 | 3 |
| Implementation risk (5 = lowest) | 3 | 3 | 2 | **4** |
| **Total** | **43** | 38 | 37 | 36 |

### What each concept proved

- **A** proved the photo-anchored journal chassis: hero photography +
  bottom dock + serif identity is the only direction that felt like a
  product someone could *love*, and it stayed calm and honest doing it.
- **B** proved the score presentation: the comparative tick-scale
  (your meals as dots, this estimate as a needle, min/max labelled, no
  bounds, no colours) finally makes the number legible without lying.
  This is the single most valuable component any concept produced.
- **C** proved the voice: sentence-first conclusions ("This meal likely asks
  about as much of insulin as most meals you log"), the renamed-item review
  question ("…were for the old name. Do they still fit?"), and the honest
  low-data state. As a *whole-app interaction paradigm* it fails scaling and
  localisation; as a *voice* it is the best of the four.
- **D** proved the evidence layer: share-of-load rows with plain-language
  provenance under each component, and disclaimers as designed footnotes
  rather than stacked warnings.

### Honest rejections

- **B as the direction:** rejected because INSIGHT's broad consumer promise
  (energy, wellbeing, curiosity) cannot anchor on an aesthetic that contains
  no food and reads clinical; the instrument metaphor also nudges toward
  false authority — the opposite of the product's epistemic honesty.
- **C as the direction:** rejected on engineering-truth grounds: grammar-
  dependent inline-control sentences are a localisation and complex-meal
  liability the sealed correction law doesn't need; and a prose-only app
  under-serves scanning (History, comparison).
- **D as the direction:** rejected because a ledger reads as record-keeping,
  not companionship; it is the best *layer* and the weakest *whole*.

### What stays deliberately ordinary

Not everything should be "premiumised": the tab bar stays a plain labeled
three-tab bar; Settings stays a plain list; the chooser stays three plain
options; standard system share/backup affordances stay standard; error
toasts stay ordinary toasts. Novelty in navigation chrome would tax the very
users the journey law serves.

---

## Verdict

**Concept A (Field Journal) is the strongest overall chassis** and becomes
the final direction — renamed **"Annotated Journal"** — carrying three
grafts, each proven in another concept:

1. **B's comparative tick-scale** as the canonical score presentation;
2. **C's sentence-first voice** for verdicts, review questions, and the
   insufficient-data state (voice only — list structures remain lists);
3. **D's share-of-load evidence rows** and footnote treatment for the
   "shows its work" layer.

The synthesis is itself prototyped (`prototypes/final-annotated-journal.html`)
with additional required states (building-history home, stale estimate,
camera failure, long-text, large-text probes) and screenshotted at both
viewports in light and dark (`screenshots/final-annotated-journal/`).
The full rationale and open questions are in `final-direction.md`.
