"""Fixed meal-ratio forecasts compared with four signed curve areas and printed marginals."""
import itertools,json,math
from model import read,coefficients,error

def trap(t,vs):
    return sum((b-a)*(u+v)/2 for a,b,u,v in zip(t,t[1:],vs,vs[1:]))

def calculate():
    inputs=read("wheat_inputs.json");p=coefficients();f=inputs["figure2"]
    calibration=1800/(f["tick_0"]-f["tick_1800"])
    scores={};signed={};unc={}
    for a,arm in inputs["arms"].items():
        starch=arm["Starch"]*inputs["serving_g"]/100
        sugar=arm["Sugars"]*1.21;rs=arm["Resistant starch"]*1.21
        ap=1-arm["amylose_fraction"]
        scores[a]={"equal_serving":1,"starch":starch,"stated_carbohydrate":starch+sugar,
                   "starch_less_RS":starch-rs,"starch_less_RS_plus_sugar":starch-rs+sugar,
                   "amylopectin_dose":starch*ap,"heated":starch*ap**p["gel"]["exponent"],
                   "shared":starch*ap**p["shared"],"fixed_dose_heated":ap**p["gel"]["exponent"],
                   "fixed_dose_unit":ap}
        vs=[calibration*(arm["y"][0]-y) for y in arm["y"]]
        signed[a]={}
        for stop in [120,180]:
            m=f["time"].index(stop)+1
            signed[a][str(stop)]=trap(f["time"][:m],vs[:m])
            # t0 is always zero after baseline subtraction. Baseline contributes to all later points.
            # Remaining trapezoid coefficients sum to T-first_interval/2.
            unc[str(stop)]=(f["baseline_error_px"]+f["marker_error_px"])*calibration*(stop-f["time"][1]/2)
    pairs={}
    for a,b in [('HAW-R','LAW-R'),('HAW-W','LAW-W'),('LAW-W','LAW-R'),('HAW-W','HAW-R')]:
        obs={t:signed[a][t]/signed[b][t] for t in unc}
        pred={k:x/scores[b][k] for k,x in scores[a].items()}
        bands={t:[(signed[a][t]-v)/(signed[b][t]+v),(signed[a][t]+v)/(signed[b][t]-v)] for t,v in unc.items()}
        pairs[a+'/'+b]={'pred':pred,'observed':obs,'abs_log_error':{t:{k:error(x,y)for k,x in pred.items()}for t,y in obs.items()},'graph_reading_bounds':bands}
    marg=inputs['table3_marginals']
    panels={}
    for label,numer,denom,n,d in [('source',['HAW-W','HAW-R'],['LAW-W','LAW-R'],'HAW','LAW'),('milling',['HAW-W','LAW-W'],['HAW-R','LAW-R'],'wholemeal','refined')]:
        obs=marg[n][0]/marg[d][0]
        pred={k:sum(scores[x][k] for x in numer)/sum(scores[x][k] for x in denom) for k in scores[numer[0]]}
        panels[label]={'printed_ratio':obs,'pred':pred,'error':{k:error(v,obs)for k,v in pred.items()},
                       'signed_group_curve_180_ratio':sum(signed[x]['180'] for x in numer)/sum(signed[x]['180'] for x in denom)}
    indices=[pairs[x+'/LAW-'+x[-1]] for x in ['HAW-W','HAW-R']]
    ir={k:indices[0]['pred'][k]/indices[1]['pred'][k] for k in scores['HAW-W']}
    source_weight_interval=[min(i['pred']['heated'] for i in indices),max(i['pred']['heated'] for i in indices)]
    # Any common nonnegative processing multiplier reweights the denominator reference means.
    # Its weighted marginal ratio must remain inside this interval.
    return {'scores_relative_inputs':scores,'signed_arm_areas_pg_min_per_mL':signed,'area_reading_shift_pg_min_per_mL':unc,
            'pairs':pairs,'printed_marginals':panels,'interaction_high_low_whole_vs_refined':{
                'pred':ir,'signed_obs':{t:indices[0]['observed'][t]/indices[1]['observed'][t]for t in ['120','180']}},
            'heated_source_marginal_envelope_under_any_shared_positive_process_weight':source_weight_interval,
            'reported_180_reduction_disagreement':{'table':1-panels['source']['printed_ratio'],'prose':inputs['reported_prose_reduction']},
            'primary_120_mean_error_high_low':{k:sum(i['abs_log_error']['120'][k]for i in indices)/2 for k in ir},
            'sugar_and_RS_semantics':'Table 1 starch + sugars is the authors’ stated carbohydrate. Minus RS is a separate sensitivity only; no subtraction from already available carbohydrate.',
            'clipping':'Figure 2 shows concentrations of group means, not subject-positive areas. Marginal Table 3 author-positive three-hour IAUC, with a participant exclusion rule.'}
if __name__=='__main__':print(json.dumps(calculate(),indent=2,allow_nan=False))
