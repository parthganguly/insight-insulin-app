"""Exposed secondary across-window objective; donor values supplied by matched reader.
Three nested windows in one cohort are correlated diagnostics, NOT n=3 trials.
Fixed oracle is fitted to evaluation outcomes and is only a lower-bound benchmark.
"""
from pathlib import Path
import json,math
from calculate import ROOT
r=json.loads((ROOT/"results.json").read_text())
# Published-aggregate donor calculations supplied by matched reader, not newly
# extracted here. Embedded so this calculator needs no private source files.
DONORS={
 "fasting":{
  "signed_nominal":[1.1601028075890871,.8640771277382648,.7619559939063231],
  "signed_linearly_interpolate_zero":[1.1764963918130067,.8787596569134526,.7764740710510082],
  "signed_stated_0840_clock":[1.2575450154253744,.8909194093992966,.786614180737758]},
 "lunch":{
  "signed_nominal":[.9897694730198751,.8619927454028894,.860891863660397],
  "signed_linearly_interpolate_zero":[.994211932155843,.8678719066533429,.8654567722220183]}}
out={}
for period,ctx in (("fasting","fasting"),("lunch","mixed")):
    out[ctx]={}
    for donorclock in ("signed_nominal","signed_linearly_interpolate_zero",
                       "signed_stated_0840_clock"):
        pred=DONORS[period].get(donorclock)
        if pred is None:continue
        for targetclock in ("actual_minus5_interpolate_zero","relocated_baseline_zero"):
            obs=[r["figure_signed"][ctx][str(t)]["ratios"]["D"]
                 if targetclock=="actual_minus5_interpolate_zero" else
                 r["figure_timing_sensitivity"][ctx][str(t)]["baseline_relocated_to_zero"]["D"]
                 for t in (60,120,180)]
            errors=[abs(math.log(p/o)) for p,o in zip(pred,obs)]
            logs=sorted(math.log(v) for v in obs)
            oracle=math.exp(logs[1])
            val={"donor_D":pred,"target_D":obs,"component_ALE":errors,
              "mean_ALE":sum(errors)/3,"fixed_oracle_D":oracle,
              "fixed_oracle_minimum_ALE":(logs[-1]-logs[0])/3,
              "equality_mean_ALE":sum(abs(math.log(o)) for o in obs)/3}
            val["beats_best_constant"]=val["mean_ALE"]<val["fixed_oracle_minimum_ALE"]
            out[ctx][donorclock+"__"+targetclock]=val
(ROOT/"trajectory_results.json").write_text(json.dumps(out,indent=2))
if __name__=="__main__":
 for c,vs in out.items():
  for k,v in vs.items():
   print(c,k,"model",v["mean_ALE"],"oracle",v["fixed_oracle_minimum_ALE"],"beats",v["beats_best_constant"])
