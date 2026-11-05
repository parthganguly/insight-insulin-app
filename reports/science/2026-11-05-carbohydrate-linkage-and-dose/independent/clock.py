import csv,json,math
from pathlib import Path
P=Path(__file__).parent
# Independently visually selected marker centres in original Holub Fig2b JPEG.
t=[0,15,30,45,60,90,120,150,180]
ys=[531,437,364,398,455,478,510,527,535]
yi=[539,499,473,466,464,492,504,517,526]
s=[(ys[0]-y)*600/245 for y in ys]; i=[(yi[0]-y)*600/245 for y in yi]
def interp(t,y,x):
 for j in range(1,len(t)):
  if x<=t[j]: return y[j-1]+(y[j]-y[j-1])*(x-t[j-1])/(t[j]-t[j-1])
 if x==t[-1]:return y[-1]
 raise ValueError('tail')
def area(t,y,a,b):
 ts=[a]+[x for x in t if a<x<b]+[b]
 return sum((v-u)*(interp(t,y,u)+interp(t,y,v))/2 for u,v in zip(ts,ts[1:]))
def fit(k,free):
 b=[interp(t,s,x/k)/k for x in t[1:]]
 c=max(0,sum(x*y for x,y in zip(b,i[1:]))/sum(x*x for x in b)) if free else 1
 return sum((c*x-y)**2 for x,y in zip(b,i[1:])),k,c
amp=fit(1,True);stretch=min(fit(n/1000,False) for n in range(1000,4001));both=min(fit(n/1000,True) for n in range(1000,4001))
r=area(t,i,0,120)/area(t,s,0,120)
models={'equality':(1,1),'amplitude':(amp[1],amp[2]),'stretch':(stretch[1],stretch[2]),'combined':(both[1],both[2]),'empirical120':(1,r)}
rows=list(csv.DictReader((P.parent/'data/vancan.csv').open()))
sets={'Holub':(t,s,i),'Keesing':([0,30,60,90,120,150,180],[0,49.2,13.6,-1.2,-14.8,-22.8,-24.0],[0,-7.2,-6.4,-11.6,-11.2,-17.6,-25.6])}
for period in ['morning','lunch']:
 arms=[]
 for arm in ['sucrose','isomaltulose']:
  a=[z for z in rows if z['period']==period and z['sugar']==arm];b=float(a[0]['mean_uU_ml']); arms.append([float(z['mean_uU_ml'])-b for z in a])
 sets['vanCan_'+period]=([0,30,60,90,120,150,180],*arms)
out={'fits':{'amplitude':amp,'stretch':stretch,'combined':both,'empirical120':r},'coordinates':{'t':t,'sucrose_y':ys,'iso_y':yi},'studies':{}}
for name,(tt,ss,ii) in sets.items():
 o={'observed':{str(w):[area(tt,ss,0,w),area(tt,ii,0,w)] for w in [60,120,180]},'predictions':{}}
 for m,(k,c) in models.items():
  pr={}
  for w in [60,120,180]:
   S=area(tt,ss,0,w);I=area(tt,ii,0,w);pred=c*area(tt,ss,0,w/k)
   pr[str(w)]={'pred_iso':pred,'pred_ratio':pred/S if S else None,'observed_ratio':I/S if S else None,'abs_log_error':abs(math.log(pred/I)) if pred>0 and I>0 and S>0 else None}
  pr['phases']={f'{a}-{b}':{'pred_iso':c*area(tt,ss,a/k,b/k),'observed_iso':area(tt,ii,a,b),'observed_sucrose':area(tt,ss,a,b)} for a,b in [(0,60),(60,120),(120,180)]}
  o['predictions'][m]=pr
 out['studies'][name]=o
P.joinpath('results.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out,indent=2))
