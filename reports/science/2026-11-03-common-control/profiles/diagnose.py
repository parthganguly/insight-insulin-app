"""Post-result diagnostic of library limits, matched profiles and reassignment sensitivity."""
import csv
import itertools
import json
import math
import runpy
import sys
from pathlib import Path
from statistics import fmean

ROOT=Path(__file__).resolve().parent
def load(name):return json.loads((ROOT/name).read_text(encoding="utf-8"))
def distance(x,y):return abs(math.log(x/y))
def calculate():
    frozen=load("frozen.json");out=load("results.json");library=load("training.json")
    results=out["scores"]["closed"]
    tie=results["no_change"]["available_set"]["pair_errors"]
    reported=results["profile_projection"]["available_set"]["pair_errors"]
    influence={}
    for name in out["observed_ratios"]:
        select=[k for k in tie if name not in k.split("/")]
        influence[name]={"remaining_pairs":len(select),"tie":fmean(tie[k] for k in select),
                         "projection":fmean(reported[k] for k in select)}
    data=frozen["scenarios"]["closed"]
    names=list(out["observed_ratios"])
    obs=out["observed_ratios"]
    forecasts=[data[a]["ratios"]["profile_projection"] for a in names]
    idx=list(itertools.combinations(range(len(names)),2))
    def loss(assignment):
        return fmean(distance(assignment[j]/assignment[i],obs[names[j]]/obs[names[i]]) for i,j in idx)
    actual=loss(forecasts)
    perm=[loss(f) for f in itertools.permutations(forecasts)]
    lo=min(library["hydrolysate_areas"])/library["control_area"]
    hi=max(library["hydrolysate_areas"])/library["control_area"]
    h=library["reading_half_width"]
    generous=(max(library["hydrolysate_areas"])+h)/(library["control_area"]-h)
    read=load("reading.json")
    def min_target(a):
        z,y,g=read["zero_y"],read["top_y"][a],read["top_y"]["CHO"]
        return min((z+dz-y-dy)/(z+dz-g-dg) for dz,dy,dg in itertools.product((-1,1),repeat=3))
    with (ROOT/"target_profiles.csv").open(encoding="utf-8") as f:rows=list(csv.DictReader(f))
    similarity={}
    table=library["aa_pct_by_wt"]
    for target,source in (("gluten","wheat"),("pea","pea"),("whey","whey")):
        anchor=dict(zip(table["_order"],table[source+"_hydrolysate"]))
        anchor.update(Asx=anchor["Asn"]+anchor["Asp"],Glx=anchor["Glu"]+anchor["Gln"])
        x=[anchor[k] for k in frozen["profile_coordinates"]]
        y=[float(row[target]) for row in rows if row["aa"] in frozen["profile_coordinates"]]
        similarity[target]=sum(abs(a/sum(x)-b/sum(y)) for a,b in zip(x,y))/2
    # Positive area P = signed net N + below-baseline magnitude B (B >= 0).
    # These are required unknowns for a hypothetical endpoint reconciliation.
    # They are NOT estimates of actual B from a group-mean trajectory.
    native=out["native_areas"]
    q=forecasts[names.index("gluten")]/forecasts[names.index("whey")]
    bridge={"whey_minus_gluten_net":native["whey"]-native["gluten"],
            "predicted_gluten_over_whey":q,
            "B_gluten_minus_q_times_B_whey_for_predicted_ratio":q*native["whey"]-native["gluten"],
            "minimum_B_CHO_for_all_positive_ratios_below_library_ceiling":
                max(native[a]/hi for a in names)-native["CHO"]}
    return {"positive_endpoint_requirements":bridge,"library_ratio_range":[lo,hi],"generous_reading_ceiling":generous,
            "target_lower_readings":{a:min_target(a) for a in names},
            "closed_profile_total_variation_matched":similarity,"leave_label_out_scoring_only":influence,
            "paired_improvements":sum(reported[k]<tie[k] for k in tie),
            "permutation":{"n":len(perm),"observed_loss":actual,"min_loss":min(perm),"max_loss":max(perm),
            "better":sum(score<actual-1e-12 for score in perm),"equal":sum(abs(score-actual)<=1e-12 for score in perm),
            "worse":sum(score>actual+1e-12 for score in perm),"average_loss":fmean(perm)}}

if __name__=="__main__":
    result=calculate()
    if "--check" in sys.argv:
        runpy.run_path(str(ROOT.parent/"compare.py"))["compare"](result,load("diagnostics.json"))
        print("PASS all 720 assignments, six influence summaries, same-source profiles and library ceiling")
    else:print(json.dumps(result,indent=2))
