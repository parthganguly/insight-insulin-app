"""Score input-only assays and a process reference measured in a separate cohort."""
from pathlib import Path
import csv,json,math,statistics
ROOT=Path(__file__).resolve().parent
def read(p):return json.loads(p.read_text(encoding='utf8'))
def err(a,b):return abs(math.log(a/b))
def model(values,y):
    return {'C_B':values[0],'S_B':values[1],'C_S':values[0]/values[1],
            'C_B_error':err(values[0],y[0]),'S_B_error':err(values[1],y[1]),
            'primary_error':statistics.fmean(err(x,z) for x,z in zip(values,y)),
            'C_S_error':err(values[0]/values[1],y[0]/y[1])}
def fieller(x,y,vx,vy,cov,t):
    # Solve (x-r*y)^2 <= t^2 Var(x-r*y) for this crossover's two arm means.
    a=y*y-t*t*vy;b=-2*x*y+2*t*t*cov;c=x*x-t*t*vx
    assert a>0 and b*b-4*a*c>=0
    return [(-b-math.sqrt(b*b-4*a*c))/(2*a),(-b+math.sqrt(b*b-4*a*c))/(2*a)]
def calc():
    with (ROOT.parent/'astra/aggregate.csv').open() as f:
        facts={(r['study'],r['arm'],r['measure'],int(r['minutes'])):float(r['value']) for r in csv.DictReader(f) if r['minutes'].isdigit()}
    def value(study,arm,measure,time):return facts[(study,arm,measure,time)]
    def assay(arm,t):return value('Cai2025',arm,'measured_amylo_g_serving',t)
    def hummus(arm,k,t):return value('Alshaalan2024',arm,k,t)
    a=read(ROOT/'aggregate.json')['windows']['120'];m=a['positive']['arms'];cov=a['positive_covariance_of_means']
    ratios=[m[k]['mean']/m['Broken']['mean'] for k in ['Intact-C','Intact-S']]
    prior=hummus('ICC','net_AUC_uU_min_mL',120)/hummus('RCC','net_AUC_uU_min_mL',120)
    hd=hummus('ICC','measured_amylo_g_serving',20)/hummus('RCC','measured_amylo_g_serving',20)
    beta=math.log(prior)/math.log(hd)
    models={'same_starch':[1.,1.],'hummus_process':[prior,prior],'prior_ingredient_H120':[21.7/63]*2}
    for t in [20,60,90,120]:
        models[f'local_H{t}']=[assay(k,t)/assay('Broken',t) for k in ['Intact-C','Intact-S']]
    h=models['local_H20']
    models['S_anchor_H20']=[prior*h[0]/h[1],prior];models['external_beta_H20']=[x**beta for x in h]
    # Duration rule specified after seeing Cai outcomes. Duration and retention are confounded.
    models['posthoc_S_anchor_time']=[prior*50/80,prior]
    models['posthoc_time_only']=[50/28,80/28]
    results={k:model(v,ratios) for k,v in models.items()}
    t=2.2621571628540993 # two-sided 95%, 9 df
    intervals={}
    for left,right in [(2,0),(1,0),(2,1)]:
        u,v=a['covariance_order'][left],a['covariance_order'][right]
        intervals[u+'/'+v]=fieller(m[u]['mean'],m[v]['mean'],cov[left][left],cov[right][right],cov[left][right],t)
    return {'hummus_signed120_process_ratio':prior,'hummus_D20_ratio':hd,'external_exponent':beta,'positive_target_ratios':ratios,
            'models':results,'paired_ratio_intervals_normal_theory':intervals,'midpoints_C_S':{'assay_vs_tie':math.sqrt(results['local_H20']['C_S']),'assay_vs_time':math.sqrt(results['local_H20']['C_S']*50/80)},
            'minimum_error_for_any_shared_intact_factor':abs(math.log(ratios[0]/ratios[1]))/2,
            'target_endpoint':'ratio of arithmetic mean areas; exact crossings above each own published time-zero value'}
if __name__=='__main__':print(json.dumps(calc(),indent=2,allow_nan=False))
