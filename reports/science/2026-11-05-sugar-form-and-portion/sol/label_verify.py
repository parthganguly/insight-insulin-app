"""Post-result identifiability audit. Stdlib only; all quantities synthetic/public summaries."""
import json, math
from pathlib import Path
R=1.2/8.1
A=.7781175447184837
def envelope(da,ta,db,tb,r,a=1):
    assert 0<=ta<=da and 0<=tb<db and 0<=r<=1
    k=1-r
    m=(da/db)**(a-1)
    return [(da-k*ta)/db*m,da/(db-k*tb)*m]
labels={'cookie':(12.71,11.72,36.28,11.51),'scone':(28.9,14.9,38.8,14.8),'muffin_F/S':(109,52,119,65),'muffin_U/S':(80,0,119,65)}
out={'frozen_R':R,'external_a':A,'label_intervals':{}}
for name,args in labels.items():
 out['label_intervals'][name]={str(a):{'fixed_R':envelope(*args,R,a),'common_R_0_to_1':envelope(*args,0,a)} for a in [1,A]}
 # Corners realize both endpoints; brute force checks all common R values.
 low,high=envelope(*args,0)
 da,ta,db,tb=args
 for r in [i/100 for i in range(101)]:
  for fa in [0,ta/2,ta]:
   for fb in [0,tb/2,tb]:
    q=(da-(1-r)*fa)/(db-(1-r)*fb)
    assert low-1e-12<=q<=high+1e-12
observed={'signed_120':{'F/S':3519/4644,'U/S':4177.5/4644},'reported_240_graph':{'F/S':92/144,'U/S':127/144}}
def muffin(r):
 den=54+32.5+32.5*r
 return {'F/S':(57+52*r)/den,'U/S':80/den}
models={'full':muffin(R),'zero':muffin(0),'equality':{'F/S':1,'U/S':1},'D':{'F/S':109/119,'U/S':80/119},'D_plus_protein':{'F/S':126/136,'U/S':99/136},'approx_4_4_9_energy':{'F/S':1107/1138,'U/S':999/1138}}
out['muffin']={window:{model:{contrast:{'observed':o,'predicted':pred[contrast],'ALE':abs(math.log(pred[contrast]/o))} for contrast,o in obs.items()} for model,pred in models.items()} for window,obs in observed.items()}
out['muffin_coefficient_restrictions']={'F/S_range_R_0_to_1':[57/86.5,109/119],'U/S_range_R_0_to_1':[80/119,80/86.5],'four_hour_F/S_reading':[89/146,94/141]}
assert muffin(0)['F/S']<muffin(R)['F/S']<muffin(1)['F/S']
assert muffin(1)['U/S']<muffin(R)['U/S']<muffin(0)['U/S']
assert abs(envelope(12.71,11.72,36.28,11.51,1)[0]-12.71/36.28)<1e-12
path=Path(__file__).with_name('label-results.json');path.write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
