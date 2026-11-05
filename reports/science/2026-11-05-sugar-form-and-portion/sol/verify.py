"""Independent stdlib-only calculations; author thesis Table 3-1 OCR, not article."""
import json, math
from pathlib import Path
HERE=Path(__file__).resolve().parent
Y={('G',25):8.1,('G',50):16.3,('G',100):32.0,('F',25):1.2,('F',50):2.4,('S',25):4.7,('S',50):7.4,('S',100):22.2,('M',100):18.9}
SEM={('G',25):1.6,('G',50):2.7,('G',100):5.9,('F',25):.2,('F',50):.4,('S',25):1.0,('S',50):1.9,('S',100):3.6,('M',100):3.6}
wb=json.loads((HERE.parent/'wb_portions.json').read_text())['rows']
a=sum(math.log(next(r['mean'] for r in wb if r['food']==f and r['C']==100)/next(r['mean'] for r in wb if r['food']==f and r['C']==25))/math.log(4) for f in ['barley','spaghetti','bread','potato'])/4
R=Y['F',25]/Y['G',25]
def score(f,d,exponent,kind,hydro=False):
    g,q={'G':(1,0),'F':(0,1),'S':(.5,.5),'M':(.5,.5)}[f]
    factor=360/342 if hydro and f=='S' else 1
    g*=d*factor;q*=d*factor;D=g+q
    return {'composition':g+R*q,'mass':D,'glucose_only':g,'equality':1}[kind]*(D/25)**(exponent-1) if kind!='equality' else 1
def err(p,o):return None if p<=0 else abs(math.log(p/o))
panel=[('F',50,'G',50),('S',50,'G',50),('S',100,'G',100),('M',100,'G',100)]
portions={'G':[(25,50),(50,100)],'F':[(25,50)],'S':[(25,50),(50,100)]}
results=[]
for exponent in [1,a]:
 for kind in ['composition','mass','glucose_only','equality']:
  for hydro in ([False,True] if kind in ['composition','mass','glucose_only'] else [False]):
   form=[]; dose=[];levels=[]
   for f,d,h,e in panel:
    observed=Y[f,d]/Y[h,e]; pred=score(f,d,exponent,kind,hydro)/score(h,e,exponent,kind,hydro)
    form.append(dict(comparison=f'{f}{d}/{h}{e}',observed=observed,predicted=pred,ALE=err(pred,observed)))
   for f,pairs in portions.items():
    for lo,hi in pairs:
     low=score(f,lo,exponent,kind,hydro);high=score(f,hi,exponent,kind,hydro)
     pred=high/low if low else None; observed=Y[f,hi]/Y[f,lo]
     dose.append(dict(comparison=f'{f}{hi}/{f}{lo}',food=f,observed=observed,predicted=pred,ALE=err(pred,observed) if pred is not None else None))
   for (f,d),observed in Y.items():
    if (f,d) in [('G',25),('F',25)]:continue
    pred=Y['G',25]*score(f,d,exponent,kind,hydro)/score('G',25,exponent,kind,hydro)
    levels.append(dict(cell=f'{f}{d}',observed=observed,predicted=pred,ALE=err(pred,observed)))
   covered=[x['ALE'] for x in form if x['ALE'] is not None]
   perfood={f:[x['ALE'] for x in dose if x['food']==f and x['ALE'] is not None] for f in portions}
   dosemeans=[sum(v)/len(v) for v in perfood.values() if v]
   results.append(dict(a=exponent,model=kind,hydrolysis=hydro,formulation=form,portion=dose,levels=levels,form_ALE=sum(covered)/len(covered),form_coverage=f'{len(covered)}/4',portion_ALE=sum(dosemeans)/len(dosemeans),portion_food_coverage=f'{len(dosemeans)}/3',mix_over_sucrose_prediction=score('M',100,exponent,kind,hydro)/score('S',100,exponent,kind,hydro)))
secondary=[]
for f,d,cd in [('M',100,50),('S',50,25),('S',100,50)]:
 for name,pred in [('measured_component_sum',Y['G',cd]+Y['F',cd]),('whole_dose_glucose',Y['G',d]),('component_glucose',Y['G',cd]),('nominal_scaling_glucose25',Y['G',25]*d/25)]:
  secondary.append(dict(cell=f'{f}{d}',benchmark=name,observed=Y[f,d],predicted=pred,ALE=err(pred,Y[f,d])))
out=dict(source='Lee 1997 thesis Table3-1, pp34; OCR only; published article data unavailable',R=R,external_a=a,rows=[dict(food=f,dose=d,mean=v,SEM=SEM[f,d],n=7 if (f,d)==('F',50) else 8) for (f,d),v in Y.items()],results=results,secondary=secondary)
(HERE/'independent-results.json').write_text(json.dumps(out,indent=2))
for row in results:print(row['a'],row['model'],row['hydrolysis'],row['form_ALE'],row['form_coverage'],row['portion_ALE'],row['portion_food_coverage'])
print('R',R,'a',a)
print('secondary',secondary)
