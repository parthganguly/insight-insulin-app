"""Recover signed curve areas, printed 180-minute areas and matched digestion forecasts."""
import itertools
import json
import math
import statistics
from models import read,load_donors,assay_maps,loss

def hydro(marker,time,figure):
    baseline=figure["zero_at_t0"]+(figure["zero_at_t180"]-figure["zero_at_t0"])*time/180
    return (baseline-marker)*80/figure["pixels_per_80_percent"]

def signed_window(arm,group):
    inc=[0]+[(group["zero"]+(i+1)*group["zero_drift_per_30min"]-y)*100/group["pixels_per_100pmol"]
             for i,y in enumerate(arm["insulin_marker_y"])]
    return sum(15*(a+b) for a,b in zip(inc,inc[1:]))/1000   # pmol to nmol

def calculate():
    spec=read("bornet_inputs.json");donors=load_donors();groups={}
    for name,group in spec["groups"].items():
        data={}
        for arm in group["arms"]:
            a=arm["source"];w120=signed_window(arm,group)
            data[a]={"signed120":w120,"area180":arm["printed_insulin_180"],"area180_sem":arm["printed_insulin_180_sem"],
                     "amylose":arm["amylose_percent"],"H":{}}
            for time,y in zip([20,30],arm["hydrolysis_marker_y_at_20_30"]):
                f=spec["figure3"];v=hydro(y,time,f)
                # Wider allowance on overlapping 20-minute cooked wheat markers.
                band=2.0 if time==20 and a in ("wheat","extruded_wheat") and name!="raw" else f["reading_shift_pixels"]*80/f["pixels_per_80_percent"]
                data[a]["H"][time]={"value":v,"low":max(0,v-band),"high":v+band}
        names=list(data);pairs=[]
        for left,right in [(1,0),(2,0),(2,1)]:
            x,y=(data[names[i]] for i in [left,right])
            obs={e:x[e]/y[e] for e in ["signed120","area180"]}
            preds={"equal":1.0,"amylopectin":(100-x["amylose"])/(100-y["amylose"])}
            ranges={}
            for t in [20,30]:
                hx=x["H"][t];hy=y["H"][t];ratio=hx["value"]/hy["value"]
                for k,v in assay_maps(ratio,donors).items():preds[f"H{t}_{k}"]=v
                ranges[t]=[hx["low"]/hy["high"],hx["high"]/hy["low"] if hy["low"] else None]
            # Signed 120 graph-coordinate band: all four nonzero time points may shift by +/-3 px,
            # common baseline fixed; graph sensitivity alone, not sampling uncertainty.
            d=3*100/group["pixels_per_100pmol"]*105/1000
            y120=[(x["signed120"]-d)/(y["signed120"]+d),(x["signed120"]+d)/(y["signed120"]-d)]
            pairs.append({"contrast":names[left]+"/"+names[right],"observed":obs,"predicted":preds,
                          "signed120_reading_range":y120,"H_ratio_reading_range":ranges,
                          "errors":{e:{k:loss(v,o) for k,v in preds.items()} for e,o in obs.items()}})
        primary={e:{k:statistics.fmean(c["errors"][e][k] for c in pairs[:2]) for k in pairs[0]["predicted"]} for e in pairs[0]["observed"]}
        groups[name]={"arms":data,"contrasts":pairs,"mean_error_on_two_wheat_referenced_contrasts":primary}
    raw,gel=[groups[g]["contrasts"][0] for g in ["raw","gel"]]
    interaction={"contrast":"(gel cassava/wheat)/(raw cassava/wheat)","observed":{e:gel["observed"][e]/raw["observed"][e] for e in gel["observed"]},
                 "predicted":{k:gel["predicted"][k]/raw["predicted"][k] for k in gel["predicted"]},
                 "signed120_graph_envelope":[gel["signed120_reading_range"][0]/raw["signed120_reading_range"][1],gel["signed120_reading_range"][1]/raw["signed120_reading_range"][0]]}
    for t in (20,30):
        u,v=raw["H_ratio_reading_range"][t],gel["H_ratio_reading_range"][t]
        interaction[f"H{t}_raw_gel_direct_range"]=[v[0]/u[1],v[1]/u[0] if u[0] else None]
    return {"groups":groups,"cassava_heat_interaction":interaction,"absolute_food_only_forecasts_available":0}
if __name__=="__main__":
    print(json.dumps(calculate(),indent=2,allow_nan=False))
