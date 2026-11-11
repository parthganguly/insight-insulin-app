# Meal order and two-hour insulin area

**Research decision.** Record how and when a meal was eaten when defining a research comparison. A randomized trial found different two-hour insulin areas for identical ingredients eaten over the same 20 minutes. Across studies, the direction of a schedule effect transferred more readily than its size. The evidence does not support applying a fixed percentage to a consumer score.

## Prediction

For each meal, switching the order leaves its total carbohydrate, protein, fat and energy unchanged. Any predictor using only those totals gives a last/first ratio of 1. This is a credible reference even though it cannot represent an order effect. We compared it with a second forecast that carries forward the observed ratio of two group mean insulin areas from a different study. Neither forecast requires the evaluation cohort's insulin as an input.

The first forecast of an order effect was 2184/3196.94 = 0.6832, learned in 18 healthy adults eating vegetables and protein before carbohydrate versus eating a mixed meal. The sequential meal included a 10-minute rest and took 30 minutes, compared with 15 minutes for the mixed meal. This ratio includes differences in elapsed time and in the delivery of carbohydrate. [Shaheen et al., 2024](https://doi.org/10.2147/DMSO.S468628)

| Evaluation contrast | Window | Predicted ratio | Observed ratio | Absolute log error | Error for ratio 1 |
|---|---:|---:|---:|---:|---:|
| Shukla 2015, carbohydrate last / first | 120 min | 0.6832 | 0.5152 | 0.2821 | 0.6631 |
| Imai 2023, slow carbohydrate last / slow carbohydrate first | 120 min | 0.5152 | 0.7404 | 0.3626 | 0.3005 |
| Shukla 2017, last / sandwich | 180 min | 0.6832 | 0.8299 | 0.1946 | 0.1864 |
| Shukla 2017, last / first | 180 min | 0.6832 | 0.7527 | 0.0970 | 0.2840 |
| Shukla 2017, implied sandwich / first diagnostic | 180 min | 1.0000 | 0.9070 | 0.0976 | 0.0976 |

The second row tests a **different transfer**. We used Shukla 2015 as development data and froze its 0.5152 ratio before extracting the Imai numeric outcomes. Both comparisons reverse the order of the courses. Shukla's 11 metformin-treated participants ate carbohydrate first at visit one and last at visit two. Visit and order therefore coincide. In Imai's randomized crossover, 18 healthy young women ate the same rice, fish and vegetables in both slow conditions. Rice moved from the first six minutes to the final six. The mean above-baseline areas were 4,222 and 5,702 µU·min/mL for rice last and first, respectively. The source reports a paired condition difference at p < .01. The transported 48.5% reduction overshot the observed 26.0% reduction enough for ratio 1 to have lower point error. The fast arm also changes pace and is retained as context. [Shukla 2015, Table 1](https://doi.org/10.2337/dc15-0429) · [Imai 2023, Table 2](https://doi.org/10.3390/nu15051174)

The 180-minute rows share participants. Grouping sandwich and carbohydrate first under one forecast forces their predicted ratio to 1. One of 16 participants lacked sandwich data. The methods describe sampling every 30 minutes, while the table footnote omits 120 and 150 minutes. We used the published 180-minute insulin areas directly. The insulin table marks the last/first difference as significant. The last/sandwich glucose result cannot be used to infer a significant insulin difference. [Shukla 2017, Table 2](https://doi.org/10.1136/bmjdrc-2017-000440)

## Interpretation and exposure

The target is the population-average positive incremental insulin area over 0–120 minutes under a stated eating protocol. Imai explicitly integrates above baseline. The other three papers report incremental areas without establishing the same clipping rule. Ratios remove a common unit scale but retain differences in sampling, population, meal, and comparator. Absolute areas were not calibrated across studies. A first-bite clock gives delayed carbohydrate less elapsed time before 120 minutes. The results cannot distinguish altered total secretion from a shifted response.

The original plan records prior exposure to the direction of the 2015 result and some 2017 outcome information. The Imai addendum was an additional comparison, specified after the first plan and before numeric extraction. The comparisons are separately evaluated external transfers with partial prior exposure. Reported condition p-values do not quantify paired uncertainty in prediction error. No means or errors are pooled across windows. The proposed oil-timing lead remains open. The accessible before/during/after study measured starch digestibility, which cannot supply a human insulin outcome. [Kaur et al., 2015](https://doi.org/10.1111/1750-3841.13070)

## Prior evidence and current status

In Sun's rice-addition study, four frozen composition models met the declared carbohydrate-relative criterion. A post hoc “same as plain rice” reference had mean absolute log error 0.157811. Only saturation improved on it on average, by 0.001247 with two of four individual contrasts closer. Plain rice also missed the source-supported chicken increase of about 30%. The Lan-derived constituent rule predicted 1.768 times plain rice for the combined meal, against a reported ratio of 0.965. The numerical review is closed. The earlier Lan joint criterion failed. A meal-order test changes a different input and leaves these results intact. [Sun et al., 2014](https://doi.org/10.1007/s00394-014-0678-z) · [Lan-Pidhainy and Wolever, 2010](https://doi.org/10.3945/ajcn.2009.28125)

Decision D is unresolved. These experiments support treating course order and timing as protocol descriptors in research. A numerical adjustment would need separate evaluation under the intended population, meal, timing and endpoint. No product formula or native implementation is changed here.

## Reproduction

The [clock-shift follow-up](clock-shift/README.md) tests whether delaying the reference insulin curve reproduces the order contrast. The [measured-control diagnostic](clock-shift/control-profile/README.md) repeats the calculation with the evaluation cohort's own reference curve.

From this directory run `python -I -X utf8 evaluate.py --check` using Python 3. The runner verifies the two protocol hashes and checks all five rows against `RESULTS.json`. Run it without `--check` to print all predictions and errors. `facts.json` contains the small set of published aggregate means and source links. The preceding immutable Sun evidence snapshot has SHA-256 `9b57e946ae6d2d040122d0332b89a6bbd7f35f7c21c82b608b43cfb9df63c5e2`.
