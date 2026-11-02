"""Post hoc limit on source discrimination if only pea-equivalent grams change."""
import csv
import json
from pathlib import Path
import runpy

root = Path(__file__).resolve().parent
model = runpy.run_path(str(root / "predict.py"))
whey = model["predictions"]()["protein"]
with (root / "composition.csv").open(encoding="utf-8", newline="") as f:
    fat = {row["arm"]:float(row["fat_g"]) for row in csv.DictReader(f)}
with (root / "outcomes.csv").open(encoding="utf-8", newline="") as f:
    means = {row["arm"]:float(row["group_mean_iAUC120"]) for row in csv.DictReader(f)}

# The admitted piecewise-linear protein factor is at least 1 across 0–30 g.
# Its minimum is attained at zero. The whey forecast and pea fat stay fixed.
assert model["PROTEIN"][0] == 1 and list(model["PROTEIN"]) == sorted(model["PROTEIN"])
diagnostic = {}
for dose in ("10", "20"):
    w, p = "whey" + dose, "pea" + dose
    smallest_pea_forecast = model["factor"](fat[p], model["FAT"])
    ceiling = whey[w] / smallest_pea_forecast
    observed = means[w] / means[p]
    diagnostic[dose] = dict(observed=observed, forecast_ceiling=ceiling,
                            ceiling_if_pea_fat_factor_removed=whey[w],
                            printed_ratio_above_ceiling=observed > ceiling)
print(json.dumps(diagnostic,indent=2))
