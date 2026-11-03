"""One-SE scale sensitivity, not an inferential prediction interval."""
import json,math
from statistics import fmean
from transfer import predict,read

def run():
    donor=read("pea2021.json")
    anchor=donor["native_120"][0]
    step=donor["sd_120"][0]/math.sqrt(31)
    lo,hi=anchor-step,anchor+step
    p=predict()["relative"]
    target=read("oxford2026.json")
    results={}
    for alt in ["reference_fit","source_line","ref_dose","paired_source_blind","energy"]:
        def loss(m,s):return fmean(abs(s*r[m]-target[k]["area120"]) for k,r in p.items())
        points={lo,hi,anchor}
        for k,r in p.items():
            for m in ["source_curve",alt]:
                kink=target[k]["area120"]/r[m]
                if lo<=kink<=hi:points.add(kink)
        diff=[loss("source_curve",s)-loss(alt,s) for s in points]
        results[alt]=[min(diff),max(diff)]
    return {"scale_range_one_donor_SE":[lo,hi],"native_MAE_curve_minus_comparator_range":results}
if __name__=="__main__":print(json.dumps(run(),indent=2))
