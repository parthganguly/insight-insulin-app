import json,math,pathlib
P=pathlib.Path(__file__).resolve().parent.parent
load=lambda x:json.loads((P/x).read_text(encoding='utf-8-sig'))
g=load('curves/graph-input.json');s=load('curves/SEM-input.json');r={'graph_stress':load('experiment/sem-convention.json')};t=g['minutes'][:6]
integ=lambda y:sum((t[i+1]-t[i])*(y[i+1]+y[i])/2 for i in range(5))
checks=[]
for label,e,pad in [('graph_stress',.5,1.1)]:
 arms={}
 for name,errs in s['arms'].items():
  y=g['panels']['4.4B']['series'][name]['means'][:6]; sem=[z['sem']+pad for z in errs[:6]]
  sigma0=math.sqrt(8)*sem[0];upper=[0.];lo=[0.]
  for i in range(1,6):
   mu=y[i]-y[0]+2*e;st=math.sqrt(8)*sem[i]
   count_bounds=[]
   for m in range(9):
    f=m/8;c=math.sqrt(f*(1-f))
    # Explicit complementary positive subset, size 8-m.
    count_bounds.append(min((1-f)*mu+c*(st+sigma0),y[i]+e-(1-f)*(y[0]-e)+c*sigma0))
   upper.append(min(max(count_bounds),y[i]+e,(mu+math.sqrt(mu*mu+(sigma0+st)**2))/2))
   lo.append(max(0,y[i]-y[0]-2*e))
  arms[name]=(integ(lo),integ(upper))
  actual=r[label]['arms'][name]
  for k,v in [('lower',arms[name][0]),('upper_finite_n',arms[name][1])]:
   checks.append({'label':label+' '+name+' '+k,'status':'PASS' if abs(v-actual[k])<1e-7 else 'FAIL','independent':v,'reported':actual[k]})
 ratio=[arms['pea_then_cho'][0]/arms['soy_then_cho'][1],arms['pea_then_cho'][1]/arms['soy_then_cho'][0]]
 for i,v in enumerate(ratio):
  actual=r[label]['pea_soy_finite_n_bounds'][i]
  checks.append({'label':label+' ratio'+str(i),'status':'PASS' if abs(v-actual)<1e-7 else 'FAIL','independent':v,'reported':actual})
(P/'sol'/'sem-convention-receipt.json').write_text(json.dumps(checks,indent=2)+'\n')
print('PASS' if all(c['status']=='PASS' for c in checks) else 'FAIL',len(checks))
