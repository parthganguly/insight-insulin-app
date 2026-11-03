"""Run with Python 3, no dependencies. Rebuild from the local primary publication."""
import csv
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
source = (HERE / "raw/schafer-publisher.md").read_text(encoding="utf-8")
rows = []
meal = None
for line in source.split("| Meal no. and component")[1].splitlines():
    if line.startswith("|"):
        cells = [x.strip() for x in line.strip("|").split("|")]
        if len(cells) == 1 and cells[0].isdigit():
            meal = int(cells[0])
        elif meal and len(cells) == 8:
            rows.append([meal] + cells)
    elif meal:
        break
assert len(rows) == 26 and rows[-1][1] == "Total"
with (HERE / "schafer_recipe.csv").open("w", newline="", encoding="utf-8") as out:
    w = csv.writer(out)
    w.writerow(["meal", "ingredient", "weight_g", "carbohydrate_g", "fiber_g", "protein_g", "fat_g", "water_g", "energy_kJ"])
    w.writerows(rows)

meals = {i: {r[1]: r[2:] for r in rows if r[0] == i} for i in (1,2,3)}
blend = meals[2]
pea_cho = float(blend["Peas"][1])
potato_cho = float(blend["Potatoes"][1])
# Figure 2 bottom panel. 40 units = 234 raster pixels. Baseline slopes
# from y=578 at x=132 to y=575 at x=480. Top edges are manual reads.
xs = [165, 212, 258]
tops = [529, 513, 447.5]
caps = [513.5, 498, 423]
mean120 = [round((578 - (x-132)*3/348 - y) * 40/234, 1) for x,y in zip(xs,tops)]
sem120 = [round((y-cap)*40/234,1) for y,cap in zip(tops,caps)]
record = json.loads((HERE / "raw/12816777.json").read_text(encoding="utf-8"))
abstract = record["resultList"]["result"][0]["abstractText"]
pattern = r"areas under the insulin curve were ([0-9.]+) \+/- ([0-9.]+), ([0-9.]+) \+/- ([0-9.]+), and ([0-9.]+) \+/- ([0-9.]+)"
values = [float(x) for x in re.search(pattern,abstract).groups()]
assert values == [13.8, 4.3, 15.4, 3.9, 31.2, 6.9]
result = {
    "order": ["pea", "blend", "potato"],
    "pea_fraction_staple_carbohydrate": [1,pea_cho/(pea_cho+potato_cho),0],
    "mean120_chart_approx_nmol_min_per_L": mean120,
    "sem120_chart_approx": sem120,
    "letters120": ["a", "ab", "b"],
    "mean180_reported": values[::2],
    "sem180_reported": values[1::2],
    "p180_reported": 0.0514,
    "reported_ratio_potato_over_pea_120": 2.7,
    "ratio_blend_over_potato_180": values[2]/values[4],
}
assert abs(mean120[2]/mean120[0]-2.7)<0.1
output = json.dumps(result, indent=2)
(HERE / "schafer_aggregate.json").write_text(output+"\n",encoding="utf-8")
print(output)
