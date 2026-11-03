"""Recover marginal SEM magnitudes from individual axis-parallel vector stems."""
import json
import sys
from pathlib import Path
import pymupdf

STEMS = {
    "soy_then_cho": [(138,-1)] + [(140,i) for i in range(0,12,2)],
    "cho_then_soy": [(192,0)] + [(194,i) for i in range(0,12,2)],
    "pea_then_cho": [(251,0),(253,0),(253,2),(254,0),(256,0),(256,2),(256,4)],
}
CAPS = {
    "soy_then_cho": [(139,0)] + [(140,i) for i in range(1,12,2)],
    "cho_then_soy": [(193,0)] + [(194,i) for i in range(1,12,2)],
    "pea_then_cho": [(252,0),(253,1),(253,3),(255,0),(256,1),(256,3),(256,5)],
}
MARGIN = 1.1

def extract(source):
    graph = json.loads((Path(__file__).parent/"graph-input.json").read_text())
    import hashlib
    assert hashlib.sha256(Path(source).read_bytes()).hexdigest() == graph["source_sha256"]
    panel = graph["panels"]["4.4B"]
    x0,x80 = panel["x_at_0_and_80_pt"]
    with pymupdf.open(source) as pdf:
        paths = pdf[64].get_drawings()
    data = {"source_sha256":graph["source_sha256"], "pdf_page":65, "x_at_0_and_80_pt":[x0,x80],
            "times_min":graph["minutes"], "unit":"microU/mL", "sem_stress_additive":MARGIN,
            "arms":{}}
    for arm, stems in STEMS.items():
        rows = []
        for i,((stem_id, part_id),(cap_id,j)) in enumerate(zip(stems,CAPS[arm])):
            _,a,b = paths[stem_id]["items"][part_id]
            _,c,d = paths[cap_id]["items"][j]
            mx,my = panel["series"][arm]["xy_pt"][i]
            assert abs(a.x-mx) < 0.5 and abs(a.y-my) < 0.5
            assert abs(a.y-b.y) < 0.01 and abs(c.x-b.x) < 0.01 and abs(d.x-b.x) < 0.01
            assert min(c.y,d.y) < b.y < max(c.y,d.y)
            height = 80*abs(b.x-a.x)/(x0-x80)
            rows.append({"stem_path_part":[stem_id,part_id],"cap_path_part":[cap_id,j],
                         "start_xy_pt":[round(a.x,5),round(a.y,5)],
                         "end_xy_pt":[round(b.x,5),round(b.y,5)],
                         "sem":round(height,5), "stressed_upper":round(height+MARGIN,5)})
        data["arms"][arm] = rows
    return data

if __name__ == "__main__":
    print(json.dumps(extract(sys.argv[1]),indent=2))
