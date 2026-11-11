import json,math
from pathlib import Path
b=Path(__file__).resolve().parents[1]; f=json.loads((b/'morifuji/figure.json').read_text()); sc=15/257; ts=f['time_min'][:7]
def line(a,c,dt):
 if a>=0 and c>=0:return(a+c)*dt/2
 if a<=0 and c<=0:return 0
 return max(a,c)**2*dt/(2*abs(c-a))
for pad in [0,2]:
 aa={}
 for arm in ['hydro','intact']:
  mu=[(1814-y)*sc for y in f[arm+'_y_px'][:7]]; e=pad*sc
  lo=[0]+[v-mu[0]-2*e for v in mu[1:]]
  lower=sum(line(lo[j],lo[j+1],ts[j+1]-ts[j]) for j in range(6))
  # Cap-free upper bound: positive(Xt-X0)<=Xt. Baseline vertex itself exactly zero.
  hi=[0]+[v+e for v in mu[1:]]
  upper=sum((hi[j]+hi[j+1])*(ts[j+1]-ts[j])/2 for j in range(6))
  aa[arm]=(lower,upper)
 print(pad,aa,'ratio',[aa['hydro'][0]/aa['intact'][1],aa['hydro'][1]/aa['intact'][0]])
