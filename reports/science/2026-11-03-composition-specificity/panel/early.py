"""Compare at the common 30-minute draw, without relabeling it as an area."""
import csv,json
from math import log,exp
from pathlib import Path
ROOT=Path(__file__).resolve().parent
def read(f):return json.loads((ROOT/f).read_text(encoding="utf-8-sig"))
def calculate():
    d=read("donors.json");g=read("glynn.json");delta=g["leu_g"]["high"]-g["leu_g"]["low"]
    curves={k:{} for k in (26,41)}
    with (ROOT.parent/"astra/figure4_coordinates.csv").open() as f:
        for r in csv.DictReader(f):
            if r["age"]=="young":
                curves[int(r["leucine_pct"])][int(r["minute"])]=(684.554-float(r["center_y_pt"]))*24/(684.554-556.468)
    target={k:v["min30"]-v["basal"] for k,v in g["means"].items()}
    obs=target["high"]/target["low"];gross=g["means"]["high"]["min30"]/g["means"]["low"]["min30"]
    out={}
    for name,pre in [("t0",[0]),("mean_basals",[-30,0])]:
        native={k:s[30]-sum(s[t] for t in pre)/len(pre) for k,s in curves.items()}
        donor=native[41]/native[26]
        inclusive=delta+g["leu_tracer_g"]["high"]-g["leu_tracer_g"]["low"]
        ratios={"tracer_inclusive_area_slope_at_30min":exp(d["substitution_slope"]*inclusive),
                "tracer_inclusive_dose_rescaled_donor":exp(log(donor)*inclusive/1.069),
                "equal":1.,"same_high_label":d["fixed_enrichment"],
                "area_slope_at_30min":exp(d["substitution_slope"]*delta),
                "direct_30min_donor":donor,"dose_rescaled_30min_donor":exp(log(donor)*delta/1.069)}
        out[name]={"donor_native_increments_uIU_ml":native,"target_native_increments_pmol_L":target,
             "observed_increment_ratio":obs,"observed_unadjusted_concentration_ratio":gross,
             "predictions":ratios,"errors":{m:abs(log(q/obs))for m,q in ratios.items()}}
    return out
if __name__=="__main__":print(json.dumps(calculate(),indent=2,allow_nan=False))
