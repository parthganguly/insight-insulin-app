import json,math
from pathlib import Path
p=Path(__file__).parent
D=[35.6,35.23,34.86];F=[2.01,21.06,29.69];Y=[11871.6,8096.3,7533.8]
dc=12.71/36.28;rc=124/229
bounds=[]
for j in [1,2]:
 db=D[j]/D[0];rb=Y[j]/Y[0]
 bounds.append({'bar_index':j,'bound':math.log(rc/rb)/math.log(dc/db),'bar_ratio':rb,'D_ratio':db})
a=min(x['bound'] for x in bounds);cap=2**a
wb=json.loads((p.parent/'wb_portions.json').read_text())
comparisons=[]
for food in ['barley','spaghetti','bread','potato']:
 rows={r['C']:r for r in wb['rows'] if r['food']==food}
 for lo,hi in [(25,50),(50,100)]:
  r=rows[hi]['mean']/rows[lo]['mean']
  comparisons.append({'food':food,'dose':[lo,hi],'ratio':r,'implied_a':math.log2(r),'above_cap':r>cap,'ratio_min_from_0.1_rounding':(rows[hi]['mean']-.05)/(rows[lo]['mean']+.05)})
out={'density_order':[.55/36.28]+[f/d for f,d in zip(F,D)]+[24.13/12.71],'bounds':bounds,'sharp_upper_a':a,'doubling_cap':cap,'comparisons':comparisons}
(p/'class_results.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
