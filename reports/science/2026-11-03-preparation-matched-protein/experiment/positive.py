"""Outer bounds on the empirical mean positive area from marginal sample moments.
See POSITIVE.md. All areas refer to the observed nominal time grid.
"""
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent

def area(times, ordinates):
    return sum((b-a)*(p+q)/2 for a,b,p,q in zip(times,times[1:],ordinates,ordinates[1:]))

def lower_piecewise(times, delta):
    total=0
    for a,b,x,y in zip(times,times[1:],delta,delta[1:]):
        if min(x,y)>=0:
            total+=(b-a)*(x+y)/2
        elif max(x,y)>0:
            total+=(b-a)*max(x,y)**2/(2*abs(y-x))
    return total

def bounds(ts, means, sems, n, marker_error, sem_pad):
    baseline=means[0]
    lo=[0.0]
    positive_high=[0.0]
    finite_high=[0.0]
    for mean,se in zip(means[1:],sems[1:]):
        # These extremes are shared by every point. For upper D+, the response
        # mean increases and the baseline decreases in BOTH analytic bounds.
        hi_mu=(mean+marker_error)-(baseline-marker_error)
        lo.append(mean-baseline-2*marker_error)
        sigma0=math.sqrt(n-1)*(sems[0]+sem_pad)
        sigma=math.sqrt(n-1)*(se+sem_pad)
        positive_high.append(min(mean+marker_error,
                                 (hi_mu+math.hypot(hi_mu,sigma+sigma0))/2))
        by_count=[]
        for neg in range(n+1):
            frac=neg/n
            c=math.sqrt(frac*(1-frac))
            # Averaging changes over nonnegative responders, or subtracting at
            # most the baselines of the negative responders, respectively.
            partial=(1-frac)*hi_mu+c*(sigma+sigma0)
            clipped_floor=(mean+marker_error)-(1-frac)*(baseline-marker_error)+c*sigma0
            by_count.append(min(partial,clipped_floor))
        finite_high.append(min(positive_high[-1],max(by_count)))
    return {"mean_net":area(ts,[x-baseline for x in means]),
            "lower":lower_piecewise(ts,lo),
            "upper_cauchy":area(ts,positive_high),"upper_finite_n":area(ts,finite_high),
            "per_time_lower_delta":lo,"per_time_upper_cauchy":positive_high,
            "per_time_upper_finite_n":finite_high}

def evaluate():
    j=json.loads((ROOT/"curves/graph-input.json").read_text())
    s=json.loads((ROOT/"curves/SEM-input.json").read_text())
    ref=json.loads((ROOT/"experiment/facts.json").read_text())["concurrent_figure"]
    z=ref["zero_y"]; tops=ref["top_y"]
    prediction=(z-tops["pea"])/(z-tops["soy"])
    times=j["minutes"][:6]
    out={}
    for label,mean_tol,sem_pad in [("drawn",0,0),("graph_stress",0.5,1.1)]:
        arms={}
        for arm,rows in s["arms"].items():
            mu=j["panels"]["4.4B"]["series"][arm]["means"][:6]
            se=[row["sem"] for row in rows[:6]]
            arms[arm]=bounds(times,mu,se,8,mean_tol,sem_pad)
        pea,soy=arms["pea_then_cho"],arms["soy_then_cho"]
        ratios={key:[pea["lower"]/soy[key],pea[key]/soy["lower"]]
                for key in ("upper_cauchy","upper_finite_n")}
        out[label]={"marker_halfwidth":mean_tol,"sem_upper_pad":sem_pad,"arms":arms,
                    "pea_over_soy_outer_bounds":ratios,
                    "pea_minus_soy_lower_finite_n":pea["lower"]-soy["upper_finite_n"],
                    "external_better_than_tie_above":math.sqrt(prediction)}
    return out

if __name__=="__main__":
    result=evaluate()
    if sys.argv[1:]==["--snapshot"]:
        (Path(__file__).parent/"positive.json").write_text(json.dumps(result,indent=2)+"\n")
    elif sys.argv[1:]:
        raise SystemExit("usage: positive.py [--snapshot]")
    else:
        print(json.dumps(result,indent=2))
