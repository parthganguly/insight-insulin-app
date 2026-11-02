# Sensitivity to the historical leucine response

For healthy Manders participants, the directly transferred leucine multiplier has lower error than the 4/3 amino-acid mass, energy and no-change forecasts for all four source conventions. For T2D, the 4/3 mass forecast is closer than the direct multiplier for every convention. Both comparisons with mass retain their direction across every declared source and target graph-reading corner. The original 1.66 forecast remains the primary analysis. This sensitivity was developed after the target results were known.

| Source convention | Multiplier | Healthy error, direct | Healthy error, increment on carbohydrate | T2D error, direct | T2D error, increment on carbohydrate |
|---|---:|---:|---:|---:|---:|
| Original 2008 abstract | 1.6600 | .0603 | .0855 | .2766 | .0304 |
| Later 2014 citation | 1.5900 | .0172 | .1181 | .2336 | .0058 |
| Original Fig. 2B, unadjusted bars | 1.5816 | .0119 | .1221 | .2282 | .0027 |
| Original Fig. 2B, water subtracted | 1.5668 | .0025 | .1292 | .2189 | .0025 |

The second response link uses observed carbohydrate and hydrolysate comparator means from Manders to translate an external fractional increment into the predicted ratio on the hydrolysate background. Both link functions and the cheap comparators are retained from the original protocol. Each error is the absolute log discrepancy on the HL/H group-mean area ratio. All individual comparator differences, including comparisons with the control-calibrated mass rule, are in GRAPH_RESULTS_v2.json.

In the 2008 study's Figure 2B, the water bar is slightly negative. Subtracting it from both arms reduces the relative rise from about 58.2% to 56.7%. The tested reading corners give 55.5–60.9% raw and 53.8–59.6% water-adjusted. Both ranges support the later approximate 59% citation. Neither accounts for the abstract's 66%. These ranges quantify pixel-reading choices and exclude biological sampling uncertainty. Close central fits in the post-result sensitivity should not be used to select a preferred convention. [Original abstract](https://pubmed.ncbi.nlm.nih.gov/19013300/) · [Original Fig. 2B](https://ars.els-cdn.com/content/image/1-s2.0-S0026049508003120-gr2_lrg.jpg) · [Iverson 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC4121211/)

Run `python -I -X utf8 graphic_sensitivity_v2.py --check` alongside the original Manders files. GRAPH_REFERENCE_v2.json supplies the publisher figure URL, SHA-256, dimensions and factual coordinates. The target and source top-axis scales cancel in each ratio. Sixteen source graphic corner scenarios cross sixteen target ratio corner scenarios per group for each graph convention. Published fixed percentages have one source value each. No copied figure is needed for arithmetic replay.
