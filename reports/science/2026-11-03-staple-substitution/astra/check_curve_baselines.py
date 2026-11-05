"""Figure 2A aggregate line digitization; explicitly hypothetical signed-trapezoid baselines."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image
from extract_aggregate import base, arms
file = base/'published_figure2.jpg'
# Recreate reviewed axis/marker coordinate system from native publisher image.
im = Image.open(file)
assert im.size == (3159, 1251)
im.crop((50,100,1620,970)).resize((1178,653)).save(base/'curve.png')
# Marker-centre y coordinates read to nearest pixel by inspection of enlarged crops.
# Several markers coincide; use approaching and departing colored lines to assign series.
time=np.array([-30,0,15,30,45,60,90,120,150,180,240,300])
marker_x=[146,234,277,321,365,408,495,582,669,757,931,1106]
markers=[
 [439,209,163,236,302,269,326,320,397,456,469,446], # black
 [416,265,224,264,297,251,358,331,325,384,441,406], # blue
 [408,248,287,258,264,248,320,353,403,432,468,460], # purple
 [446,232,270,269,175,192,318,342,451,468,469,456], # yellow
 [462,325,317,241,297,290,244,250,294,299,400,470], # green
 [431,227,224,259,248,248,296,347,425,409,406,337], # orange
]
# Main tick pixel centres and printed mIU/L levels.
slope,intercept=np.polyfit([628,510,391,273,155,37],[0,5,10,15,20,25],1)
out=[]
late=json.loads((base/'late_aggregate.json').read_text())['arms']
total=json.loads((base/'window_check.json').read_text())['rows']
for i,(arm,y) in enumerate(zip(arms,markers)):
    concentration=slope*np.array(y)+intercept
    r=dict(arm=arm['arm'],mean_concentration_mIU_per_L=np.round(concentration,2).tolist(),
           supplementary_early=arm['mean'],supplementary_late=late[i]['mean'],main_total=total[i]['main_total'])
    for label,k in [('minus30',0),('zero',1)]:
        ia=concentration-concentration[k]
        vals=[np.trapezoid(ia[1:8],time[1:8]),np.trapezoid(ia[7:],time[7:]),np.trapezoid(ia[1:],time[1:])]
        r[label+'_signed_early_late_total']=[round(d) for d in vals]
    # Post hoc diagnostic: omit 0-15 trapezoid; never substitute for the labeled endpoint.
    r["minus30_signed_15_to_120"]=round(np.trapezoid((concentration-concentration[0])[2:8],time[2:8]))
    out.append(r)
result=dict(source='https://ars.els-cdn.com/content/image/1-s2.0-S0002916526000407-gr2_lrg.jpg',
            sha256=hashlib.sha256(file.read_bytes()).hexdigest(), time_min=time.tolist(), x_px=marker_x,
            y_px_by_arm=markers,y_axis_slope=slope,y_axis_intercept=intercept,rows=out,
            note='Approximate graph-digitized means. Conditional signed trapezoidal integration of aggregate curves; does not identify the authors’ individual-level algorithm. Single premeal point shown at -30. Any earlier postabsorptive samples invisible here.')
(base/'curve_baseline_check.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
for r in out:
 print(r['arm'],r['mean_concentration_mIU_per_L'][:2],r['minus30_signed_early_late_total'],r['zero_signed_early_late_total'])
