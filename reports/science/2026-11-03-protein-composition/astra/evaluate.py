"""Reproduce frozen Manders forecasts from published figure coordinates."""
import hashlib
import itertools
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent

def evaluate(means, rules):
    g,h,hl=means
    pred={**rules["food_input_rules"],
          "conditional_mass_increment":1+(h-g)/(3*h),
          "conditional_external_increment":1+.66*g/h}
    observed=hl/h
    err={k:abs(math.log(v/observed)) for k,v in pred.items()}
    return {"observed_HL_over_H":observed,"forecasts":pred,"abs_log_errors":err}

def main():
    path=ROOT/"FREEZE.json"
    assert hashlib.sha256(path.read_bytes()).hexdigest()=="5c20cebd0d2b88b85c17c68ef1a01211ea4eb36a951934915d9e14c35c166072"
    rules=json.loads(path.read_text(encoding="utf-8-sig"))
    source=json.loads((ROOT/"EVIDENCE.json").read_text(encoding="utf-8-sig"))
    panels={}
    for group in ("healthy","T2D"):
        arm=source[group]
        y0,y120=source["axis_zero_y"],source["axis_120_y"]
        def decode(y0,y120,tops):
            return [120*(y0-y)/(y0-y120) for y in tops]
        tops=arm["bar_tops_y_G_H_HL"]
        means=decode(y0,y120,tops)
        central=evaluate(means,rules)
        wiggle=source["top_uncertainty_px"]
        tick=source["tick_uncertainty_px"]
        corners=[evaluate(decode(y0+i*tick,y120+j*tick,
                                 [y+v*wiggle for y,v in zip(tops,offsets)]),rules)
                 for i,j,*offsets in itertools.product([-1,1],repeat=5)]
        errors=central["abs_log_errors"]
        central["reading_corner_error_ranges"]={key:[
            min(c["abs_log_errors"][key] for c in corners),
            max(c["abs_log_errors"][key] for c in corners)] for key in errors}
        central["corner_observed_ratio_range"]=[min(c["observed_HL_over_H"] for c in corners),
                                                max(c["observed_HL_over_H"] for c in corners)]
        central["area_means_G_H_HL"]=means
        central["published_percent_compound_diagnostic"]=(
            (100+arm["text_percent_changes_vs_G"][1])/(100+arm["text_percent_changes_vs_G"][0]))
        central["additional_panels"]={}
        for key,obs,energy in (("H/G",means[1]/means[0],1/.7),("HL/G",means[2]/means[0],1.1/.7)):
            candidates={"no_change":1,"macro_energy":energy}
            if key=="HL/G":
                candidates.update({k+"_conditional_on_H":means[1]/means[0]*v
                                  for k,v in central["forecasts"].items()})
            central["additional_panels"][key]={"observed":obs,"forecasts":candidates,
                "abs_log_errors":{k:abs(math.log(v/obs)) for k,v in candidates.items()}}
        panels[group]=central
    return panels

def check(a,b):
    if isinstance(a,dict):
        assert a.keys()==b.keys()
        for key in a:check(a[key],b[key])
    elif isinstance(a,list):
        assert len(a)==len(b)
        for x,y in zip(a,b):check(x,y)
    else: assert math.isclose(a,b,rel_tol=1e-12,abs_tol=1e-12)

if __name__=="__main__":
    result=main()
    if "--check" in sys.argv:
        check(result,json.loads((ROOT/"RESULTS.json").read_text(encoding="utf-8-sig")))
        print("PASS both cohorts and all 32 figure-reading scenarios per cohort")
    else:print(json.dumps(result,indent=2))
