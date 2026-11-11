"""Digitize arm means only; Figure 4b from DOI 10.1039/D5FO00348B."""
from itertools import pairwise
import csv
from pathlib import Path
base=Path(__file__).resolve().parent
# kanata-B.png = crop (95,520,809,824) of the archived 1280 x 1100 screenshot.
# 70 uU/mL marked at y49.5, 0 at 261.5. Green CFM and blue CLP central markers.
# At zero and 60 min CFM is partly occluded; read exposed edges, +/-2 pixels.
times=[0,30,45,60,90,120,180]
xs=[71,112,132,152,193,234,315]
data={'CFM':[251,131,105,114,153.5,200,238], 'CLP':[248,108.5,96,110.5,164,186,247]}
rows=[]
for arm, marker in data.items():
    values=[(261.5-y)*70/212 for y in marker]
    rows.extend((arm,'mean_serum_insulin_uU_mL',t,y,v) for t,y,v in zip(times,marker,values))
    for stop in [60,120,180]:
        auc=sum((b-a)*(u+v-2*values[0])/2 for (a,b),(u,v) in zip(pairwise(times),pairwise(values)) if b<=stop)
        rows.append((arm,'derived_signed_net_AUC_uU_min_mL',stop,'',auc))
    # Author bars y0=266.5; 6000 tick y13.5; bar tops green 78, blue 74.
    y=78 if arm=='CFM' else 74
    rows.append((arm,'author_positive_iAUC_uU_min_mL',180,y,(266.5-y)*6000/253))
with (base/'kanata-aggregate.csv').open('w',newline='') as f:
    w=csv.writer(f);w.writerow(['arm','measure','minutes','marker_y_pixels','value']);w.writerows(rows)
for row in rows:
    if row[2] in (120,180): print(row)
