"""Audit frozen fits from Thondre and score independent Gunnerud arm means."""
import argparse
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FREEZE_SHA = "f5067487c9a760183ca78a2534147aa0efcdd555be9d42e9f72b6489bee2962e"

def reconstruct(train, scale, doses):
    ref = train["reference"]
    def slope(points):
        return sum(d*(area/ref-1) for d,area in points)/sum(d*d for d,area in points)
    slopes = {name:slope(train[name]) for name in ("whey","pea")}
    slopes["pooled"] = slope(train["whey"]+train["pea"])
    def lan(x):
        first, last = 1.1666666666666667, 1.5518518518518518
        if x <= 5:
            return 1+x/5*(first-1)
        return first+(min(x,30)-5)/25*(last-first)
    return [{"dose_g":dose,"pred":{**{key:1+b*dose*scale for key,b in slopes.items()},
                                    "no_change":1,"lan":lan(dose*scale)}} for dose in doses]

def compute():
    path=ROOT/"FROZEN.json"
    assert hashlib.sha256(path.read_bytes()).hexdigest()==FREEZE_SHA
    frozen=json.loads(path.read_text(encoding="utf-8"))
    target=json.loads((ROOT/"FACTS.json").read_text(encoding="utf-8-sig"))
    doses=[arm["protein_g"] for arm in target["whey"]]
    panels={}
    for scenario,scale in (("grams",1),("protein_per_glucose",2)):
        forecasts=reconstruct(frozen["training"],scale,doses)
        check(forecasts,frozen["scenarios"][scenario])
        rows=[]
        for forecast,arm in zip(forecasts,target["whey"]):
            observed=arm["mean"]/target["reference"]["mean"]
            errors={key:abs(math.log(r/observed)) for key,r in forecast["pred"].items()}
            rows.append(dict(dose_g=arm["protein_g"],observed=observed,predicted=forecast["pred"],errors=errors))
        panels[scenario]=dict(rows=rows,mean_absolute_log_error={
            k:sum(row["errors"][k] for row in rows)/len(rows) for k in rows[0]["errors"]})
    return panels

def check(a,b):
    if isinstance(a,dict):
        assert a.keys()==b.keys()
        for key in a:check(a[key],b[key])
    elif isinstance(a,list):
        assert len(a)==len(b)
        for x,y in zip(a,b):check(x,y)
    else:assert math.isclose(a,b,rel_tol=1e-12,abs_tol=1e-12)

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    results=compute()
    if parser.parse_args().check:
        check(results,json.loads((ROOT/"RESULTS.json").read_text(encoding="utf-8-sig")))
        print("PASS frozen predictions and both scenarios, three dose arms, five forecasters.")
    else:
        print(json.dumps(results,indent=2))
