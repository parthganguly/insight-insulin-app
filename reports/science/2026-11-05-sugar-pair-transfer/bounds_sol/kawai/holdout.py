"""Independent graph reading of Kawai1985 Fig1 insulin, frozen holdout scoring."""
import csv
import itertools
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TIMES = [0, 15, 30, 60, 90, 120]
X = [901, 1138, 1373, 1836, 2302, 2766]
Y = {
    "isomaltulose": [4887, 4672, 4614, 4651, 4601, 4625],
    "sucrose": [4874, 4452, 4171, 4139, 4445, 4458],
}
PREDICTIONS = [0.41470337160713994, 0.5799043269598717]


def auc(y, window, drift=0.00215, scale=23.2):
    # Common zero ordinate cancels in increments. Positive time is paper clock.
    increments = [(y[0] - v + drift * (x - X[0])) / scale for x, v in zip(X, y)]
    stop = TIMES.index(window)
    return sum((increments[j] + increments[j + 1]) * (TIMES[j + 1] - TIMES[j]) / 2 for j in range(stop))


def male(predicted, actual):
    return sum(abs(math.log(p / a)) for p, a in zip(predicted, actual)) / len(actual)


def marginal_interval(values):
    return [min(values), max(values)]


def main():
    areas = {s: [auc(y, w) for w in [60, 120]] for s, y in Y.items()}
    r = [a / b for a, b in zip(areas["isomaltulose"], areas["sucrose"])]
    forecast_shape = PREDICTIONS[1] / PREDICTIONS[0]
    shape = r[1] / r[0]
    scores = {
        "frozen_trajectory": male(PREDICTIONS, r),
        "donor_120_constant": male([PREDICTIONS[1]] * 2, r),
        "external_065477_constant": male([0.65477] * 2, r),
        "equality": male([1.0] * 2, r),
        "best_possible_fixed": abs(math.log(r[1] / r[0])) / 2,
    }
    result = {"source": "https://doi.org/10.1507/endocrj1954.32.933", "n": 8, "area_units": "uU min/ml", "time_points": TIMES, "areas": areas, "ratios": r, "shape": shape, "predictions": PREDICTIONS, "forecast_shape": forecast_shape, "MALE": scores, "shape_log_errors": {"trajectory": abs(math.log(forecast_shape / shape)), "no_change": abs(math.log(shape))}, "best_fixed_ratio_interval": sorted(r), "sensitivity": {}}
    for error in [5, 10]:
        possibilities = {}
        for sugar, center in Y.items():
            possibilities[sugar] = []
            # Linear-fractional positive-denominator extrema occur at vertices.
            # Preserve shared baseline and all node dependence in each shape.
            for signs in itertools.product([-1, 1], repeat=6):
                reading = [c + error * s for c, s in zip(center, signs)]
                for drift in [0.0, 0.0043]:
                    a = [auc(reading, w, drift) for w in [60, 120]]
                    possibilities[sugar].append(a)
        rr = [[], []]
        shape_values = []
        for ai in possibilities["isomaltulose"]:
            for ass in possibilities["sucrose"]:
                ratio = [a / b for a, b in zip(ai, ass)]
                for j in range(2):
                    rr[j].append(ratio[j])
                shape_values.append(ratio[1] / ratio[0])
        ranges = [marginal_interval(v) for v in rr]
        shape_range = marginal_interval(shape_values)
        result["sensitivity"][str(error)] = {
            "pixel_bound": error,
            "scan_drift_y_per_x_range": [0.0, 0.0043],
            "ratio_intervals": ranges,
            "shape_interval": shape_range,
            "shape_winner_threshold": math.sqrt(forecast_shape),
            "area_intervals_with_scale_range_23_to_23point4": {
                s: [[min(a[j] for a in v) * 23.2 / 23.4, max(a[j] for a in v) * 23.2 / 23.0] for j in range(2)] for s, v in possibilities.items()
            },
        }
    (ROOT / "results.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    with (ROOT / "digitization.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["sugar", "minutes", "original_image_x", "original_image_mean_y", "central_mean_uU_per_ml", "mean_increment"])
        for sugar, y in Y.items():
            for t, x, v in zip(TIMES, X, y):
                mean = (5150 + 0.00215 * (x - X[0]) - v) / 23.2
                baseline = (5150 - y[0]) / 23.2
                writer.writerow([sugar, t, x, v, mean, mean - baseline])
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
