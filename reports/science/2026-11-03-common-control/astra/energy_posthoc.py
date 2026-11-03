"""Post hoc Quek energy comparator. Input-only energy and protein/tie predictions."""
import itertools
import json
import math
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parent
def read(name):return json.loads((ROOT/name).read_text(encoding="utf-8-sig"))
def evaluate_pairs(pairs,scores,areas):
    rows=[]
    for a,b in pairs:
        observed=areas[a]/areas[b]
        ratios={name:values[a]/values[b] for name,values in scores.items()}
        rows.append(dict(pair=[a,b],observed=observed,predicted=ratios,
                         abs_log_error={name:abs(math.log(value/observed)) for name,value in ratios.items()}))
    return dict(rows=rows,mean_abs_log_error={name:sum(r["abs_log_error"][name] for r in rows)/len(rows) for name in scores})
def result():
    old=read("RESULTS.json")
    foods=read("FACTS.json")["rows"]
    energy={a:4*p+4*c+9*f for a,(p,c,f,*_) in foods.items()}
    scores={"derived_energy":energy,"unchanged_carb":{a:v[1] for a,v in foods.items()},
            "proportional_total_protein":{a:v[0] for a,v in foods.items()}}
    areas=old["vector_read_areas"]
    names=[key for key in foods if key!="rice"]
    six=evaluate_pairs(itertools.combinations(names,2),scores,areas)
    four=evaluate_pairs(((a,"rice") for a in names),scores,areas)
    return dict(kcal=energy,original_group_mean_areas=areas,within_sources=six,meal_vs_plain_rice=four,
                energy_error_minus_leucine_proxy_MAE={s:{k:six["mean_abs_log_error"]["derived_energy"]-v
                for k,v in m["mean_abs_log_error"].items() if k!="matched_tie"} for s,m in old["scenarios"].items()})
def check(a,b):
    if isinstance(a,dict):
        assert a.keys()==b.keys()
        for k in a:check(a[k],b[k])
    elif isinstance(a,list):
        assert len(a)==len(b)
        for x,y in zip(a,b):check(x,y)
    elif isinstance(a,str):assert a==b
    else:assert math.isclose(a,b,abs_tol=1e-12,rel_tol=1e-12)
if __name__=="__main__":
    d=result()
    if "--check" in sys.argv:
        check(d,read("ENERGY_RESULTS.json"))
        print("PASS five meal energies, six protein-source pairs and four rice-reference contrasts")
    else:print(json.dumps(d,indent=2))
