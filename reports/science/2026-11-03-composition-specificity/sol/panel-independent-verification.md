# Sol independent panel verification

Run `python sol/panel_independent_check.py` from any directory (stdlib only, packet-relative inputs). Optional original-figure check: install PyMuPDF, place original reprint at sol/katsanos2006.pdf, run `python sol/stem_audit.py`. Saved execution receipts: panel-check-receipt.txt and stem-check-receipt.json. All checks passed.

## Participant-positive nonidentification witness

Independently rebuilt every synthetic column using two-point distances determined from sample variance (SE = sample SD/sqrt(n)), independently integrated each row over0–120min with exact zero crossing splits, then averaged. No synthetic value is negative: minimum2.3243408522uIU/ml. Every column reproduces admitted marginal mean/SE within1.78e-15. Row assignments alone change after0min; marginal distributions stay fixed.

Two-predose baseline attained examples: young high-aligned/low-reassigned ratio.7570641073 versus high-reassigned/low-aligned1.1487763122; old.7078113504 versus1.4884621933. All four assignment combinations under both baselines reproduce panel/witnesses.json within1e-9area units. Each age/baseline spans the1.0561569853 log-loss preference midpoint between equality and frozen1.1154675776. This is constructive nonidentification of the sample mean participant-positive endpoint from the plotted marginals, stronger than merely loose upper bounds. It is not a claim of real participant trajectories, attainable extremes, populationCI, or fulfillment of every unpublished ANOVA constraint.

Original PDF geometry audit checks36draws at nine times per arm against the supplied vector marker centers. All nearest upward/downward stems are unique inside independent x/y<.1pt windows, maximum Manhattan start offset.066986pt. Heights/path IDs match panel/marginals.json exactly. There are no competing stems in these windows. This supports nearest matching stems rather than selecting a larger nearby whisker. Figure resolution/rounding assumptions remain explicit.

## Farup hierarchy and structural bound

Independently verified centered DH and leucine predictions,20/45dose sensitivity, family ratios47.5/36 and37.5/26.3, every pair/error, all grouped loss means and monotonicity bound. No casein DH is imputed. Centering makes the geometric mean of three whey forecasts equal the imported family anchor. Since all casein-referenced predictions underpredict observedAU ratios, zero-sum centered adjustments redistribute cross-family absolute-log errors while keeping their mean identical (.8694062567). This is algebra, not evidence those adjustments improve transport. Same-whey loss increases; overall losses can conceal that by averaging cross-family coverage. No native absolute forecast is identified from food features alone.

## Opus v2 check and discrepancies

All Opus E2/E3 areas from its own vector means reproduce with independent integration under both baselines and both windows, within1e-8. All ratios/model errors reproduce within1e-12. Tiny differences from Astra coordinates are harmless rendering precision; central ranking agrees. Opus's larger-whisker SEM extraction is superseded by unique nearest stems for the participant witness.

Opus Farup prose understates leucine contrasts: high/medium1.64g and high/low1.28g, not merely tenths. Frozen slope predicts ratios1.18251 and1.13979. An explicit transported DH coefficient produces non-equal forecasts; donor single-DH comparison does not establish that coefficient as a biological gradient. The structural printed-AU bound limits any monotone joint extension, including nonlinear ones.

## Glynn early endpoint receipt

Admitted indexed original PMC2955876 and publisher J Nutr DOI10.3945/jn.110.127647. Direct originalXML retrieval failed; this is indexed primary-text admission. Nutrient composition is Table2, notTable1. CTRL/LEU leucine1.85/3.50g in10gEAA; tracer leucine additionally0.10/0.19g. Original results give basal30±5/33±6 and30min103±18/92±12pmol/L. Thus increment ratio59/73=.8082191781, gross ratio92/103=.8932038835. The60min56±8LEU value is not an area. All panel/early.json predictions/errors and both independent donor-baseline reconstructions pass. Difference1.65g refers listed EAA leucine, excluding added tracer; tracer-inclusive difference1.74g gives frozen-slope ratio1.19466approximately, no ranking reversal. Actual concentration increments are used separately from area. No sampling claim without paired baseline-time covariance.

Primary links:
- https://pmc.ncbi.nlm.nih.gov/articles/PMC2955876/
- https://jn.nutrition.org/article/S0022-3166%2822%2907139-5/fulltext

No repository modifications, private data, identity data, tokens, or local connection files required.

## Public packaging allowlist

sol/panel_independent_check.py
sol/panel-check-receipt.txt
sol/stem_audit.py
sol/stem-check-receipt.json
sol/panel-independent-verification.md

Required public inputs: panel/marginals.json,witnesses.json,form.json,donors.json,farup.json,glynn.json,early.json; public/transfer/fig4_vector.json,RESULTS_v2.json; astra/figure4_coordinates.csv. Optional sourcePDF: sol/katsanos2006.pdf (published aggregate reprint). Exclude connection-local and unrelated tool-call dumps.
