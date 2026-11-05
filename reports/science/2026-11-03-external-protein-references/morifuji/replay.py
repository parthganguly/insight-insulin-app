"""Replay source-group insulin areas from the published figure. Standard library."""
import json
import math
from pathlib import Path

folder = Path(__file__).resolve().parent
def load(name):
    return json.loads((folder / name).read_text(encoding="utf-8-sig"))

f = load("figure.json")
t = f["time_min"]
units_per_pixel = 15 / (f["axis_zero_y_px"] - f["axis_fifteen_y_px"])
training = load("training.json")
for source, arms in training.items():
    r = [arms["hydro"][dose] / arms["intact"][dose] for dose in ("0.3","0.4","0.6")]
    print(source, "ratios", r, "constant", math.prod(r)**(1/3))

for horizon in (120, 180):
    n = t.index(horizon) + 1
    weights = [0.] * n
    for i in range(1,n):
        half_width = (t[i] - t[i-1]) / 2
        weights[i-1] += half_width
        weights[i] += half_width
    weights[0] -= horizon
    def area(arm):
        ys = f[arm+"_y_px"]
        return -sum(a*b for a,b in zip(ys, weights)) * units_per_pixel
    hydro, intact = area("hydro"), area("intact")
    ratio = hydro/intact
    delta = units_per_pixel * sum(abs(w) for w in weights) * f["reading_envelope_px"]
    bounds = ((hydro-delta)/(intact+delta), (hydro+delta)/(intact-delta))
    arms = training["whey"]
    ratios = [arms["hydro"][dose]/arms["intact"][dose] for dose in ("0.3","0.4","0.6")]
    print(horizon, "areas hydro/intact", hydro, intact, "ratio", ratio,
          "reading scenario", bounds)
    for label, pred in [("equality",1.),("geometric",math.prod(ratios)**(1/3)),("boundary",ratios[0])]:
        print(label, "prediction",pred,"absolute log error",abs(math.log(pred/ratio)))
