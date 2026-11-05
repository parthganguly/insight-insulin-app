"""Cross-phase baked-roll forecasts. Ratios of fixed-time arithmetic arm means."""
from pathlib import Path
import itertools,json,math,statistics
ROOT=Path(__file__).resolve().parent
def ratios(x):return [x[1]/x[0],x[2]/x[0],x[2]/x[1]]
def score(p,y):
    h=ratios(p);t=ratios(y)
    e=[abs(math.log(v/w)) for v,w in zip(h,t)]
    return {'roll_scores':p,'ratios_30_0_60_0_60_30':h,'abs_log_errors':e,'mean_error_vs_control':sum(e[:2])/2,'separation_error':e[2]}
def calc():
    i=json.loads((ROOT/'inputs.json').read_text());y=i['insulin_iAUC_0_120'];s=i['starch_g'];sugar=i['sugar_g']
    donor=json.loads((ROOT.parent/'pilot/results.json').read_text())['hummus_signed120_process_ratio']
    wheat=[a*b for a,b in zip(s,i['wheat_fraction'])]
    models={'equality':[1,1,1],'available_composition':i['potential_g'],'total_starch':s,'long_kit_digestible_starch':i['assayed_digestible_starch_g'],
            'wheat_flour_recipe':[v/i['batch_rolls'] for v in i['wheat_flour_g_batch']],'wheat_origin_starch':wheat,
            'partly_accessible_hummus_reference':[a+(b-a)*donor for a,b in zip(wheat,s)]}
    for t in [20,120]:
        for label,hydro in [('figure',i['H'+str(t)+'_percent']),('fitted',[c*(1-math.exp(-k*t)) for c,k in zip(i['prior_curve_Cinf'],i['prior_curve_k'])])]:
            g=[h/100*x for h,x in zip(hydro,s)]
            models[f'{label}_H{t}']=g
            models[f'{label}_H{t}_bread_sugar']=[v+q for v,q in zip(g,sugar)]
            models[f'{label}_H{t}_all_sugar']=[v+q+i['jam_sugar_g_upper'] for v,q in zip(g,sugar)]
    bounds={}
    for key,limits in i['reading_bounds_percent'].items():
        scored=[score([a*b/100 for a,b in zip(v,s)],y) for v in itertools.product(*limits)]
        bounds[key]={k:[min(row[k]for row in scored),max(row[k]for row in scored)] for k in ['mean_error_vs_control','separation_error']}
    return {'observed_ratios':ratios(y),'native_areas':y,'models':{k:score(v,y) for k,v in models.items()},'marker_extreme_corners_not_CI':bounds,
            'reported_0_60_secondary':{'ratios':ratios(i['insulin_iAUC_0_60']),'models':{k:score(v,i['insulin_iAUC_0_60']) for k,v in models.items()}},
            'first_peak_geometric_ratios_separate':ratios(i['first_peak_geometric'])}
if __name__=='__main__':print(json.dumps(calc(),indent=2))
