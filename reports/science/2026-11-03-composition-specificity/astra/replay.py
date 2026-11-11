"""Reconstruct group-mean curves from the Figure 4 marker centres (PDF points)."""
import csv
from collections import defaultdict
from pathlib import Path

AXIS_ZERO = 684.554
AXIS_24 = 556.468
curves = defaultdict(dict)
with Path(__file__).with_name("figure4_coordinates.csv").open() as handle:
    for row in csv.DictReader(handle):
        y = float(row["center_y_pt"])
        curves[(row["age"], int(row["leucine_pct"]))][int(row["minute"])] = (
            (AXIS_ZERO - y) * 24 / (AXIS_ZERO - AXIS_24)
        )


def areas(points):
    """Signed and positive-only area. Linear interpolation at every crossing."""
    signed = positive = 0.0
    for (t0, v0), (t1, v1) in zip(points, points[1:]):
        width = t1 - t0
        total = width * (v0 + v1) / 2
        signed += total
        if min(v0, v1) >= 0:
            positive += total
        elif max(v0, v1) > 0:
            positive += width * max(v0, v1)**2 / (2 * abs(v1 - v0))
    return signed, positive


def summarize(curve, basal, perturb=0):
    # Raise post-dose concentrations and lower basal markers for a simultaneous
    # upper bound; reverse for the lower bound. Shared marker at t=0 remains coupled.
    changed = {t: v + (perturb if t > 0 else -perturb) for t, v in curve.items()}
    baseline = changed[0] if basal == "zero" else (changed[-30] + changed[0]) / 2
    return areas([(t, v - baseline) for t, v in sorted(changed.items()) if 0 <= t <= 120])


if __name__ == "__main__":
    for age in ("young", "older"):
        for basal in ("zero", "predose_mean"):
            low, high = (curves[(age, pct)] for pct in (26, 41))
            for i, mode in enumerate(("signed", "positive")):
                a, b = (summarize(c, basal)[i] for c in (low, high))
                # Stress envelope of +/- 0.25 PDF point for each marker, about
                # +/- 0.047 uIU/mL. It describes reading uncertainty only.
                error = 0.25 * 24 / (AXIS_ZERO - AXIS_24)
                lo = summarize(high, basal, -error)[i] - summarize(low, basal, error)[i]
                hi = summarize(high, basal, error)[i] - summarize(low, basal, -error)[i]
                print(age, basal, mode, f"26={a:.2f} 41={b:.2f} delta={b-a:.2f} bounds=[{lo:.2f},{hi:.2f}]")
