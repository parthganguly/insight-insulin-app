"""Imai Fig 3B, group-mean control-calibrated diagnostic. Public factual coordinates only."""
import itertools
import json
import math
from pathlib import Path

TICKS = [0, 30, 60, 120]
OBSERVED = 4222 / 5702


def calculate(y_zero, y_hundred, y_base, y_end):
    def decode(y):
        return 100 * (y_zero - y) / (y_zero - y_hundred)
    baseline, end = decode(y_base), decode(y_end)
    values = [0, 83.6 - baseline, 58.2 - baseline, end - baseline]
    assert min(values) >= 0
    def profile(t):
        if t <= 0:
            return 0
        for i, right in enumerate(TICKS[1:]):
            left = TICKS[i]
            if t <= right:
                return values[i] + (t-left)/(right-left)*(values[i+1]-values[i])
        raise ValueError(t)
    def integral(times, shift=0):
        return sum((b-a)*(profile(a-shift)+profile(b-shift))/2
                   for a,b in zip(times,times[1:]))
    denominator = integral(TICKS)
    a = integral([0,30,60,106])/denominator
    b = integral(TICKS,14)/denominator
    return dict(baseline=baseline,end=end,profile_area=denominator,
                A=a,B=b,error_A=abs(math.log(a/OBSERVED)),error_B=abs(math.log(b/OBSERVED)))


def main():
    # Positions read from original 3974 x 2594 raster, origin top left, axes shared.
    central = calculate(1153.5,212.5,1093,749)
    corners = [calculate(*point) for point in itertools.product(
        [1152,1155],[212,213],[1082,1104],[744,754])]
    bounds = {key:[min(row[key] for row in corners),max(row[key] for row in corners)] for key in central}
    print(json.dumps(dict(observed=OBSERVED,central=central,reading_corners=len(corners),
                          finite_corner_ranges=bounds),indent=2))

if __name__=="__main__":
    main()
