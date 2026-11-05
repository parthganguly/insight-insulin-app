"""Forecast substitution contrasts and native group-mean levels on each protocol."""
import csv
import json
import math
from pathlib import Path

from sample import contrasts, extract, sample, trapezoids

ROOT = Path(__file__).resolve().parent
ARMS = {'T':'trehalose','G':'glucose','I':'isomaltulose','S':'sucrose'}
OLD = {'T/G':590/1709, 'I/S':0.654771347866157}
WT = (1+1.2/8.1)/2
EXPONENT = 0.7781175447184837
TABLE = {'fast':dict(T=9425,G=15216,I=5779,S=7326),
         'lunch':dict(T=17934,G=20875,I=11726,S=17658)}


def ratios(arm):
    return {'T/G':arm['T']/arm['G'],'I/S':arm['I']/arm['S']}


def d(pair):
    return pair['T/G']/pair['I/S']


def common(q):
    return {'T/G':q, 'I/S':q}


def err(pred,obs):
    return abs(math.log(pred/obs))


def score(obs,models):
    out={}
    for name,pr in models.items():
        errors={k:err(pr[k],obs[k]) for k in obs}
        out[name]={'predicted_ratios':pr,'errors':errors,'mean_absolute_log_error':sum(errors.values())/2,
                   'predicted_D':d(pr),'absolute_log_error_D':err(d(pr),d(obs))}
    return out


def donor():
    with (ROOT/'matched/areas.csv').open(newline='') as f:
        data=list(csv.DictReader(f))
    out={}
    for row in data:
        period={'fasting':'fast','lunch':'lunch'}[row['period']]
        key=(period,row['operator'],int(row['end_min']))
        arm=next(short for short,long in ARMS.items() if long==row['arm'])
        out.setdefault(key,{})[arm]=float(row['area_nominal_uU_min_per_mL'])
    return out


def native_metrics(truth,forecast):
    return {'forecast':forecast,'signed_error':{k:v-truth[k] for k,v in forecast.items()},
            'MAE':sum(abs(v-truth[k]) for k,v in forecast.items())/len(forecast),
            'mean_absolute_log_error':sum(err(v,truth[k]) for k,v in forecast.items())/len(forecast)}


def compare(period,truth,matched,matched_fast):
    obs=ratios(truth)
    ds=ratios(matched)
    models={'equal_grams':common(1),'common_polymer':common(.42),'common_scalar':common(.520757979630314),
            'common_Holub':common(OLD['I/S']),'lower_dose_separate':OLD,
            'lower_dose_common':common(math.sqrt(math.prod(OLD.values()))),'matched_separate':ds,
            'matched_common':common(math.sqrt(math.prod(ds.values()))),'fast_donor_both_periods':ratios(matched_fast)}
    results=score(obs,models)
    levels={'matched_same_protocol':native_metrics(truth,matched),
            'matched_fast_only':native_metrics(truth,matched_fast)}
    # Preserve both donor controls in the common and equal-grams native predictions.
    for label in ['matched_common','equal_grams','lower_dose_separate','matched_separate']:
        pr=models[label]
        levels[label+'_donor_controls']=native_metrics(truth,dict(
            G=matched['G'],S=matched['S'],T=matched['G']*pr['T/G'],I=matched['S']*pr['I/S']))
        levels[label+'_measured_target_controls']=native_metrics(truth,{
            'T':truth['G']*pr['T/G'],'I':truth['S']*pr['I/S']})
    direct={'equality':1,'constituents':1/WT,'constituents_and_lower_dose_ratios':d(OLD)/WT,
            'matched_control_ratio_only':matched['G']/matched['S'],'matched_product_levels':matched['T']/matched['I']}
    observed_direct=truth['T']/truth['I']
    return {'observed':truth,'ratios':obs,'D':d(obs),'models':results,'native':levels,
            'exposed_direct_T_I':{'observed':observed_direct,'control_G_S':truth['G']/truth['S'],
            'predictions':direct,'absolute_log_errors':{k:err(v,observed_direct) for k,v in direct.items()},
            'matched_vs_control_only_midpoint':math.sqrt(direct['matched_control_ratio_only']*direct['matched_product_levels'])}}


def compute():
    subjects=sample()
    source=donor()
    panels={}
    signed_bounds=contrasts(subjects)
    for period in subjects:
        panels[period]={}
        for end in [60,120,180]:
            truth={k:subjects[period][k]['area'][str(end)]['signed'] for k in ARMS}
            fac=source[(period,'signed_nominal',end)]
            panels[period]['signed'+str(end)]=compare(period,truth,fac,source[('fast','signed_nominal',end)])
        panels[period]['reported180']=compare(period,TABLE[period],source[(period,'source_table_3h',180)],
                                               source[('fast','source_table_3h',180)])
    fast120=panels['fast']['signed120']['observed']
    low_levels={}
    for conv in [6.0,6.945]:
        # These are conditional bridges from different operators, assays and protocols.
        base={'G':1709,'T':590,'I':15200.069619572363/conv,'S':23214.31698119973/conv}
        for name,b in [('flat',0),('linear',1),('prior_sublinear',EXPONENT)]:
            forecast={k:v*(75/(25 if k in ('G','T') else 50))**b for k,v in base.items()}
            low_levels[f'{conv}_{name}']=native_metrics(fast120,forecast)
    changes={}
    for endpoint in ['signed60','signed120','signed180','reported180']:
        a,b=panels['fast'][endpoint],panels['lunch'][endpoint]
        change=b['D']/a['D']
        pred=b['models']['matched_separate']['predicted_D']/a['models']['matched_separate']['predicted_D']
        changes[endpoint]={'observed_lunch_D_over_fast_D':change, 'matched':pred,
                           'matched_log_error':err(pred,change),'no_change_log_error':err(1,change)}
    checks={}
    for period,arms in subjects.items():
        check={}
        for key in arms['G']['area']['120']['positive_bounds']:
            intervals={a:arms[a]['area']['120']['positive_bounds'][key] for a in ARMS}
            check[key]={'T/I':[intervals['T'][0]/intervals['I'][1],intervals['T'][1]/intervals['I'][0]],
                        'T/G':[intervals['T'][0]/intervals['G'][1],intervals['T'][1]/intervals['G'][0]],
                        'I/S':[intervals['I'][0]/intervals['S'][1],intervals['I'][1]/intervals['S'][0]]}
        checks[period]=check
    clock={}
    for period,arm,scale,mu,se in extract(json.loads((ROOT/'figure.json').read_text())):
        delta=[x-mu[0] for x in mu]
        for convention,first in [('carry',0),('interpolate_from_minus5',delta[1]/7)]:
            y=[first]+delta[1:5]
            clock.setdefault(period,{}).setdefault(convention,{})[arm]=trapezoids([0,30,60,90,120],y)
    return {'study':panels,'positive_bounds_D':signed_bounds,'positive_bounds_pairs120':checks,
            'nominal_conditional_native_fast120_from_25_50g':low_levels,'between_protocol_change':changes,
            'clock_sensitivity':clock,'fixed_midpoint':math.sqrt(d(OLD))}


if __name__=='__main__':
    print(json.dumps(compute(),indent=2,allow_nan=False))
