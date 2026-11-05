"""Graph-reading box sensitivity (AMENDMENT_B). Reads frozen PREDICTIONS.json + outcomes.json; no fitting.

python -I -X utf8 bounds.py           write BOUNDS.json
python -I -X utf8 bounds.py --check   recompute and compare
"""
from pathlib import Path
import itertools, json, math, sys

ROOT = Path(__file__).resolve().parent
FOOD = ['no_change', 'energy', 'lan_mass', 'lan_aa_sum', 'lan_leucine_whey_eq']


def load(n): return json.loads((ROOT / n).read_text(encoding='utf-8'))


def over_box(f, centres, h):
    """Range of f over the independent +/-h box (corners; f monotone in each reading)."""
    keys = list(centres)
    vals = [f({k: centres[k] + s * h for k, s in zip(keys, signs)}) for signs in itertools.product([-1, 1], repeat=len(keys))]
    return [min(vals), max(vals)]


def abs_range(signed):  # |x| over an interval of signed values
    lo, hi = signed
    return [0.0 if lo <= 0 <= hi else min(abs(lo), abs(hi)), max(abs(lo), abs(hi))]


def run():
    pred = load('PREDICTIONS.json'); fc = pred['forecasts'][pred['primary_basis']]['ratio_vs_drink1']
    out = {}
    for ep, cell in load('outcomes.json')['endpoints'].items():
        R, h = cell['means'], cell['reading_half_width']
        A = {}
        for r in FOOD:
            per = {d: abs_range(over_box(lambda x, d=d: math.log(fc[r][d]) - math.log(x[d] / x['1']), {d: R[d], '1': R['1']}, h))
                   for d in fc[r]}
            A[r] = dict(per_drink_abs_log_error_range=per)
        # Panel A mean error range over the full 10-reading box is not separable; report the conservative sum of per-drink extremes
        for r in FOOD:
            per = A[r]['per_drink_abs_log_error_range']
            A[r]['mean_9_conservative_range'] = [sum(v[0] for v in per.values()) / 9, sum(v[1] for v in per.values()) / 9]
        sub = {k: R[k] for k in ['3', '7', '10']}
        C = dict(
            linear_minus_observed_ln=over_box(lambda x: math.log(0.5 * x['3'] + 0.5 * x['7']) - math.log(x['10']), sub, h),
            log_minus_observed_ln=over_box(lambda x: 0.5 * math.log(x['3']) + 0.5 * math.log(x['7']) - math.log(x['10']), sub, h),
            drink10_minus_min_parent=over_box(lambda x: x['10'] - min(x['3'], x['7']), sub, h))
        C['drink10_below_both_parents_throughout_box'] = C['drink10_minus_min_parent'][1] < 0
        C['observed_below_linear_blend_throughout_box'] = C['linear_minus_observed_ln'][0] > 0
        B = {}
        for d in ['5', '6', '8']:
            for r, p in [('tie', 1.0), ('lan_leucine_whey_eq', fc['lan_leucine_whey_eq'][d] / fc['lan_leucine_whey_eq']['7']),
                         ('substitution_slope', fc['substitution_slope_vs_drink7'][d])]:
                B.setdefault(f'{d}/7', {})[r] = abs_range(over_box(lambda x, p=p, d=d: math.log(p) - math.log(x[d] / x['7']), {d: R[d], '7': R['7']}, h))
        out[ep] = dict(reading_half_width=h, A=A, B=B, C_blend=C)
    return dict(status='Graph-reading box only (independent +/-h per bar); not sampling uncertainty', endpoints=out)


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    r = json.loads(json.dumps(run()))
    if '--check' in sys.argv:
        assert same(r, load('BOUNDS.json')); print('PASS check'); sys.exit()
    (ROOT / 'BOUNDS.json').write_text(json.dumps(r, indent=2) + '\n', encoding='utf-8', newline='\n')
    for ep, v in r['endpoints'].items():
        print(ep, json.dumps(v['C_blend']))
        print('  A mean ranges', {k: [round(x, 3) for x in a['mean_9_conservative_range']] for k, a in v['A'].items()})
        print('  B', {k: {m: [round(x, 3) for x in y] for m, y in w.items()} for k, w in v['B'].items()})
