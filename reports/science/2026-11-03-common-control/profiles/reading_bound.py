"""Paired error comparison with shared figure coordinates. No clinical covariance is inferred."""
import itertools
import json
import math
from pathlib import Path
import runpy
from statistics import fmean
import sys

ROOT=Path(__file__).resolve().parent
def load(n):return json.loads((ROOT/n).read_text())
def corners(center,h):
    return itertools.product(*[(v-h,v+h) for v in center])
def logp(weights,training):
    return [math.log(sum(w*x for w,x in zip(row,training))) for row in weights]
def delta(p,o,pairs):
    return fmean(abs((p[i]-p[j])-(o[i]-o[j]))-abs(o[i]-o[j]) for i,j in pairs)
def calculate():
    f=load("frozen.json")["scenarios"]["closed"]
    r=load("reading.json")
    t=load("training.json")
    names=list(f)
    w=[[f[a]["weights"][s] for s in ("whey","pea","wheat")] for a in names]
    pairs=list(itertools.combinations(range(len(names)),2))
    centers=[r["top_y"][n] for n in names]
    h=r["reading_half_px"]; z0=r["zero_y"]
    # Every observed ranking is strict throughout the +/-1 pixel box.
    assert all(abs(centers[i]-centers[j])>2*h for i,j in pairs)
    obs=[list(map(math.log,(z-y for y in ys))) for z in (z0-h,z0+h) for ys in corners(centers,h)]
    train=t["hydrolysate_areas"]; k=t["reading_half_width"]
    predictions=[logp(w,v) for v in corners(train,k)]
    evaluations=[(delta(p,o,pairs),p,o) for p,o in itertools.product(predictions,obs)]
    low,pc,oc=min(evaluations,key=lambda row:row[0])
    # For every pair |a-b| >= sign(a_c-b_c)*(a-b). In this box |b| is affine
    # in log-observations because the ordering of the observed bars cannot change.
    # Collect coefficients before bounding, preserving repeated arms in the loss.
    cp=[0]*len(names);co=[0]*len(names)
    for i,j in pairs:
        residual=(pc[i]-pc[j])-(oc[i]-oc[j])
        sign=1 if residual>=0 else -1
        # Any supporting slope in [-1,1] gives a valid bound. A half-slope
        # sharpens the certificate for the rice/egg residual, which crosses zero.
        if (names[i],names[j])==("rice","egg"):sign=0.5
        sign_obs=1 if oc[i]>oc[j] else -1
        cp[i]+=sign; cp[j]-=sign
        co[i]-=sign+sign_obs; co[j]+=sign+sign_obs
    def lower(c,lo,hi):
        return sum(a*(x if a>=0 else y) for a,x,y in zip(c,lo,hi))
    # Enclose the divided 3-D training box and 1-D shared-zero box. Log is
    # monotonic; training weights are nonnegative. Lower bounds, not discrete minima.
    n=64
    grid=lambda v,half:[(v-half+2*half*i/n,v-half+2*half*(i+1)/n) for i in range(n)]
    train_lower=min(lower(cp,logp(w,[a for a,b in box]),logp(w,[b for a,b in box]))
                    for box in itertools.product(*(grid(v,k) for v in train)))
    obs_lower=min(lower(co,[math.log(a-y-h) for y in centers],[math.log(b-y+h) for y in centers])
                  for a,b in grid(z0,h))
    return {"corner_count":len(evaluations),"corner_min":low,"corner_max":max(a for a,_,_ in evaluations),
            "continuous_lower_bound":(train_lower+obs_lower)/len(pairs),"subdivisions":n,
            "sign_support_forecast":cp,"sign_support_observed":co}

if __name__=="__main__":
    result=calculate()
    if "--check" in sys.argv:
        runpy.run_path(str(ROOT.parent/"compare.py"))["compare"](result,load("reading_bound.json"))
        print("PASS joint reading corners and continuous supporting bound")
    else:print(json.dumps(result,indent=2))
