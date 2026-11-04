"""Costabile 2023. First meal only. All pixel coordinates refer to first.png crop."""
import csv, hashlib
from pathlib import Path
D=Path(__file__).resolve().parent
def save(name,head,rows):
 with (D/name).open('w',newline='',encoding='utf-8') as f:
  w=csv.writer(f);w.writerow(head);w.writerows(rows)
foods=['85HAF','70HAF','control']
t=[0,30,60,90,120,180,240]
x=[249,353,458,562,666,875,1083]
# Marker centers at intersecting segments. Three triangle tips/edges imply a centroid
# a few pixels lower than the data-line vertex; use the vertex as its value.
pixels={'85HAF':[894,332,205,437,512,700,833],
        '70HAF':[866,215,338,310,461,616,800],
        'control':[875,282,234,286,474,763,833]}
def convert(y):return (1002-y)*200/(1002-59)
def integrate(food,n):
 conc=[convert(y) for y in pixels[food]]
 return sum((t[j+1]-t[j])*((conc[j]+conc[j+1])/2-conc[0]) for j in range(n))
areas={k:[integrate(k,4),integrate(k,6)] for k in foods}
author=dict(zip(foods,[13500,14000,13200]))
save('figure1B.csv',['food','minute','x_in_crop','y','approx_insulin_uU_mL','approx_increment_above_own_fasting'],
 ([k,tm,xp,y,convert(y),convert(y)-convert(pixels[k][0])] for k in foods for tm,xp,y in zip(t,x,pixels[k])))
save('areas.csv',['food','discrete_signed_120_uU_min_mL','discrete_signed_240_uU_min_mL','author_breakfast_iAUC_prose','as_printed_SD'],
 ([k,*areas[k],author[k],e] for k,e in zip(foods,[9700,12000,12000])))
save('comparisons.csv',['comparison','first_meal_signed_120_ratio','first_meal_signed_240_ratio','published_breakfast_iAUC_ratio','meal_available_CHO_ratio','bread_starch_minus_RS_ratio'],
 ([a+'/'+b,areas[a][0]/areas[b][0],areas[a][1]/areas[b][1],author[a]/author[b],1,'unavailable'] for a,b in [('85HAF','control'),('70HAF','control'),('85HAF','70HAF')]))
