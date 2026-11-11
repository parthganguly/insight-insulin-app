"""Post-hoc direct T/I aggregate diagnostics, separate from frozen D objective.
Nonnegative individual concentrations B and X(t), linear interpolation.
Jensen: integral max(mean(X-B),0) <= mean integral max(X-B,0).
Upper: on first interval starting baseline at -5, positive increment <=
((t+5)/35)*mean(X30), and later <= mean(X(t)). These are deterministic
finite-sample bounds, not confidence intervals or population intervals.
"""
from pathlib import Path
import json,math,itertools
from calculate import PIXELS,SCALE,TIMES,trapezoid,ROOT
donor={"fasting":3936.03/2583.40,"mixed":7826.56/5635.36}
controls={"fasting":1.76325167,"mixed":1.61118669}
constituent=1/((1+1.2/8.1)/2)
def area_bounds(y,end=120):
    signed=trapezoid(y,end)
    # All sampled mean increments are >=0 to120 here, so lower equals signed.
    assert all(v>=y[0] for v in y[1:5])
    first=30*(1+5/35)/2*y[1]
    upper=first+sum(30*(a+b)/2 for a,b in zip(y[1:4],y[2:5]))
    return signed,upper
r={}
for context,pix in PIXELS.items():
    y={a:[(641-v)/SCALE[a] for v in vs] for a,vs in pix.items()}
    b={a:area_bounds(v) for a,v in y.items()}
    observed=b["T"][0]/b["I"][0]
    bounds=[b["T"][0]/b["I"][1],b["T"][1]/b["I"][0]]
    # Conservative reading bounds in addition to finite-sample bounds.
    pert={}
    for arm in ("T","I"):
       bs=[area_bounds([v+sgn*2/SCALE[arm] for v,sgn in zip(y[arm],ss)])
          for ss in itertools.product((-1,1),repeat=7)]
       pert[arm]=[min(z[0] for z in bs),max(z[1] for z in bs)]
    conservative=[pert["T"][0]/pert["I"][1],pert["T"][1]/pert["I"][0]]
    r[context]={"donor_signed120_T_over_I":donor[context],
      "target_signed120_T_over_I":observed,"target_positive120_ratio_bound":bounds,
      "including_2px_reading_bound":conservative,
      "target_arm_positive120_bounds":b,
      "signed_ALE_donor":abs(math.log(donor[context]/observed)),
      "signed_ALE_equality":abs(math.log(observed))}
    # Area is a linear functional: total positive post-sample coefficient
    # equals the magnitude of its negative baseline coefficient.
    baseline_weight=30*(1+5/35)/2+90
    signed_reading_error={arm:4*baseline_weight/SCALE[arm] for arm in ("T","I")}
    r[context].update({
      "generic_same_donor_G_over_S":controls[context],
      "signed_ALE_generic_same_donor":abs(math.log(controls[context]/observed)),
      "generic_vs_matched_midpoint":math.sqrt(controls[context]*donor[context]),
      "constituent_prediction":constituent,
      "signed_ALE_constituent":abs(math.log(constituent/observed)),
      "constituent_vs_matched_midpoint":math.sqrt(constituent*donor[context]),
      "signed_2px_T_over_I_bounds":[
       (b["T"][0]-signed_reading_error["T"])/
       (b["I"][0]+signed_reading_error["I"]),
       (b["T"][0]+signed_reading_error["T"])/
       (b["I"][0]-signed_reading_error["I"])]})
(ROOT/"direct_results.json").write_text(json.dumps(r,indent=2))
if __name__ == "__main__":
    print(json.dumps(r,indent=2))
