"""Same-source intact/hydrolysate dose-shape bridge (SPEC.md v1). Standard library only.

python -I -X utf8 bridge.py           read readings.json, write RESULTS.json
python -I -X utf8 bridge.py --check   recompute and compare with RESULTS.json
"""
from pathlib import Path
import itertools, json, math, sys

ROOT = Path(__file__).resolve().parent
S, F, DOSES = ['soy', 'whey'], ['intact', 'hydro'], ['0.3', '0.4', '0.6']
RULES = ['bridge_same_source', 'no_change', 'proportional_dose', 'no_form_adjustment', 'bridge_cross_source']
OTHER_F = {'intact': 'hydro', 'hydro': 'intact'}
OTHER_S = {'soy': 'whey', 'whey': 'soy'}


def predict(R, s, f, d, d0):
    fo, so = OTHER_F[f], OTHER_S[s]
    return {'bridge_same_source': R[s][f][d0] * R[s][fo][d] / R[s][fo][d0],
            'no_change': R[s][f][d0],
            'proportional_dose': R[s][f][d0] * float(d) / float(d0),
            'no_form_adjustment': R[s][fo][d],
            'bridge_cross_source': R[s][f][d0] * R[so][f][d] / R[so][f][d0]}


def cells(d0):
    return [(s, f, d) for s in S for f in F for d in DOSES if d != d0]


def o1(R, d0):
    """Per-cell errors and means; None where any required bar is <= 0."""
    err = {}
    for s, f, d in cells(d0):
        need = [R[s][f][d], R[s][f][d0], R[s][OTHER_F[f]][d], R[s][OTHER_F[f]][d0], R[OTHER_S[s]][f][d], R[OTHER_S[s]][f][d0]]
        if min(need) <= 0:
            err[f'{s}_{f}_{d}'] = None; continue
        p = predict(R, s, f, d, d0)
        err[f'{s}_{f}_{d}'] = {r: abs(math.log(p[r] / R[s][f][d])) for r in RULES}
    ok = {k: v for k, v in err.items() if v is not None}
    mean = {r: sum(v[r] for v in ok.values()) / len(ok) for r in RULES} if ok else None
    by_source = {s: {r: sum(v[r] for k, v in ok.items() if k.startswith(s)) / sum(1 for k in ok if k.startswith(s)) for r in RULES} for s in S}
    return err, mean, by_source


def o2(R, d0):
    out = {}
    for s in S:
        for d in [x for x in DOSES if x != d0]:
            obs = R[s]['intact'][d] / R[s]['hydro'][d]
            pr = {'bridge_same_source': R[s]['intact'][d0] / R[s]['hydro'][d0], 'proportional_dose': R[s]['intact'][d0] / R[s]['hydro'][d0],
                  'no_change': R[s]['intact'][d0] / R[s]['hydro'][d], 'no_form_adjustment': 1.0}
            out[f'{s}_{d}'] = dict(observed=obs, predicted=pr, abs_log_error={k: abs(math.log(v / obs)) for k, v in pr.items()})
    return out


def scenario_ranges(R, h, d0):
    keys = [(s, f, d) for s in S for f in F for d in DOSES]
    lo = {k: math.inf for k in RULES + [f'bridge_minus_{r}' for r in RULES[1:]]}; hi = {k: -math.inf for k in lo}
    for shifts in itertools.product((-h, 0.0, h), repeat=len(keys)):
        Q = {s: {f: {} for f in F} for s in S}
        for (s, f, d), x in zip(keys, shifts): Q[s][f][d] = R[s][f][d] + x
        _, m, _ = o1(Q, d0)
        if m is None: continue
        vals = dict(m, **{f'bridge_minus_{r}': m['bridge_same_source'] - m[r] for r in RULES[1:]})
        for k, v in vals.items(): lo[k] = min(lo[k], v); hi[k] = max(hi[k], v)
    return {k: [lo[k], hi[k]] for k in lo}


def run():
    rd = json.loads((ROOT / 'readings.json').read_text(encoding='utf-8'))
    R, h = rd['total_insulin_AUC'], rd['reading_half_width']
    out = {}
    for name, d0 in [('primary_calibrate_0.3', '0.3'), ('S1_calibrate_0.6', '0.6')]:
        err, mean, by_s = o1(R, d0)
        out[name] = dict(O1_cell_errors=err, O1_mean=mean, O1_by_source=by_s, O2_form_contrast=o2(R, d0),
                         reading_scenario_ranges=scenario_ranges(R, h, d0) if rd.get('run_scenarios', True) else None)
    shape = {s: {f: {d: R[s][f][d] / R[s][f]['0.3'] for d in DOSES} for f in F} for s in S}
    return dict(status='Exposed development test (abstract-level directions known); no fitting; graph-reading ranges only, no paired CI',
                units=rd['units'], readings=R, reading_half_width=h, observed_dose_shape_vs_0p3=shape, results=out)


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    r = json.loads(json.dumps(run()))
    if '--check' in sys.argv:
        assert same(r, json.loads((ROOT / 'RESULTS.json').read_text(encoding='utf-8'))); print('PASS check'); sys.exit()
    (ROOT / 'RESULTS.json').write_text(json.dumps(r, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(r['observed_dose_shape_vs_0p3'], indent=0))
    for k, v in r['results'].items():
        print(k, {x: round(y, 4) for x, y in v['O1_mean'].items()}, {s: {x: round(y, 4) for x, y in w.items()} for s, w in v['O1_by_source'].items()})
        print('  ranges', {x: [round(y, 4) for y in z] for x, z in v['reading_scenario_ranges'].items()})
        print('  O2', {x: {m: round(e, 3) for m, e in w['abs_log_error'].items()} for x, w in v['O2_form_contrast'].items()})
