import math,json,pathlib,statistics
p=pathlib.Path(__file__).resolve().parent;avg=statistics.fmean
source=[[10.9,10.4,9.7,10],[19.9,13.1,12.8,12.3]];target=[[8.4,5.8,4.9],[11.2,4.4,4.7]]
d=[[math.log(row[c]/row[0]) for c in [2,3]] for row in source];y=[[math.log(row[c]/row[0]) for c in [1,2]] for row in target];pool=avg(v for row in d for v in row)
methods={'equality':[[0,0],[0,0]],'pooled':[[pool]*2]*2,'starch_only':[[avg(row)]*2 for row in d],'color_only':[[avg(d[s][c] for s in range(2)) for c in range(2)] for _ in range(2)],'matched':d}
for name,v in list(methods.items()):
 if name!='equality':methods[name+'_fraction_scaled']=[[x*50/[27.3,26.9][s] for x in v[s]] for s in range(2)]
def metrics(v):
 e=[[v[s][c]-y[s][c] for c in range(2)] for s in range(2)]
 return {'predicted_ratios':[[math.exp(x) for x in row] for row in v],'signed_log_residuals':e,'all4_MALE':avg(abs(x) for row in e for x in row),'red_green_errors':[abs((v[s][1]-v[s][0])-(y[s][1]-y[s][0])) for s in range(2)],'potato_rice_ratio_of_ratios_predicted':[math.exp(v[1][c]-v[0][c]) for c in range(2)],'potato_rice_ratio_of_ratios_log_errors':[abs((v[1][c]-v[0][c])-(y[1][c]-y[0][c])) for c in range(2)]}
out={'source':source,'target':target,'source_log_ratios':d,'target_log_ratios':y,'observed_potato_rice_ratio_of_ratios':[math.exp(y[1][c]-y[0][c]) for c in range(2)],'methods':{k:metrics(v) for k,v in methods.items()},'native':{'source_control_green_red':[[row[c] for c in [0,2,3]] for row in source],'target':target,'all6_MAE':avg(abs(source[s][c]-target[s][j]) for s in range(2) for j,c in enumerate([0,2,3]))}}
out['reverse_exploratory']={}
for name,v in {'matched':y,'starch_only':[[avg(row)]*2 for row in y],'pooled':[[avg(x for row in y for x in row)]*2 for _ in range(2)]}.items():
 for scale in [False,True]:
  vv=[[x*([27.3,26.9][s]/50 if scale else 1) for x in v[s]] for s in range(2)]
  out['reverse_exploratory'][name+('_fraction_scaled' if scale else '')]={'predicted_ratios':[[math.exp(x) for x in row] for row in vv],'all4_MALE':avg(abs(vv[s][c]-d[s][c]) for s in range(2) for c in range(2))}
lentil=json.loads((p.parent/'lentil/results.json').read_text())['methods'];out['target_subset_baselines']={k:{'all4_MALE':avg(x for row in v['recipes'][1:] for x in row['two_control_log_errors']),'red_green_MALE':avg(row['red_green_log_error'] for row in v['recipes'][1:])} for k,v in lentil.items() if k not in ['same_color','common_substitution']}
(p/'results.json').write_text(json.dumps(out,indent=2))
for k,v in out['methods'].items():print(k,round(v['all4_MALE'],6),[round(x,6) for x in v['potato_rice_ratio_of_ratios_log_errors']])
print('nativeMAE',out['native']['all6_MAE'])
