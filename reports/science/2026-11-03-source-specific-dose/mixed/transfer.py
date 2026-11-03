"""External preparation/dose lookup on the Oxford four-arm study. No target means are fitted."""
from bisect import bisect_right
from itertools import combinations
import json
from math import log
from pathlib import Path
from statistics import fmean

ROOT=Path(__file__).resolve().parent
def read(name):
    return json.loads((ROOT/name).read_text(encoding="utf-8-sig"))

def interpolate(series, x):
    if not series[0][0] <= x <= series[-1][0]:
        raise ValueError("Outside donor dose support")
    if x==series[-1][0]:
        return series[-1][1]
    i=bisect_right([row[0] for row in series],x)
    a,u=series[i-1]
    b,v=series[i]
    return u+(v-u)*(x-a)/(b-a)

def linear(series,x):
    slope=sum(d*(r-1) for d,r in series)/sum(d*d for d,_ in series)
    return 1+x*slope

def predict():
    pea,whey=read("pea2021.json"),read("lund.json")
    anchor=pea["native_120"][0]
    curves={"pea":[(x,v/anchor) for x,v in zip(pea["pea_powder_g"],pea["native_120"])],
            "whey":[(0,1.)]+[(r["protein_g"],r["mean"]/whey["reference"]["mean"]) for r in whey["whey"]]}
    # Inputs from target Table 1 only. No target insulin data enter predict().
    servings={"pea_low":10,"pea_high":20,"whey_low":8.1,"whey_high":16.2}
    prior=read("baselines.json")
    normalized={}
    for arm,x in servings.items():
        source,size=arm.split("_")
        scale=whey["available_glucose_g"]/pea["glucose_g"] if source=="whey" else 1.
        normalized[arm]={"source_curve":interpolate(curves[source],x),
             "source_line":linear(curves[source],x),
             "protein_per_carbohydrate":interpolate(curves[source],x*scale),
             "donor_constant":fmean(r for d,r in curves[source] if d>0),
             "earlier_pea_constant":fmean(r for _,r in curves["pea"]),
             **{k:prior[arm][k] for k in ("no_change","constant_fit","cheap_fit","reference_fit","ref","ref_dose","energy")}}
    # Blind to source at the corresponding small/large serving. Keeps both empirical dose curves.
    for size in ["low","high"]:
        mean=fmean(normalized[s+"_"+size]["source_curve"] for s in ("pea","whey"))
        for s in ("pea","whey"):
            normalized[s+"_"+size]["paired_source_blind"]=mean
    return {"source_knots":curves,"external_50g_glucose_native_anchor":anchor,"relative":normalized,
            "native":{a:{m:r*anchor for m,r in row.items()} for a,row in normalized.items()}}

def contrasts(arms):
    lo=arms["whey_low"]/arms["pea_low"]
    hi=arms["whey_high"]/arms["pea_high"]
    return {"whey_pea_low":lo,"whey_pea_high":hi,"whey_dose":arms["whey_high"]/arms["whey_low"],
            "pea_dose":arms["pea_high"]/arms["pea_low"],"dose_change_in_source_contrast":hi/lo}

def evaluate():
    pred=predict()
    actual={a:r["area120"] for a,r in read("oxford2026.json").items()}
    observed=contrasts(actual)
    scores={}
    for m in pred["relative"]["pea_low"]:
        y={a:r[m] for a,r in pred["relative"].items()}
        a={k:abs(log(v/(actual[k]/actual["glucose"]))) for k,v in y.items()}
        p=contrasts(y)
        e={k:abs(log(v/observed[k])) for k,v in p.items()}
        scores[m]={"predicted_contrasts":p,"contrast_errors":e,"level_log_errors":a,
                   "ratio_level_mae":fmean(a.values()),
                   "native_errors":{k:pred["native"][k][m]-actual[k] for k in y},
                   "native_mae":fmean(abs(pred["native"][k][m]-actual[k]) for k in y),
                   "source_pair_mae":(e["whey_pea_low"]+e["whey_pea_high"])/2,
                   "dose_pair_mae":(e["whey_dose"]+e["pea_dose"])/2}
    m,b=scores["source_curve"],scores["reference_fit"]
    verdict=m["ratio_level_mae"]<b["ratio_level_mae"] and m["contrast_errors"]["dose_change_in_source_contrast"]<b["contrast_errors"]["dose_change_in_source_contrast"]
    return {"predictions":pred,"target_native":actual,"target_contrasts":observed,"scores":scores,
            "primary_joint_improvement_vs_prior_named":verdict}

if __name__=="__main__":
    print(json.dumps(evaluate(),indent=2,allow_nan=False))
