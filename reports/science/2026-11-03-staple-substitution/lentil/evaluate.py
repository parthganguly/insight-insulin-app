"""Cross-recipe and cross-publication forecasts for ratios of geometric mean insulin areas."""
from pathlib import Path
from itertools import product
import json,math,statistics
ROOT=Path(__file__).resolve().parent
read=lambda p:json.loads(p.read_text(encoding='utf8'))
avg=statistics.fmean
def gmean(v):return math.exp(avg(map(math.log,v)))
def error(p,y):return abs(math.log(p/y))
def ratio_pairs(values):
    return [[values[i+1]/values[i],values[i+2]/values[i]] for i in range(0,len(values),3)]
def report(p,y):
    pairs=[[error(a,b) for a,b in zip(pr,ob)] for pr,ob in zip(p,y)]
    sub=[error(pr[1]/pr[0],ob[1]/ob[0]) for pr,ob in zip(p,y)]
    return {'ratios':p,'substitution_errors':pairs,'substitution_MALE':avg(sum(pairs,[])),
            'red_over_green_errors':sub,'red_over_green_MALE':avg(sub)}
def bridges(source,target,share):
    pooled=gmean(sum(source,[]));by_color=list(map(gmean,zip(*source)))
    models={'no_change':[[1,1] for row in source],'pooled':[[pooled]*2 for row in source],
            'color_only':[by_color[:] for row in source],
            'starch_only':[[gmean(row)]*2 for row in source],'starch_and_color':source}
    for name in ['pooled','color_only','starch_only','starch_and_color']:
        models[name+'_exchange_share']=[[z**s for z in pair] for pair,s in zip(models[name],share)]
    change=[target[1][i]/target[0][i] for i in (0,1)]
    scored={}
    for k,v in models.items():
        pred=[v[1][i]/v[0][i] for i in (0,1)]
        scored[k]={**report(v,target),'potato_relative_to_rice':pred,'change_MALE':avg(map(error,pred,change))}
    return {'observed':target,'observed_potato_relative_to_rice':change,'models':scored}
def evaluate():
    inputs=read(ROOT/'inputs.json');obs=read(ROOT.parent/'astra/lentil/aggregate.json')['arms']
    native_inputs=read(ROOT.parent/'native/inputs.json')
    for idx,row in enumerate(obs):
        for key,src in [('C','available_carbohydrate_g'),('P','protein_g'),('F','fat_g'),('energy','energy_kcal')]:
            assert inputs[key][idx]==row[src]
    gm=[a['insulin_iAUC_geometric_mean'] for a in obs]
    y=ratio_pairs(gm)
    relative={'no_change':[[1,1]]*3,'available_C':ratio_pairs(inputs['C']),'energy':ratio_pairs(inputs['energy'])}
    native={}
    for name,m in native_inputs['models'].items():
        p=[.06*(m['intercept']+sum(w*inputs[k][j] for k,w in m['slopes'].items())) for j in range(9)]
        relative[name]=ratio_pairs(p)
        native[name]={'pred_nmol_min_L':p,'MAE_to_geometric_means':avg(map(lambda t:abs(t[0]-t[1]),zip(p,gm)))}
    common=[]; color=[]; single=[]
    for i in range(3):
        donors=[r for j,r in enumerate(y) if j!=i]
        common.append([gmean(sum(donors,[]))]*2)
        color.append(list(map(gmean,zip(*donors))))
        for j,r in enumerate(y):
            if j!=i:single.append({'donor':j,'held':i,'pooled':report([[gmean(r)]*2],[y[i]]),'color':report([r],[y[i]])})
    relative.update(held_recipe_common=common,held_recipe_color=color)
    donor=read(ROOT/'donor.json')
    old=[v[j] for v in donor['geometric_areas'] for j in (0,2,3)]
    a=ratio_pairs(old);b=y[1:]
    fractions=[50/inputs['C'][i] for i in (3,6)]
    forward=bridges(a,b,fractions)
    forward['joint']=all(forward['models']['starch_only']['substitution_MALE']<forward['models'][k]['substitution_MALE']-1e-12 for k in ['pooled','color_only','no_change'])
    return {'target_geometric_areas':gm,'target_ratios':y,'native_stress':native,'within':{k:report(v,y) for k,v in relative.items()},
            'single_donor':single,'matched_subset_baselines':{k:report(v[1:],b) for k,v in relative.items()},
            'prior_to_later':forward,'later_to_prior_exploratory':bridges(b,a,[1/x for x in fractions]),
            'direct_native_transfer':{'donor':old,'target':gm[3:],'MAE_nmol_min_L':avg(abs(x-z) for x,z in zip(old,gm[3:]))},
            'unsupported_wheat_substrate':{'matched':None,'pooled_unmatched':report([[gmean(sum(a,[]))]*2],[y[0]]),'color_only_unmatched':report([list(map(gmean,zip(*a)))],[y[0]])}}
if __name__=='__main__':print(json.dumps(evaluate(),indent=2,allow_nan=False))
