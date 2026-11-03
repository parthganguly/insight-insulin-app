"""Project each target assay profile onto the three external hydrolysate profiles."""
import csv
import itertools
import json
import math
from pathlib import Path
from statistics import fmean

ROOT=Path(__file__).resolve().parent
LIBRARY=("whey","pea","wheat")
def load(p):return json.loads(p.read_text(encoding="utf-8-sig"))
def subtract(a,b):return [x-y for x,y in zip(a,b)]
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def squared_distance(a,b):return sum((x-y)**2 for x,y in zip(a,b))

def closest_weights(target,profiles):
    a,b,c=profiles
    u,v,p=subtract(b,a),subtract(c,a),subtract(target,a)
    aa,ab,bb=dot(u,u),dot(u,v),dot(v,v)
    det=aa*bb-ab**2
    if det<=0:raise ValueError("Training profiles are collinear")
    s=(dot(p,u)*bb-dot(p,v)*ab)/det
    t=(dot(p,v)*aa-dot(p,u)*ab)/det
    candidates=[]
    if min(1-s-t,s,t)>=0:
        candidates.append([1-s-t,s,t])
    for i,j in itertools.combinations(range(3),2):
        edge=subtract(profiles[j],profiles[i])
        f=max(0,min(1,dot(subtract(target,profiles[i]),edge)/dot(edge,edge)))
        w=[0,0,0]
        w[i],w[j]=1-f,f
        candidates.append(w)
    def residual(w):
        pred=[dot(w,axis) for axis in zip(*profiles)]
        return squared_distance(target,pred)
    w=min(candidates,key=residual)
    return w,math.sqrt(residual(w))

def predict():
    library=load(ROOT/"training.json")
    with (ROOT/"target_profiles.csv").open(encoding="utf-8") as handle:rows=list(csv.DictReader(handle))
    shared=[r["aa"] for r in rows if r["aa"] not in ("Lys","Trp")]
    train=library["aa_pct_by_wt"]
    targets=list(rows[0])[1:]
    result={}
    def vector(record,close):
        numbers=[record[k] for k in shared]
        return [x/sum(numbers) for x in numbers] if close else numbers
    for mode,close in (("closed",True),("unclosed",False)):
        profiles=[]
        for name in LIBRARY:
            record=dict(zip(train["_order"],train[name+"_hydrolysate"]))
            record.update(Asx=record["Asp"]+record["Asn"],Glx=record["Glu"]+record["Gln"])
            profiles.append(vector(record,close))
        ratios=[v/library["control_area"] for v in library["hydrolysate_areas"]]
        out={}
        for name in targets:
            target=vector({r["aa"]:float(r[name]) for r in rows},close)
            w,res=closest_weights(target,profiles)
            nearest=min(range(3),key=lambda j:squared_distance(target,profiles[j]))
            lookup={"whey":0,"pea":1,"gluten":2}.get(name)
            predicted=dot(w,ratios)
            out[name]={"weights":dict(zip(LIBRARY,w)),"residual_l2":res,"in_hull_to_1e-10":res<=1e-10,
                       "nearest":LIBRARY[nearest],"ratios":{"no_change":1.0,"macro_energy":2.0,
                       "training_mean":fmean(ratios),"profile_projection":predicted,"nearest_profile":ratios[nearest],
                       "nominal_source":ratios[lookup] if lookup is not None else None,
                       "double_increment_profile":1+2*(predicted-1),"double_increment_mean":1+2*(fmean(ratios)-1)}}
        result[mode]=out
    return {"training_order":LIBRARY,"profile_coordinates":shared,"scenarios":result}

if __name__=="__main__":print(json.dumps(predict(),indent=2))
