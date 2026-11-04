"""Rebuild paper-figure aggregate means only. No participant-level source data."""
import csv
from pathlib import Path
import pymupdf
from itertools import pairwise
base = Path(__file__).resolve().parent
rows=[]
def add(study, arm, measure, xs, ys):
    rows.extend((study, arm, measure, x, y) for x,y in zip(xs,ys))
def area(xs, ys, stop):
    return sum((b-a)*(u+v-2*ys[0])/2 for (a,b),(u,v) in zip(pairwise(xs),pairwise(ys)) if b<=stop)
# Fig 7B original raster, xref 256, crop (5,623,1120,1100), resized 850x365.
# y ticks at 325.0 (0) and 24.0 (50 uU/mL); visually verified coloured marker centroids.
for arm,pix in {'ICC':[266,225,149,150,179,196,235],'RCC':[262,204,93,126,135,119,226]}.items():
    xs=[0,15,30,60,90,120,180]
    ys=[(325-y)*50/301 for y in pix]
    add('Alshaalan2024',arm,'insulin_uU_mL',xs,ys)
    add('Alshaalan2024',arm,'net_AUC_uU_min_mL',[120,180],[area(xs,ys,t) for t in (120,180)])
    # Fig 7B bars from 800x980 scaled full figure; reported definition not described.
    add('Alshaalan2024',arm,'author_label_iAUC_unclear_units',[180],[(477-(385 if arm=='ICC' else 358))*250/(477-301)])
# Cai Fig 2d: PDF vector polylines, only the mean curves in the left hand panel.
d=pymupdf.open(base/'cai.pdf')[2].get_drawings()
for arm,idx in {'Broken':95,'Intact-C':113,'Intact-S':130}.items():
    pts=[line[-1] for line in d[idx]['items']]
    xs=[round((pt.x-131.8466)*180/(282.4046-131.8466)) for pt in pts]
    ys=[(324.9868-pt.y)*20/(324.9868-291.5294) for pt in pts]
    assert xs==[0,15,30,45,60,90,120,150,180]
    add('Cai2025',arm,'insulin_uU_mL',xs,ys)
    add('Cai2025',arm,'net_AUC_uU_min_mL',[120,180],[area(xs,ys,t) for t in (120,180)])
# Fig 4, Alshaalan, xref 213 at native dimensions; percent axis y 491 = 0; 12 = 100.
# Fig 1d, Cai, page 2, clipped (383,187,493,254) at 6x; y 353.5 = 0; y 54.5 = 80.
for study, starch, axes, positions, arms in [
    ('Alshaalan2024',26.8,(491,12,100),[20,60,90],{'ICC':[448,376,331],'RCC':[324,197,158]}),
    ('Cai2025',29.5,(353.5,54.5,80),[20,60,90,120],{'Broken':[204,139,108,83],'Intact-S':[244,189,194,148],'Intact-C':[286,209,222,192]})
]:
    for arm,pix in arms.items():
        p0,pmax,vmax=axes
        ys=[(p0-y)*vmax/(p0-pmax) for y in pix]
        add(study,arm,'measured_amylo_pct',positions,ys)
        add(study,arm,'measured_amylo_g_serving',positions,[y*starch/100 for y in ys])
# Main Fig. 2f bars, author-defined iAUC; supplement table 4 first-peak geometric means.
for arm, idx, geom, low, high in [('Intact-C',365,410,235,715),('Intact-S',367,1538,986,2398),('Broken',368,1910,1384,2636)]:
    add('Cai2025',arm,'author_iAUC_figure2f',[180],[(330.7710-d[idx]['rect'].y0)*1000/(330.7710-308.6407)])
    for measure,val in [('gmean',geom),('lower95',low),('upper95',high)]:
        add('Cai2025',arm,'first_peak_iAUC_'+measure,['variable'],[val])
with (base/'aggregate.csv').open('w',newline='') as out:
    w=csv.writer(out);w.writerow(['study','arm','measure','minutes','value']);w.writerows(rows)
for r in rows:
    if 'net_AUC' in r[2] or r[2]=='measured_amylo_g_serving' and r[3]==20: print(r)
