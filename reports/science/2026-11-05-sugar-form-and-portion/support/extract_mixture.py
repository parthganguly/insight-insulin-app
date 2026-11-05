"""Digitize Figure 1C on the saved crop, using the authors' exact fasting values."""
import csv
from pathlib import Path
from math import log

minutes = [0, 15, 30, 60, 120]
# Time-point centres in mixture_panel.png. Axis calibration uses major ticks.
zero_y, fifty_y = 602.5, 165.3
pixels_per_unit = (zero_y - fifty_y) / 50
# The 15-min glucose and free-mixture marks nearly overlap. Allow 6 px here.
errors_px = [6, 3, 3, 3]
arms = {
    "glucose": (5.18, [377.5, 321.5, 337.5, 474.0]),
    "fructose": (5.15, [517.0, 488.5, 494.5, 516.5]),
    "free_mix": (6.2, [384.5, 303.5, 402.5, 533.0]),
    "sucralose": (5.5, [560.5, 569.0, 566.5, 569.5]),
}

def area(levels):
    return sum((t2 - t1) * (l1 + l2 - 2 * levels[0]) / 2
               for t1, t2, l1, l2 in zip(minutes, minutes[1:], levels, levels[1:]))

bounds = {}
rows = []
for arm, (baseline, ordinates) in arms.items():
    levels = [baseline] + [(zero_y - y) / pixels_per_unit for y in ordinates]
    # Include axis calibration uncertainty (±1 px per tick), native fasting rounding,
    # and independent selection bounds at each nonzero time point.
    fast_halfstep = .005 if arm in ("glucose", "fructose") else .05
    lower = [baseline + fast_halfstep] + [(zero_y - 1 - y - e) * 50 / (zero_y - fifty_y + 2)
                                          for y, e in zip(ordinates, errors_px)]
    upper = [baseline - fast_halfstep] + [(zero_y + 1 - y + e) * 50 / (zero_y - fifty_y - 2)
                                          for y, e in zip(ordinates, errors_px)]
    bounds[arm] = (area(lower), area(levels), area(upper))
    rows.append([arm, *levels, *bounds[arm]])
    print(arm, bounds[arm])
with Path(__file__).with_name("mixture_area.csv").open("w", newline="") as out:
    writer = csv.writer(out)
    writer.writerow(["arm", *[f"insulin_{t}_mU_L" for t in minutes],
                     "signed_low", "signed_center", "signed_high"])
    writer.writerows(rows)
for num, den in [("fructose","glucose"), ("free_mix","glucose"), ("free_mix","fructose")]:
    lo, mid, hi = bounds[num]
    dlo, dmid, dhi = bounds[den]
    print(f"{num}/{den}", lo / dhi, mid / dmid, hi / dlo)
g, f, mix = [bounds[k][1] for k in ("glucose", "fructose", "free_mix")]
print("internal interpolation mix/G", 0.5 * (g + f) / g, "mix signed log error",
      log(0.5 * (g + f) / mix))

# Protocol comparisons, by selected F/G and mixture/G contrasts.
observed = [f / g, mix / g]
donor_r = 1.2 / 8.1
for label, predictions in [("equal-grams", [1, 1]),
                           ("Lee-constituents", [donor_r, (1 + donor_r) / 2]),
                           ("glucose-only", [0, .5])]:
    errors = [abs(log(p / o)) if p > 0 else float("inf")
              for p, o in zip(predictions, observed)]
    print(label, predictions, errors, sum(errors) / len(errors))
