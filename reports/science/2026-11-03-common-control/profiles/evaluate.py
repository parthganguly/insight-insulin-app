"""Score a separately measured six-source, single-bolus net insulin-area panel."""
import itertools
import json
import math
import runpy
import sys
from pathlib import Path
from statistics import fmean

ROOT=Path(__file__).resolve().parent
def load(name):return json.loads((ROOT/name).read_text(encoding="utf-8-sig"))

def metric(obs,forecasts,panel):
    ready=[a for a in panel if forecasts[a] is not None]
    errors=[abs(math.log(forecasts[a]/obs[a])) for a in ready]
    pairerrors={f"{b}/{a}":abs(math.log((forecasts[b]/forecasts[a])/(obs[b]/obs[a])))
                for a,b in itertools.combinations(ready,2)}
    return {"n_arms":len(ready),"n_pairs":len(pairerrors),"level_log_mae":fmean(errors),
            "contrast_log_mae":fmean(pairerrors.values()),"pair_errors":pairerrors}

def scenarios(centers,half):
    for e in itertools.product((-half,half),repeat=len(centers)):
        yield [v+d for v,d in zip(centers,e)]

def difference_bounds(pr,ob):
    # Extremize |log(p/o)|-|log(o)| in a rectangle; piecewise linear in log p/log o.
    xs=list(map(math.log,pr)); ys=list(map(math.log,ob))
    knots=[*ys,*[v for v in [0,*xs] if ys[0]<=v<=ys[1]]]
    vals=[abs(x-y)-abs(y) for y in knots for x in (*xs,min(xs[1],max(xs[0],y)))]
    return min(vals),max(vals)

def evaluate():
    pred=runpy.run_path(str(ROOT/"predict.py"))["predict"]()
    read=load("reading.json")
    y=read["top_y"]; z=read["zero_y"]
    scale=3500/(z-read["tick_3500_y"])
    area={a:(z-v)*scale for a,v in y.items()}
    obs={a:v/area["CHO"] for a,v in area.items() if a!="CHO"}
    nominal=["pea","whey","gluten"]
    scores={}
    for mode,arms in pred["scenarios"].items():
        model_scores={}
        for model in arms["pea"]["ratios"]:
            forecast={a:row["ratios"][model] for a,row in arms.items()}
            model_scores[model]={"available_set":metric(obs,forecast,list(obs)),
                                 "nominal_common_set":metric(obs,forecast,nominal),
                                 "local_CHO_calibrated_areas":{a:area["CHO"]*v if v is not None else None for a,v in forecast.items()}}
        scores[mode]=model_scores
    # In projected source-to-source ratios the training glucose control cancels.
    w={a:row["weights"] for a,row in pred["scenarios"]["closed"].items()}
    library=load("training.json")
    area_sets=list(scenarios(library["hydrolysate_areas"],library["reading_half_width"]))
    uncertainty={}
    for a,b in itertools.combinations(obs,2):
        projected=[]
        for centers in area_sets:
            mix=lambda arm:sum(v*w[arm][name] for name,v in zip(pred["training_order"],centers))
            projected.append(mix(b)/mix(a))
        observed=[(zero-yt)/(zero-yb) for zero,yt,yb in scenarios([z,y[b],y[a]],read["reading_half_px"])]
        uncertainty[b+"/"+a]=difference_bounds((min(projected),max(projected)),(min(observed),max(observed)))
    return {"native_areas":area,"observed_ratios":obs,"scores":scores,"pairwise_difference_bounds":uncertainty,
            "conservative_primary_difference_interval":[fmean(v[i] for v in uncertainty.values()) for i in (0,1)]}

if __name__=="__main__":
    result=evaluate()
    if "--check" in sys.argv:
        compare=runpy.run_path(str(ROOT.parent/"compare.py"))["compare"]
        # Tuple-valued internal calculations are serialized as JSON arrays.
        compare(json.loads(json.dumps(runpy.run_path(str(ROOT/"predict.py"))["predict"]())),load("frozen.json"))
        compare(json.loads(json.dumps(result)),load("results.json"))
        print("PASS frozen profiles, two projections, all arm levels and formulation contrasts")
    else:print(json.dumps(result,indent=2))
