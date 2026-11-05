"""Formulation, dose, timing and native-scale transfer, kept as separate outcomes."""
import json
import math
from pathlib import Path

from clock import clock_panel, log_error, rows

HERE = Path(__file__).resolve().parent
WB = 0.7781175447184837


def scored(observed, predictions):
    return {'observed':observed, 'predictions':predictions,
            'absolute_log_errors':{k:log_error(v,observed) for k,v in predictions.items()}}


def matrix_panel(clock):
    q = clock['fitted_k_c']['empirical120'][1]
    w = (1 + 1.2/8.1)/2
    def score(test,reference,B_test,B_ref):
        return (B_test+w*q*test)/(B_ref+w*reference)
    mixed = {}
    for name,background,dose in [('Suklaew',27,40),('Zhang_A',24,50),('vanCan_lunch',30,25)]:
        obs=clock['studies'][name]['intervals']['0-120']['observed_ratio']
        mixed[name]=scored(obs,{'equal_grams_or_constituents':1,'whole_reference':q,
                        'carbohydrate_dilution':(background+q*dose)/(background+dose),
                        'combined':score(dose,dose,background,background)})
        mixed[name]['background_and_substitution']=[background,dose]
    tea={r['arm']:float(r['native_bar_uIU_min_mL']) for r in rows('tea_summary.csv')}
    vehicles={}
    for v,prose in [('water',.58),('tea',.58*(1-.377)/(1-.321))]:
        refs={'equal':1,'reference':q}
        vehicles[v]={'bar':scored(tea[v+'_isomaltulose']/tea[v+'_sucrose'],refs),
                     'prose_implied':scored(prose,refs)}
    refs={'equal_grams':1,'previous_constituents':37*w/(28+9*w),'whole_reference':q,
          'dilution_w1':37*q/(28+9),'combined':score(37,9,0,28)}
    return {'q':q,'w':w,'signed_mixed':mixed,'tea_native_bars_and_prose':vehicles,
            'Keller_acute_signed120':None,'Kahlhofer_companion_rounded_tAUC':scored(.72,refs),
            'Suklaew_native_240':scored(4412.06/7367.70,{'equal':1,'unadjusted_q120':q}),
            'Keesing_published_iAUC_window_unspecified':scored(609/2492,{'equal':1,'unadjusted_q120':q})}


def graded_panel(clock):
    q=clock['fitted_k_c']['empirical120'][1]
    c=clock['fitted_k_c']['amplitude'][1]
    donor=clock['studies']['Holub']['intervals']
    tab=rows('window_summary.csv')
    def label(row):
        return row['cohort']+'_'+row['dose_g']
    def get_panel(minutes):
        return {label(r):r for r in tab if int(r['minute'])==minutes}
    def adjusted(row):
        return 1-float(row['author_relative_reduction_percent'])/100
    def levels(row):
        return {short:float(row['approx_'+short+'_net_group_curve_uIU_min_mL']) for short in ['OM','MD']}
    two=get_panel(120)
    q33=adjusted(two['PwO_33'])
    qhv=adjusted(two['HV_50'])
    compar={'equal_grams':1,'class_q':q,'class_amplitude':c}
    adjusted_scores={}
    for key,row in two.items():
        refs=dict(compar)
        if key!='PwO_33' and 'BMI' not in key:
            refs['PwO33_calibration']=q33
        if key!='HV_50':
            refs['HV50_calibration']=qhv
        adjusted_scores[key]=scored(adjusted(row),refs)
    time_scores={}
    for end in [60,120,180]:
        data=get_panel(end); r_donor=donor['0-'+str(end)]['observed_ratio']
        time_scores[str(end)]={}
        for key,row in data.items():
            prediction={'equality':1,'Holub_signed_same_window':r_donor}
            if end==180:
                prediction['Holub_author_window_unspecified']=15208/23347
            time_scores[str(end)][key]=scored(adjusted(row),prediction)
    strata_changes={}
    for end in [60,120,180]:
        d=get_panel(end)
        strata_changes[str(end)]={}
        multiplier={}
        strata=['PwO BMI 25-29.9','PwO BMI >=30']
        for cohort in strata+['PwO']:
            low,high=adjusted(d[cohort+'_33']),adjusted(d[cohort+'_50'])
            multiplier[cohort]=high/low
            strata_changes[str(end)][cohort]={'low':low,'high':high,'contrast_change':high/low}
        for cohort,other in zip(strata,reversed(strata)):
            low=adjusted(d[cohort+'_33']);high=adjusted(d[cohort+'_50'])
            strata_changes[str(end)][cohort]['post_hoc_change_transfer']=scored(high,
                        {'own_low_ratio':low,'other_stratum_dose_change':low*multiplier[other]})
    targets={key:levels(two[key]) for key in ['HV_50','PwO_33','PwO_50','T2D_50']}
    lo,hi=targets['PwO_33'],targets['PwO_50']
    within={}
    for arm in ['OM','MD']:
        predictions={m:(50/33)**e for m,e in [('no_change',0),('WB',WB),('linear',1)]}
        ratio=hi[arm]/lo[arm]
        within[arm]={'portion':scored(ratio,predictions),
            'low_arm_calibrated_area':scored(hi[arm],{m:lo[arm]*v for m,v in predictions.items()}),
            'absolute_difference':hi[arm]-lo[arm]}
    calibrated={}
    for name,factor in [('linear',50/33),('WB',(50/33)**WB)]:
        calibrated[name]={}
        for arm in ['OM','MD']:
            # Different estimator paths. A matched signed reference exactly recovers the low OM area.
            for_model={'equal':1,'class_q':q,'class_amplitude':c,'PwO33_adjusted_ratio':q33,
                       'PwO33_matched_signed_ratio':lo['OM']/lo['MD'],'HV50_adjusted_ratio':qhv}
            pred={m:lo['MD']*factor*(v if arm=='OM' else 1) for m,v in for_model.items()}
            calibrated[name][arm]=scored(hi[arm],pred)
    # Additional exposed diagnostic: transfer actual HV levels vs ratio across distinct cohorts.
    external={}
    for name,grams in [('PwO_33',33),('PwO_50',50),('T2D_50',50)]:
        external[name]={}
        for arm in ['OM','MD']:
            pred={m:targets['HV_50'][arm]*(grams/50)**e for m,e in [('flat',0),('linear',1),('WB',WB)]}
            external[name][arm]=scored(targets[name][arm],pred)
        external[name]['signed_ratio']=scored(targets[name]['OM']/targets[name]['MD'],
                                               {'HV50_signed_ratio':targets['HV_50']['OM']/targets['HV_50']['MD']})
    indices={'HV_50':(44,14),'PwO_33':(44,16),'PwO_50':(50,24),'T2D_50':(63,44)}
    return {'author_adjusted120':adjusted_scores,'time_matched_class':time_scores,'strata':strata_changes,
            'individual_index_mean_SD_percent':indices,'index33_to_50':scored(.50,{'index33':.44,'equality':1}),
            'signed_areas_120':targets,'same_arm_measured_33_to_50':within,'MD33_calibrated_50g_levels':calibrated,
            'exposed_HV50_native_transfer':external}


def build():
    clocks=clock_panel()
    return {'clock':clocks,'recipe':matrix_panel(clocks),'polymer':graded_panel(clocks)}


if __name__=='__main__':
    (HERE/'results.json').write_text(json.dumps(build(),indent=2,allow_nan=False)+'\n',encoding='utf8')
