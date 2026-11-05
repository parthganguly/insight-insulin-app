"""Independent arithmetic audit. Published aggregate inputs only; no fitting.

Target original PDF had been read before this script was written. Thus this is
an uncalibrated cross-source arithmetic check, not a blinded validation.
External ratios are the task-specified inputs, not independently verified here.
"""
import csv
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
oat = 1111 / 1323
barley = {"normal": 5.8 / 11.0, "high_amylose": 5.2 / 10.2}
# A declared common-factor alternative: equal weight to species on log scale,
# with equal weight to the two task-specified barley contrasts within barley.
common = math.sqrt(oat * math.sqrt(math.prod(barley.values())))
targets = {
    90: {"oat_roasted": (13.5, 9.9), "barley_steamed": (13.6, 14.3)},
    120: {"oat_roasted": (14.9, 10.8), "barley_steamed": (14.7, 15.3)},
}
rows = []
for time, products in targets.items():
    for product, (thin, thick) in products.items():
        factors = {"species_specific_oat": oat} if product.startswith("oat") else {
            "species_specific_barley_" + k: v for k, v in barley.items()}
        factors.update({"common_log_factor": common, "null_no_process_transfer": 1.0})
        for label, factor in factors.items():
            prediction = thin * factor
            rows.append(dict(time_minutes=time, product=product, model=label,
                             thin_native_mean=thin, observed_thick_native_mean=thick,
                             observed_ratio=thick/thin, factor=factor,
                             predicted_thick_native_mean=prediction,
                             prediction_minus_observed=prediction-thick,
                             absolute_error=abs(prediction-thick)))
with (ROOT / "transfer_predictions.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)

report = {
    "exposure": "Target original PDF read before arithmetic; no blinded validation claim.",
    "external_inputs": {"oat": {"numerator":1111,"denominator":1323,"native_minutes":180},
                        "barley_normal":{"numerator":5.8,"denominator":11,"native_minutes":120},
                        "barley_high_amylose":{"numerator":5.2,"denominator":10.2,"native_minutes":120}},
    "factors":{"oat":oat, **barley, "common_log_factor":common},
    "linear_attenuation":"r(lambda)=1-lambda*(1-r), 0<lambda<=1; endpoints reported as closed envelope; 1 excluded",
    "log_attenuation":"r(lambda)=r**lambda, 0<lambda<=1; same marginal envelopes and invariant ordering",
    "attenuated_prediction_envelopes_120":{
        "oat":[14.9*oat,14.9],
        **{"barley_"+k:[14.7*v,14.7] for k,v in barley.items()},
        "common_oat":[14.9*common,14.9],
        "common_barley":[14.7*common,14.7]},
    "observed_native_120_ratios":{"oat":10.8/14.9,"barley":15.3/14.7,
                                 "barley_to_oat_ratio_of_ratios":(15.3/14.7)/(10.8/14.9)},
    "observed_II_120_ratios":{"oat":58/84,"barley":81/85,
                             "barley_to_oat_ratio_of_ratios":(81/85)/(58/84)},
    "external_barley_to_oat_factor_ratios":{k:v/oat for k,v in barley.items()},
    "native_area_unit":"Paper typography nmol/(min L); numerical area operationally concentration x minutes (nmol min/L). No unit conversion performed."
}
(ROOT / "transfer_calculations.json").write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
print(json.dumps(report, indent=2))
print("\nPredictions:")
for row in rows:
    print(row)
