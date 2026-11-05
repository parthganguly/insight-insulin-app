"""Frozen forecasts and generic evaluator for lentil-for-starch exchange targets (PLAN.md). Standard library only.

python -I -X utf8 evaluate.py forecast              write FORECASTS.json (donor + f grid; refuses overwrite)
python -I -X utf8 evaluate.py score TARGETS OUT     score a targets file (schema: targets_TEMPLATE.json)
python -I -X utf8 evaluate.py check TARGETS OUT     recompute FORECASTS.json and OUT and compare
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
DONOR = json.loads((ROOT.parent / 'donor.json').read_text(encoding='utf-8'))
G = {s: dict(zip(['control', 'large_green', 'small_green', 'split_red'], v)) for s, v in zip(['rice', 'potato'], DONOR['geometric_areas'])}
R = {s: math.sqrt(G[s]['small_green'] * G[s]['split_red']) / G[s]['control'] for s in G}
COLOUR = {s: {c: G[s][c] / G[s]['control'] for c in ('small_green', 'split_red', 'large_green')} for s in G}
RPOOL = math.sqrt(R['rice'] * R['potato'])
F0 = 0.5
PRIMARY_RULES = ['equality', 'carbohydrate', 'fixed_starch', 'scaled_starch', 'linear_starch', 'fixed_pooled', 'scaled_pooled']


def rules(starch, f, colour=None, cho_ratio=None):
    k = None if f is None else f / F0
    out = {'equality': 1.0, 'carbohydrate': cho_ratio,
           'fixed_pooled': RPOOL, 'scaled_pooled': None if k is None else RPOOL ** k}
    if starch in R:
        r = R[starch]
        out.update(fixed_starch=r, scaled_starch=None if k is None else r ** k,
                   linear_starch=None if k is None else max(0.0, 1 - k * (1 - r)))
        if colour in COLOUR[starch]:
            c = COLOUR[starch][colour]
            out.update(fixed_colour=c, scaled_colour=None if k is None else c ** k)
    else:
        out.update(fixed_starch=None, scaled_starch=None, linear_starch=None)
    return out


def forecast():
    grid = {}
    for s in R:
        for f in (0.5, 0.75, 0.9, 1.0):
            grid[f'{s}_f{f}'] = rules(s, f)
    mid = {s: dict(fixed_vs_scaled_geometric_midpoint=math.sqrt(R[s] * R[s] ** 2), fixed_vs_scaled_log_separation=math.log(R[s] / R[s] ** 2),
                   scaled_vs_linear_geometric_midpoint=math.sqrt(R[s] ** 2 * (1 - 2 * (1 - R[s])))) for s in R}
    return dict(status='Frozen before any new target insulin outcome', donor=dict(source=DONOR['doi'], table=DONOR['table'], units=DONOR['units'],
                ratios_starch=R, ratios_colour=COLOUR, ratio_pooled=RPOOL, donor_exchange_fraction=F0,
                donor_uncertainty='unavailable (GM point values only)'), forecasts_by_starch_and_f=grid, f1_thresholds=mid)


def score(targets):
    panels = {}
    for t in targets['targets']:
        f = t.get('exchange_fraction')
        if f is None and t.get('pulse_avcho_g') is not None and t.get('control_avcho_g'):
            f = t['pulse_avcho_g'] / t['control_avcho_g']
        cho = (t['test_avcho_g'] / t['control_avcho_g']) if t.get('test_avcho_g') and t.get('control_avcho_g') else None
        pulse_is_lentil = t.get('pulse_family') == 'lentil'
        panel = t['operator'] if pulse_is_lentil else 'pulse_extension:' + t['operator']
        p = rules(t['displaced_starch'], f, t.get('pulse_colour'), cho)
        if not pulse_is_lentil:
            for k in ('fixed_starch', 'scaled_starch', 'linear_starch', 'fixed_colour', 'scaled_colour'):
                if k in p: p[k] = None  # primary starch-specific rules abstain for non-lentil pulses (kept as extension below)
            ext = rules(t['displaced_starch'], f, None, cho)
            p.update({'ext_' + k: ext[k] for k in ('fixed_starch', 'scaled_starch', 'linear_starch') if ext.get(k) is not None})
        obs = t['observed_ratio']
        err = {k: (abs(math.log(v / obs)) if v else None) for k, v in p.items()}
        se = None
        if t.get('arm_log_se'): se = math.sqrt(t['arm_log_se']['test'] ** 2 + t['arm_log_se']['control'] ** 2)
        inside = None
        if t.get('paired_ratio_ci'):
            lo, hi = t['paired_ratio_ci']; inside = {k: (lo <= v <= hi) if v else None for k, v in p.items()}
        disc = None
        if p.get('fixed_starch') and p.get('scaled_starch'):
            mid = math.sqrt(p['fixed_starch'] * p['scaled_starch'])
            disc = dict(midpoint=mid, scaled_closer=obs < mid if p['scaled_starch'] < p['fixed_starch'] else obs > mid, margin_log=abs(math.log(obs / mid)))
        panels.setdefault(panel, []).append(dict(id=t['id'], source=t.get('source'), locator=t.get('locator'), displaced_starch=t['displaced_starch'],
            pulse=t.get('pulse_family'), colour=t.get('pulse_colour'), exchange_fraction=f, extrapolation=(f is not None and f > 1),
            observed_ratio=obs, predicted=p, abs_log_error=err, zero_correlation_log_se_scenario=se, prediction_inside_paired_ci=inside,
            fixed_vs_scaled=disc, notes=t.get('notes')))
    summary = {}
    for name, rows in panels.items():
        keys = sorted({k for r in rows for k in r['predicted']})
        summary[name] = {k: dict(coverage=sum(1 for r in rows if r['abs_log_error'].get(k) is not None), n=len(rows),
                                 mean_abs_log_error=(sum(r['abs_log_error'][k] for r in rows) / len(rows))
                                 if all(r['abs_log_error'].get(k) is not None for r in rows) else None) for k in keys}
    return dict(status='Scored with frozen donor and rules; panels by operator never pooled', panels=panels, summary=summary)


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


def dump(p, x): Path(p).write_text(json.dumps(x, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'forecast':
        if (ROOT / 'FORECASTS.json').exists(): sys.exit('already frozen')
        dump(ROOT / 'FORECASTS.json', json.loads(json.dumps(forecast()))); print(json.dumps(forecast()['forecasts_by_starch_and_f'], indent=1))
    elif cmd == 'score':
        r = json.loads(json.dumps(score(json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))))); dump(sys.argv[3], r)
        print(json.dumps(r['summary'], indent=1))
    elif cmd == 'check':
        assert same(json.loads(json.dumps(forecast())), json.loads((ROOT / 'FORECASTS.json').read_text(encoding='utf-8')))
        if len(sys.argv) > 3:
            assert same(json.loads(json.dumps(score(json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))))), json.loads(Path(sys.argv[3]).read_text(encoding='utf-8')))
        print('PASS check')
