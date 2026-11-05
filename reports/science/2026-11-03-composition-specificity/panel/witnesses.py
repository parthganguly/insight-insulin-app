"""Synthetic moment witnesses: same drawn marginal means and SEs, alternate assignments across time."""
from math import sqrt,isclose,log
from pathlib import Path
import json
from statistics import mean,stdev
ROOT=Path(__file__).resolve().parent
TIMES=(-30,0,15,30,45,60,75,90,120)
def pos_area(xs):
    area=0.
    for a,b,t,u in zip(xs,xs[1:],TIMES[1:],TIMES[2:]):
        if min(a,b)>=0:area+=(u-t)*(a+b)/2
        elif max(a,b)>0:area+=(u-t)*max(a,b)**2/(2*abs(b-a))
    return area

def witness(points,n,coupling,baseline):
    k=n//2-1
    arr=[[] for _ in range(n)]
    for t in TIMES:
        mu=points[str(t)]["mean"]; se=points[str(t)]["sem"]
        shift=0 if coupling=="aligned" or t<=0 else k
        high=mu+se*sqrt((n-1)*(n-k)/k)
        low=mu-se*sqrt((n-1)*k/(n-k))
        assert low>=0
        col=[high if (i-shift)%n<k else low for i in range(n)]
        assert isclose(mean(col),mu,abs_tol=1e-12)
        assert isclose(stdev(col)/sqrt(n),se,abs_tol=1e-12)
        for series,v in zip(arr,col):series.append(v)
    def integration(a):
        b=(a[0]+a[1])/2 if baseline=="two_predose" else a[1]
        return pos_area([v-b for v in a[1:]])
    return mean(map(integration,arr))

def calculate():
    data=json.loads((ROOT/"marginals.json").read_text(encoding="utf-8-sig"))
    result={}
    q=1.1154675776169127
    for age,n in [("young",8),("old",10)]:
        for basal in ["two_predose","t0"]:
            arms={arm:{flag:witness(data[age+"_"+arm],n,flag,basal) for flag in ["aligned","reassigned"]}
                  for arm in ["high","low"]}
            settings=[]
            for h in arms["high"]:
                for lo in arms["low"]:
                    ratio=arms["high"][h]/arms["low"][lo]
                    settings.append({"high_assignment":h,"low_assignment":lo,"ratio":ratio,
                                     "frozen_slope_closer_than_tie":abs(log(q/ratio))<abs(log(ratio))})
            result[age+"_"+basal]={"synthetic_mean_positive_areas":arms,"attained_examples":settings,
                  "conventions":"mean of individual linearly interpolated above-baseline area; not participant records or extreme attainable bounds"}
    return result
if __name__=="__main__":print(json.dumps(calculate(),indent=2,allow_nan=False))
