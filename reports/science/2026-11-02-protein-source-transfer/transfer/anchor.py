"""Post hoc transport of the unchanged reported-area model to the exposed 2026 powder drinks."""
import argparse
import json
import math
from pathlib import Path
import runpy
from statistics import fmean

ROOT = Path(__file__).resolve().parent
engine = runpy.run_path(str(ROOT / "evaluate.py"))


def score():
    rows = [r for r in engine["load_rows"]() if r["method"] == "Reported" and r["author"] != "Thondre"]
    mean, intercept, slope, offsets = engine["fit"](rows)
    # PLOS One, Thondre et al., Tables 1 and 4. Grams refer to protein, not powder.
    protein = {"pea10":8.0, "pea20":16.0, "whey10":8.1, "whey20":16.2}
    y = {"pea10":4069.7, "pea20":4104.9, "whey10":4183.3, "whey20":6043.07}
    observed = {key:value/3373.4 for key,value in y.items()}
    predicted = {m:{} for m in engine["MODELS"]}
    for arm, grams in protein.items():
        x = grams/50
        family = "whey" if arm.startswith("whey") else "pea"
        d = intercept + slope*x
        for m, log_y in zip(engine["MODELS"], (0, mean, d, d+offsets[family])):
            predicted[m][arm] = math.exp(log_y)
    def contrasts(arms):
        low = arms["whey10"]/arms["pea10"]
        high = arms["whey20"]/arms["pea20"]
        return {"whey_pea_low":low, "whey_pea_high":high, "high_ratio_over_low_ratio":high/low}
    return {
        "n_authors":len(set(r["author"] for r in rows)), "n_rows":len(rows),
        "intercept":intercept, "slope":slope, "source_offsets":{k:offsets[k] for k in ("whey","pea")},
        "observed":observed, "observed_contrasts":contrasts(observed),
        "forecasts":predicted, "contrasts":{m:contrasts(v) for m,v in predicted.items()},
        "mae_log":{m:fmean(abs(math.log(v[k]/observed[k])) for k in observed) for m,v in predicted.items()},
        "parallel_slopes_implied_double_ratio":math.exp(slope*((16.2-16.0)-(8.1-8.0))/50),
    }

if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    result=score()
    if parser.parse_args().check:
        assert engine["close"](result,json.loads((ROOT/"ANCHOR_RESULTS.json").read_text(encoding="utf-8")))
        print("PASS four later-published drink predictions and source-by-dose contrast")
    else:
        print(json.dumps(result,indent=2))
