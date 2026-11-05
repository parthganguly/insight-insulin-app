"""Frozen Holub per-window comparator scored on independent Kawai reading."""
import csv
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parents[1] / "prior" / "holub.csv"


def main():
    rows = list(csv.DictReader(SOURCE.open(encoding="utf-8")))
    areas = {}
    for sugar in ["isomaltulose", "sucrose"]:
        curve = sorted((r for r in rows if r["sugar"] == sugar), key=lambda r: float(r["minutes"]))
        baseline = float(curve[0]["pmol_L"])
        areas[sugar] = []
        for window in [60, 120]:
            nodes = [r for r in curve if float(r["minutes"]) <= window]
            assert float(nodes[-1]["minutes"]) == window
            integral = sum((float(a["pmol_L"]) + float(b["pmol_L"]) - 2 * baseline) * (float(b["minutes"]) - float(a["minutes"])) / 2 for a, b in zip(nodes, nodes[1:]))
            areas[sugar].append(integral)
    holub_ratios = [a / b for a, b in zip(areas["isomaltulose"], areas["sucrose"])]
    target = json.loads((ROOT / "results.json").read_text(encoding="utf-8"))
    predictions = {"Holub_per_window": holub_ratios, "Maastricht_frozen": target["predictions"], "no_change": [1, 1]}
    shapes = {name: r[1] / r[0] for name, r in predictions.items()}
    def male(r):
        return sum(abs(math.log(p / a)) for p, a in zip(r, target["ratios"])) / 2
    result = {
        "Holub_source_csv_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "Holub_area_units": "pmol min/L",
        "Holub_signed_areas": areas,
        "Holub_ratios": holub_ratios,
        "Kawai_ratios": target["ratios"],
        "Kawai_shape": target["shape"],
        "level_MALE": {("equality_constant_one" if name == "no_change" else name): male(r) for name, r in predictions.items()},
        "forecast_shapes": shapes,
        "shape_log_errors": {name: abs(math.log(p / target["shape"])) for name, p in shapes.items()},
        "geometric_threshold_Holub_vs_Maastricht": math.sqrt(shapes["Holub_per_window"] * shapes["Maastricht_frozen"]),
        "geometric_threshold_Holub_vs_no_change": math.sqrt(shapes["Holub_per_window"]),
        "per_window_level_thresholds_Holub_vs_Maastricht": [math.sqrt(a * b) for a, b in zip(holub_ratios, target["predictions"])],
        "graph_error": {},
    }
    for error, bounds in target["sensitivity"].items():
        lo, hi = bounds["shape_interval"]
        minimax_center = math.sqrt(lo * hi)
        result["graph_error"][error] = {
            "Kawai_shape_interval": [lo, hi],
            "Kawai_ratio_intervals": bounds["ratio_intervals"],
            "minimax_target_informed_center": minimax_center,
            "minimax_target_informed_radius": math.log(hi / lo) / 2,
            "candidate_worst_case_shape_log_error": {name: max(abs(math.log(p / lo)), abs(math.log(p / hi))) for name, p in shapes.items()},
        }
    # Original data identity, not an arbitrary synthetic check.
    assert abs(holub_ratios[1] - 0.654771347866157) < 1e-12
    for error, b in result["graph_error"].items():
        center = b["minimax_target_informed_center"]
        radius = b["minimax_target_informed_radius"]
        for name, p in shapes.items():
            assert abs(b["candidate_worst_case_shape_log_error"][name] - (radius + abs(math.log(p / center)))) < 1e-12
    (ROOT / "holub_results.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
