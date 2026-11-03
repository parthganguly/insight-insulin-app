"""Fixed reference selection and equal-budget held-author development. Standard library only."""
import csv
from collections import Counter, defaultdict
from itertools import combinations
import json
from math import exp, log, log1p
from pathlib import Path
from statistics import fmean

HERE=Path(__file__).resolve().parent
def load(name):
    return json.loads((HERE/name).read_text(encoding="utf-8-sig"))

def library():
    fig=load("reading.json")
    zero=fig["zero_y"]
    return {s:(zero-y)/(zero-fig["top_y"]["CHO"]) for s,y in fig["top_y"].items() if s!="CHO"}

def observations():
    with (HERE/"comparisons.csv").open(encoding="utf-8-sig") as f:
        return [dict(row=int(r["row"]),author=r["author"],year=r["year"],food=r["source"].lower(),
                     d=float(r["dose"]),obs=float(r["rr"]),method=r["method"]) for r in csv.DictReader(f)]

def weights(rows):
    counts=Counter(r["author"] for r in rows)
    return [1/counts[r["author"]]/len(counts) for r in rows]

def fit(rows,refs):
    # Each first-author block has total weight one before normalization.
    w=weights(rows)
    ys=[log(r["obs"]) for r in rows]
    result={"constant_log":sum(v*y for v,y in zip(w,ys))}
    for key in ["cheap","reference"]:
        x=[log1p(r["d"]*(refs[r["food"]]-1)) if key=="reference" else log1p(r["d"]) for r in rows]
        result[key]=sum(v*t*y for v,t,y in zip(w,x,ys))/sum(v*t*t for v,t in zip(w,x))
    return result

def levels(r,d,beta,mean_ref):
    scaled=1+d*(r-1)
    return {"no_change":1.0,"ref":r,"ref_dose":scaled,"blind_dose":1+d*(mean_ref-1),
            "constant_fit":exp(beta["constant_log"]),"cheap_fit":exp(beta["cheap"]*log1p(d)),
            "reference_fit":exp(beta["reference"]*log(scaled))}

def distances(profile,donors,keys):
    def closed(vals):
        mass=sum(vals[k] for k in keys)
        return [vals[k]/mass for k in keys]
    target=closed(profile)
    return dict(sorted(((food,sum(abs(i-j) for i,j in zip(target,closed(p)))/2)
                 for food,p in donors.items()),key=lambda x:x[1]))

def scored(pred,actual):
    return {k:abs(log(v/actual)) for k,v in pred.items()}

def calculate():
    refs=library()
    mean_ref=fmean(refs.values())
    rows=observations()
    old=load("earlier_forecasts.json")
    panels={}
    for method in ["Reported","Calculated"]:
        all_rows=[r for r in rows if r["method"]==method and r["author"]!="Claessens"]
        admitted=[r for r in all_rows if r["food"] in refs]
        authors=sorted({r["author"] for r in admitted})
        predictions=[]
        fits={}
        for author in authors:
            train=[r for r in admitted if r["author"]!=author]
            beta=fit(train,refs)
            fits[author]={"training_authors":sorted({r["author"] for r in train}),"beta":beta}
            for r in admitted:
                if r["author"]!=author: continue
                pred=levels(refs[r["food"]],r["d"],beta,mean_ref)
                pred.update(old[str(r["row"])])
                predictions.append({**r,"pred":pred,"abs_log_error":scored(pred,r["obs"])})
        by_author={a:{m:fmean(r["abs_log_error"][m] for r in predictions if r["author"]==a)
                       for m in predictions[0]["pred"]} for a in authors}
        pairs=[]
        for left,right in combinations(predictions,2):
            if (left["author"],left["year"],left["d"])!=(right["author"],right["year"],right["d"]):continue
            if left["food"]==right["food"]:continue
            assert left["author"] in ("Quek","Acheson"),"Independently confirm shared control before admission"
            pred={m:left["pred"][m]/right["pred"][m] for m in left["pred"]}
            obs=left["obs"]/right["obs"]
            pairs.append({"author":left["author"],"foods":[left["food"],right["food"]],"obs":obs,
                          "pred":pred,"abs_log_error":scored(pred,obs)})
        panels[method]={"eligible_before_name_matching":len(all_rows),"eligible_authors_before":len({r['author'] for r in all_rows}),
                        "matched_rows":len(admitted),"matched_authors":len(authors),
                        "unmatched_rows":[r["row"] for r in all_rows if r["food"] not in refs],"fits":fits,
                        "predictions":predictions,"per_author_mae":by_author,"equal_author_mae":{
                            m:fmean(v[m] for v in by_author.values()) for m in predictions[0]["pred"]},
                        "same_dose_shared_control_pairs":pairs}
    target=load("acheson.json")
    with (HERE/"target_profiles.csv").open(encoding="utf-8-sig") as f:
        donors=defaultdict(dict)
        for row in csv.DictReader(f):
            aa=row.pop("aa")
            for k,v in row.items():donors[k][aa]=float(v)
    foods=("whey","casein","soy")
    keys=target["amino_order"]
    approaches={}
    beta=panels["Reported"]["fits"]["Acheson"]["beta"]
    for description,fields in [("16", [k for k in keys if k not in ("Asx","Glx")]),("18",keys)]:
        ds={food:distances(dict(zip(keys,target["profiles"][food])),donors,fields) for food in foods}
        # Exact ties in a distance tier receive equal response weights.
        def tier(food,rank):
            distinct=sorted(set(ds[food].values()))
            return fmean(refs[k] for k,v in ds[food].items() if v==distinct[rank])
        pred={}
        for food in foods:
            nr=tier(food,0)
            pred[food]=levels(nr,target["d"],beta,mean_ref)
            pred[food].update({"nearest_removed":tier(food,1),"source_blind":mean_ref,
                "energy":target["kcal"][food]/target["kcal"]["glucose"]})
            if food in refs:pred[food]["family"]=refs[food]
        native=target["area120"]
        panel=[]
        leu=keys.index("Leu")
        for a,b in combinations(foods,2):
            ratios={m:x/pred[b][m] for m,x in pred[a].items() if m in pred[b]}
            gramdiff=target["protein_mass_proxy_g"]*(target["profiles"][a][leu]-target["profiles"][b][leu])/100
            ratios["leucine_scenario"]=exp(target["leu_slope"]*gramdiff)
            actual=native[a]/native[b]
            panel.append({"a":a,"b":b,"obs":actual,"pred":ratios,"abs_log_error":scored(ratios,actual)})
        obs={k:native[k]/native["glucose"] for k in foods}
        errors={k:scored(pred[k],obs[k]) for k in foods}
        approaches[description]={"distances":ds,"normalized_levels":pred,"observed_levels":obs,
            "level_errors":errors,"level_mae":{m:fmean(errors[k][m] for k in foods if m in errors[k]) for m in pred["whey"]},
            "contrasts":panel,"contrast_mae":{m:fmean(r["abs_log_error"][m] for r in panel if m in r["abs_log_error"])
                                                 for m in panel[1]["pred"]},
            "support":{"family_arms":2,"family_pairs":1,"profile_arms":3,"profile_pairs":3,
                       "exact_formulations":0,"absolute_food_input_levels":0}}
    return {"external_response_ratios":refs,"forest":panels,"acheson":approaches}

if __name__=="__main__":
    print(json.dumps(calculate(),indent=2))
