"""Independent aggregate-only verification; stdlib; run beside verification_inputs.json."""
import json,math,itertools,pathlib
p=pathlib.Path(__file__).resolve().parent
d=json.loads((p/'verification_inputs.json').read_text());i=d['native_inputs'];y=[x['mean'] for x in d['observed']]
def score(v):
 pairs=[(a,b) for a in range(6) for b in range(a+1,6)]
 return {'ratio_MALE':sum(abs(math.log(v[a]/v[b])-math.log(y[a]/y[b])) for a,b in pairs)/15,'MAE_native_6':sum(abs(10*v[k]-y[k]) for k in range(6))/6,'MAE_native_6_945':sum(abs(60/6.945*v[k]-y[k]) for k in range(6))/6,'predictions_pmol_h_L':v}
out={};err=0
for label,vals in d['frozen_predictions'].items():
 actual=label.startswith('group');egg=float(label.split('_')[-1]);fresh={}
 for name,m in i['models'].items():
  v=[]
  for k in range(6):
   f=i['body_mass_kg'][k]/80 if actual else 1
   x={'C':(egg if k==1 else i['C'][k])*f,'P':20*f,'F':i['F'][k]*f}
   v.append(m['intercept']+sum(co*x[n] for n,co in m['slopes'].items()))
  err=max(err,max(abs(a-b) for a,b in zip(v,vals[name])));fresh[name]=score(v)
 out[label]=fresh
for egg in [0,.05,.1]:
 fresh={}
 for name,m in i['models'].items():
  v=[]
  for k,mass in enumerate(d['mass_served_g']):
   x={'C':(egg if k==1 else d['per100_C'][k])*mass/100,'P':d['per100_P'][k]*mass/100,'F':d['per100_F'][k]*mass/100}
   v.append(m['intercept']+sum(co*x[n] for n,co in m['slopes'].items()))
  fresh[name]=score(v)
 out['actual_served_mass_recipe_egg_'+str(egg)]=fresh
out['max_forecast_reproduction_error']=err
# Independent parallel arms; normal/delta approximation, not paired inference.
out['sampling_log_ratio_SE']=[{'arms':[d['observed'][a]['arm'],d['observed'][b]['arm']],'SE':math.hypot(d['observed'][a]['sem']/y[a],d['observed'][b]['sem']/y[b])} for a,b in itertools.combinations(range(6),2)]
(p/'verification_results.json').write_text(json.dumps(out,indent=2))
for scenario in ['group_mean_mass_egg_0.05','80kg_egg_0.05','actual_served_mass_recipe_egg_0.05']:
 print(scenario)
 for model,v in out[scenario].items(): print(model,*(round(v[x],6) for x in ['ratio_MALE','MAE_native_6','MAE_native_6_945']))
print('max reproduction error',err)
