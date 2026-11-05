"""Ratio forecasts from per-meal scores. No evaluation insulin used in fitting."""
import itertools
import math
from pathlib import Path
import json
from statistics import fmean,median

ROOT=Path(__file__).resolve().parent
def read(name):
    return json.loads((ROOT/name).read_text(encoding='utf-8-sig'))

def fit(points):
    x,y=zip(*points)
    mean_x,mean_y=fmean(x),fmean(y)
    var=sum((a-mean_x)**2 for a in x)
    cov=sum((a-mean_x)*(b-mean_y) for a,b in points)
    return cov/var,cov,var

def coefficients():
    inputs=read("training.json")
    params={}
    sums=[]
    for form,rows in inputs["Bornet"].items():
        points=[(math.log1p(-r['amylose_pct']/100),math.log(r['area180'])) for r in rows]
        slope,cov,var=fit(points)
        sums.append((cov,var))
        params[form]={"exponent":slope,"leave_one_source_out":{
            rows[i]["source"]:fit([p for j,p in enumerate(points) if j!=i])[0] for i in range(len(points))}}
    params["shared"]=sum(s[0] for s in sums)/sum(s[1] for s in sums)
    hh=inputs["hummus"]
    r=hh["ICC_area"]/hh["RCC_area"]
    d=hh["ICC_release_g"]/hh["RCC_release_g"]
    params["assay"]={"human_ratio":r,"H_ratio":d,"pair_lambda":(1-r)/(1-d),
                     "power":math.log(r)/math.log(d),
                     "background_grams":(r*hh["RCC_release_g"]-hh["ICC_release_g"])/(1-r)}
    return params

def forecasts(frac,ref,param):
    t=(1-frac)/(1-ref)
    return {"tie":1.0,"amylopectin":t,"shared_state":t**param["shared"],
            "heated":t**param["gel"]["exponent"],"raw_diagnostic":t**param["raw"]["exponent"]}

def error(p,o):
    if min(p,o)<=0: return None
    return abs(math.log(p/o))

def assays(m1,m0,pars):
    """m is measured starch release (grams at the serving), same assay/time within pair."""
    x=m1/m0; q=pars["assay"]
    return {"tie":1,"direct":x,"power":x**q["power"],"oriented_affine":1+q["pair_lambda"]*(x-1),
            "offset_score":(q["background_grams"]+m1)/(q["background_grams"]+m0)}
if __name__=="__main__":print(json.dumps(coefficients(),indent=2))
