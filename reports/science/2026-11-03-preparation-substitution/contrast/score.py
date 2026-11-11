"""Aggregate-only comparisons. Ratios are computed separately for each endpoint."""
from pathlib import Path
import itertools,json,math,statistics,csv
D=Path(__file__).resolve().parent
load=lambda f:json.loads((D/f).read_text(encoding='utf-8'))
err=lambda a,b:abs(math.log(a/b))
def compare(ratios,scores):
    return {k:{'predicted':v,'errors':[err(p,y) for p,y in zip(v,ratios)],'mean_error':statistics.fmean(err(p,y) for p,y in zip(v,ratios)),'separation_error':err(v[0]/v[1],ratios[0]/ratios[1])} for k,v in scores.items()}
def timing():
    t=load('thorburn.json');means={}
    for food,ordinates in t['marker_y'].items():
        ax=t['axis'][food.replace('salt_','')]
        means[food]=[(ax['y0']-v)*ax['max']/(ax['y0']-ax['ymax']) for v in ordinates]
    def auc(v,n):
        return sum((b-a)*((x+z)/2-v[0]) for a,b,x,z in zip(t['time'][:n-1],t['time'][1:n],v[:n-1],v[1:n]))
    signed={str(m):{k:auc(v,n) for k,v in means.items()} for m,n in [(120,7),(180,9)]}
    wheat=math.sqrt(15.1*15.7)/18.2
    ref=load('../public/model/FORECASTS.json')['donor']['ratios_starch'];pool=math.sqrt(ref['rice']*ref['potato'])
    pred={'equal':1,'wheat_fixed':wheat,'wheat_scaled_food_f1':wheat**(44.8/25),'pool_fixed':pool,'pool_scaled_food_f1':pool**2}
    out={}
    for label,a in [*signed.items(),('printed_180',{k:v[0] for k,v in t['printed_180_areas'].items()})]:
        obs=[a['lentils']/a['bread'],a['salt_lentils']/a['salt_bread']]
        out[label]={'areas':a,'ratios':obs,'score':compare(obs,{k:[p,p] for k,p in pred.items()}),'salted_vs_unsalted_ratio_of_ratios':obs[1]/obs[0]}
    return out
def cooking():
    data=load('assay_inputs.json');wei=data['wei'];zhao=data['zhao']
    def fractions(bars):
        heights=[zhao['origin_y']-h for h in bars];return [h/sum(heights) for h in heights]
    ext={k:fractions(v) for k,v in zhao['bars'].items()}
    rc,h,s=wei['insulin_area'];target=[h/rc,s/rc]
    g=wei['starch_g'];r,p,c=g['test_rice'],g['test_potato'],g['control_rice']
    local=[[x/100 for x in wei['RDS_SDS_RS_percent'][k]] for k in ['rice','hard','soft']]
    def convert(rows,n,background):
        rice=sum(local[0][:n])
        return [(r*rice+p*sum(v[:n])+background)/(c*rice+background) for v in rows]
    models={'equal':[1,1],'total_starch':[(r+p)/c]*2,'zero_hard_rice_like_soft_starch':[r/c,(r+p)/c],
            'zero_hard_rice_like_soft_AC':[r/c,1]}
    limits={}
    for n,kind in [(1,'RDS'),(2,'RDS_SDS')]:
        for bg in [0,10]:
            for name,v in [('earlier_potato',[ext['short'],ext['long']]),('meal_potato',local[1:])]:
                models[f'{name}_{kind}_background{bg}']=convert(v,n,bg)
        # ±1 native pixel for top of each of six external bars, fixed baseline. Deterministic read sensitivity.
        errors=[];seps=[]
        for shifts in itertools.product([-1,1],repeat=6):
            rows=[fractions([a+b for a,b in zip(zhao['bars'][name],shifts[j*3:(j+1)*3])]) for j,name in enumerate(['short','long'])]
            m=compare(target,{'model':convert(rows,n,0)})['model']
            errors.append(m['mean_error']);seps.append(m['separation_error'])
        limits[kind]={'mean_error':[min(errors),max(errors)],'separation_error':[min(seps),max(seps)]}
    a=zhao['glucose_iAUC'];base=[a[k]/a['rice'] for k in ['minimal_potato_rice','highly_cooked_potato_rice']]
    models.update({'earlier_mixed_glucose':base,'earlier_glucose_fraction_adjusted':[v**(wei['fraction_whole']/zhao['fraction']) for v in base]})
    return {'external_assay_fractions':ext,'earlier_glucose_meal_ratios':base,'undiluted_potato_only_GI_ratio':zhao['standalone_GI']['minimal']/zhao['standalone_GI']['high'],
            'observed':target,'HP_SP':h/s,'scores':compare(target,models),'pixel_sensitivity':limits}
def pea():
    a=load('../astra/schafer_aggregate.json')
    m=a['mean120_chart_approx_nmol_min_per_L'];obs=[m[0]/m[2],m[1]/m[2]]
    # Unlike the lentil trial the preparations change meat and side dishes too. No fully isolated ingredient.
    q=load('../public/model/FORECASTS.json')['donor']['ratios_starch']['potato']
    # Source-side displaced potato CHO divided by total control meal CHO, separate from pulse's share of test-staple CHO.
    with (D.parent/'astra/schafer_recipe.csv').open(encoding='utf8') as f: rows=list(csv.DictReader(f))
    def carbs(j,name):return float(next(r['carbohydrate_g'] for r in rows if r['meal']==str(j) and r['ingredient']==name))
    whole=[carbs(3,'Potatoes')/carbs(3,'Total'),(carbs(3,'Potatoes')-carbs(2,'Potatoes'))/carbs(3,'Total')]
    frac=[1,a['pea_fraction_staple_carbohydrate'][1]]
    models={'equality':[1,1],'fixed_potato':[q,q],'scaled_pea_share_staple':[q**(2*v) for v in frac],
            'scaled_potato_displaced_whole':[q**(2*v) for v in whole], 'proportional_total_C':[carbs(i,'Total')/carbs(3,'Total') for i in [1,2]]}
    return {'observed':obs,'fraction_displaced_of_control_meal':whole,'test_staple_pea_share':frac,'scores':compare(obs,models)}
def evaluate():return {'thorburn':timing(),'assay_transfer':cooking(),'schafer':pea()}
if __name__=='__main__':print(json.dumps(evaluate(),indent=2,allow_nan=False))
