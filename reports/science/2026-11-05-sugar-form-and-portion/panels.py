"""Cross-study checks of the frozen sugar-identity forecast. Standard library, numeric public inputs."""
import csv
from itertools import product
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def read(name):
    return json.loads((ROOT/name).read_text(encoding='utf8'))

def integrate(t, values, subtract_baseline=True):
    baseline = values[0] if subtract_baseline else 0
    return sum((b-a)*((left+right)/2-baseline)
               for a,b,left,right in zip(t,t[1:],values,values[1:]))

def summary(observed, predictions):
    result={}
    for model, pred in predictions.items():
        errors={k:abs(math.log(pred[k]/obs)) if pred[k]>0 else None for k,obs in observed.items()}
        valid=[e for e in errors.values() if e is not None]
        result[model]={'predicted':pred,'log_errors':errors,'coverage':[len(valid),len(observed)],
                       'full_mean':sum(valid)/len(observed) if len(valid)==len(observed) else None}
    return result

def drink_comparison(fructose_ratio, second_ratio, second, r, sucrose_ref):
    obs={'fructose':fructose_ratio,second:second_ratio}
    pred={'equal_grams':{'fructose':1,second:1},
          'constituents':{'fructose':r,second:(1+r)/2},
          'glucose_grams_only':{'fructose':0,second:.5}}
    if second=='sucrose':
        pred['same_sugar_25g_reference']={'fructose':r,second:sucrose_ref}
    return {'observed':obs,'scores':summary(obs,pred)}

def jameel(r,sucrose_ref):
    src=read('jameel_markers.json')
    zero,top=src['baseline_y'],src['y_at_800']
    y=src['bars_y']
    bars={k:800*(zero-v)/(zero-top) for k,v in y.items()}
    result=drink_comparison(bars['fructose']/bars['glucose'],bars['sucrose']/bars['glucose'],'sucrose',r,sucrose_ref)
    bounds={k:[] for k in ('fructose','sucrose')}
    for label,samples in bounds.items():
        for axis,treated,control in product((-1,1),(-1.5,1.5),(-1.5,1.5)):
            samples.append((zero+axis-y[label]-treated)/(zero+axis-y['glucose']-control))
    result.update({'operator':src['panel_d'],'bar_ordinates':bars,'reading_ranges':{k:[min(v),max(v)] for k,v in bounds.items()}})
    c_zero=src['zero_y_c']
    areas={}
    for k,ys in src['curve_y'].items():
        values=[1400*(c_zero-v)/(c_zero-src['y_at_1400_c']) for v in ys]
        areas[k]=integrate(src['times'],values)
    c=drink_comparison(areas['fructose']/areas['glucose'],areas['sucrose']/areas['glucose'],'sucrose',r,sucrose_ref)
    c.update({'operator':src['panel_c'],'signed_percent_min':areas})
    return {'printed_panel_d':result,'integrated_panel_c':c}

def free_mixture(r,sucrose_ref):
    with (ROOT/'mixture_area.csv').open(encoding='utf8',newline='') as f:
        rows={v['arm']:v for v in csv.DictReader(f)}
    areas={}
    for arm,v in rows.items():
        levels=[float(v[f'insulin_{t}_mU_L']) for t in (0,15,30,60,120)]
        areas[arm]=integrate([0,15,30,60,120],levels)
        assert math.isclose(areas[arm],float(v['signed_center']),abs_tol=1e-7)
    g,f,m=[areas[k] for k in ('glucose','fructose','free_mix')]
    result=drink_comparison(f/g,m/g,'free_mix',r,sucrose_ref)
    result['areas']=areas
    result['whole_dose_component_benchmark_ratio']=(g+f)/(2*g)
    result['benchmark_log_error']=abs(math.log((g+f)/(2*m)))
    lo=lambda k:float(rows[k]['signed_low'])
    hi=lambda k:float(rows[k]['signed_high'])
    result['excess_over_linear_interpolation_mU_min_L']={'central':m-(g+f)/2,
         'source_coordinate_range':[lo('free_mix')-(hi('fructose')+hi('glucose'))/2,
                                    hi('free_mix')-(lo('fructose')+lo('glucose'))/2]}
    return result

def muffin(r):
    src=read('gallagher_markers.json');facts=read('muffin_facts.json')
    meals=facts['recipe_grams_and_kcal']
    def scores(k):
        return {a:p['starch']+.5*p['sucrose']+k*(p['fructose']+.5*p['sucrose']) for a,p in meals.items()}
    models={'equal_response':dict.fromkeys(meals,1),'total_carb':{a:p['total_carb'] for a,p in meals.items()},
        'weighted':scores(r),'zero_fructose_weight':scores(0.),
        'published_energy':{a:p['kcal'] for a,p in meals.items()},
        'carb_plus_protein':{a:p['total_carb']+p['protein'] for a,p in meals.items()},
        'macro_energy_proxy':{a:4*(p['total_carb']+p['protein'])+9*p['fat'] for a,p in meals.items()}}
    pairs=('fructose','sucralose')
    def ratios(v):return {a:v[a]/v['sucrose'] for a in pairs}
    preds={k:ratios(v) for k,v in models.items()}
    curves={}
    for arm,ys in src['fig3_y'].items():
        curves[arm]=[(src['fig3_zero_y']-y)*70/(src['fig3_zero_y']-src['fig3_70_y']) for y in ys]
    early={k:integrate(src['time_minutes'][:5],v[:5]) for k,v in curves.items()}
    late={k:(src['fig4_zero_y']-y)*180/(src['fig4_zero_y']-src['fig4_180_y']) for k,y in src['fig4_y'].items()}
    outputs={}
    for name,actual in [('signed_group_120',early),('published_incremental_240',late)]:
        obs=ratios(actual)
        outputs[name]={'areas':actual,'observed':obs,'comparisons':summary(obs,preds)}
        fo,su=obs['fructose'],obs['sucralose']
        # These widths describe extraction from the figure only. They include no sampling variability.
        # Fig 3: ±2 pixels for every marker including each baseline. Fig 4: ±1.5 pixels per bar top
        # and ±1 pixel for the shared axis origin; the calibration slope cancels from ratios.
        bounds={}
        for arm in pairs:
            if name=='signed_group_120':
                half_width=210*2*70/(src['fig3_zero_y']-src['fig3_70_y'])
                low=(actual[arm]-half_width)/(actual['sucrose']+half_width)
                high=(actual[arm]+half_width)/(actual['sucrose']-half_width)
            else:
                candidates=[]
                for shift,dy,dr in product((-1,1),(-1.5,1.5),(-1.5,1.5)):
                    zero=src['fig4_zero_y']+shift
                    candidates.append((zero-src['fig4_y'][arm]-dy)/(zero-src['fig4_y']['sucrose']-dr))
                low,high=min(candidates),max(candidates)
            bounds[arm]={'ratio_range':[low,high],'vs_total_carb_tie':math.sqrt(preds['weighted'][arm]*preds['total_carb'][arm]),
                        'vs_equality_tie':math.sqrt(preds['weighted'][arm])}
        outputs[name]['coordinate_reading_sensitivity']=bounds
        outputs[name]['implied_weights_posthoc']={
              'F_over_S':(86.5*fo-57)/(52-32.5*fo),'U_over_S':(80/su-86.5)/32.5}
    outputs['nonnegative_weight_F_over_S_lower_bound']=57/86.5
    outputs['comment']='For k>=0 the F/S ratio increases from its k=0 floor. This restricts exact point matching under the declared recipe accounting.'
    return outputs

def absolute_stress(r):
    facts=read('absolute_facts.json')
    arms=read('external_inputs.json')['rows']
    g,s=[next(a['mean'] for a in arms if a['arm'].startswith(k)) for k in ('glucose','sucrose')]
    # Post-result development: conditional transport using the inferred Grüneis integrated concentration unit.
    preds={'same_grams_G30_anchor':g*35/30,'constituents_G30_anchor':g*35/30*(1+r)/2,'S30_as_reference':s*35/30}
    result={k:{'observed':v['area'],'predictions':preds,'absolute_errors':{q:abs(y-v['area']) for q,y in preds.items()}} for k,v in facts.items() if isinstance(v,dict)}
    lee=read('lee_inputs.json')['arms'];y25=next(a[2] for a in lee if a[:2]==['glucose',25])
    result['Lee_to_2017_conditional']={'forecast_nmol_min_L':y25*(35/25)*(1+r)/2,
           'observed_nmol_min_L_at_authors_conversion':facts['free']['area']*facts['free']['study_pmol_per_mU']/1000}
    return result

def compute():
    arms=read('lee_inputs.json')['arms']
    y={a[0]:a[2] for a in arms if a[1]==25}
    r=y['fructose']/y['glucose'];s_ref=y['sucrose']/y['glucose']
    return {'r':r,'jameel':jameel(r,s_ref),'eckstein':free_mixture(r,s_ref),'gallagher':muffin(r),
            'descriptive_35g_anchors':absolute_stress(r)}
if __name__=='__main__':print(json.dumps(compute(),indent=2,allow_nan=False))
