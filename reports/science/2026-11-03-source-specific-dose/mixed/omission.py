"""Influence of each nonzero external dose knot; no target refitting or extrapolation."""
import json
from transfer import predict,read,interpolate,contrasts
from math import log
from statistics import fmean

def evaluate():
    src=predict()
    curves=src["source_knots"]; native=read("oxford2026.json")
    doses={"pea_low":10,"pea_high":20,"whey_low":8.1,"whey_high":16.2}
    obs={k:v["area120"]/native["glucose"]["area120"] for k,v in native.items()}
    truth=contrasts(obs)
    trials=[]
    for source,rows in curves.items():
        for removed,_ in rows[1:]:
            candidate={**curves,source:[(d,r) for d,r in rows if d!=removed]}
            out={}
            for arm,x in doses.items():
                donor=candidate[arm.split("_")[0]]
                out[arm]=interpolate(donor,x) if x<=donor[-1][0] else None
            covered=[a for a,y in out.items() if y is not None]
            change=contrasts(out)["dose_change_in_source_contrast"] if len(covered)==4 else None
            trials.append({"source":source,"removed_knot":removed,"forecasts":out,"coverage":len(covered),
                "mean_log_error_on_available":fmean(abs(log(out[k]/obs[k])) for k in covered),
                "change":change,"change_error":None if change is None else abs(log(change/truth["dose_change_in_source_contrast"]))})
    return trials

if __name__=="__main__":print(json.dumps(evaluate(),indent=2,allow_nan=False))
