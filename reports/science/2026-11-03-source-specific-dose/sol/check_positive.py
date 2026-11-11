"""Cap-free finite-sample positive-AUC outer bounds; standard library only."""
import csv,json,math
from pathlib import Path
R=Path(__file__).resolve().parent.parent
rows=list(csv.DictReader((R/'astra/target-course.csv').open(encoding='utf-8-sig')))
h=6*1000/733
trap=lambda v:sum(15*(x+y) for x,y in zip(v,v[1:]))
areas={}
for arm in ['wheat_low','wheat_high','blend_low','blend_high']:
    v=[float(x['plasma_insulin_pmol_per_L_approx']) for x in rows if x['arm']==arm and int(x['minute'])<=120]
    # E[(X-B)+] >= (E[X]-E[B])+; all interpolated lower differences positive after0.
    differences=[0]+[x-v[0]-2*h for x in v[1:]]
    assert min(differences)>=0
    # Nonnegative individual X,B imply (X-B)+ <= X. t0 increment is exactly0.
    areas[arm]=[trap(differences),trap([0]+[x+h for x in v[1:]])]
l=[areas['blend_low'][0]/areas['wheat_low'][1],areas['blend_low'][1]/areas['wheat_low'][0]]
u=[areas['blend_high'][0]/areas['wheat_high'][1],areas['blend_high'][1]/areas['wheat_high'][0]]
did=[areas['blend_high'][0]-areas['wheat_high'][1]-areas['blend_low'][1]+areas['wheat_low'][0],areas['blend_high'][1]-areas['wheat_high'][0]-areas['blend_low'][0]+areas['wheat_low'][1]]
q=json.loads((R/'mixed/leucine.json').read_text())['predictions']['per_bolus_substitution']['ratios']
threshold=[math.sqrt(q['low_blend_over_wheat']),math.sqrt(q['high_blend_over_wheat'])]
out={'positive_area_bounds':areas,'low_formulation_ratio':l,'high_formulation_ratio':u,'ratio_of_ratios':[u[0]/l[1],u[1]/l[0]],'native_difference_in_differences_pmol_min_L':did,'tie_midpoints':threshold,'both_formulations_beat_tie_under_stress':l[0]>threshold[0] and u[0]>threshold[1],'assumptions':['Nonnegative individual insulin concentrations and baseline.','Piecewise linear interpolation between observed concentration samples.','Figure means allowed independent +/-6pixel errors, baseline included.','Finite-sample bounds only; neither population CI nor physiological cap imposed.']}
(R/'sol/POSITIVE_RECEIPT.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
