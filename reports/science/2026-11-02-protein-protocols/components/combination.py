"""Recompute all frozen constituent predictions and their observed mixed-drink residuals."""
import argparse
import hashlib
import itertools
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FROZEN_SHA = "e68576fca37eeb0dae890bb69108cd2cfcc23f7babee5a5168d88dd6c965e2fe"

def measured(literal):
    mean_text = literal.split("±")[0].strip()
    return float(mean_text), 0.5 * 10 ** -(len(mean_text.partition(".")[2]))

def predictions(values):
    return {"additive_control": values["G"] + values["P"] - values["C"],
            "glucose_only": values["G"], "additive_raw": values["G"] + values["P"]}

def calculate():
    frozen_file = ROOT / "COMBINATION_FROZEN.json"
    assert hashlib.sha256(frozen_file.read_bytes()).hexdigest() == FROZEN_SHA
    inputs = json.loads(frozen_file.read_text(encoding="utf-8"))
    gp = json.loads((ROOT / "COMBINATION_OUTCOMES.json").read_text(encoding="utf-8-sig"))["mixture_GP"]
    results = {}
    for group_window, source in inputs.items():
        literals = {**source["inputs"], "GP": gp[group_window]}
        values = {key: measured(text)[0] for key,text in literals.items()}
        forecasts = predictions(values)
        assert forecasts == source["predictions"]
        corners = [dict(zip(literals, row)) for row in itertools.product(*[
            [mean-half, mean+half] for mean,half in map(measured,literals.values())])]
        cell = {}
        for model, pred in forecasts.items():
            signed = pred - values["GP"]
            improvement = abs(forecasts["glucose_only"]-values["GP"]) - abs(signed)
            residuals = [row["GP"]-predictions(row)[model] for row in corners]
            gains = [abs(row["GP"]-row["G"])-abs(row["GP"]-predictions(row)[model]) for row in corners]
            cell[model] = dict(predicted=pred, observed=values["GP"], signed_error=signed,
                              residual_observed_minus_predicted=-signed, absolute_error=abs(signed),
                              absolute_error_reduction_vs_glucose_only=improvement,
                              rounding_residual_range=[min(residuals),max(residuals)],
                              rounding_gain_range=[min(gains),max(gains)])
        results[group_window] = cell
    return results

def check(current, saved):
    if isinstance(current,dict):
        assert current.keys()==saved.keys()
        for key in current:check(current[key],saved[key])
    elif isinstance(current,list):
        assert len(current)==len(saved)
        for a,b in zip(current,saved):check(a,b)
    else:assert math.isclose(current,saved,abs_tol=1e-11,rel_tol=1e-11)

if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    results=calculate()
    if parser.parse_args().check:
        check(results,json.loads((ROOT/"COMBINATION_RESULTS.json").read_text(encoding="utf-8-sig")))
        print("PASS 4 group/windows, 3 frozen forecasts each, all 16 rounding corners per cell")
    else:
        print(json.dumps(results,indent=2))
