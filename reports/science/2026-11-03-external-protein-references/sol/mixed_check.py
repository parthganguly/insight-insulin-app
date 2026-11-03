import csv,json,math,itertools
from pathlib import Path
from collections import defaultdict
from statistics import mean
b=Path(__file__).resolve().parents[1]; m=b/'mixed'
f=json.loads((m/'reading.json').read_text()); z=f['zero_y']; R={s:(z-y)/(z-f['top_y']['CHO']) for s,y in f['top_y'].items() if s!='CHO'}
rows=list(csv.DictReader((m/'comparisons.csv').open())); result={}
def evaluate(rows,refs,feature):
 authors=sorted(set(r['author'] for r in rows)); preds={}; betas={}
 for author in authors:
  tr=[r for r in rows if r['author']!=author]; counts={a:sum(r['author']==a for r in tr) for a in authors if a!=author}
  def x(r):
   d=float(r['dose']); v=refs[r['source'].lower()]
   return {'reference':math.log1p(d*(v-1)),'cheap':math.log1p(d),'common':math.log1p(d*(mean(R.values())-1)),'constant':1}[feature]
  beta=sum(x(r)*math.log(float(r['rr']))/counts[r['author']] for r in tr)/sum(x(r)**2/counts[r['author']] for r in tr)
  betas[author]=beta
  for r in rows:
   if r['author']==author:preds[r['row']]=math.exp(beta*x(r))
 per={a:mean(abs(math.log(preds[r['row']]/float(r['rr']))) for r in rows if r['author']==a) for a in authors}
 return {'beta':betas,'prediction':preds,'per_author':per,'mae':mean(per.values())}
for panel in ['Reported','Calculated']:
 allrows=[r for r in rows if r['method']==panel and r['author']!='Claessens']; rr=[r for r in allrows if r['source'].lower() in R]
 foods=sorted(set(r['source'].lower() for r in rr)); vals=[R[x] for x in foods]
 q={k:evaluate(rr,R,k) for k in ['reference','cheap','common','constant']}
 perms=[]
 for vv in itertools.permutations(vals):
  rp=dict(zip(foods,vv)); perms.append({'assignment':rp,'mae':evaluate(rr,rp,'reference')['mae']})
 q.update({'eligible':[len(allrows),len(set(r['author'] for r in allrows))],'matched':[len(rr),len(set(r['author'] for r in rr))],'foods':foods,'permutations':perms,'num_permutations':len(perms)})
 result[panel]=q
# Independent closed-profile TVD
T=json.loads((m/'acheson.json').read_text()); prof=list(csv.DictReader((m/'target_profiles.csv').open())); keys=T['amino_order']; donors={food:{r['aa']:float(r[food]) for r in prof} for food in R}; distances={}
for dims in [16,18]:
 kk=[k for k in keys if dims==18 or k not in ['Asx','Glx']]; ds={}
 for food,vs in T['profiles'].items():
  p=dict(zip(keys,vs)); norm=sum(p[k] for k in kk); dv={}
  for donor,pp in donors.items():
   dn=sum(pp[k] for k in kk); dv[donor]=sum(abs(p[k]/norm-pp[k]/dn) for k in kk)/2
  ds[food]=dict(sorted(dv.items(),key=lambda a:a[1]))
 distances[dims]=ds
result['distances']=distances
(b/'sol/mixed_check.json').write_text(json.dumps(result,indent=2))
main=json.loads((m/'results.json').read_text())
for panel in ['Reported','Calculated']:
 q=result[panel]; print(panel,q['eligible'],q['matched'],q['foods'],q['num_permutations'])
 for feat,name in [('reference','reference_fit'),('cheap','cheap_fit'),('constant','constant_fit')]:
  assert math.isclose(q[feat]['mae'],main['forest'][panel]['equal_author_mae'][name],abs_tol=1e-12)
  for r in main['forest'][panel]['predictions']: assert math.isclose(q[feat]['prediction'][str(r['row'])],r['pred'][name],abs_tol=1e-12)
 print('MAE', {k:q[k]['mae'] for k in ['reference','cheap','common','constant']},'permutation range',min(p['mae'] for p in q['permutations']),max(p['mae'] for p in q['permutations']))
for dims,ds in distances.items():
 for food,dd in ds.items():
  for donor,v in dd.items():assert math.isclose(v,main['acheson'][str(dims)]['distances'][food][donor],abs_tol=1e-12)
print('Fits, predictions, distances match to1e-12')
# Extend verification to every target level and contrast.
old=json.loads((m/'earlier_forecasts.json').read_text()); target=main['acheson']
for dims,ds in distances.items():
 beta=result['Reported']['reference']['beta']['Acheson']; cheap=result['Reported']['cheap']['beta']['Acheson']; const=result['Reported']['constant']['beta']['Acheson']; pp={}
 for food,dd in ds.items():
  tiers=sorted(set(dd.values())); nr=mean(R[s] for s,v in dd.items() if v==tiers[0]); second=mean(R[s] for s,v in dd.items() if v==tiers[1]); d=T['d']; scaled=1+d*(nr-1)
  p={'no_change':1,'ref':nr,'ref_dose':scaled,'blind_dose':1+d*(mean(R.values())-1),'constant_fit':math.exp(const),'cheap_fit':math.exp(cheap*math.log1p(d)),'reference_fit':math.exp(beta*math.log(scaled)),'nearest_removed':second,'source_blind':mean(R.values()),'energy':T['kcal'][food]/T['kcal']['glucose']}
  if food in R:p['family']=R[food]
  pp[food]=p
  for name,v in p.items():assert math.isclose(v,target[str(dims)]['normalized_levels'][food][name],abs_tol=1e-12)
  obs=T['area120'][food]/T['area120']['glucose']
  for name,v in p.items():assert math.isclose(abs(math.log(v/obs)),target[str(dims)]['level_errors'][food][name],abs_tol=1e-12)
 for contrast in target[str(dims)]['contrasts']:
  a,bb=contrast['a'],contrast['b']; actual=T['area120'][a]/T['area120'][bb]
  for name,v in contrast['pred'].items():
   if name=='leucine_scenario':
    j=T['amino_order'].index('Leu'); vv=math.exp(T['leu_slope']*T['protein_mass_proxy_g']*(T['profiles'][a][j]-T['profiles'][bb][j])/100)
   else:vv=pp[a][name]/pp[bb][name]
   assert math.isclose(vv,v,abs_tol=1e-12)
   assert math.isclose(abs(math.log(vv/actual)),contrast['abs_log_error'][name],abs_tol=1e-12)
print('Every Acheson level, contrast, error and leucine scenario matches')
q=result['Reported']; obs=q['reference']['mae']; print('Reported permutation count at least as good',sum(p['mae']<=obs+1e-14 for p in q['permutations']),'of',len(q['permutations']))
# Independently refit Oxford coefficients excluding every Thondre row, then derive all levels/pairs.
ox=json.loads((b/'mixed/challenge.json').read_text())['oxford']; arms=json.loads((m/'plos.json').read_text()); train=[r for r in rows if r['method']=='Reported' and r['author'] not in ['Claessens','Thondre'] and r['source'].lower() in R]; counts={a:sum(r['author']==a for r in train) for a in set(r['author'] for r in train)}
def reg(feature):
 def x(r):
  d=float(r['dose']); rr=R[r['source'].lower()] if feature=='rich' else mean(R.values())
  return math.log1p(d) if feature=='cheap' else math.log1p(d*(rr-1))
 return sum(x(r)*math.log(float(r['rr']))/counts[r['author']] for r in train)/sum(x(r)**2/counts[r['author']] for r in train)
beta={k:reg(k) for k in ['rich','common','cheap']}; const=mean(mean(math.log(float(r['rr'])) for r in train if r['author']==a) for a in counts); pred={}
for key,v in arms.items():
 if key=='glucose':continue
 source=key.split('_')[0]; d=v['protein']/v['availCHO']; rr=R[source]
 coords=[k for k in T['amino_order'] if k not in ['Asx','Glx']]; sm=sum(v[k] for k in coords); dd={food:sum(abs(v[k]/sm-pp[k]/sum(pp[aa] for aa in coords)) for k in coords)/2 for food,pp in donors.items()}; nearest=min(dd,key=dd.get); nn=R[nearest]
 q={'no_change':1,'ref':rr,'ref_dose':1+d*(rr-1),'blind_dose':1+d*(mean(R.values())-1),'constant_fit':math.exp(const),'cheap_fit':math.exp(beta['cheap']*math.log1p(d)),'reference_fit':math.exp(beta['rich']*math.log1p(d*(rr-1))),'profile_ref':nn,'profile_calibrated':math.exp(beta['rich']*math.log1p(d*(nn-1))),'blind_ref_fit':math.exp(beta['common']*math.log1p(d*(mean(R.values())-1))),'energy':v['kcal']/arms['glucose']['kcal']}; pred[key]=q
 assert nearest==ox['neighbor'][key]['selected']
 obs=v['area120']/arms['glucose']['area120']
 for name,value in q.items():
  assert math.isclose(value,ox['arms'][key]['levels'][name],abs_tol=1e-12)
  assert math.isclose(abs(math.log(value/obs)),ox['arms'][key]['abs_log_error'][name],abs_tol=1e-12)
for name,a,bb in [('low_whey_over_pea','whey_low','pea_low'),('high_whey_over_pea','whey_high','pea_high'),('whey_high_over_low','whey_high','whey_low'),('pea_high_over_low','pea_high','pea_low')]:
 for method,value in ox['pairs'][name]['pred'].items():
  vv=math.exp(T['leu_slope']*(arms[a]['Leu']-arms[bb]['Leu'])) if method=='substitution_leucine' else pred[a][method]/pred[bb][method]
  assert math.isclose(vv,value,abs_tol=1e-12)
print('Oxford all refits, nearest selections, levels, pairs, leucine and level errors match1e-12; Thondre absent')
# Verify current challenge controls, not a historical snapshot.
challenge=json.loads((m/'challenge.json').read_text())
for panel in ['Reported','Calculated']:
 q=result[panel]; c=challenge['control'][panel]
 assert math.isclose(q['reference']['mae'],c['reference'],abs_tol=1e-12)
 assert math.isclose(q['common']['mae'],c['common_R_same_budget'],abs_tol=1e-12)
 assert sorted(round(x['mae'],12) for x in q['permutations'])==sorted(round(x['mae'],12) for x in c['assignments'])
low=math.log(arms['whey_low']['area120']/arms['pea_low']['area120']); high=math.log(arms['whey_high']['area120']/arms['pea_high']['area120']); eps=(high-2*low)/3
assert math.isclose(eps,.11055617823944974,abs_tol=1e-12)
print('Current challenge common-gain and permutation outputs match; Oxford structural residual lower bound',eps)
