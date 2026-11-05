"""Score documented kernel/flour and genotype contrasts. No fit uses the barley outcomes."""
import itertools
import json
import math
import statistics
from models import read,load_donors,assay_maps,midpoint,loss

def nine_bounds(kernel,flour,rounding=False):
    delta_m,delta_se=(.05,.5) if rounding else (0,0)
    m,e,f=kernel["mean_120"],kernel["sem_120"],flour["mean_120"]
    # Each individual deviation from the n-person mean is at most (n-1)*SEM.
    # The omitted positive area also cannot be below zero.
    return [max(0,m-delta_m-e-delta_se)/(f+delta_m),
            min(m+delta_m+e+delta_se,(m+delta_m)*10/9)/(f-delta_m)]

def calculate():
    study=read("barley_inputs.json")
    arms=study["arms"]
    donor=load_donors()
    grain=donor["grain_reference"]
    endpoints=["mean_120","mean_90","II_120"]
    def pair(a,b,cross=False):
        x,y=arms[a],arms[b]
        h=x["HI_180"]/y["HI_180"]
        predictions={"equality":1, "amylopectin":(100-x["amylose_pct"])/(100-y["amylose_pct"]),**assay_maps(h,donor)}
        obs={e:x[e]/y[e] for e in endpoints}
        if cross:
            predictions.update(grain_reference=grain,hummus_reference=donor["hummus_response"])
        row={"x":a,"y":b,"observed":obs,"predicted":predictions,
             "error":{e:{k:loss(p,ratio) for k,p in predictions.items()} for e,ratio in obs.items()}}
        if cross:
            row.update(matched_nine=nine_bounds(x,y),rounded_matched_nine=nine_bounds(x,y,True),grain_HI_midpoint=midpoint(grain,h))
            row["printed_mean_rounding_interval"]=[(x["mean_120"]-.05)/(y["mean_120"]+.05),(x["mean_120"]+.05)/(y["mean_120"]-.05)]
        return row
    milling=[pair("normal_kernel","normal_flour",True),pair("high_kernel","high_flour",True)]
    kernels=["high_hullless_kernel","high_kernel","normal_kernel","waxy_kernel"]  # descending amylose
    genotypes=[pair(a,b) for a,b in itertools.combinations(kernels,2)]+[pair("high_flour","normal_flour")]
    primary={e:{k:statistics.fmean(x["error"][e][k] for x in milling) for k in milling[0]["predicted"]} for e in endpoints}
    # Feasible sample witness: the same omitted individual could have zero
    # in both kernel arms. Verify the remaining nine can realize the declared moments.
    witness={}
    for name in ["normal_kernel","high_kernel"]:
        m,e=arms[name]["mean_120"],arms[name]["sem_120"]
        sample=[0]+[(10*m)/9]*9
        residual=90*e*e-sum((v-m)**2 for v in sample)
        split=math.sqrt(residual/2);sample[1]+=split;sample[2]-=split
        # If that two-point distribution crosses zero, use one high / eight equally low.
        if min(sample)<0:
            step=math.sqrt(residual/72)
            sample=[0,10*m/9+8*step]+[10*m/9-step]*8
        assert min(sample)>=0 and math.isclose(statistics.mean(sample),m)
        assert math.isclose(statistics.stdev(sample)/math.sqrt(10),e)
        witness[name]=statistics.mean(sample[1:])
    worst=[x["matched_nine"][1] for x in milling]
    witness_errors={k:statistics.mean(loss(x["predicted"][k],w) for x,w in zip(milling,worst)) for k in ("grain_reference","release")}
    # Secondary, outcome-exposed: forecast levels relative to a normal flour without
    # importing its clinical value. The normalized per-form input needs an HI measurement on the normal cultivar.
    level={}
    for name,values in arms.items():
        if name=="reference":continue
        form="kernel" if "kernel" in name else "flour"
        anchor=grain if form=="kernel" else 1
        rel=values["HI_180"]/arms["normal_"+form]["HI_180"]
        amy=(100-values["amylose_pct"])/(100-arms["normal_"+form]["amylose_pct"])
        level[name]={"observe_to_normal_flour":values["mean_120"]/arms["normal_flour"]["mean_120"],
                     "form_only":anchor,"form_times_amylopectin":anchor*amy,
                     "form_times_local_HI_power":anchor*rel**donor["power"]}
    return {"donors":donor,"milling":milling,"primary":primary,"same_form":genotypes,"deletion_witness_errors":witness_errors,
            "secondary_factorized_meal_ratios":level,"same_individual_removed_in_both_arms_possible":True}

if __name__=="__main__":
    print(json.dumps(calculate(),indent=2,allow_nan=False))
