"""Post-outcome check of the two wheat arms for which the authors report 40 g carbohydrate."""
import json
from wheat import calculate
from positive import run as bounds
from model import read,error

def run():
    a,b='HAW-R','LAW-W';w=calculate();s=w['scores_relative_inputs']
    raw=read('wheat_inputs.json')['arms']
    pos=bounds()['arms']
    predictions={k:s[a][k]/s[b][k] for k in s[a]}
    observed={e:w['signed_arm_areas_pg_min_per_mL'][a][e]/w['signed_arm_areas_pg_min_per_mL'][b][e] for e in ('120','180')}
    return {'arms':[a,b],'signed_ratios':observed,'predictions':predictions,
            'paper_carbohydrate_g_rounded':[40,40],
            'paper_carbohydrate_g_from_composition':[(raw[k]['Starch']+raw[k]['Sugars'])*1.21 for k in [a,b]],
            'positive_outer_reading':[pos[a]['with_marker_reading'][0]/pos[b]['with_marker_reading'][1],pos[a]['with_marker_reading'][1]/pos[b]['with_marker_reading'][0]],
            'errors_signed120':{k:error(v,observed['120']) for k,v in predictions.items()},
            'scope':'Outcome-exposed diagonal contrast changes both wheat and milling. Corresponding three-hour individual cell means not reported.'}
if __name__=='__main__':print(json.dumps(run(),indent=2))
