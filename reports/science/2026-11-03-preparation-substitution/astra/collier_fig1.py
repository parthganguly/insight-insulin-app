"""Approximate incremental area under the *group-mean* Figure 1 insulin curves.

The source is raw/collier.pdf, p. 51 (PDF page 2). Re-render the calibration image:
pdftoppm -f 2 -l 2 -scale-to 5400 -x 2150 -y 1090 -W 850 -H 850 -singlefile -png raw/collier.pdf raw/collier_zoom
No direct author-reported 0-120 minute arm means or uncertainty are available.
"""
import csv
import hashlib
from pathlib import Path
from bisect import bisect_right

here = Path(__file__).resolve().parent
assert hashlib.sha256((here/"raw/collier.pdf").read_bytes()).hexdigest() == "615cd29b4ae7bd2960cb77de36a11a4d92e2519523c3842f7efd6082ea5784a2"
# Y positions of ticks at 50, 40, 30, 20, 10 mU/L in the rendered panel.
axis_y = [200,349,481,621,751]
axis_units = [50,40,30,20,10]
times = [0,15,30,60,90,120]
# 0 min: extrapolated polyline intercepts at the left axis, no individual markers.
# Both potato curves overlap near the intercept and at the 15-minute marker.
# Lentil+fat and potato baseline intercepts partly overlap. Values here represent
# the centers of visible traces. The recipes denote 37.5 g fat as 46.5 g butter.
pixel_readings = {
    "potato": [718,566,44,85,529,579],
    "potato_plus_fat": [718,566,206,219,566,539],
    "lentil": [756,699,595,458,514,598],
    "lentil_plus_fat": [718,621,570,566,597,635],
}
def concentration(y):
    i = min(3,max(0,bisect_right(axis_y,y)-1))
    return axis_units[i]+(y-axis_y[i])*(axis_units[i+1]-axis_units[i])/(axis_y[i+1]-axis_y[i])
def auc(values):
    return sum((t1-t0)*((a+b)/2-values[0]) for t0,t1,a,b in zip(times,times[1:],values,values[1:]))
def estimate(values):
    # Baseline ±2 mU/L, each other digitized value ±1 mU/L in opposite direction.
    # This is a readout sensitivity envelope; it excludes sampling error.
    up = [values[0]-2]+[v+1 for v in values[1:]]
    down = [values[0]+2]+[v-1 for v in values[1:]]
    return [auc(values),auc(down),auc(up)]
rows = []
for arm,pixels in pixel_readings.items():
    values = [concentration(y) for y in pixels]
    metrics = [round(x) for x in estimate(values)]
    rows.append([arm]+[round(v,1) for v in values]+metrics)
    print(arm,metrics)
with (here/"collier_chart_120.csv").open("w",newline="",encoding="utf-8") as f:
    w=csv.writer(f)
    w.writerow(["arm"] + [f"mean_insulin_mU_L_{t}min" for t in times]+["approx_mean_curve_net_incremental_area_mU_min_L","readout_sensitivity_low","readout_sensitivity_high"])
    w.writerows(rows)
for potato,lentil in ((rows[0],rows[2]),(rows[1],rows[3])):
    print(lentil[0],"/",potato[0],round(lentil[-3]/potato[-3],3),
          "digitization sensitivity",round(lentil[-2]/potato[-1],3),round(lentil[-1]/potato[-2],3))
