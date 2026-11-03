"""Collier (doi 10.1007/BF00252263) reconciled v2. Two DISTINCT panels, never pooled:
  (A) printed p52 reported incremental areas (window not stated; 4 h sampled)  -> targets_collier.json (v1, unchanged)
  (B) approximate group signed 0-120 areas from p51 Fig 1 (Astra reading)      -> targets_collier_approx.json
Frozen ../model/evaluate.py scores both; this script adds reading-range errors, paired-SE extrema over rho in [-1,1],
fat additivity vs log-shape description. Standard library only.

python -I -X utf8 collier_v2.py           write COLLIER_V2.json
python -I -X utf8 collier_v2.py --check
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
PRINTED = {'potato': (3333, 590), 'potato_butter': (3024, 452), 'lentil': (1796, 333), 'lentil_butter': (1324, 256)}  # mean, SEM, mU/L*min
APPROX = {'no_fat': dict(lentil=1726, potato=3183, reading_range=(0.395, 0.725)),
          'butter': dict(lentil=1075, potato=2632, reading_range=(0.248, 0.616))}
FAT_WORDING = 'Coordinator facts: meals with "no fat" or "+37.5 g as butter"; whether 37.5 g is fat or butter mass is kept as worded, not converted.'


def forecasts():
    F = json.loads((ROOT.parent / 'model' / 'FORECASTS.json').read_text(encoding='utf-8'))
    return {k: v for k, v in F['forecasts_by_starch_and_f']['potato_f1.0'].items() if v}, F['f1_thresholds']['potato']['fixed_vs_scaled_geometric_midpoint']


def err_range(p, lo, hi):
    pts = [lo, hi] + ([p] if lo < p < hi else [])
    v = [abs(math.log(p / o)) for o in pts]
    return [min(v), max(v)]


def run():
    P, mid = forecasts(); out = {}
    for name, (l, c) in {'no_fat': ('lentil', 'potato'), 'butter': ('lentil_butter', 'potato_butter')}.items():
        (ml, sl), (mc, sc) = PRINTED[l], PRINTED[c]
        ca, cb = sl / ml, sc / mc
        obs_p = ml / mc
        a = APPROX[name]; obs_a = a['lentil'] / a['potato']; lo, hi = a['reading_range']
        out[name] = dict(
            printed_panel=dict(observed=obs_p, paired_se_log_range={'rho_plus1': abs(ca - cb), 'rho_0': math.hypot(ca, cb), 'rho_minus1': ca + cb},
                               errors={k: abs(math.log(v / obs_p)) for k, v in P.items()}, scaled_closer_than_fixed=obs_p < mid),
            approx_group_panel=dict(observed=obs_a, reading_range=[lo, hi],
                                    errors={k: abs(math.log(v / obs_a)) for k, v in P.items()},
                                    error_range_over_reading={k: err_range(v, lo, hi) for k, v in P.items()},
                                    inside_reading_range={k: lo <= v <= hi for k, v in P.items()},
                                    scaled_closer_than_fixed=obs_a < mid, fixed_scaled_midpoint_inside_reading_range=lo <= mid <= hi))
    pr = PRINTED; ap = APPROX
    out['fat_shape'] = dict(
        printed=dict(potato_abs_change=pr['potato_butter'][0] - pr['potato'][0], lentil_abs_change=pr['lentil_butter'][0] - pr['lentil'][0],
                     potato_log_change=math.log(pr['potato_butter'][0] / pr['potato'][0]), lentil_log_change=math.log(pr['lentil_butter'][0] / pr['lentil'][0])),
        approx=dict(potato_abs_change=ap['butter']['potato'] - ap['no_fat']['potato'], lentil_abs_change=ap['butter']['lentil'] - ap['no_fat']['lentil'],
                    potato_log_change=math.log(ap['butter']['potato'] / ap['no_fat']['potato']), lentil_log_change=math.log(ap['butter']['lentil'] / ap['no_fat']['lentil'])),
        note='A common additive fat effect would give equal absolute changes; a common multiplicative effect equal log changes. Neither holds at the '
             'point estimates in either panel; paired uncertainty of these differences is unavailable, so no shape is established.')
    out['fat_wording'] = FAT_WORDING
    out['scope'] = ('Panel A is the printed longer experiment (window unstated) and is not reclassified. Panel B is an approximate group-mean-curve '
                    'signed 0-120 reading (Astra), distinct operator from the donor GM of participant iAUC. n = 7; IV arms excluded; lentil colour unspecified.')
    return out


if __name__ == '__main__':
    r = json.loads(json.dumps(run(), allow_nan=False)); p = ROOT / 'COLLIER_V2.json'
    if '--check' in sys.argv:
        sys.path.insert(0, str(ROOT.parents[1]))
        from reproduce import same
        same(r, json.loads(p.read_text(encoding='utf-8')))
        print('PASS check')
        sys.exit()
    p.write_text(json.dumps(r, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    for k in ('no_fat', 'butter'):
        a, b = r[k]['printed_panel'], r[k]['approx_group_panel']
        print(k, 'printed', round(a['observed'], 4), {x: round(y, 3) for x, y in a['paired_se_log_range'].items()})
        print('   approx', round(b['observed'], 4), 'mid inside', b['fixed_scaled_midpoint_inside_reading_range'], {x: round(y, 3) for x, y in b['errors'].items()})
        print('   inside', b['inside_reading_range'])
    print(json.dumps(r['fat_shape'], indent=1))
