# What the marginal plots identify at two hours

This is a post hoc partial-identification analysis of an empirical group mean. The fixed forecast and its primary 150-minute evaluation precede this calculation. The target here is the average of eight individual areas above each man's own fasting insulin from minute 0 to 120, with straight segments between nominal blood draws. The group-mean curve alone does not give that quantity.

## Assumptions

Chapter 4 describes all data as means and SEM, n=8. We require the same eight at every relevant time within each arm, ordinary sample SEM, and nonnegative individual insulin concentrations. The source reports no point-specific exclusions. We use nominal times and participant-specific fasting baselines. Unknown excursions between draws are outside this estimand. Participant reuse across different studies is unknown and irrelevant to this within-cohort bound.

## Derivation

Write X0 and Xt for fasting and later insulin and D = Xt − X0 at a blood draw. E is the uniform average over the eight participants. A reported SEM e implies empirical standard deviation sqrt(7)e, using denominator eight. Thus sd(D) ≤ sqrt(7)(e0 + et) for every possible baseline-to-follow-up correlation. The Cauchy–Schwarz inequality and the identity D+ = (D + |D|)/2 give

    E D+ ≤ min(E Xt, (E D + hypot(E D, sqrt(7)(e0+et)))/2).

The first bound follows from nonnegative fasting concentrations. A finite-sample refinement uses the possible number m of negative changes. With f=m/8 and c=sqrt(f(1−f)), the covariance bound for a 0/1 subset gives two simultaneous upper bounds on E D+:

    (1−f) E D + c (sd(X0)+sd(Xt))
    E Xt − (1−f) E X0 + c sd(X0).

The first averages D only over its nonnegative subset. For the second, drop the nonnegative Xt on the negative subset and bound its subset sum of X0. Take the smaller bound for each m, then the largest over m=0,...,8. Retain the unrestricted Cauchy upper bound whenever it is smaller. Minute zero is exactly zero for every person.

Convexity gives a pointwise upper envelope by joining the endpoint bounds with straight lines. A lower envelope is the positive part of the linearly interpolated group mean of D by Jensen's inequality. Integrate these envelopes. Pairwise ratios of positive intervals with positive denominators give valid **outer bounds**. Endpoints need not be jointly attainable. No normality, invented participant traces, or assumed correlations enter this calculation.

The stress analysis moves each plotted mean by up to 0.5 µU/mL and increases every marginal SEM by 1.1 µU/mL. For upper bounds both formulae increase with the later mean and decrease with the fasting mean; using high later and low fasting values is conservative. The lower uses the opposite extremes. The stress describes graph reading, with no probability coverage. The moment envelope accounts separately for the unreported dependence structure of the sample.

## Interpretation

Under the graph stress, the pea-first sample mean positive area is 3425–4161 and soy-first 2436–3189 µU·min/mL (outward integer rounding). Pea minus soy is at least 237.1; the ratio lies in [1.074, 1.708] (rounded out). The order survives even using only the simpler Cauchy bound (lower ratio 1.040). The stronger central-vector interval [1.232, 1.504] is sensitive to the graph allowances. Equal absolute-log errors for the empirical prediction 93/71 and a tie occur at sqrt(93/71)=1.1445, which lies inside the stressed outer bounds. The positive-area ordering is supported; under graph stress superiority in ratio accuracy remains unresolved. The signed net-area comparison and the published 150-minute paired source comparison are separate results. Under an alternative SEM convention raised by Opus, the stressed ratio interval widens to 1.0624–1.7253 and still excludes a tie. These are finite-sample identification bounds. They supply neither a confidence interval for the population ratio nor an absolute forecast from food inputs.
