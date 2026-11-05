"""Score pre-scoring forecasts and conservatively enclose reading error for the primary decision."""
import argparse
import itertools
import json
import math
from pathlib import Path
import runpy
from statistics import fmean

ROOT=Path(__file__).resolve().parent
def load(name):
    return json.loads((ROOT/name).read_text(encoding="utf-8"))

def difference(pred,obs):
    return abs(math.log(pred/obs))-abs(math.log(obs))

def primary_bound(pred, graph):
    # Condition on common zero and reference bar. Split their uncertainty intervals.
    # For each box use all eight corners for every observed ratio (positive denominators).
    # The difference of abs-log errors changes slope only at observed=1 and observed=prediction.
    # Summing within-box bounds is conservative because the common coordinates are shared.
    z0=graph["y_zero"]
    reference=graph["y_bar"]["W6"]
    half=graph["tolerance_px"]
    def bins(center):
        edges=[center-half+2*half*i/10 for i in range(11)]
        return list(zip(edges,edges[1:]))
    bounds=[]
    for z,ref in itertools.product(bins(z0),bins(reference)):
        ranges=[]
        for arm in ("low","BCAA","high"):
            y=graph["y_bar"][arm]
            ratios=[(a-b)/(a-c) for a,b,c in itertools.product(z,(y-half,y+half),ref)]
            lo,hi=min(ratios),max(ratios)
            candidates=[lo,hi]+[x for x in (1,pred[arm]) if lo<=x<=hi]
            delta=[difference(pred[arm],x) for x in candidates]
            ranges.append((min(delta),max(delta)))
        bounds.append(tuple(fmean(r[k] for r in ranges) for k in (0,1)))
    return [min(r[0] for r in bounds),max(r[1] for r in bounds)]

def calculate():
    frozen=load("frozen.json")
    current=runpy.run_path(str(ROOT/"predict.py"))["predict"]()
    def validate(a,b):
        if isinstance(a,dict):
            assert a.keys()==b.keys()
            for k in a:validate(a[k],b[k])
        elif a is None:assert b is None
        else:assert math.isclose(a,b,rel_tol=1e-13,abs_tol=1e-13)
    validate(frozen,current)
    data,graph=load("inputs.json"),load("reading.json")
    z=graph["y_zero"]
    native={a:(z-y)*5000/(z-graph["y_5000"]) for a,y in graph["y_bar"].items()}
    rows={}
    for a,b in itertools.combinations(data["arms"],2):
        ratio=native[b]/native[a]
        by_model={}
        for name,arms in frozen["ratios_vs_W6"].items():
            pred=None if None in (arms[a],arms[b]) else arms[b]/arms[a]
            by_model[name]={"forecast":pred,"absolute_log_error":None if pred is None else abs(math.log(pred/ratio))}
        rows[b+"/"+a]={"observed":ratio,"models":by_model}
    panels={}
    for name,arms in frozen["ratios_vs_W6"].items():
        def panel(keys):
            values=[rows[k]["models"][name]["absolute_log_error"] for k in keys]
            available=[v for v in values if v is not None]
            return {"coverage":len(available),"eligible":len(values),
                    "mean_error":fmean(available) if len(available)==len(values) else None}
        panels[name]={"vs_W6":panel([k for k in rows if k.endswith("/W6")]),"all_pairs":panel(rows)}
        if all(v is not None for v in arms.values()):
            panels[name]["vs_W6_error_minus_tie_reading_enclosure"]=primary_bound(arms,graph)
    # Free unhydrated amino acids each contain one nitrogen atom. Shared whey cancels.
    molar_masses={"alanine":89.09,"glycine":75.07,"leucine":131.17,"isoleucine":131.17,"valine":117.15}
    nitrogen={arm:sum(data["added_"+aa+"_g"][i]*14.007/mw for aa,mw in molar_masses.items())
              for i,arm in enumerate(data["arms"])}
    return {"bar_AUC_approximate_plot_units":native,"all_contrasts":rows,"loss":panels,
            "nitrogen_g_listed_added_free_amino_acids":nitrogen}

if __name__=="__main__":
    import sys
    result=calculate()
    if "--check" in sys.argv:
        # Recursive tolerant comparison is shared with the checkpoint-level runner.
        runpy.run_path(str(ROOT.parent/"check.py"))["compare"](result,load("results.json"))
        print("PASS substitution training, forecasts, six contrasts, coverage and reading bounds.")
    else:print(json.dumps(result,indent=2))
