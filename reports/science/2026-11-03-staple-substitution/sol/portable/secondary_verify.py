"""Aggregate-only independent fixed forecast squared-loss comparison. Run verify.py first."""
import json,pathlib,math
p=pathlib.Path(__file__).resolve().parent
d=json.loads((p/'verification_inputs.json').read_text());r=json.loads((p/'verification_results.json').read_text())
y=[v['mean'] for v in d['observed']];s=[v['sem'] for v in d['observed']];n=[v['n'] for v in d['observed']]
out=[]
for scenario,models in r.items():
 if not isinstance(models,dict) or 'CPF' not in models:continue
 for conversion in [6,6.945]:
  for baseline in ['C','mean']:
   for center in [False,True]:
    a=[v*60/conversion for v in models['CPF']['predictions_pmol_h_L']];b=[v*60/conversion for v in models[baseline]['predictions_pmol_h_L']]
    ma=sum(a)/6 if center else 0;mb=sum(b)/6 if center else 0;my=sum(y)/6 if center else 0
    aa=[v-ma for v in a];bb=[v-mb for v in b];yy=[v-my for v in y]
    diff=sum((x-t)**2-(z-t)**2 for x,z,t in zip(aa,bb,yy))/6
    w=[2*(z-x)/6 for x,z in zip(aa,bb)];var=sum((c*ss)**2 for c,ss in zip(w,s));se=math.sqrt(var);df=var**2/sum((c*ss)**4/(nn-1) for c,ss,nn in zip(w,s,n))
    out.append(dict(scenario=scenario,conversion=conversion,baseline=baseline,centered=center,difference=diff,SE=se,Welch_df=df,estimate_over_SE=diff/se))
(p/'secondary_risk_portable.json').write_text(json.dumps(out,indent=2))
print('Computed',len(out),'aggregate-only fixed-forecast comparisons')
