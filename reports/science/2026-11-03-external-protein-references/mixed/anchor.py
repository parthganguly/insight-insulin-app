"""Independent of fitting: control choice, figure-reading and printed precision diagnostics."""
import json
from itertools import product
from math import log
from test_transfer import load

def run():
    f=load("reading.json")
    t=load("acheson.json")
    area=t["area120"]
    q=area["whey"]/area["soy"]
    tops=f["top_y"]
    zz=f["zero_y"]
    rr=(zz-tops["whey"])/(zz-tops["soy"])
    read=[(z-w)/(z-s) for z,w,s in product([zz-1,zz+1],[tops["whey"]-1,tops["whey"]+1],
                                               [tops["soy"]-1,tops["soy"]+1])]
    native_ratio=[(area["whey"]+w)/(area["soy"]+s) for w,s in product([-.05,.05],repeat=2)]
    # The high-carbohydrate comparator has a different carbohydrate load.
    # Translate an external glucose-relative forecast only with an actual local ratio.
    donor={s:(zz-tops[s])/(zz-tops["CHO"]) for s in ("whey","soy")}
    sensitivity={}
    for s in donor:
        anchor=area["glucose"]/area["highCHO"]
        observed=area[s]/area["highCHO"]
        translated=donor[s]*anchor
        sensitivity[s]={"actual":observed,"naive_reference_swap":donor[s],
                        "local_anchor_ratio_glucose_over_highCHO":anchor,
                        "using_local_anchor":translated,"abs_log_error_translated":abs(log(translated/observed)),
                        "abs_log_error_naive":abs(log(donor[s]/observed))}
    return {"whey_soy_source_ratio":rr,"target_ratio":q,"source_figure_range":[min(read),max(read)],
            "target_decimal_rounding_range":[min(native_ratio),max(native_ratio)],
            "worst_matched_abs_log_reading_rounding":max(abs(log(v/w)) for v,w in product(read,native_ratio)),
            "best_tie_abs_log_rounding":min(abs(log(1/x)) for x in native_ratio),
            "highCHO_sensitivity":sensitivity}

if __name__=="__main__":
    print(json.dumps(run(),indent=2))
