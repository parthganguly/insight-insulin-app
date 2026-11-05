"""Evaluate unchanged forecasts on aggregate arm estimates. Optional finite-sample SE for risk differences."""
from pathlib import Path
import json,itertools,math,statistics
ROOT=Path(__file__).resolve().parent
def read(p):return json.loads(p.read_text(encoding='utf8'))
def average(x):return statistics.fmean(x)
def metrics(pred,obs):
    pairs=[math.log(pred[i]/pred[j])-math.log(obs[i]/obs[j]) for i,j in itertools.combinations(range(len(obs)),2)]
    errors=[p-y for p,y in zip(pred,obs)]
    return {'forecast':pred,'errors':errors,'mae':average(map(abs,errors)),'mean_bias':average(errors),
            'pair_log_mae':average(map(abs,pairs)),'all_pair_log_residuals':pairs}
def uncertainty(a,b,y,sem,n,centered):
    # For fixed points and squared loss, the difference in risk is affine in the unknown arm means.
    if centered:
        a=[x-average(a) for x in a];b=[x-average(b) for x in b]
    k=len(y)
    intercept=average(x*x-z*z for x,z in zip(a,b))
    weights=[2*(z-x)/k for x,z in zip(a,b)]
    diff=intercept+sum(c*t for c,t in zip(weights,y))
    terms=[(c*s)**2 for c,s in zip(weights,sem)]
    var=sum(terms)
    df=var**2/sum(t*t/(m-1) for t,m in zip(terms,n)) if var>0 else None
    return {'MSE_difference_A_minus_B':diff,'SE':math.sqrt(var),'Welch_df':df,
            'estimate_over_SE':diff/math.sqrt(var) if var>0 else None,'mean_coefficients':weights}
def evaluate():
    source=read(ROOT.parent/'astra/aggregate.json')['arms']
    y=[a['mean'] for a in source]; sem=[a['sem'] for a in source]; n=[a['n'] for a in source]
    f=read(ROOT/'PREDICTIONS.json');inputs=read(ROOT/'inputs.json')
    actual={}
    for name,m in inputs['models'].items():
        vals=[]
        for j,arm in enumerate(source):
            mass=float(arm['reported_serving_g'].split()[0])
            num=lambda x:.05 if x=='<0.1' else float(x)
            macros={key:mass/100*num(arm[col+'_g_per_100g']) for key,col in [('C','carbohydrate'),('P','protein'),('F','fat')]}
            vals.append(m['intercept']+sum(v*macros[k] for k,v in m['slopes'].items()))
        actual[name]=vals
    f={**f,'reported_food_mass_per100g':actual}
    out={}
    for setting,model in f.items():
        out[setting]={}
        for scale in (6,6.945):
            pred={k:[v*60/scale for v in vals] for k,vals in model.items()}
            m={k:metrics(p,y) for k,p in pred.items()}
            criterion={score:all(m['CPF'][score]<m[k][score] for k in ['mean','C']) for score in ['mae','pair_log_mae']}
            out[setting][str(scale)]={'predictions_and_metrics':m,'beats_both':criterion,'joint_pass':all(criterion.values()),
                'secondary_squared_risk_difference':{a+' minus '+b:{('shape' if centered else 'native'):uncertainty(pred[a],pred[b],y,sem,n,centered) for centered in (False,True)}
                        for a,b in itertools.combinations(['CPF','C','mean','CP','CPF_nonnegative'],2)}}
    return out
if __name__=='__main__':print(json.dumps(evaluate(),indent=2,allow_nan=False))
