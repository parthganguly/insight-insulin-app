"""Post-result challenge using the previously trained, unmodified leucine substitution slope."""
from itertools import product
from math import exp,log
from pathlib import Path
import csv,json

ROOT=Path(__file__).resolve().parents[1]

def evaluate():
    with (ROOT/"astra/target-windows.csv").open(encoding="utf-8-sig") as f:
        areas={r["arm"]:float(r["baseline_subtracted_trapezoid_pmol_min_L_approx"])
               for r in csv.DictReader(f) if r["from_min"]=="0" and r["to_min"]=="120"}
    with (ROOT/"astra/pixel-bounds.csv").open(encoding="utf-8-sig") as f:
        h=float(next(csv.DictReader(f))["arm_abs_err_at_6pixels"])
    spec=json.loads((ROOT/"public/training/inputs.json").read_text(encoding="utf-8-sig"))
    rate=spec["substitution_slope_log_per_g_leucine"]["value"]
    # Target Table 1 (g Leu per g hydrolysate); high mix explicitly twice the low recipe.
    fraction=0.056
    volume=0.0035*70.0
    concentrations={"wheat_low":28.6*fraction,"wheat_high":57.1*fraction,
                    "blend_low":14.3*fraction+7.1,"blend_high":28.6*fraction+14.2}
    gr={k:v*volume for k,v in concentrations.items()}
    def contrast(v):
        low=v["blend_low"]/v["wheat_low"]; high=v["blend_high"]/v["wheat_high"]
        return {"low_blend_over_wheat":low,"high_blend_over_wheat":high,"high_over_low_contrast":high/low}
    expected=contrast(areas)
    predictions={"tie":dict.fromkeys(expected,1.)}
    for name,n in [("per_bolus_substitution",1),("cumulative_four_boluses",4)]:
        predictions[name]=contrast({arm:exp(n*rate*x) for arm,x in gr.items()})
    names=["wheat_low","wheat_high","blend_low","blend_high"]
    corners=[contrast({arm:areas[arm]+s*h for arm,s in zip(names,mask)}) for mask in product([-1,1],repeat=4)]
    bounds={k:[min(c[k] for c in corners),max(c[k] for c in corners)] for k in expected}
    return {"frozen_log_slope_per_gram":rate,"g_leucine_per_bolus_at_group_mean_mass":gr,
            "observed":expected,"reading_box_outer":bounds,
            "predictions":{m:{"ratios":p,"abs_log_error":{k:abs(log(p[k]/expected[k])) for k in p}}
                           for m,p in predictions.items()}}

if __name__=="__main__":
    print(json.dumps(evaluate(),indent=2,allow_nan=False))
