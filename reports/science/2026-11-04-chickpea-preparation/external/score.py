"""Held preparation comparison. True chickpea share of served starch is unavailable."""
from pathlib import Path
import csv,json,math
D=Path(__file__).resolve().parent
def score():
    pilot=json.loads((D.parent/'pilot/results.json').read_text())
    q={'measured_porridge_response':pilot['positive_target_ratios'][0],
       'measured_porridge_H20':pilot['models']['local_H20']['C_B'],
       'hummus_reference':pilot['hummus_signed120_process_ratio'],'zero_limit':0}
    starch=39.7/41.8
    models={'same_bake_equal':1,'measured_total_starch':starch}
    for k,v in q.items():
        models['same_starch_nominal30_'+k]=.7+.3*v
        models['measured_total_nominal30_'+k]=starch*(.7+.3*v)
    with (D.parent/'astra/kanata-aggregate.csv').open() as f:
        inp={(r['arm'],r['measure'],int(r['minutes'])):float(r['value']) for r in csv.DictReader(f)}
    out={}
    for m,t in [('derived_signed_net_AUC_uU_min_mL',120),('author_positive_iAUC_uU_min_mL',180)]:
        obs=inp['CLP',m,t]/inp['CFM',m,t]
        out[str(t)]={'operator':m,'n':15,'areas_CFM_CLP':[inp[x,m,t] for x in ['CFM','CLP']],
            'ratio_CLP_CFM':obs,'abs_log_error':{k:abs(math.log(v/obs)) for k,v in models.items()}}
    # The area is a linear combination of mean concentrations when the original arm baseline is subtracted.
    # Simultaneous +/-2 native-pixel movement of each marker including baseline; independent by marker.
    bound=2*(120-15)*2*70/212
    f,c=out['120']['areas_CFM_CLP']
    out['120']['graph_read_range']=[(c-bound)/(f+bound),(c+bound)/(f-bound)]
    # Bar height ratios do not require an absolute vertical-unit conversion. +/-2 px for each top.
    out['180']['graph_read_range']=[(266.5-74-2)/(266.5-78+2),(266.5-74+2)/(266.5-78-2)]
    return {'forecasts':models,'sourced_starch_grams':{'CFM':41.8,'CLP':39.7},'assumed_share':.3,'unknown_actual_share':True,
            'own_bread_H20_coverage':0,'outcomes':out}
if __name__=='__main__':print(json.dumps(score(),indent=2,allow_nan=False))
