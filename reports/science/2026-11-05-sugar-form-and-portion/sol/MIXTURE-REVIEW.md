# Independent mixture and muffin figure review

## Lee scan confirmation

Independently inspected sources/lee_table31.png, printed34. Every insulin mean and SEM in sol/verify.py matches the scanned table. Confirmed all4 bread doses,2 pure fructose doses,3 glucose doses,3 sucrose doses, and mixture18.9±3.6. Footnote explicitly assigns starred100g fructose-column cell to50g glucose+50g fructose. Thus prior OCR-only limitation is removed for these raw insulin cells. Published1998 article remains a distinct source.

## Free mixture, DOI10.3390/nu13114095

Read frozen MIXTURE_PLAN, source XML and original Figure1C independently. Fifteen healthy participants, complete crossover,1g/kg glucose,1g/kg fructose, or.5g/kg of each in300mL water. Hormonal grid0,15,30,60,120. Figure serum insulin mU/L; curve central-estimate aggregation not specified in caption. Paper reports mean±SD baseline/peak but that does not establish graph aggregation; classify graph separately from participant-positive iAUC. Baseline sourceG5.18,F5.15,mix6.2. The mean body mass76.3kg is not a personal calibration.

Independent approximate curve readings in mU/L: G[5.2,25.8,32.2,30.4,14.7],F[5.2,9.8,13.1,12.3,10.0],mix[6.2,25.2,34.2,22.9,8.0]. Image mixture_panel.png: x centers206,285,364,522,837; y0≈602,y10≈515. Filled squares/circles traceG, open squaresF, half squaresmix. Signed trapezoid after each own baseline givesG2335.5,F710.25,mix1720.5 mU/L·min; F/G.304110,M/G.736673. Fixed predictionsR=.148148 and.574074; D/equality1. Thus form-aware beatsD on both central contrasts. Same-cohort fixed-total-mass interpolation predicts mix/G=(1+.304110)/2=.652055, closer to observed mix than frozen forecast; it uses external component outcomes.

Reading sensitivity is NOT biological uncertainty. Allow±.5mU/L independently at every point including baseline: G area[2223,2448],F[597.75,822.75],M[1608,1833]. Ratio rangesF/G[.24418,.37011],M/G[.65686,.82456]. F/G advantage over equality persists; mix advantage need not: composition/equality log-error crossover is sqrt(.574074)=.75768. Therefore an unqualified claim of better mix-only prediction is too strong. At joint extremeF/G=.37011,M/G=.82456 even the two-contrast average can reverse; retain the central average improvement as a digitized estimate.

## Gallagher muffin

Source input Table1 values were supplied by coordinator (not independently retrieved here): S/F/sucralose starch54/57/80g; sugar65/52/0g; carbohydrate119/109/80g; protein17/17/19g; fat66/67/67g. Sucralose carrier maltodextrin included in80g. These are unequal backgrounds. With frozenR, form scoresS=91.314815,F=64.703704,U=80, giving F/S=.708578,U/S=.876090. Total-carbohydrateD predicts.915966,.672269. Equality1. No fitting to muffin insulin. Food coefficient1 for all starch is an assumption, not established physiology.

Independently read original fig.jpg (459×259): x0≈40,30≈83,60≈126,90≈170,120≈213; insulin y0≈223,70≈40. Early curve estimates μIU/mL: S[6.5,48,48.3,53.3,55.9],F[5.2,42.9,37.5,37.1,36.0],U[6.5,48,47.5,43.7,45.6]. Own-baseline signed0–120 areasS4644,F3519,U4177.5 μIU/mL·min; ratios.757752,.899548. Form-aware beatsD and equality at these centers on BOTH contrasts. This is graph-derived signed early area, not reported participant-positive120.

Conservative independent±1μIU/mL each point gives areasS[4434,4854],F[3309,3729],U[3967.5,4387.5], ratiosF/S[.68171,.84100],U/S[.81737,.98951]. These adversarial reading ranges allow comparator reversals. Even±.5 permits U/S above.935997, where equality becomes closer than form. At±.5,F/S roughly.719–.799, below form/D crossover sqrt(.708578*.915966)≈.8056, so form-versusD F contrast is more stable. Do not overclaim digitization robustness; shared-baseline correlated errors might narrow or shift ranges but are not known.

Independently read gr4_lrg.jpg (290×203): reported operational four-hour iAUC bars approximatelyF92,S144,U127 μIU/mL·h; conservative image boundsF89–94,S141–146,U124–129. F/S center.639,U/S.882; corresponding ranges.610–.667 and.849–.915. Form beatsD and equality on both throughout these reading ranges. This is a stronger graph-reading result but a DIFFERENT four-hour endpoint. Baseline clipping/participant averaging must follow full methods, not the graph label alone. Cannot pool with early signed curves or donor positive120 operator. Marginal error bars do not supply paired ratio uncertainty or a significance test of model performance.

Completion: inspected requested original graph assets; independently recomputed Table1 forecasts from coordinator-supplied inputs; independently checked baseline-sensitive signed areas and broad reading scenarios. Remaining: independent full Table1 acquisition, graph central-estimate/area-convention clarification, participant paired uncertainty. No formulas or repository code changed.
