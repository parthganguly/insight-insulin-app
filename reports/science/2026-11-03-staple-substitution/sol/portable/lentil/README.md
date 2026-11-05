# Chamoun2024 independent recipe-transfer check

Source: https://doi.org/10.3390/nu16162669 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC11357280/
Read primary article XML in astra/lentil/article.xml independently. All9 Table1 served availableC, protein, fat and energy inputs match frozen lentil/inputs.json. AvailableC is measured [total starch−resistant starch]+free sugars; do not replace with totalC−fibre or the25g exchanged dose. No allulose identified. Table1 energy is bomb calorimetry, so interpretation differs from an assumed metabolizable-energy formula.

Table3 insulin iAUC0-120 values in nmol/L*min: muffin control/green/red18.2/15.1/15.7; chili8.4/5.8/4.9; soup11.2/4.4/4.7. These are GEOMETRIC means with95%CI after natural-log transformation, not arithmetic native means and not medians. Primary GM ratios green/red to control are muffin.829670/.862637; chili.690476/.583333; soup.392857/.419643. Published relative-insulinemic-response percentages86/92,75/63,46/45 are a distinct participant-ratio estimand and must not be substituted for ratios of printedGM. No arithmetic insulin-area means were supplied by Table3; the code does not fabricate them by exponentiating or attaching lognormal corrections.

Methods say trapezoidal2h iAUC, citing Brouns2005(10.1079/NRR2005100); below-baseline exclusion is not explicit in this article. Therefore clipping remains method-reference-qualified. Native predictions from historical arithmetic positive-area Wolever models are shown againstGM only as estimand-mismatched scale stresses. Exact units convert pmol*h/L to nmol*min/L by60/1000=.06. This unit alignment does not harmonize aggregation, clipping or assays.

42 distinct participants:4 completed all3 studies,18 two studies,20 one. Recipe sample sizes24/24/20 imply68 recipe-participations, consistent4*3+18*2+20. Table3 generic title saysn24 but soup-specificn20 from methods/Table2 takes precedence. This is within-program recipe holdout with overlapping people, not independent external participants. Recipe6contrast errors are correlated through controls/participants; no p-value or independent contrast count is assigned.

Run `python verify.py`. Entire held recipe is excluded from both donor estimators. Common-substitution forecast averages4 donor logGM ratios across both donor recipes/colors, and predicts the same ratio for green/red in target recipe. Same-color forecast averages2 same-color donor logGM ratios. No target control is used to anchor a native prediction; these are relative-only donor-effect comparators. Every donor and target appears explicitly in results; single-recipe donor sensitivity included.

All6 control-ratio mean absolute log errors:
common substitution.395147; same color.403891; equality.507753; proportional availableC.491092; proportional energy.832905; Wolever constant.507753, C.498224, CP.506877, CPF.510889, nonnegativeCPF.510335.

All3 red/green mean absolute log errors:
common/equality/constant.091182; same color.147390; proportionalC.119840; energy.133489; Wolever C.110387, CP.097552, CPF.110498, nonnegativeCPF.111505.

Common donor transfer improves the pooled reduction objective, but its held-muffin error.510764 is worse than equality.167216; chili.084311 and soup.590366 improve over equality.454657/.901302. It does not establish a transferable lentil-color distinction: common/equality ties color, and same-color transport is worse overall. Donor reduction strength varies strongly: muffin common ratio.845993, chili.634648, soup.406029. Changing a single donor changes the predicted target reduction and exposes the limited range of transport. Do not describe a pooled point improvement as broad validation.

Per-recipe native absolute errors againstGM (nmol/L*min), explicitly mismatched:
constant10.5033/1.1767/2.6433; C1.5539/5.1992/4.6612; CP8.5869/1.4945/2.9488; CPF1.2900/5.3209/4.8975; nonnegativeCPF1.6798/5.2580/4.7079 (muffin/chili/soup). Native favors different models by recipe and cannot replace the frozen relative objective.

No participant records used, no author requests, no new model or scientific formula fit. Public aggregate files and stdlib verifier only.
