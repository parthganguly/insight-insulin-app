"""Replay aggregate donor concentrations, clocks, areas and forecasts using Python stdlib.

Reads only coordinates.csv and native_input.csv. Does not require the papers or internet.
All integrals are signed group-mean trapezoids in microunit-minutes per millilitre.
"""
import csv
import math
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent
TIMES = [-5, 30, 60, 90, 120, 150, 180]
ARMS = ("trehalose", "glucose", "isomaltulose", "sucrose")


def read(name):
    with (ROOT / name).open(encoding="utf-8", newline="") as stream:
        return list(csv.DictReader(stream))


def write(name, columns, rows):
    with (ROOT / name).open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(columns)
        writer.writerows(rows)


def integrate(times, values, start, end, baseline):
    """Clip every line segment at the requested endpoints, with no extrapolation."""
    assert times[0] <= start < end <= times[-1] and len(times) == len(values)
    area = 0.0
    for t0, t1, v0, v1 in zip(times, times[1:], values, values[1:]):
        lo, hi = max(t0, start), min(t1, end)
        if lo < hi:
            slope = (v1 - v0) / (t1 - t0)
            left = v0 + slope * (lo - t0) - baseline
            right = v0 + slope * (hi - t0) - baseline
            area += (hi - lo) * (left + right) / 2
    return area


def main():
    groups = defaultdict(list)
    scale_by_arm = {}
    concentration_rows = []
    for row in read("coordinates.csv"):
        arm, period = row["arm"], row["period"]
        x, y, cap, tick9, tick16, zero, top, value = [float(row[key]) for key in (
            "x_pt","y_pt","sem_cap_y_pt","tick_0900_x_pt","tick_1600_x_pt",
            "tick_zero_y_pt","tick_top_y_pt","top_uU_per_mL")]
        scale = value / (zero - top)
        scale_by_arm[arm] = scale
        clock = round(540 + (x - tick9) * 420 / (tick16 - tick9))
        t = int(row["sample_min"])
        mean = (zero - y) * scale
        groups[period,arm].append((t,clock,mean))
        concentration_rows.append([arm,period,t,f"{clock//60:02}:{clock%60:02}",mean,(y-cap)*scale])
    write("curve.csv", ["arm","period","sample_min","figure_clock","mean_uU_per_mL","pointwise_SEM_uU_per_mL"],concentration_rows)
    records = defaultdict(dict)
    for (period,arm), points in groups.items():
        times, clocks, values = map(list,zip(*points))
        assert times == TIMES
        assert clocks == ([520,555,585,615,645,675,705] if period=="fasting" else [745,780,810,840,870,900,930])
        for end in [60,120,180]:
            # Primary uses nominal challenge time 0 with the measured -5 concentration.
            nominal = [0]+times[1:]
            baseline = values[0]
            records[period,"signed_nominal",end][arm] = integrate(nominal, values, 0, end, baseline)
            # Diagnostics separately vary the start clock and the baseline handling.
            records[period,"signed_minus5_to_end",end][arm] = integrate(times, values, -5, end, baseline)
            records[period,"signed_linearly_interpolate_zero",end][arm] = integrate(times, values, 0, end, baseline)
            if period == "fasting":
                # Stated 08:40 is figure baseline. End the interval at 09:40, 10:40, or 11:40.
                records[period,"signed_stated_0840_clock",end][arm] = integrate(clocks, values, 520, 520+end, baseline)
    for row in read("native_input.csv"):
        records[row["period"], "source_table_3h",180][row["arm"]] = int(row["area"])
    area_rows, ratios, reading_bounds = [], [], []
    for (period,operator,end), arms in records.items():
        assert set(arms) == set(ARMS)
        levels = [arms[arm] for arm in ARMS]
        t, g, i, s = levels
        tg, ins = t/g, i/s
        if operator == "signed_nominal":
            for perturbation_pt in (0.25, 0.5):
                # Sum of absolute trapezoid weights after arm-specific baseline subtraction.
                errors = [2 * (end - 15) * perturbation_pt * scale_by_arm[arm] for arm in ARMS]
                low = [v-delta for v,delta in zip(levels,errors)]
                high = [v+delta for v,delta in zip(levels,errors)]
                assert min(low) > 0
                d_low = low[0] * low[3] / (high[1] * high[2])
                d_high = high[0] * high[3] / (low[1] * low[2])
                reading_bounds.append([period,end,perturbation_pt,d_low,d_high])
        for arm in ARMS:
            area_rows.append([arm,period,operator,end,arms[arm]])
        ratios.append([period,operator,end,tg,ins,tg/ins,math.sqrt(tg*ins)])
    write("areas.csv",["arm","period","operator","end_min","area_nominal_uU_min_per_mL"],area_rows)
    write("reading_sensitivity.csv",["period","end_min","independent_point_error_pt","D_low","D_high"],reading_bounds)
    write("forecasts.csv",["period","operator","end_min","T_over_G","I_over_S","D","matched_common_geomean"],ratios)


if __name__ == "__main__":
    main()
