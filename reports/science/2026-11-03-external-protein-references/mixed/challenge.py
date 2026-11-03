"""Adversarial checks and transfer of the frozen equations to the Oxford drink series."""
from itertools import permutations
from collections import defaultdict
from statistics import fmean
from math import log,log1p,exp
import csv,json
from test_transfer import HERE, observations, library, fit, weights, distances, levels, scored, load

def assess(rows,assigned):
    by={}
    for author in sorted({r["author"] for r in rows}):
        train=[r for r in rows if r["author"]!=author]
        beta=fit(train,assigned)["reference"]
        test=[r for r in rows if r["author"]==author]
        by[author]=fmean(abs(beta*log1p(r["d"]*(assigned[r["food"]]-1))-log(r["obs"])) for r in test)
    return fmean(by.values()),by

def calculate():
    refs=library()
    mean=fmean(refs.values())
    blind=dict.fromkeys(refs,mean)
    allrows=[r for r in observations() if r["food"] in refs and r["author"]!="Claessens"]
    panels={}
    for method in ["Reported","Calculated"]:
        rows=[r for r in allrows if r["method"]==method]
        foods=sorted({r["food"] for r in rows})
        actual,by=assess(rows,refs)
        common,by_blind=assess(rows,blind)
        perms=[{"assignment":p,"mae":assess(rows,{k:refs[v] for k,v in zip(foods,p)})[0]} for p in permutations(foods)]
        omissions={}
        for author in by:
            reduced=[r for r in rows if r["author"]!=author]
            omissions[author]=assess(reduced,refs)[0]-assess(reduced,blind)[0]
        panels[method]={"reference":actual,"common_R_same_budget":common,"by_author_common_R":by_blind,
            "omitting_author_ref_minus_common_refit":omissions,"foods":foods,"assignments":perms,
            "strictly_better_assignments":sum(x["mae"]<actual-1e-12 for x in perms),
            "tied_assignments":sum(abs(x["mae"]-actual)<=1e-12 for x in perms)}

    # Oxford published in 2026 after the 2024 forest; exclude its prior 2021 first-author group, too.
    train=[r for r in allrows if r["method"]=="Reported" and r["author"]!="Thondre"]
    beta=fit(train,refs)
    beta_common=fit(train,blind)["reference"]
    arms=load("plos.json")
    native={k:v["area120"] for k,v in arms.items()}
    predictions={}
    neighbor={}
    donors=defaultdict(dict)
    with (HERE/"target_profiles.csv").open() as f:
        for row in csv.DictReader(f):
            aa=row.pop("aa")
            for food,value in row.items():donors[food][aa]=float(value)
    for key,a in arms.items():
        if key=="glucose":continue
        source=key.split("_")[0]
        d=a["protein"]/a["availCHO"]
        common_keys=sorted((set(a)&set(donors[source]))-{"Asx","Glx"})
        ds=distances(a,donors,common_keys)
        nearest=next(iter(ds))
        neighbor[key]={"coordinates":common_keys,"distances":ds,"selected":nearest}
        pred=levels(refs[source],d,beta,mean)
        pred["profile_ref"]=refs[nearest]
        pred["profile_calibrated"]=exp(beta["reference"]*log1p(d*(refs[nearest]-1)))
        pred["blind_ref_fit"]=exp(beta_common*log1p(d*(mean-1)))
        pred["energy"]=a["kcal"]/arms["glucose"]["kcal"]
        obs=native[key]/native["glucose"]
        predictions[key]={"obs":obs,"levels":pred,"abs_log_error":scored(pred,obs)}
    pairs={}
    for name,a,b in [("low_whey_over_pea","whey_low","pea_low"),("high_whey_over_pea","whey_high","pea_high"),
                     ("whey_high_over_low","whey_high","whey_low"),("pea_high_over_low","pea_high","pea_low")]:
        ratio={m:v/predictions[b]["levels"][m] for m,v in predictions[a]["levels"].items()}
        if "whey_over_pea" in name:
            ratio["substitution_leucine"]=exp(load("acheson.json")["leu_slope"]*(arms[a]["Leu"]-arms[b]["Leu"]))
        obs=native[a]/native[b]
        pairs[name]={"obs":obs,"pred":ratio,"abs_log_error":scored(ratio,obs)}
    out={"frozen_beta":beta,"frozen_common_beta":beta_common,"train_authors":sorted({r["author"] for r in train}),
         "native":native,"neighbor":neighbor,"arms":predictions,"pairs":pairs,
         "level_mae":{m:fmean(r["abs_log_error"][m] for r in predictions.values()) for m in predictions["whey_low"]["levels"]}}
    return {"control":panels,"oxford":out}

if __name__=="__main__":
    print(json.dumps(calculate(),indent=2))
