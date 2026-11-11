# Katsanos 2006 (leucine proportion at matched EAA dose): frozen test, scoring pending, and an outcome-free verdict on discrimination

Owner and implementer: Opus 5.5 (`claude-opus-5-5`).

**Status: predictions frozen; target insulin outcomes not yet available to me.**

- **Plan and code:** `PLAN.md` and `katsanos.py` were frozen at 12:49:02Z (`FREEZE_RECEIPT.json`), before the source was opened.
- **Numeric predictions:** frozen at 12:49:34Z (`PREDICTION_RECEIPT.json`), from the brief's stated leucine percentages, before any source text was read.

## Source access (receipts)

- **Publisher:** journals.physiology.org full text and PDF returned **HTTP 403** (WebFetch and local urllib).
- **Open copies:** not in PMC or Europe PMC (`inEPMC: N`).
- **Read after the freeze:** only the PubMed abstract (PMID 16507602).
  - It confirms the design: four groups (two elderly, two young), 6.7 g EAA, a 26% leucine mixture ("whey-like") vs 41%.
  - It reports muscle FSR results only. **It does not mention insulin.** The FSR results are now exposed, but they are not the scored endpoint.
- **Still needed:**
  - per-group n;
  - the actual composition table (leucine grams and which EAAs were reduced);
  - drink timing relative to sampling;
  - the insulin endpoint (concentration table, curve or AUC; operator; window; units).

  These must come from the forthcoming Astra/Sol transcription. Fill `outcomes_TEMPLATE.json` → `outcomes.json`, run `katsanos.py score`, then `--check`. The harness needs no change.

## Frozen predictions (ratio high-leucine / low-leucine; identical for young and old)

| Rule | Prediction |
|---|---:|
| P0 equal response | 1 |
| P1 generic AA flag (ties both EAA drinks) | 1, **identical to P0 in this design** |
| P2 fixed enrichment multiplier (label only; prior checkpoint) | 1.2671 |
| P3 frozen pooled substitution slope, ΔLeu = 1.005 g (stated %, to be verified) | 1.1082 |
| P3w / P3s whey- and soy-trained slopes (sensitivity) | 1.0544 / 1.1525 |

- **Who wins:**
  - P3 beats equal response if the observed ratio is above 1.053.
  - P3 beats P2 if it is below 1.185.
  - P2 beats equal response above 1.126.
- **Age interaction:** every rule predicts 1, so this is coverage only.
- **Native levels:** abstained. There is no externally calibrated reference arm.
- **Signed or near-zero areas:** abstained from log scoring, with native differences kept.

## Outcome-free verdict: this design cannot discriminate the fixed and quantitative hypotheses (`DESIGN_POWER.json`)

The two hypotheses differ by only **0.134** in log ratio (1.267 vs 1.108). Requiring 2·SE < separation with independent groups (SE ≈ √(2/n)·CV) needs these group sizes:

| Insulin-summary CV | n/group: P2 vs P3 | n/group: P3 vs equal | n/group: P2 vs equal |
|---:|---:|---:|---:|
| 0.3 | 41 | 69 | 13 |
| 0.4 | 72 | 122 | 23 |
| 0.5 | 112 | 190 | 36 |

Studies of this design typically have far fewer per group. A protein-only drink with no carbohydrate gives small insulin increments, which inflates CV further, and between-group baselines add more variance.

**Therefore, before any outcome:**

- **The fixed-vs-quantitative comparison will not be resolvable** at plausible variability. Whichever point estimate lands closer is not decision evidence.
- **Only a large effect could separate P2 from equal response.** Distinguishing the slope from equality would need an implausibly precise design.
- **A generic rule can fit as well.** With two leucine levels per age, any one-parameter rule (a free multiplier or a free slope) fits each age exactly. Pre-existing coefficients can be *ranked* but cannot show that a quantitative dose law is required.
- **The generic EAA flag ties both drinks**, so this design cannot test "generic flag vs nothing" at all.

## Identification limits

- The 41% mixture lowers the other EAAs at equal total, so leucine is confounded with that reduction.
- Groups are independent, not crossover, so baseline and between-person differences enter the ratio.
- With no carbohydrate, the slope (trained on carbohydrate meals) is extrapolated.
- Positive-clipped group-curve area ≠ mean of participant positive areas. Participant-positive bounds require complete SEMs and are possible only if a full time course is printed.

## Decision implication

Even with outcomes, Katsanos can at most show whether *large* enrichment effects on insulin occur without carbohydrate. It cannot establish that **quantitative** composition beats a fixed enrichment flag.

The informative design is ≥ 3 leucine fractions at matched total EAA, ideally crossover, with a carbohydrate-matched vehicle, so the slope and the flag make different *shape* predictions across levels.
