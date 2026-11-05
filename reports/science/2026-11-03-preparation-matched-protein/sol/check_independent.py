"""Portable independent arithmetic; Python stdlib only. No source assets needed."""
import json
from pathlib import Path
rows=json.loads(Path(__file__).with_name('chapter3-extraction.json').read_text())
D={(r['cohort'],r['form'],r['dose_g_kg']):r['mean'] for r in rows}
results=[]
for c in ['soy','whey']:
 for target,other in [('intact','hydrolysate'),('hydrolysate','intact')]:
  anchor=D[c,target,.3]
  for dose in [.4,.6]:
   actual=D[c,target,dose]
   predictions={'flat':anchor,'proportional':anchor*dose/.3,'other_form_direct':D[c,other,dose], 'other_form_shape_low_dose_calibrated':anchor*D[c,other,dose]/D[c,other,.3]}
   for name,pred in predictions.items(): results.append(dict(cohort=c,target_form=target,dose_g_kg=dose,model=name,prediction=pred,observed=actual,error=pred-actual,absolute_error=abs(pred-actual)))
print(json.dumps(results,indent=2))
