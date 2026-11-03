"""Finite-sample bounds, using only nonnegative insulin and the scheduled group means."""
import csv,json,math
from pathlib import Path
from statistics import fmean
from leucine import evaluate as leucine_evaluation

ROOT=Path(__file__).resolve().parents[1]

def trap(ts,ys):
    return sum((t-s)*(p+q)/2 for s,t,p,q in zip(ts,ts[1:],ys,ys[1:]))

def clipped(ts,ys):
    area=0.
    for s,t,p,q in zip(ts,ts[1:],ys,ys[1:]):
        if min(p,q)>=0:area+=(t-s)*(p+q)/2
        elif max(p,q)>0:area+=(t-s)*max(p,q)**2/(2*abs(q-p))
    return area

def bounds(ts,ys,h):
    # Supplied figure coordinate reads have a common origin; differences use the same scale.
    delta_lower=[0.]+[v-ys[0]-2*h for v in ys[1:]]
    upper=[0.]+[v+h for v in ys[1:]]
    return [clipped(ts,delta_lower),trap(ts,upper)]

def ratio(num,den):
    return [num[0]/den[1],num[1]/den[0]]

def evaluate():
    curves={}
    with (ROOT/"astra/target-course.csv").open(encoding="utf-8-sig") as file:
        for r in csv.DictReader(file):
            if int(r["minute"])<=120:
                curves.setdefault(r["arm"],[]).append((int(r["minute"]),int(r["y_pixel"])))
    output={}
    candidates=leucine_evaluation()["predictions"]
    for pad in [0,6]:
        arms={}
        for a,series in curves.items():
            t,y=zip(*series)
            arms[a]=bounds(t,[(750-v)*1000/733 for v in y],pad*1000/733)
        low=ratio(arms["blend_low"],arms["wheat_low"])
        high=ratio(arms["blend_high"],arms["wheat_high"])
        actual={"low_blend_over_wheat":low,"high_blend_over_wheat":high,
                "high_over_low_contrast":ratio(high,low)}
        test={}
        for m,row in candidates.items():
            test[m]={}
            for label,p in row["ratios"].items():
                lo,hi=actual[label]
                # ln-ratio loss difference vs equality is monotone in log outcome when p>=1.
                diffs=[abs(math.log(p/y))-abs(math.log(y)) for y in (lo,hi)]
                test[m][label]={"tie_crossing":math.sqrt(p),"error_minus_tie":[min(diffs),max(diffs)],
                                "strictly_better_throughout":max(diffs)<0}
        w1,w2=arms["wheat_low"],arms["wheat_high"]
        b1,b2=arms["blend_low"],arms["blend_high"]
        diff=[b2[0]+w1[0]-w2[1]-b1[1],b2[1]+w1[1]-w2[0]-b1[0]]
        output[str(pad)]={"arms":arms,"ratios":actual,"additive_change_outer":diff,"test":test}
    return output

if __name__=="__main__":print(json.dumps(evaluate(),indent=2,allow_nan=False))
