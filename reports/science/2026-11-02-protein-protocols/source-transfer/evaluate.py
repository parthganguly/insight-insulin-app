"""Score the frozen ratios against Table 4. Only the observation uses target insulin."""
import argparse
import csv
import hashlib
import runpy
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTRASTS = {
    "whey_over_pea_10": ("whey10", "pea10"),
    "whey_over_pea_20": ("whey20", "pea20"),
    "high_over_low_whey": ("whey20", "whey10"),
    "high_over_low_pea": ("pea20", "pea10"),
}
def check_close(actual, expected):
    if isinstance(expected, dict):
        if actual.keys() != expected.keys():
            raise ValueError("Output keys differ")
        for key in expected:
            check_close(actual[key], expected[key])
    elif isinstance(expected, float):
        if not math.isclose(actual, expected, rel_tol=1e-12, abs_tol=1e-12):
            raise ValueError(f"Numeric mismatch: {actual} versus {expected}")
    elif actual != expected:
        raise ValueError(f"Mismatch: {actual} versus {expected}")

def load_predictions():
    freeze = json.loads((ROOT / 'FREEZE.json').read_text(encoding='utf-8'))
    for name, digest in freeze['hashes'].items():
        if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != digest:
            raise ValueError(f'Frozen input changed: {name}')
    predicted = runpy.run_path(str(ROOT / 'predict.py'))['predictions']()
    check_close(predicted, json.loads((ROOT / 'PREDICTIONS.json').read_text(encoding='utf-8')))
    return predicted

def evaluate():
    predicted = load_predictions()
    with (ROOT / 'outcomes.csv').open(encoding='utf-8', newline='') as file:
        means = {r['arm']:float(r['group_mean_iAUC120']) for r in csv.DictReader(file)}
    observed = {k:v / means['glucose'] for k,v in means.items() if k != 'glucose'}
    results = {}
    for model, ratios in predicted.items():
        errors = {k:abs(math.log(v / observed[k])) for k,v in ratios.items() if v is not None}
        pairs = {}
        for name, (numerator, denominator) in CONTRASTS.items():
            target = observed[numerator] / observed[denominator]
            ratio = None
            if ratios[numerator] is not None and ratios[denominator] is not None:
                ratio = ratios[numerator] / ratios[denominator]
            pairs[name] = dict(predicted=ratio, observed=target,
                               abs_log_error=None if ratio is None else abs(math.log(ratio / target)))
        results[model] = dict(predicted_ratios=ratios, coverage=len(errors), errors=errors,
                              four_arm_mean_abs_log_error=sum(errors.values())/4 if len(errors)==4 else None,
                              contrasts=pairs)
    return dict(observed=observed, models=results)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    result=evaluate()
    if args.check:
        check_close(result,json.loads((ROOT/'RESULTS.json').read_text(encoding='utf-8')))
        print('PASS frozen forecasts, four 120-minute arm ratios, dose and source contrasts')
    else:
        print(json.dumps(result,indent=2,allow_nan=False))
