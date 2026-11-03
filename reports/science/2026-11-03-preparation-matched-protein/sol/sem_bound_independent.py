"""Empirical n8 marginal-SEM upper bound; not a population CI."""
import json,math
from pathlib import Path
P=Path(__file__).resolve().parent.parent
load=lambda p:json.loads((P/p).read_text(encoding='utf-8-sig'))
g=load('curves/graph-input.json'); s=load('curves/SEM-input.json'); times=g['minutes']; curves={k:v['means'] for p in g['panels'].values() for k,v in p['series'].items()}
out={}
for name,errors in s['arms'].items():
 y=curves[name]; ee=[z['stressed_upper'] for z in errors]
 # Independent audit conservative mean reading halfwidth .55 => delta +-1.1.
 for e in [0,.55]:
  b=[0]+[min(y[0]+e,(math.sqrt((y[i]-y[0]-2*e)**2+7*(ee[i]+ee[0])**2)-(y[i]-y[0]-2*e))/2) for i in range(1,6)]
  area=sum((times[i+1]-times[i])*(b[i]+b[i+1])/2 for i in range(5))
  out[name+f'_mean_halfwidth_{e}']={'endpoint_bounds':b,'B120_upper':area}
(P/'sol'/'sem-bound-independent.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
