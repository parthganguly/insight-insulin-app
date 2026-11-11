"""Restriction on a common monotone fibre-density adjustment under a power dose model.

The baking and portion observations were exposed when this diagnostic was proposed.
No coefficient is estimated and no population interval is constructed.
"""
import json
import math
from itertools import product
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def main():
    facts = json.loads((ROOT / 'source_facts.json').read_text(encoding='utf8'))
    cookie = facts['cookie']
    bar = facts['potato']
    def pair(s, target):
        d = s['available']
        y = s['insulin_mean']
        f = s['fibre']
        return {'D_ratio': d[target] / d[0], 'Y_ratio': y[target] / y[0],
                'x0': f[0]/d[0], 'x1': f[target]/d[target]}
    c = pair(cookie, 1)
    comparisons = {}
    for idx, label in [(1, 'medium'), (2, 'high')]:
        p = pair(bar, idx)
        assert c['x0'] < p['x0'] < p['x1'] < c['x1']
        # g(cookie test)/g(cookie control) <= g(bar test)/g(bar control).
        log_d = math.log(c['D_ratio'] / p['D_ratio'])
        assert log_d < 0  # division reverses the inequality
        upper = math.log(c['Y_ratio'] / p['Y_ratio']) / log_d
        comparisons[label] = {'target':p, 'upper_exponent':upper, 'upper_for_doubling':2**upper}
    limit = min(entry['upper_exponent'] for entry in comparisons.values())
    rows = json.loads((ROOT/'wb_portions.json').read_text(encoding='utf8'))['rows']
    foods = sorted({r['food'] for r in rows})
    portions = {}
    for lo, hi in [(25, 50), (50, 100)]:
        portion_rows = {}
        for food in foods:
            points = {r['C']:r['mean'] for r in rows if r['food']==food}
            observed = points[hi]/points[lo]
            portion_rows[food] = {'observed_ratio':observed,
                  'sample_log_slope':math.log(observed)/math.log(hi/lo),
                  'exceeds_cap':observed > (hi/lo)**limit}
        portions[f'{lo}_to_{hi}'] = portion_rows
    # The high-bar inequality alone suffices for a conservative bound under printed precision.
    central = (cookie['insulin_mean'][1],cookie['insulin_mean'][0],
               bar['insulin_mean'][2],bar['insulin_mean'][0],
               cookie['available'][1],cookie['available'][0],
               bar['available'][2],bar['available'][0])
    half_steps = (.5,.5,.05,.05,.005,.005,.005,.005)
    corners = []
    for signs in product((-1,1), repeat=len(central)):
        yc, cc, yb, cb, dc, kc, db, kb = [v+t*h for v,t,h in zip(central,signs,half_steps)]
        corners.append(math.log((yc/cc)/(yb/cb))/math.log((dc/kc)/(db/kb)))
    upper = max(corners)
    # Check nesting itself throughout label rounding. Within a food density rises with F and falls with D.
    arm_list=[(cookie,0),(bar,0),(bar,1),(bar,2),(cookie,1)]
    densities=[((trial['fibre'][i]-.005)/(trial['available'][i]+.005),
                (trial['fibre'][i]+.005)/(trial['available'][i]-.005)) for trial,i in arm_list]
    assert all(left[1]<right[0] for left,right in zip(densities,densities[1:]))
    for span, comparisons_by_food in portions.items():
        lo,hi=(int(k) for k in span.split('_to_'))
        for food,row in comparisons_by_food.items():
            means={r['C']:r['mean'] for r in rows if r['food']==food}
            row['lower_ratio_from_printed_precision']=(means[hi]-.05)/(means[lo]+.05)
            row['above_conservative_rounding_cap']=row['lower_ratio_from_printed_precision']>2**upper
    return {'high_bar_rounding_corners':len(corners),'upper_exponent_after_rounding':upper,
            'conservative_doubling_cap_after_rounding':2**upper,'density_intervals_after_rounding':densities,'cookie':c,'nested_contrasts':comparisons,'necessary_exponent_ceiling':limit,
            'upper_for_doubling':2**limit,'within_recipe':portions}

if __name__ == '__main__':
    print(json.dumps(main(), indent=2))
