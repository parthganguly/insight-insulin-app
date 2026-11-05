import json
from pathlib import Path
p=Path(__file__).parent
t=[0,15,30,45,60,90,120]
curves={'control':[45,185,230,227,158,125,97],'fibre':[50,175,185,132,105,66,55]}
out={}
for k,y in curves.items():
 area=sum((t[i+1]-t[i])*((y[i]-y[0])+(y[i+1]-y[0]))/2 for i in range(6))
 out[k]={'coarse_points_pmol_per_L':y,'signed_incremental_pmol_min_per_L':area,'hours':area/60,'approx_conservative_reading_error_pmol_min_per_L':1800}
(p/'cookie_curve_scale.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
