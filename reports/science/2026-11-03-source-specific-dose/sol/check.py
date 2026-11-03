"""Portable independent Figure 2 reconstruction. Run: python check.py"""
import hashlib
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'raw' / 'independent_points.json'
d = json.loads(SOURCE.read_text())

def area(values, stop):
    t = d['time_min']
    n = t.index(stop)
    return sum((t[i+1]-t[i])*((values[i]-values[0])+(values[i+1]-values[0]))/2 for i in range(n))

result = {'input_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'method': 'signed baseline-subtracted trapezoid of approximate group means; no below-baseline segment occurs', 'units': 'pmol min/L', 'windows': {}, 'published_native': d['published_native'], 'limitations': ['Reading envelope is deterministic digitization sensitivity, not sampling uncertainty or a confidence interval.', 'No participant covariance, individual ratios, or individual AUC available.', '120-min group-curve endpoint and 180-min published endpoint are distinct.', 'Source figure 3 bars are not replaced by curve trapezoids. Native reported percentages are retained separately.', 'Dose variation also changes total protein/amino-acid exposure and energy; exercise state and carbohydrate rate differ from resting study.']}
for stop in (120,180):
    a = {k: area(v, stop) for k,v in d['insulin_pmol_L'].items()}
    e = 2*d['reading_error_pmol_L']*stop
    ref = a['control']
    result['windows'][str(stop)] = {k: {'auc':v,'ratio_of_group_auc':v/ref,'ratio_digitization_envelope':[(v-e)/(ref+e),(v+e)/(ref-e)]} for k,v in a.items()}
    result['windows'][str(stop)]['control']['ratio_digitization_envelope'] = [1.0, 1.0]
    result['windows'][str(stop)]['dose_comparisons']={family:{'high_low_ratio':a[family+'_high']/a[family+'_low'],'high_low_digitization_envelope':[(a[family+'_high']-e)/(a[family+'_low']+e),(a[family+'_high']+e)/(a[family+'_low']-e)]} for family in ('wheat','mixture')}
assert d['protocol']['bolus_times_min'] == [0,30,60,90,120,150]
assert all(len(v)==7 for v in d['insulin_pmol_L'].values())
(ROOT/'RECEIPT.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result['windows'],indent=2))
