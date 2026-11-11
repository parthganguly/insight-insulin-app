"""Post-result absolute-scale transport from hummus. No target-cohort insulin used in forecasts."""
from pathlib import Path
import csv,json,math,statistics
D=Path(__file__).resolve().parent
def calc():
    p=json.loads((D/'results.json').read_text());m=json.loads((D/'aggregate.json').read_text())['windows']['120']['positive']['arms']
    y=[m[k]['mean'] for k in ('Broken','Intact-S','Intact-C')]
    with (D.parent/'astra/aggregate.csv').open() as f:
        a=next(float(r['value']) for r in csv.DictReader(f) if (r['study'],r['arm'],r['measure'],r['minutes'])==('Alshaalan2024','RCC','net_AUC_uU_min_mL','120'))
    result={}
    for name,scale in [('unchanged_donor',a),('starch_scaled_donor',a*29.5/26.8)]:
        rows={}
        for k in ('same_starch','hummus_process','local_H20','S_anchor_H20','external_beta_H20'):
            v=p['models'][k];pred=[scale,scale*v['S_B'],scale*v['C_B']]
            rows[k]={'pred_B_S_C':pred,'native_MAE':statistics.mean(abs(x-z) for x,z in zip(pred,y)),
                      'mean_abs_log_level_error':statistics.mean(abs(math.log(x/z)) for x,z in zip(pred,y))}
        result[name]=rows
    return {'actual_B_S_C':y,'donor_signed_hummus_area_Rcc':a,'forecasts':result}
if __name__=='__main__':print(json.dumps(calc(),indent=2))
