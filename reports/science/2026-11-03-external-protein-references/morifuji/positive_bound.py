"""Post hoc finite-group bounds on mean positive area, distinct from signed AUC."""
import json
import math
from pathlib import Path

folder = Path(__file__).resolve().parent
f = json.loads((folder / "figure.json").read_text(encoding="utf-8-sig"))
scale = 15 / (f["axis_zero_y_px"] - f["axis_fifteen_y_px"])
times = f["time_min"][:7]
# Outward cap-extents envelope of the two drawn series at each x. None = obscured.
# Treat visible cap lengths as magnitude only; no assigning caps to individual curves.
cap_ranges = [(1767,1799), (1612,1693), None, (1731,1775),
              (1762,1800), (1752,1821), (1768,1816)]

def positive_line_area(left, right, dt):
    if min(left, right) >= 0:
        return dt * (left + right) / 2
    if max(left, right) <= 0:
        return 0.
    return dt * max(left, right)**2 / (2 * abs(left - right))

def upper_vertex(base, later, se_base, se_later):
    diff = later - base
    # Empirical (denominator n) SD = sqrt(n-1) times conventional SEM.
    b, t = 3*se_base, 3*se_later
    bounds = []
    for k in range(11):
        frac = k / 10
        c = math.sqrt(frac * (1 - frac))
        bounds.append(min((1-frac)*diff + c*(b+t),
                          later - (1-frac)*base + c*b))
    return min(later, (diff + math.hypot(diff,b+t))/2, max(bounds))

def arm_bounds(key, pad, cap_assumption):
    pixels = f[key + "_y_px"][:7]
    means = [(f["axis_zero_y_px"] - y)*scale for y in pixels]
    err = pad * scale
    ses = []
    for i, caps in enumerate(cap_ranges):
        # For any finite nonnegative sample, SEM cannot exceed the sample mean.
        upper_se = means[i] + err
        if caps and cap_assumption:
            # Cap and center can each differ by pad pixels.
            upper_se = min(upper_se, (max(abs(pixels[i]-v) for v in caps) + 2*pad)*scale)
        ses.append(upper_se)
    lower = [0.] + [v-means[0]-2*err for v in means[1:]]
    upper = [0.] + [upper_vertex(means[0]-err, v+err, ses[0], ses[i])
                    for i,v in enumerate(means[1:],1)]
    lo = sum(positive_line_area(a,b,end-start)
             for a,b,start,end in zip(lower,lower[1:],times,times[1:]))
    hi = sum((a+b)*(end-start)/2
             for a,b,start,end in zip(upper,upper[1:],times,times[1:]))
    return lo,hi

for pad, use_caps in [(0,True),(2,True),(2,False)]:
    h = arm_bounds("hydro",pad,use_caps)
    w = arm_bounds("intact",pad,use_caps)
    print("pixel pad",pad,"cap envelope",use_caps,"hydro",h,"intact",w,
          "H-I", (h[0]-w[1],h[1]-w[0]), "H/I",(h[0]/w[1],h[1]/w[0]))
