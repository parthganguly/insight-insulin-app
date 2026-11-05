"""Independent entire-recipe-held-out comparison; public aggregates and stdlib only."""
import json,pathlib,math,statistics,itertools
p=pathlib.Path(__file__).resolve().parent;d=json.loads((p/'inputs.json').read_text());i=d['inputs'];y=d['geometric_insulin_iAUC_nmol_min_L'];recipes=['muffin','chili','soup'];avg=statistics.fmean
observed=[[math.log(y[3*k+c]/y[3*k]) for c in [1,2]] for k in range(3)]
methods={};native={}
for name,m in d['models'].items():
 v=[m['intercept']+sum(s*i[n][k] for n,s in m['slopes'].items()) for k in range(9)]
 methods['Wolever_'+name]=[[math.log(v[3*k+c]/v[3*k]) for c in [1,2]] for k in range(3)]
 # pmol*h/L -> nmol*min/L factor60/1000. GM mismatch is intentional stress only.
 vv=[x*.06 for x in v];native[name]={'predicted_nmol_min_L':vv,'per_recipe_MAE_vs_GM':[avg(abs(vv[3*k+c]-y[3*k+c]) for c in range(3)) for k in range(3)]}
methods['equality']=[[0,0] for _ in range(3)]
for key in ['C','energy']:
 methods['proportional_'+key]=[[math.log(i[key][3*k+c]/i[key][3*k]) for c in [1,2]] for k in range(3)]
methods['common_substitution']=[[avg(observed[j][c] for j in range(3) if j!=k for c in range(2))]*2 for k in range(3)]
methods['same_color']=[[avg(observed[j][c] for j in range(3) if j!=k) for c in range(2)] for k in range(3)]
def evaluate(v):
 rows=[]
 for k in range(3):
  rows.append({'recipe':recipes[k],'predicted_green_control':math.exp(v[k][0]),'predicted_red_control':math.exp(v[k][1]),'observed_green_control':math.exp(observed[k][0]),'observed_red_control':math.exp(observed[k][1]),'two_control_log_errors':[abs(v[k][c]-observed[k][c]) for c in range(2)],'red_green_prediction':math.exp(v[k][1]-v[k][0]),'red_green_observed':y[3*k+2]/y[3*k+1],'red_green_log_error':abs(v[k][1]-v[k][0]-observed[k][1]+observed[k][0])})
 return {'all6_control_MALE':avg(abs(v[k][c]-observed[k][c]) for k in range(3) for c in range(2)),'all3_red_green_MALE':avg(r['red_green_log_error'] for r in rows),'recipes':rows}
results={name:evaluate(v) for name,v in methods.items()}
single=[]
for target,donor in itertools.permutations(range(3),2):
 for method in ['common_substitution','same_color']:
  v=[avg(observed[donor])]*2 if method=='common_substitution' else observed[donor]
  single.append({'target':recipes[target],'donor':recipes[donor],'method':method,'predicted_ratios':list(map(math.exp,v)),'two_control_MALE':avg(abs(v[c]-observed[target][c]) for c in range(2)),'red_green_log_error':abs(v[1]-v[0]-observed[target][1]+observed[target][0])})
out={'estimand':'ratios of printed geometric mean insulin iAUC; not printed participant RIR or arithmetic native mean','methods':results,'single_donor':single,'native_estimand_mismatched_stress':native}
(p/'results.json').write_text(json.dumps(out,indent=2))
for name,r in results.items():print(name,round(r['all6_control_MALE'],6),round(r['all3_red_green_MALE'],6))
