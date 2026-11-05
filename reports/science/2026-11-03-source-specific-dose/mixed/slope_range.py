"""Slopes certified to beat an equal-response forecast under the retained reading bounds."""
from math import log
import json
from positive import evaluate
from leucine import evaluate as composition

def run():
    obs=evaluate()["6"]["ratios"]
    grams=composition()["g_leucine_per_bolus_at_group_mean_mass"]
    out={}
    for dose in ("low","high"):
        lower=obs[dose+"_blend_over_wheat"][0]
        delta=grams["blend_"+dose]-grams["wheat_"+dose]
        out[dose]={"lower_positive_ratio":lower,"delta_leucine_g":delta,
                   "exclusive_upper_slope":2*log(lower)/delta}
    return out
if __name__=="__main__":print(json.dumps(run(),indent=2))
