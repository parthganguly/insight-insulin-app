# v3: PLAN panel B completed (six protein pairs) and two wording corrections

Author: Opus 5.5 (`claude-opus-5-5`).

New code is `pairs.py`, producing `PAIRS.json`; run `python -I -X utf8 pairs.py --check`. It reads frozen `PREDICTIONS.json`, the admitted `outcomes.json` readings and `inputs.json`, and changes none of them. All earlier checks still pass, and the frozen hashes still match `FREEZE_RECEIPT.json`. This is a post-result completion of a promised panel: point errors on one graph reading, with no CI.

**Pairs:** a/b with a < b. The drinks are 5 (whey hydrolysate), 6 (pea hydrolysate), 7 (wheat hydrolysate) and 8 (intact casein).

**F4 pair ratios** are derived as F4[a]/F4[b] from the frozen vs-drink-7 values, with drink 7 = 1. This is exact, because exp(slope·Δleucine) is multiplicative.

**Mass rounding** does not matter here. All four protein drinks list 57.1 g/L, so F2 (Lan mass) equals the tie *exactly*. Ingredient rounding affects only free-AA drinks 3, 4 and 9.

## Mean absolute log error over the six pairs

| Window, dose basis | Tie / F2 mass | F2b reported-AA sum | F3 capped leucine | F4 substitution slope |
|---|---:|---:|---:|---:|
| 2nd h, per 50 g carb (primary) | **0.228** | 0.242 | 0.263 | 0.255 |
| 2nd h, per bolus | **0.228** | 0.233 | 0.246 | 0.238 |
| 0–120, per 50 g carb | **0.233** | 0.262 | 0.283 | 0.275 |
| 0–120, per bolus | **0.233** | 0.252 | 0.266 | 0.258 |

## Observed pair ratios

| Pair | 2nd h | 0–120 |
|---|---:|---:|
| whey/pea | 1.273 | 1.301 |
| whey/wheat | 0.862 | 0.905 |
| whey/casein | 1.217 | 1.319 |
| pea/wheat | 0.677 | 0.695 |
| pea/casein | 0.957 | 1.014 |
| wheat/casein | 1.413 | 1.458 |

**Direction:** F2b, F3 and F4 order whey/pea correctly, and pea/wheat slightly. They reverse whey/wheat, whey/casein and wheat/casein. Pea/casein is correct in the 2nd hour but not over 0–120. The tie has the lowest pair MAE in every window and basis. This is consistent with the earlier vs-wheat panel, and it is not a significance claim.

## Corrections

1. **Table 2 profiles.** The reported sums are whey 88.9%, pea 69.9% (Trp not reported), wheat 81.9% (Lys and Trp not reported) and casein 110.8%. They do not establish a chemical reason such as water uptake or hydration. My earlier "includes hydration" wording is withdrawn. Treat Table 2 as a **reported-profile proxy**, and `lan_reported_aa_sum` as a lower-bound-input scenario wherever residues are unreported.
2. **v2 wording.** Outside the arginine drink, capped leucine keeps **small favorable central gains** over energy and mass: 0.009–0.080 across windows and bases. They are not zero. What depends on drink 2 is whether the gain is reading-box-settled vs energy (it is not, without drink 2). The gain vs mass in the second hour stays favorable across the reading box. Separately, on the within-protein pairs above, leucine is *worse* than the tie.

## Coordinator's 720-label reassignment

I agree with running it as a **post-result diagnostic**. The outcomes were already read, so it is not a confirmatory p-test.

Close similarity of the three matching-source profiles after closure (normalization to a constant sum) should not be read as evidence of a shared product lot. Protein amino-acid profiles share broad composition, closure itself induces similarity, and the source signal sits in a few residues (Gln, Pro, Lys).

The same similarity makes the permutation test **low-powered**. A non-extreme rank for the true assignment is weak evidence against profile information, and a favorable rank is only descriptive. The wheat/gluten reversal between the profiles and the clinical means is a further reason not to credit profile similarity as predictive.
