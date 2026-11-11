# Offset-family verifier

Independently checked root `offset_bound.py` using both frozen Astra and own Sol native screenshot readings. Replay is standard-library-only: `python verify_offset_family.py` with `offset_family_inputs.json`. Output `offset_family_verification.json`. All 18 coordinator numeric bounds reproduced within 1 e−12; numerical convex-combination checks passed for both release orientations, multiple scales and nonnegative offsets.

The restriction is mathematically correct. For released gramsd_b>0 and commonq≥0,

`(q+d_a)/(q+d_b) = w*(d_a/d_b)+(1-w)`, where `w=d_b/(q+d_b)`.

Every finiteq therefore moves the ratio from direct release toward 1. When releases differ,1 is only approached asq→∞; the reported closed interval is an outer envelope, not a statement that 1 is attained at finiteq. A common positive mass conversion changesq's scale but cannot change the union over allq. This is a family restriction, stronger than checking the fitted hummus offset alone.

At fixed axes and±2 pixel post-baseline/assay marker readings, all three pair envelopes are disjoint in both reading conventions. Sol values:

|Pair|Allq closed outer envelope|Clinical signed 120 reading range|
|---|---|---|
|HAWB/WWB|[.745762,1]|[.565114,.590416]|
|SP/WWB|[.612661,1]|[.583258,.608853]|
|HAWB/SP|[1,1.245395]|[.943166,.996168]|

HAWB/WWB separation is substantial. The other two gaps are onlyabout.0038. They admit overlap under either±3 pixel markers, or±2 pixel markers plus a±1 pixel zero-axis stress. The HAWB/WWB disjointness survives both stresses. Consequently do not describe all three numerical exclusions as robust to arbitrary digitization choices. This stress does not invalidate the stated root±2 pixel fixed-axis result.

The mathematical scope covers common nonnegative backgrounds with these positive released-gram inputs. The numerical scope is H 30, printed total-starch grams, signed arithmetic mean-curve 120 areas, fixed incremental baseline 0 and the specified reading box. It is not a population confidence interval, an individual-positive-AUC result, a statement about reported II, other assay times, negative or food-specific offsets, nonlinear maps, or all possible meal-response models. No original papers/images were copied or Git actions taken.
