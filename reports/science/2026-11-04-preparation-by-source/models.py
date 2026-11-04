"""Fixed research comparators; all scores are positive meal-to-meal ratios."""
from pathlib import Path
import json
import math
import statistics

ROOT=Path(__file__).resolve().parent

def read(name):
    return json.loads((ROOT/name).read_text(encoding="utf-8-sig"))

def loss(pred,obs):
    return abs(math.log(pred/obs)) if pred>0 and obs>0 else None

def load_donors():
    rows=read("donors.json")
    hummus=rows["hummus"]
    ref=hummus["ICC"]["area120"]/hummus["RCC"]["area120"]
    early=hummus["ICC"]["H20"]/hummus["RCC"]["H20"]
    grain_ratios={g:pair["whole"]["area180"]/pair["fine_flour"]["area180"] for g,pair in rows["Heaton"].items()}
    return {"hummus_response":ref,"hummus_release":early,"power":math.log(ref)/math.log(early),
            "affine_slope":(1-ref)/(1-early),"grain_donors":grain_ratios,
            "grain_reference":math.exp(statistics.median(map(math.log,grain_ratios.values())))}

def assay_maps(h, donor):
    return {"release":h,"power":h**donor["power"],"affine":1-donor["affine_slope"]*(1-h)}

def midpoint(a,b):
    return math.sqrt(a*b)
