"""Sensitivity to empirical (n-divisor) rather than corrected SD used in the published SEM."""
from pathlib import Path
import json
import math
from positive import ROOT, bounds

def evaluate():
    curves = json.loads((ROOT/"curves/graph-input.json").read_text())
    bars = json.loads((ROOT/"curves/SEM-input.json").read_text())
    factor = math.sqrt(8/7)
    arms = {}
    for arm,rows in bars["arms"].items():
        values = curves["panels"]["4.4B"]["series"][arm]["means"][:6]
        sem = [r["sem"]*factor for r in rows[:6]]
        arms[arm] = bounds(curves["minutes"][:6],values,sem,8,0.5,1.1*factor)
    pea,soy = arms["pea_then_cho"],arms["soy_then_cho"]
    return {"assumed_empirical_SD_per_SEM": math.sqrt(8),
            "marker_halfwidth":0.5,"SEM_pad_before_scaling":1.1,"arms":arms,
            "pea_soy_finite_n_bounds":[pea["lower"]/soy["upper_finite_n"],
                                       pea["upper_finite_n"]/soy["lower"]],
            "difference_lower":pea["lower"]-soy["upper_finite_n"]}

if __name__=="__main__":
    print(json.dumps(evaluate(),indent=2))
