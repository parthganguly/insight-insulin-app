"""Contrast the two glucose-plus-leucine protocols and separate numerator from reference."""
import itertools
import json
import math
from pathlib import Path
import runpy
import sys
from statistics import fmean

ROOT=Path(__file__).resolve().parent
def load(name):
    return json.loads((ROOT/name).read_text(encoding="utf-8"))

def lan(grams):
    if 0<=grams<=5:return 1+(1.1666666666666667-1)*grams/5
    if 5<grams<=30:return 1.1666666666666667+(1.5518518518518518-1.1666666666666667)*(grams-5)/25
    raise ValueError("Outside the input range")

def graph(y):
    scale=3000/(y["zero"]-y["3000"])
    w,a,g,m=[(y["zero"]-y[k])*scale for k in ("water","pair","glucose","mixture")]
    # For a common water background, forecast M=G+A-W on the raw net scale.
    return {"glucose_raw":g,"mixture_raw":m,"pair_raw":a,"water_raw":w,
            "glucose_corrected":g-w,"mixture_corrected":m-w,"pair_corrected":a-w,
            "ratio_raw":m/g,"ratio_corrected":(m-w)/(g-w),
            "sum_prediction_native_raw":g+a-w,"sum_residual":m-(g+a-w),
            "sum_over_glucose_raw":(g+a-w)/g,
            "sum_over_glucose_corrected":1+(a-w)/(g-w)}

def corners(y):
    return [graph({k:v+d for (k,v),d in zip(y.items(),corner)})
            for corner in itertools.product((-1,1),repeat=len(y))]

def bounds(rows):
    return {k:[min(r[k] for r in rows),max(r[k] for r in rows)] for k in rows[0]}

def decompose(left,right,basis):
    # Exact identity. Expresses how two group-mean ratios differ without a causal interpretation.
    m=left["mixture_"+basis]/right["mixture_"+basis]
    g=right["glucose_"+basis]/left["glucose_"+basis]
    return {"mixture_Phe_over_Gly":m, "glucose_Gly_over_Phe":g,
            "ratio_of_ratios":m*g}

def level_transfer(source, target, basis):
    """Post hoc comparison of copying an external level and calibrating its ratio locally."""
    m,g="mixture_"+basis,"glucose_"+basis
    copy_level=source[m]
    use_local_glucose=source[m]*target[g]/source[g]
    return {"observed":target[m],"external_mixture_area":copy_level,
            "external_ratio_times_measured_local_glucose":use_local_glucose,
            "abs_log_error_copy":abs(math.log(copy_level/target[m])),
            "abs_log_error_local_glucose_calibrated":abs(math.log(use_local_glucose/target[m]))}

def calculate():
    d=load("facts.json")
    refs=load("reference.json")
    constant=math.exp(fmean(fmean(math.log(v) for v in study) for study in refs.values()))
    results={}
    graph_corners={}
    for name,s in d["studies"].items():
        mmol=s["ffm_mean_kg"]*d["mmol_per_kg_FFM_each"]
        leu=mmol*d["molar_mass_g_mol"]["leucine"]/1000
        partner=mmol*d["molar_mass_g_mol"][name]/1000
        target=s["printed_ratio"]
        center=graph(s["y_pixels"])
        graph_corners[name]=corners(s["y_pixels"])
        named={
            "no_change":1,"external_protein_panel_constant":constant,
            "food_energy":1+(leu+partner)/d["glucose_g"],
            "lan_total_mass":lan(leu+partner),"lan_leucine_mass_only":lan(leu),
            "historical_leucine_only":s["leucine_alone_with_glucose"],
            "historical_separate_increments":s["leucine_alone_with_glucose"]+s["partner_alone_with_glucose"]-1,
            "cohort_pair_plus_glucose":center["sum_over_glucose_raw"] if name=="phenylalanine" else 1+s["pair_without_glucose_relative"],
        }
        results[name]={"derived_mean_grams":{"leucine":leu,name:partner},"printed_ratio":target,"forecast":named,
                       "abs_log_error":{k:abs(math.log(x/target)) for k,x in named.items()},
                       "figure_center":center,"figure_bounds":bounds(graph_corners[name])}
    p,g=results["phenylalanine"],results["glycine"]
    target=p["printed_ratio"]/g["printed_ratio"]
    scores={}
    for name in p["forecast"]:
        contrast=p["forecast"][name]/g["forecast"][name]
        scores[name]={"level_error_mean":(p["abs_log_error"][name]+g["abs_log_error"][name])/2,
                      "predicted_ratio_of_ratios":contrast,"separation_error":abs(math.log(contrast/target))}
    decompositions={}
    for basis in ("raw","corrected"):
        # The component extrema are ratios of linear differences with fixed-sign
        # denominators; shared axes cancel within each study's ratio of ratios.
        ds=[decompose(left,right,basis) for left,right in
            itertools.product(graph_corners["phenylalanine"],graph_corners["glycine"])]
        decompositions[basis]={"center":decompose(p["figure_center"],g["figure_center"],basis),"bounds":bounds(ds)}
        for label,source,target_study in (("Phe_to_Gly",p,g),("Gly_to_Phe",g,p)):
            decompositions[basis][label]=level_transfer(source["figure_center"],target_study["figure_center"],basis)
    return {"studies":results,"across_studies":{"printed_ratio_of_ratios":target,"scores":scores},
            "posthoc_common_basis_decomposition":decompositions}

if __name__=="__main__":
    result=calculate()
    if "--check" in sys.argv:
        runpy.run_path(str(ROOT.parent/"check.py"))["compare"](result,load("results.json"))
        print("PASS two published ratios, eight forecasts, shared-basis figure analysis and precision scenarios")
    else:print(json.dumps(result,indent=2))
