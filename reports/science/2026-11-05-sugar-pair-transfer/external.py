"""Window-specific signed formulation forecasts; no fitting to the Kawai outcomes."""
from pathlib import Path
import csv,json,math
from transfer import donor,ratios
ROOT=Path(__file__).resolve().parent

def load_series():
    out={}
    def add(study,arm,t,c):out.setdefault(study,{}).setdefault(arm,[]).append((int(t),float(c)))
    def csvrows(name):
        with (ROOT/name).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
    for r in csvrows('prior/holub.csv'):add('Holub',r['sugar'],r['minutes'],r['pmol_L'])
    for r in csvrows('prior/tea_trace.csv'):
        context,arm=r['arm'].split('_');add('Suraphad_'+context,arm,r['t_min'],r['mean_delta_uIU_mL'])
    for r in csvrows('kawai/curve.csv'):add('Kawai',{'I':'isomaltulose','S':'sucrose'}[r['arm']],r['t_min'],r['mean_uU_per_mL'])
    r=json.loads((ROOT/'prior/yoshizane.json').read_text(encoding='utf8'))['reading']
    for a in ['trehalose','glucose']:
        for t,c in zip(r['times_min'],r[a]):add('Yoshizane',a,t,c)
    return out

def inspect_series(arms,pair):
    def a(series,t):
        assert series[0][0]==0 and t in dict(series)
        return sum((v+u-2*series[0][1])*(b-a)/2 for (a,u),(b,v) in zip(series,series[1:]) if b<=t)
    out={}
    for t in [60,120,180]:
        n,d=[arms[k] for k in pair]
        if t in dict(n) and t in dict(d):
            x,y=a(n,t),a(d,t); assert min(x,y)>0
            out[t]=(x,y,x/y)
    return out

def result():
    data=load_series(); panels={}
    ref={t:ratios(donor()[('fast','signed_nominal',t)]) for t in (60,120,180)}
    for study,arms in data.items():
        tg='trehalose' in arms; key='T/G' if tg else 'I/S'
        pair=['trehalose','glucose'] if tg else ['isomaltulose','sucrose']
        target=inspect_series(arms,pair)
        obs={t:arr[2] for t,arr in target.items()}
        # A forecast for the normalized trajectory of insulin AREAS, not instantaneous concentrations.
        d={t:ref[t][key] for t in target}
        rules={'matched_time':d,'same_donor_constant120':{t:ref[120][key] for t in target},
               'historical_scalar':{t:(.42 if tg else .654771347866157) for t in target},
               'equal':{t:1.0 for t in target},
               'posthoc_same_donor_constant60':{t:ref[60][key] for t in target}}
        if not tg and study!='Holub':
            h=inspect_series(data['Holub'],pair)
            rules['Holub_time']={t:h[t][2] for t in target}
        logs=sorted(math.log(v) for v in obs.values());n=len(logs)
        med=math.exp((logs[(n-1)//2]+logs[n//2])/2)
        rules['target_fitted_constant']={t:med for t in target}
        scored={}
        for name,v in rules.items():
            scored[name]={'ratio_forecast':v,'MALE':sum(abs(math.log(v[t]/obs[t])) for t in target)/n,
                          'shape':{t:{'predicted_fold':v[t]/v[60],'observed_fold':obs[t]/obs[60],
                          'absolute_log_error':abs(math.log((v[t]/v[60])/(obs[t]/obs[60]))),
                          'predicted_ratio_with_measured_target60':obs[60]*v[t]/v[60]} for t in target if t!=60}}
        panels[study]={'pair':key,'areas_numerator_denominator_ratio':target,'scored':scored}
    return panels

if __name__=='__main__':print(json.dumps(result(),indent=2,allow_nan=False))
