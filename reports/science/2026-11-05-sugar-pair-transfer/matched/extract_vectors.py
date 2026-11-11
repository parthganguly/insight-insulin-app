"""Read the traced paths and their error-bar stems from both original PDF figures.

Optional provenance step, requires PyMuPDF. analyse.py only needs Python's stdlib.
Acquire the PDF editions identified in sources.csv into a private directory first.
"""
import argparse
import csv
import hashlib
from pathlib import Path

import pymupdf


def read_panel(filename, control, test, digest):
    source = Path(filename)
    if hashlib.sha256(source.read_bytes()).hexdigest() != digest:
        raise ValueError(f"Unexpected edition: {filename}")
    doc = pymupdf.open(source)
    paths = doc[2].get_drawings()
    items = paths[228]["items"]
    if control == "glucose":
        x_axis = paths[160]["items"]
        y_axis = paths[215]["items"]
        zero_y, top_y, top = y_axis[1][1].y, y_axis[5][1].y, 200
        start, first_bar = 0, 24
    else:
        x_axis = items
        zero_y, top_y, top = items[17][1].y, items[17][2].y, 160
        start, first_bar = 27, 51
    x9, x16 = x_axis[1][1].x, x_axis[8][1].x
    panels = [(control,"fasting",229),(control,"lunch",243),
              (test,"fasting",257),(test,"lunch",271)]
    out = []
    for group, (arm, period, first_marker) in enumerate(panels):
        segments = items[start+group*6:start+group*6+6]
        vertices = [segments[0][1]] + [s[2] for s in segments]
        for i, point in enumerate(vertices):
            marker = paths[first_marker+2*i]
            assert marker["fill"] == ((0.,)*3 if arm == control else (1.,)*3)
            assert marker["rect"].contains(point)
            bar = items[first_bar] if group == 0 and i == 0 else paths[first_marker+2*i-1]["items"][0]
            assert bar[1] == point and bar[2].y <= point.y
            out.append((arm,period,[-5,30,60,90,120,150,180][i],point.x,point.y,bar[2].y,x9,x16,zero_y,top_y,top))
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir",type=Path,default=Path(__file__).parent/"private")
    args = parser.parse_args()
    base = Path(__file__).resolve().parent
    rows = []
    for control,test,digest in [
        ("glucose","trehalose","6ff640e34dc1eafd568d5c5e225d52ace0f6223071d7bc61efae6e4f7e217b2a"),
        ("sucrose","isomaltulose","cf930fd53f51a79622f2bbdbfdd523aee86b05671d29f5dc53518f255bda52a6"),
    ]:
        rows.extend(read_panel(args.source_dir/(test+".pdf"),control,test,digest))
    with (base/"coordinates.csv").open("w",newline="",encoding="utf-8") as stream:
        writer=csv.writer(stream)
        writer.writerow(["arm","period","sample_min","x_pt","y_pt","sem_cap_y_pt","tick_0900_x_pt","tick_1600_x_pt","tick_zero_y_pt","tick_top_y_pt","top_uU_per_mL"])
        writer.writerows(rows)


if __name__ == "__main__":
    main()
