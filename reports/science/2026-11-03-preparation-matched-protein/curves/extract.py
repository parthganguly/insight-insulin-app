"""Read vector marker bounding-box centers from the identified thesis PDF."""
import hashlib
import json
import sys
from pathlib import Path
import pymupdf

TIMES = [0, 15, 30, 60, 90, 120, 150]
PANELS = [
    (63, "4.2B", 89, {"soy": (136, 1), "cho": (143, 2)}),
    (65, "4.4B", 138, {"soy_then_cho": (257, 1), "cho_then_soy": (264, 2),
                        "pea_then_cho": (278, 1)}),
]


def extract(source):
    data = {"source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "minutes": TIMES, "insulin_unit": "microU/mL", "panels": {}}
    with pymupdf.open(source) as pdf:
        for page, name, axes, series in PANELS:
            paths = pdf[page - 1].get_drawings()
            axis = paths[axes]["rect"]
            x0, x80 = axis.x1, axis.x0
            panel = {"pdf_page": page, "axis_path": axes, "x_at_0_and_80_pt": [x0, x80],
                     "y_at_0_and_180_min_pt": [axis.y1, axis.y0], "series": {}}
            for arm, (start, step) in series.items():
                ids = list(range(start, start + step * len(TIMES), step))
                centers, values = [], []
                for i, t in zip(ids, TIMES):
                    r = paths[i]["rect"]
                    x, y = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
                    assert abs((axis.y1 - y) / axis.height * 180 - t) < 1
                    centers.append([round(x, 5), round(y, 5)])
                    values.append(round(80 * (x0 - x) / (x0 - x80), 5))
                panel["series"][arm] = {"vector_paths": ids, "xy_pt": centers, "means": values}
            data["panels"][name] = panel
    return data


if __name__ == "__main__":
    print(json.dumps(extract(Path(sys.argv[1])), indent=2))
