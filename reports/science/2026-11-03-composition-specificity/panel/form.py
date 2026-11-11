"""Transport external coefficients; all predictions precede use of evaluation AUCs."""
from itertools import combinations
from math import log,exp,sqrt
from statistics import fmean
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent
def read(name):return json.loads((ROOT/name).read_text(encoding="utf-8-sig"))
def calculate():
    f=read("farup.json"); train=read("donors.json")
    names=["High DH","Medium DH","Low DH"];arms=f["arms"];dose=f["protein_g"]
    beta=train["substitution_slope"]
    dh_slope=log(train["power_native"]["hydro"]/train["power_native"]["intact"])/train["power_dh"]
    leu={k:v["leu_per100protein"]*dose/100 for k,v in arms.items()}
    dh={k:arms[k]["dh"] for k in names}
    avg_dh=fmean(dh.values());avg_leu=fmean(leu[k] for k in names)
    mean_native={k:v["auc"] for k,v in arms.items()}
    donor=train["resting_whey"]/train["resting_casein"]
    overall={}
    for name in names:
        x=dh[name]-avg_dh;y=leu[name]-avg_leu
        overall[name]={"equal":1.,"family":donor,
                       "family_plus_DH":donor*exp(dh_slope*x),
                       "family_plus_DH_dose_scaled":donor*exp(dh_slope*x*dose/train["power_dose_g"]),
                       "family_plus_leucine":donor*exp(beta*y),
                       "family_plus_both":donor*exp(dh_slope*x+beta*y),
                       "family_swiss":train["swiss_whey"]/train["swiss_casein"]}
    overall["Casein"]=dict.fromkeys(overall[names[0]],1.)
    # Casein = unit reference for a two-family model. No DH value is imputed for casein.
    pairs={}
    for a,b in combinations(names+["Casein"],2):
        pred={m:overall[a][m]/overall[b][m] for m in overall[a]}
        actual=mean_native[a]/mean_native[b]
        pairs[a+"/"+b]={"observed":actual,"predicted":pred,"error":{m:abs(log(q/actual)) for m,q in pred.items()}}
    losses={}
    for sel,chosen in [("within_whey",[v for k,v in pairs.items() if not k.endswith("/Casein")]),
                       ("vs_casein",[v for k,v in pairs.items() if k.endswith("/Casein")]),("all",list(pairs.values()))]:
        losses[sel]={m:fmean(v["error"][m] for v in chosen) for m in overall[names[0]]}
    structural={}
    for m in overall[names[0]]:
        r=[log(overall[k][m]/mean_native[k]) for k in names]
        structural[m]={"reconstructed_loss":2*(max(r)-min(r))/3,
             "lower_bound":losses["within_whey"]["equal"]+2*log(overall[names[0]][m]/overall[names[1]][m])/3}
        assert abs(structural[m]["reconstructed_loss"]-losses["within_whey"][m])<1e-12
        assert structural[m]["lower_bound"]<=losses["within_whey"][m]+1e-12
    powder={k:{"powder_g":dose/(v["protein_pct"]/100),"fat_g":dose*v["fat_pct"]/v["protein_pct"],
               "lactose_g":dose*v["lactose_pct"]/v["protein_pct"]} for k,v in arms.items()}
    return {"leucine_grams":leu,"conditional_as_is_masses":powder,"log_ratio_per_DH_percentage_point":dh_slope,
            "casein_referenced_predictions":overall,"pairs":pairs,"loss":losses,
            "three_whey_monotonicity_restriction":structural,
            "coverage":{"within_whey_pairs":3,"pair_dimensions":2,"native_area_forecasts_from_food_only":0,
                        "family_anchored_pairs":6,"measured_DH_of_casein":None}}
if __name__=="__main__":print(json.dumps(calculate(),indent=2,allow_nan=False))
