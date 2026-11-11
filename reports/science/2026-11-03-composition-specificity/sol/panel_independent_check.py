"""Independent stdlib audit; run from any directory. Inputs relative to packet."""
from pathlib import Path
import json, math, statistics
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text(encoding='utf-8-sig'))
def integral(t,y,clip):
 total=0.
 for l,u,a,b in zip(t,t[1:],y,y[1:]):
  if not clip:total+=(u-l)*(a+b)/2;continue
  if a>=0 and b>=0:total+=(u-l)*(a+b)/2
  elif a*b<0:
   z=l+(u-l)*(-a)/(b-a)
   total+=(z-l)*a/2 if a>0 else (u-z)*b/2
 return total
M=read('panel/marginals.json');W=read('panel/witnesses.json');out={};minval=math.inf;maxerr=0
for age,n in [('young',8),('old',10)]:
 for basal in ['two_predose','t0']:
  areas={}
  for arm in ['high','low']:
   points=M[age+'_'+arm];ts=sorted(map(int,points));k=n//2-1
   for mode in ['aligned','reassigned']:
    rows=[[] for i in range(n)]
    for t in ts:
     mu,se=(points[str(t)][v] for v in ['mean','sem']);D=se*n*math.sqrt((n-1)/(k*(n-k)))
     hi=mu+(n-k)*D/n;lo=mu-k*D/n
     vals=[hi]*k+[lo]*(n-k)
     if mode=='reassigned' and t>0:vals=vals[-k:]+vals[:-k]
     assert min(vals)>=0;minval=min(minval,min(vals))
     maxerr=max(maxerr,abs(statistics.mean(vals)-mu),abs(statistics.stdev(vals)/math.sqrt(n)-se))
     for row,v in zip(rows,vals):row.append(v)
    vals=[]
    for row in rows:
     base=(row[0]+row[1])/2 if basal=='two_predose' else row[1]
     vals.append(integral(ts[1:],[v-base for v in row[1:]],True))
    A=statistics.mean(vals);areas[arm+'_'+mode]=A
    expected=W[age+'_'+basal]['synthetic_mean_positive_areas'][arm][mode]
    assert abs(A-expected)<1e-9,(age,arm,mode,A,expected)
  qs=[areas['high_'+h]/areas['low_'+l] for h in ['aligned','reassigned'] for l in ['aligned','reassigned']]
  out[age+'_'+basal]={'areas':areas,'ratio_examples':qs,'preference_reverses':min(qs)<1.056156985308961<max(qs)}
F=read('panel/form.json')
for pair,v in F['pairs'].items():
 for m,q in v['predicted'].items():assert abs(abs(math.log(q/v['observed']))-v['error'][m])<1e-12
for sel in ['within_whey','vs_casein','all']:
 pairs=[v for k,v in F['pairs'].items() if sel=='all' or (k.endswith('/Casein'))==(sel=='vs_casein')]
 for m,v in F['loss'][sel].items():assert abs(statistics.mean(x['error'][m]for x in pairs)-v)<1e-12
O=read('public/transfer/RESULTS_v2.json');V=read('public/transfer/fig4_vector.json');deltas=[]
for case,result in O['results'].items():
 stop=int(case.rsplit('_',1)[1]);twob=case.startswith('B_mean')
 for arm,points in V['groups'].items():
  vals={int(t):p['mean'] for t,p in points.items()};base=(vals[-30]+vals[0])/2 if twob else vals[0];ts=sorted(t for t in vals if 0<=t<=stop)
  for key,clip in [('E2_signed',False),('E3_positive_group',True)]:
   a=integral(ts,[vals[t]-base for t in ts],clip);assert abs(a-result['arms'][arm][key])<1e-8
 for age in ['young','old']:
  for key in ['E2_signed','E3_positive_group']:
   q=result['arms'][age+'_high'][key]/result['arms'][age+'_low'][key];v=result['ages'][age][key]
   assert abs(q-v['observed_ratio'])<1e-12
   for model,p in O['predictions_v2'].items():assert abs(abs(math.log(q/p))-v['abs_log_error'][model])<1e-12
print(json.dumps({'witness_check':out,'minimum_synthetic_concentration':minval,'maximum_marginal_moment_error':maxerr,'form_pair_errors_and_losses':'PASS','opus_E2_E3_and_errors_all_baselines_windows':'PASS'},indent=2))

# Additional independent checks of centered hierarchy and 30-minute endpoint.
D=read('panel/donors.json');A=read('panel/farup.json')['arms'];names=list(A)[:3]
leu={k:A[k]['leu_per100protein']*.2 for k in A};bl=D['substitution_slope'];bh=math.log(10.8/7.6)/30
for k in names:
 x=A[k]['dh']-statistics.mean(A[n]['dh']for n in names);y=leu[k]-statistics.mean(leu[n]for n in names);a=47.5/36
 p={'equal':1,'family':a,'family_plus_DH':a*math.exp(bh*x),'family_plus_DH_dose_scaled':a*math.exp(bh*x*20/45),'family_plus_leucine':a*math.exp(bl*y),'family_plus_both':a*math.exp(bh*x+bl*y),'family_swiss':37.5/26.3}
 for m,v in p.items():assert abs(v-F['casein_referenced_predictions'][k][m])<1e-12
for m in F['loss']['within_whey']:
 p=F['casein_referenced_predictions'];r=[math.log(p[n][m]/A[n]['auc'])for n in names];loss=2*(max(r)-min(r))/3
 bound=(2/3)*math.log(226/210.6)+(2/3)*math.log(p[names[0]][m]/p[names[1]][m]);assert loss>=bound-1e-12
 assert abs(loss-F['loss']['within_whey'][m])<1e-12
E=read('panel/early.json');G=read('panel/glynn.json');q=(92-33)/(103-30)
for mode,v in E.items():
 assert abs(v['observed_increment_ratio']-q)<1e-12
 for m,p in v['predictions'].items():assert abs(abs(math.log(p/q))-v['errors'][m])<1e-12
 assert abs(v['predictions']['area_slope_at_30min']-math.exp(bl*(3.5-1.85)))<1e-12
print('PASS: centered family hierarchy, structural bound, and early.json ratios/errors (conditional exact Glynn leucine table1.85g).')
import csv
C={26:{},41:{}}
for row in csv.DictReader((R/'astra/figure4_coordinates.csv').open()):
 if row['age']=='young':C[int(row['leucine_pct'])][int(row['minute'])]=(684.554-float(row['center_y_pt']))*24/(684.554-556.468)
for mode,v in E.items():
 pre=[0]if mode=='t0'else[-30,0];inc={k:c[30]-statistics.mean(c[t]for t in pre)for k,c in C.items()};donor=inc[41]/inc[26]
 assert abs(donor-v['predictions']['direct_30min_donor'])<1e-12
 assert abs(math.exp(math.log(donor)*1.65/1.069)-v['predictions']['dose_rescaled_30min_donor'])<1e-12
print('PASS: early direct and rescaled donor independently reconstructed from Astra coordinates; tracer-inclusive slope sensitivity',math.exp(bl*1.74))
