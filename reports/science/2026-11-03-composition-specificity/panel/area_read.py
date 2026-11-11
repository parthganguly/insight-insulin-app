"""Signed two-hour area and ratio bounds under two declared independent reading allowances."""
import json
from math import sqrt
from pathlib import Path
from witnesses import TIMES
ROOT=Path(__file__).resolve().parent
def run():
    x=json.loads((ROOT/"marginals.json").read_text(encoding="utf-8-sig"));out={}
    for times in [[0],[-30,0]]:
        w={t:0. for t in TIMES}
        for a,b in zip(TIMES[1:],TIMES[2:]):
            w[a]+=(b-a)/2;w[b]+=(b-a)/2
        for t in times:w[t]-=120/len(times)
        for h in [0,0.25*24/(684.554-556.468),.25]:
            areas={k:sum(w[t]*g[str(t)]["mean"] for t in TIMES) for k,g in x.items()}
            half=h*sum(abs(v) for v in w.values())
            intervals={}
            for age in ("young","old"):
                hi,lo=areas[age+"_high"],areas[age+"_low"]
                intervals[age]=[(hi-half)/(lo+half),(hi+half)/(lo-half)]
            out[str(times)+"/"+str(round(h,5))]={"areas":areas,"half_width_area":half,"ratio_bounds":intervals}
    return out
if __name__=="__main__":print(json.dumps(run(),indent=2,allow_nan=False))
