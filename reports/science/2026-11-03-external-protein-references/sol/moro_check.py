import json,itertools,math
from pathlib import Path
b=Path(__file__).resolve().parents[1]
f=json.loads((b/'morifuji/figure.json').read_text(encoding='utf-8-sig')); out={}
for horizon in [120,180]:
 n=f['time_min'].index(horizon)+1; ts=f['time_min'][:n]
 def a(ys):
  v=[(ys[0]-y)*15/257 for y in ys]
  return sum((v[i]+v[i+1])*(ts[i+1]-ts[i])/2 for i in range(n-1))
 vals={}
 for arm in ['hydro','intact']:
  ys=f[arm+'_y_px'][:n]
  vv=[a([y+delta for y,delta in zip(ys,ds)]) for ds in itertools.product([-2,2],repeat=n)]
  vals[arm]={'point':a(ys),'min':min(vv),'max':max(vv)}
 ratio=vals['hydro']['point']/vals['intact']['point']
 out[horizon]={'areas':vals,'ratio':ratio,'box_ratio':[vals['hydro']['min']/vals['intact']['max'],vals['hydro']['max']/vals['intact']['min']]}
(b/'sol/moro_check.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out,indent=2))
