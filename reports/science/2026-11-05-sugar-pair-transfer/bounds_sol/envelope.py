"""Descriptive finite-n bounds; no reconstructed participant data or population CI."""
from __future__ import annotations

import csv
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
N = 10
# Original embedded image coordinates, not resized screenshots. Unresolved tips
# are None. The black baseline in panel c is partially obscured by the white
# marker. All numerical conclusions are also reported with +/-2 and +/-3 px.
READINGS = {
    "breakfast": {
        "T": ([613, 557, 531, 520, 527], [None, 544, 515, 501, 509]),
        "G": ([616, 513, 472, 461, 476], [None, 493, 443, 432, 453]),
        "I": ([610, 566, 552, 543, 551], [None, 553, 539, 528, 537]),
        "S": ([606, 503, 488, 511, 576], [None, 482, 467, 494, 569]),
    },
    "lunch": {
        "T": ([610, 438, 446, 466, 496], [None, None, 421, 441, 465]),
        "G": ([606, 434, 410, 420, 450], [None, None, 389, 393, 412]),
        "I": ([606, 466, 462, 505, 512], [None, 440, 440, 479, 485]),
        "S": ([616, 415, 420, 424, 493], [None, 388, 400, 392, 462]),
    },
}
IMAGE_Y = 176.81951904296875
IMAGE_SCALE = 474.11749267578125 / 988
ZERO_Y = (482.7980041503906 - IMAGE_Y) / IMAGE_SCALE
SCALES = {
    "c": 220 * IMAGE_SCALE / (482.7980041503906 - 348.97698974609375),
    "d": 180 * IMAGE_SCALE / (482.7980041503906 - 351.6700134277344),
}


def positive_segment(a: float, b: float, dt: float) -> float:
    """Integral max(0, affine(a,b)); split at its actual zero crossing."""
    if a >= 0 and b >= 0:
        return dt * (a + b) / 2
    if a <= 0 and b <= 0:
        return 0.0
    if a > 0:
        return dt * a * a / (2 * (a - b))
    return dt * b * b / (2 * (b - a))


def positive_auc(increments: list[float]) -> float:
    return sum(positive_segment(a, b, 30) for a, b in zip(increments, increments[1:]))


def signed_auc(means: list[float]) -> float:
    return sum(30 * (a + b) / 2 for a, b in zip(means, means[1:])) - 120 * means[0]


def finite_n_positive_upper(x: float, b: float, sx: float, sb: float) -> float:
    """Bound mean_i (X_i-B_i)+ from two marginal means and SEM upper bounds.

    For the k indices with X_i>B_i, Cauchy gives the corresponding subset
    concentration sum bounds; nonnegative concentrations give the caps.
    The SEM conversion uses sample denominator n-1, so this is finite-n.
    """
    upper = 0.0
    for k in range(N + 1):
        c = math.sqrt((N - 1) * k * (N - k)) / N
        concentration_upper = min(x, k * x / N + c * sx)
        baseline_lower = max(0.0, k * b / N - c * sb)
        upper = max(upper, concentration_upper - baseline_lower)
    return max(0.0, upper)


def curve_bounds(period: str, sugar: str, pixel_error: float, subdivisions: int = 120):
    means_y, tips_y = READINGS[period][sugar]
    scale = SCALES["c" if sugar in ("T", "G") else "d"]
    means = [(ZERO_Y - y) * scale for y in means_y]
    lo = [max(0, m - pixel_error * scale) for m in means]
    hi = [m + pixel_error * scale for m in means]
    # A nonnegative n-sample concentration has SEM <= its sample mean. Missing
    # tips use this exact bound, never an assumed zero SEM. Tip and marker
    # reading errors each contribute pixel_error to the SEM difference bound.
    sem_hi = [
        hi[j] if tip is None else min(hi[j], max(0, (means_y[j] - tip + 2 * pixel_error) * scale))
        for j, tip in enumerate(tips_y)
    ]
    increments_lo = [0] + [lo[j] - hi[0] for j in range(1, 5)]
    lower = positive_auc(increments_lo)
    concentration_only_upper = sum(w * hi[j] for j, w in enumerate([0, 30, 30, 30, 15]))
    upper = 0.0
    # Dense trapezoids of upper bounds are certified: each participant's
    # positive affine increment is convex on each original sampling segment.
    # First segment is exactly a*(X30-B), retaining identity at nominal t=0.
    for j in range(4):
        values = []
        for q in range(subdivisions + 1):
            a = q / subdivisions
            if j == 0:
                h = a * finite_n_positive_upper(hi[1], lo[0], sem_hi[1], sem_hi[0])
            else:
                x = (1 - a) * hi[j] + a * hi[j + 1]
                sx = (1 - a) * sem_hi[j] + a * sem_hi[j + 1]
                h = finite_n_positive_upper(x, lo[0], sx, sem_hi[0])
            values.append(h)
        upper += sum(30 / subdivisions * (a + b) / 2 for a, b in zip(values, values[1:]))
    return {
        "means": means,
        "sem_upper_bounds": sem_hi,
        "missing_tips": [j * 30 for j, tip in enumerate(tips_y) if tip is None],
        "signed_central": signed_auc(means),
        "signed_interval": [signed_auc([hi[0]] + lo[1:]), signed_auc([lo[0]] + hi[1:])],
        "positive_interval": [lower, min(upper, concentration_only_upper)],
        "concentration_only_positive_interval": [lower, concentration_only_upper],
    }


def ratio_interval(bounds, key):
    b = {s: bounds[s][key] for s in "TGIS"}
    tg = [b["T"][0] / b["G"][1], b["T"][1] / b["G"][0]]
    ins = [b["I"][0] / b["S"][1], b["I"][1] / b["S"][0]]
    return {"T_over_G": tg, "I_over_S": ins, "Q": [tg[0] / ins[1], tg[1] / ins[0]]}


def check():
    assert positive_segment(-1, 1, 2) == 0.5
    assert positive_segment(1, -1, 2) == 0.5
    assert positive_auc([0, 1, -1, 1, -1]) == 37.5
    # Synthetic samples test the finite-n inequality, including extremal
    # concentrations and a baseline with every concentration in one person.
    from random import Random
    random = Random(20261105)
    for _ in range(10000):
        x = [random.expovariate(1) for _ in range(N)]
        b = [random.expovariate(1) for _ in range(N)]
        if _ % 10 == 0:
            b = [N] + [0.0] * (N - 1)
        def moments(v):
            m = sum(v) / N
            sem = math.sqrt(sum((z - m) ** 2 for z in v) / (N - 1) / N)
            return m, sem
        mx, sx = moments(x)
        mb, sb = moments(b)
        assert sx <= mx + 1e-12 and sb <= mb + 1e-12
        actual = sum(max(0, a - z) for a, z in zip(x, b)) / N
        assert actual <= finite_n_positive_upper(mx, mb, sx, sb) + 1e-12


def main():
    check()
    d = 0.345231 / 0.654771
    result = {"n": N, "old_pair_specific_Q": d, "log_distance_midpoint": math.sqrt(d), "axis_y0": ZERO_Y, "units_per_original_pixel": SCALES, "results": {}}
    for period in READINGS:
        result["results"][period] = {}
        for error in [0, 2, 3]:
            curves = {s: curve_bounds(period, s, error) for s in "TGIS"}
            result["results"][period][str(error)] = {
                "curves": curves,
                "finite_sample_positive": ratio_interval(curves, "positive_interval"),
                "nonnegativity_only_positive": ratio_interval(curves, "concentration_only_positive_interval"),
                "signed": ratio_interval(curves, "signed_interval"),
            }
    (ROOT / "envelope.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    with (ROOT / "digitization.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["period", "sugar", "nominal_min", "original_image_mean_y", "original_image_upper_tip_y", "mean_units", "sem_units_if_resolved", "tip_status"])
        for p, sugars in READINGS.items():
            for s, (means, tips) in sugars.items():
                scale = SCALES["c" if s in "TG" else "d"]
                for j, (m, tip) in enumerate(zip(means, tips)):
                    writer.writerow([p, s, 30 * j, m, "" if tip is None else tip, (ZERO_Y - m) * scale, "" if tip is None else (m - tip) * scale, "unresolved; SEM<=mean" if tip is None else "read; retain pixel bound"])
    for p, all_errors in result["results"].items():
        for e, value in all_errors.items():
            print(p, "+/-", e, "pixels", "positive", value["finite_sample_positive"], "signed", value["signed"])


if __name__ == "__main__":
    main()
