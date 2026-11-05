"""Post-result comparison of published summaries and figure readings. Original frozen model is read only."""
import itertools
import json
import math
import sys
from pathlib import Path

from importlib.util import module_from_spec, spec_from_file_location

ROOT = Path(__file__).resolve().parent
spec = spec_from_file_location("manders_transfer", ROOT / "evaluate.py")
original = module_from_spec(spec)
spec.loader.exec_module(original)

def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))

def corners(center,radius):
    return itertools.product(*[(v-r,v+r) for v,r in zip(center,radius)])

def area_ratio(z,g,gl,w,water_adjust):
    origin = w if water_adjust else z
    return (origin-gl)/(origin-g)

def log_error(ratio,observed):
    return abs(math.log(ratio/observed))

def compute():
    source=read(ROOT/"GRAPH_REFERENCE_v2.json")
    target=read(ROOT/"EVIDENCE.json")
    baseline=original.main()
    a,bar=source["axis"],source["bar_y"]
    z,top=a["zero_y"],a["4000_y"]
    central=[z,bar["G"],bar["G_plus_leucine"],bar["water"]]
    source_corners=list(corners(central,[a["read_radius_px"]]+[source["bar_read_radius_px"]]*3))
    ref={"original_abstract":(source["reported_2008"],[source["reported_2008"]]),
         "iverson_2014_citation":(source["cited_2014"],[source["cited_2014"]])}
    for label,adjust in (("graphic_raw",False),("graphic_water_adjusted",True)):
        ref[label]=(area_ratio(*central,adjust),[area_ratio(*x,adjust) for x in source_corners])
    out={"read_areas":{k:4000*(z-y)/(z-top) for k,y in bar.items()},
         "source_ratio":{k:{"central":v,"reading_range":[min(c),max(c)]} for k,(v,c) in ref.items()},
         "panels":{}}
    for group in ("healthy","T2D"):
        panel=baseline[group]
        shape=target[group]["bar_tops_y_G_H_HL"]
        observed=panel["observed_HL_over_H"]
        g,h,_=panel["area_means_G_H_HL"]
        # Both ratio scores and calibrated G/H cancel the top tick scale.
        target_corners=list(corners([target["axis_zero_y"]]+shape,
            [target["tick_uncertainty_px"]]+[target["top_uncertainty_px"]]*3))
        results={}
        for label,(v,svals) in ref.items():
            results[label]={}
            for name in ("whole_multiplier","increment_on_carbohydrate"):
                def predict(v,g_h):
                    return v if name=="whole_multiplier" else 1+(v-1)*g_h
                p=predict(v,g/h)
                diffs={k:[] for k in ("no_change","macro_energy","protein_or_AA_mass","conditional_mass_increment")}
                errs=[]
                for sv,(yz,yg,yh,yl) in itertools.product(svals,target_corners):
                    gh=(yz-yg)/(yz-yh)
                    targetratio=(yz-yl)/(yz-yh)
                    error=log_error(predict(sv,gh),targetratio)
                    errs.append(error)
                    for k in diffs:
                        comparison=1+(1-gh)/3 if k=="conditional_mass_increment" else panel["forecasts"][k]
                        diffs[k].append(error-log_error(comparison,targetratio))
                results[label][name]={"prediction":p,"absolute_log_error":log_error(p,observed),
                    "error_corner_range":[min(errs),max(errs)],
                    "central_error_minus_comparator":{k:log_error(p,observed)-panel["abs_log_errors"][k] for k in diffs},
                    "corner_error_minus_comparator":{k:[min(xs),max(xs)] for k,xs in diffs.items()}}
        assert math.isclose(results["original_abstract"]["whole_multiplier"]["absolute_log_error"],
                            panel["abs_log_errors"]["external_free_leucine_multiplier"],abs_tol=1e-12)
        assert math.isclose(results["original_abstract"]["increment_on_carbohydrate"]["absolute_log_error"],
                            panel["abs_log_errors"]["conditional_external_increment"],abs_tol=1e-12)
        out["panels"][group]=results
    return out

if __name__=="__main__":
    data=compute()
    if "--check" in sys.argv:
        original.check(data,read(ROOT/"GRAPH_RESULTS_v2.json"))
        print("PASS original 1.66 anchor, 4 references, 2 response links, 2 target groups, graph corners and comparator differences")
    else: print(json.dumps(data,indent=2))
