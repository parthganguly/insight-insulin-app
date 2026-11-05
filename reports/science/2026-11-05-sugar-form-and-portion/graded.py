"""Reviewed co-lead drink score, with hydrolysis water applied once. See RECONCILIATION.md."""
from math import log
import json
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parent
ANCHOR_DOSE = 25.0
MODELS = ('equality','reference_dose_only','composition','glucose_moiety_only')
def read(name):
    return json.loads((ROOT/name).read_text(encoding='utf8'))

# Public reduction of the Claude Code implementation. The nominal scores and WB fit are preserved.
def masses(sugar,dose,hydrolysis):
    if sugar=='glucose':return dose,0.
    if sugar=='fructose':return 0.,dose
    assert sugar in ('free_mixture','sucrose')
    half=dose/2.
    if hydrolysis and sugar=='sucrose':
        half*=360/342
    return half,half

def scores(sugar,dose,r,a,hydrolysis=False):
    g,f=masses(sugar,dose,hydrolysis)
    d=g+f
    portion=(d/ANCHOR_DOSE)**(a-1)
    return {'equality':1.,'reference_dose_only':d*portion,
            'composition':(g+r*f)*portion,'glucose_moiety_only':g*portion}

def dose_exponent():
    wb=read('wb_portions.json')['rows']
    levels={(row['food'],row['C']):row['mean'] for row in wb}
    foods=sorted({food for food,dose in levels})
    assert len(foods)==4
    return mean(log(levels[food,100]/levels[food,25])/log(4.) for food in foods)

def ratio_cell(areas,num,den,r,a,m,h):
    s1=scores(*num,r,a,h)[m];s0=scores(*den,r,a,h)[m]
    obs=areas[num]/areas[den]
    pred=s1/s0 if s0>0 else None
    return {'numerator':num,'denominator':den,'observed':obs,'predicted':pred,
            'absolute_log_error':abs(log(pred/obs)) if pred is not None and pred>0 else None}

def full_and_partial(values):
    present=[v for v in values if v is not None]
    partial=mean(present) if present else None
    return {'coverage':[len(present),len(values)],'partial_mean':partial,
            'full_mean':partial if len(present)==len(values) else None}

def run():
    areas={(s,d):y for s,d,y,se,n in read('lee_inputs.json')['arms']}
    r=areas['fructose',25]/areas['glucose',25]
    a_wb=dose_exponent()
    panel=[('fructose',50),('sucrose',50),('sucrose',100),('free_mixture',100)]
    rows=[]
    for a in (1.,a_wb):
        for h in (False,True):
            for m in MODELS:
                form=[ratio_cell(areas,p,('glucose',p[1]),r,a,m,h) for p in panel]
                portion={}
                for s,maxdose in [('glucose',100),('fructose',50),('sucrose',100)]:
                    portion[s]=[ratio_cell(areas,(s,d),(s,d//2),r,a,m,h) for d in (50,100) if d<=maxdose]
                each=[full_and_partial([v['absolute_log_error'] for v in group])['full_mean'] for group in portion.values()]
                levels=[]
                for arm,obs in areas.items():
                    if arm in [('glucose',25),('fructose',25)]:continue
                    pred=areas['glucose',25]*scores(*arm,r,a,h)[m]/scores('glucose',25,r,a,h)[m]
                    levels.append({'arm':arm,'observed':obs,'forecast':pred,'absolute_error':abs(obs-pred)})
                rows.append({'a':a,'hydrolysis':h,'model':m,'formulation':form,'portion':portion,'native_levels':levels,
                    'formulation_error':full_and_partial([row['absolute_log_error'] for row in form]),
                    'portion_error':full_and_partial(each),'native_area_MAE':mean(x['absolute_error'] for x in levels)})
    benchmarks={}
    for s,d in [('sucrose',50),('sucrose',100),('free_mixture',100)]:
        g=areas['glucose',d//2];f=areas['fructose',d//2];obs=areas[s,d]
        preds={'measured_sum':g+f,'measured_component_glucose':g,'measured_whole_dose_glucose':areas['glucose',d],
               'proportional_from_glucose25':areas['glucose',25]*d/25}
        benchmarks[f'{s}_{d}']={'observed':obs,'forecasts':preds,'absolute_log_error':{m:abs(log(v/obs)) for m,v in preds.items()}}
    ext=read('external_inputs.json')['rows'];g,s=[next(v['mean'] for v in ext if v['arm'].startswith(k)) for k in ('glucose','sucrose')]
    gr={}
    for a in (1.,a_wb):
        preds={'constituents':(1+r)/2,'equality':1,'glucose_only':.5,'hydro_constituents':(1+r)/2*(360/342)**a,
               'hydro_glucose_only':.5*(360/342)**a,'same_sugar_ref_25':areas['sucrose',25]/areas['glucose',25],
               'same_sugar_ref_50':areas['sucrose',50]/areas['glucose',50]}
        gr[str(a)]={'observed':s/g,'forecasts':preds,'absolute_log_error':{m:abs(log(v/(s/g))) for m,v in preds.items()},
                    'donor_anchored_forecast_nmol_min_L':{k:areas['glucose',25]*scores(k,30,r,a)['composition']/25 for k in ('glucose','sucrose')}}
    return {'r':r,'solid_derived_a':a_wb,'tests':rows,'observed_free_over_sucrose_at_100':areas['free_mixture',100]/areas['sucrose',100],
            'component_measurement_benchmarks':benchmarks,'independent_30g':gr}
if __name__=='__main__':print(json.dumps(run(),indent=2,allow_nan=False))
