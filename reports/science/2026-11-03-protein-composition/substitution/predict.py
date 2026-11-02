"""Transfer a log-contrast learned on two published, exposed replacement pairs."""
import json
import math
from pathlib import Path

ROOT=Path(__file__).resolve().parent

def predict():
    d=json.loads((ROOT/"inputs.json").read_text(encoding="utf-8"))
    changes=[]
    for r in d["training"]:
        x=r["extra_free_leucine_g"]+(r["remaining_intact_g"]-r["intact_g"])*r["leucine_per_g"]
        y=math.log(r["after_index"]/r["before_index"])
        changes.append((x,y))
    slopes={"pooled":sum(x*y for x,y in changes)/sum(x*x for x,y in changes),
            "whey_training":changes[0][1]/changes[0][0],"soy_training":changes[1][1]/changes[1][0]}
    predictions={model:{a:math.exp(b*(g-d["total_leucine_g"][0])) for a,g in zip(d["arms"],d["total_leucine_g"])}
                 for model,b in slopes.items()}
    predictions["matched_tie"]=dict.fromkeys(d["arms"],1.0)
    def lan(g):
        xs,ys=d["lan_g"],d["lan_ratios"]
        for i in range(1,len(xs)):
            if xs[i-1]<=g<=xs[i]:
                return ys[i-1]+(g-xs[i-1])*(ys[i]-ys[i-1])/(xs[i]-xs[i-1])
        return None
    factors=[lan(g/d["proxy_leucine_per_g"]) for g in d["total_leucine_g"]]
    predictions["retained_lan"]={a:(v/factors[0] if v is not None else None) for a,v in zip(d["arms"],factors)}
    return {"slopes":slopes,"ratios_vs_W6":predictions}

if __name__=="__main__":
    print(json.dumps(predict(),indent=2))
