"""Reproduce visual digitization from native 1-bit figure images, y measured downwards."""
from pathlib import Path
import csv
p=Path(__file__).resolve().parent
def save(name,header,rows):
    with (p/name).open('w',newline='') as f:
        w=csv.writer(f);w.writerow(header);w.writerows(rows)
labels=['control','wheat_low','wheat_high','blend_low','blend_high']
ts=[0,30,60,90,120,150,180]
xs=[176,310,447,580,714,850,984]
ys=[[733,628,602,554,509,453,452],
    [732,612,577,561,523,469,524],
    [731,626,575,547,537,457,457],
    [731,563,537,436,422,385,418],
    [731,585,419,362,316,211,242]]
# Individual baselines inseparable; approximate all from overlapping marker centers. +/- 6 px for all marker locations is a sensitivity parameter.
def integral(y,a,b):return sum((y[i]+y[i+1]-2*y[0])/2*30 for i in range(a//30,b//30))
conc=[[round((750-j)*1000/733,3) for j in row] for row in ys]
save('target-course.csv',['arm','minute','x_pixel','y_pixel','plasma_insulin_pmol_per_L_approx'],[(l,t,x,y,c) for l,row,cy in zip(labels,ys,conc) for t,x,y,c in zip(ts,xs,row,cy)])
rows=[]
for a,b in [(0,120),(60,120),(0,180)]:
    v=[integral(y,a,b) for y in conc]
    for l,k in zip(labels,v):rows.append([a,b,l,round(k,1),round(100*(k/v[0]-1),2)])
save('target-windows.csv',['from_min','to_min','arm','baseline_subtracted_trapezoid_pmol_min_L_approx','change_vs_control_pct'],rows)
print(rows)
# Account for slight tilt in AJCN by tracking baseline coordinate at bar.
graphs=[('target_fig3','0-180','raw/65.png',labels,[219,369,519,669,819],[355,357,357,247,123],[601]*5,583,100),
('rest_fig5','0-120','raw/rest56.png',['control','wheat_high','blend_high'],[175,693,865],[300,152,165],[559,563,564],539,70),
('rest_fig6','60-120','raw/rest57.png',['control','wheat_high','blend_high'],[175,694,867],[365,208,166],[561,567,569],539,50)]
rows=[]
for g,w,f,ls,x,y,y0,span,scale in graphs:
    vs=[(z-j)*scale/span for z,j in zip(y0,y)]
    for l,xx,j,z,v in zip(ls,x,y,y0,vs):rows.append([g,w,f,l,xx,j,z,span,scale,round(v,3),round(100*(v/vs[0]-1),2)])
save('bars.csv',['figure','window_min','image','arm','x_px','y_top_px','y_zero_px','y_span_px','scale','plot_units','percent_delta_ratio_of_means'],rows)
print(rows)
# Deterministic simultaneous independent pixel-pick bounds; not biological CI.
# For full integrals including t=0, coefficient on baseline is -(duration-15); for later window, -duration.
out=[]
for a,b in [(0,120),(60,120),(0,180)]:
    v=[integral(y,a,b) for y in conc]
    D=2*(b-a-(15 if a==0 else 0))*6*1000/733
    contrast=v[4]-v[3]-v[2]+v[1]
    out.append([a,b,round(D,1),round(contrast,1),round(contrast-4*D,1),round(contrast+4*D,1)])
save('pixel-bounds.csv',['start','end','arm_abs_err_at_6pixels','difference_of_differences','lower_digitizing_bound','upper_digitizing_bound'],out)
print(out)
