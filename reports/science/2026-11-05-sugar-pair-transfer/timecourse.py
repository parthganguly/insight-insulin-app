"""Secondary descriptive trajectory test. The evaluation windows were set in PLAN.md."""
import json
import math
from pathlib import Path
from sample import extract,trapezoids
from transfer import compute

ROOT=Path(__file__).resolve().parent


def fixed_oracle(obs):
    # For three values under L1 log loss, their middle log is optimal.
    logs=sorted(math.log(x) for x in obs)
    return {'ratio':math.exp(logs[1]),'min_MALE':(logs[-1]-logs[0])/3}


def evaluate(obs,pred):
    oracle=fixed_oracle(obs)
    loss=sum(abs(math.log(a/b)) for a,b in zip(pred,obs))/3
    return {'observed_D':obs,'matched_D':pred,'matched_MALE':loss,'best_constant':oracle,
            'improvement_over_best_constant':oracle['min_MALE']-loss,
            'same_donor_constant120_MALE':sum(abs(math.log(pred[1]/x)) for x in obs)/3,
            'common_one_MALE':sum(abs(math.log(x)) for x in obs)/3}


def shape_sensitivity(study,period):
    fig=json.loads((ROOT/'figure.json').read_text())
    cases={}
    for pixels in [0,0.5,1,2,3]:
        intervals={}
        for pr,arm,scale,mu,_ in extract(fig):
            if pr!=period:continue
            box=[]
            for window in [60,120,180]:
                ts=fig['times'][:fig['times'].index(window)+1]
                area=trapezoids(ts,[c-mu[0] for c in mu[:len(ts)]])
                # Each post-baseline ordinate and the common baseline may shift by epsilon.
                delta=2*pixels*scale*(window-15)
                box.append([area-delta,area+delta])
            intervals[arm]=box
        ds=[]
        for idx in range(3):
            a={arm:bounds[idx] for arm,bounds in intervals.items()}
            ds.append([a['T'][0]*a['S'][0]/(a['G'][1]*a['I'][1]),
                       a['T'][1]*a['S'][1]/(a['G'][0]*a['I'][0])])
        log_boxes=[[math.log(v) for v in bound] for bound in ds]
        donor=[study['signed'+str(end)]['models']['matched_separate']['predicted_D'] for end in [60,120,180]]
        worst=sum(max(abs(math.log(f)-x) for x in bounds) for f,bounds in zip(donor,log_boxes))/3
        oracle_lower=max(0,max(a for a,b in log_boxes)-min(b for a,b in log_boxes))/3
        cases[str(pixels)]={'signed_D_intervals':ds,'worst_matched_MALE_outer':worst,
                            'lower_best_constant_MALE_outer':oracle_lower,'certified_win_if_true':worst<oracle_lower,
                            'attainable_high':evaluate([pair[1] for pair in ds],donor),
                            'attainable_low':evaluate([pair[0] for pair in ds],donor)}
    return cases


def results():
    primary=compute()['study']
    out={}
    for period,study in primary.items():
        obs=[];pred=[]
        for end in [60,120,180]:
            panel=study['signed'+str(end)]
            obs.append(panel['D'])
            pred.append(panel['models']['matched_separate']['predicted_D'])
        out[period]=evaluate(obs,pred)
        out[period]['target_pixel_stress']=shape_sensitivity(study,period)
    return out
