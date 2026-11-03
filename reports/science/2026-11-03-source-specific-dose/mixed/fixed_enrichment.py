"""Dose-blind ablation at the geometric mean of the two frozen per-bolus ratios."""
import json,math
from statistics import fmean
from positive import evaluate as positive_bounds
from leucine import evaluate as substitution

def run():
    p=substitution()
    bounds=positive_bounds()["6"]["ratios"]
    keys=["low_blend_over_wheat","high_blend_over_wheat"]
    loc=p["predictions"]["per_bolus_substitution"]["ratios"]
    ref=math.sqrt(loc[keys[0]]*loc[keys[1]])
    observed=p["observed"]
    al=lambda x,y:abs(math.log(x/y))
    box=[]
    for y0 in [bounds[keys[0]][0],bounds[keys[0]][1],*[v for v in (loc[keys[0]],ref) if bounds[keys[0]][0]<v<bounds[keys[0]][1]]]:
        for y1 in [bounds[keys[1]][0],bounds[keys[1]][1],*[v for v in (loc[keys[1]],ref) if bounds[keys[1]][0]<v<bounds[keys[1]][1]]]:
            box.append((al(loc[keys[0]],y0)+al(loc[keys[1]],y1)-al(ref,y0)-al(ref,y1))/2)
    return {"constant":ref,"signed_area_comparison":{
       "mean_two_errors_per_bolus":fmean(al(loc[k],observed[k]) for k in keys),
       "mean_two_errors_constant":fmean(al(ref,observed[k]) for k in keys),
       "change_error_per_bolus":al(loc["high_over_low_contrast"],observed["high_over_low_contrast"]),
       "change_error_constant":al(1,observed["high_over_low_contrast"])},
       "positive_area_stressed_mean_error_per_bolus_minus_constant_outer":[min(box),max(box)]}
if __name__=="__main__":print(json.dumps(run(),indent=2))
