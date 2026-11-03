"""Claessens whey form ratio -> Power 2009 (SPEC.md v1). Standard library only.

python -I -X utf8 transfer.py predict   target_inputs.json -> PREDICTIONS.json (no outcomes read)
python -I -X utf8 transfer.py score     + target_outcomes.json -> RESULTS.json
python -I -X utf8 transfer.py --check   recompute both and compare
"""
from pathlib import Path
import itertools, json, math, sys

ROOT = Path(__file__).resolve().parent
TRAIN = ROOT.parent / 'readings.json'
DOSES = [0.3, 0.4, 0.6]


def load(p): return json.loads(Path(p).read_text(encoding='utf-8'))


def ratios(R, src, shift=None):
    out = []
    for i, d in enumerate(['0.3', '0.4', '0.6']):
        h, n = R[src]['hydro'][d], R[src]['intact'][d]
        if shift: h, n = h + shift[2 * i], n + shift[2 * i + 1]
        out.append(h / n)
    return out


def rules(r, x):
    ln = [math.log(v) for v in r]
    near = min(range(3), key=lambda i: abs(DOSES[i] - x))
    inside = DOSES[0] <= x <= DOSES[-1]
    if inside:
        j = 0 if x <= DOSES[1] else 1
        t = (x - DOSES[j]) / (DOSES[j + 1] - DOSES[j]); interp = math.exp(ln[j] + t * (ln[j + 1] - ln[j]))
    else:
        interp = None
    hold = r[-1] if x > DOSES[-1] else r[0] if x < DOSES[0] else None
    return {'R1_nearest_dose': r[near], 'R2_log_interpolation': interp, 'R2x_boundary_hold': hold, 'R3_flat': 1.0,
            'R4_log_mean_three': math.exp(sum(ln) / 3)}, dict(nearest_training_dose=DOSES[near], inside_training_range=inside,
                                                            R1_status='interpolation_nearest' if inside else 'extrapolation_hold')


def predict():
    tr, tg = load(TRAIN), load(ROOT / 'target_inputs.json')
    R, h = tr['total_insulin_AUC'], tr['reading_half_width']
    out = {}
    for arm in tg['groups']:
        bw = arm.get('mean_body_mass_kg')
        if bw is None:
            out[arm['name']] = dict(status='ABSTAIN: body mass not printed'); continue
        x = tg['protein_g'] / bw
        whey, info = rules(ratios(R, 'whey'), x)
        soy, _ = rules(ratios(R, 'soy'), x)
        rng = {k: [math.inf, -math.inf] for k in whey}
        for sh in itertools.product((-h, h), repeat=6):  # training graph-reading box (corners; each rule monotone per bar)
            v, _ = rules(ratios(R, 'whey', sh), x)
            for k, y in v.items():
                if y is not None: rng[k] = [min(rng[k][0], y), max(rng[k][1], y)]
        out[arm['name']] = dict(dose_g_per_kg=x, **info, whey_family=whey, whey_training_reading_range=rng,
                                S1_soy_family_sensitivity=soy)
    return dict(status='Frozen before target outcome reading; exposure per SPEC.md', training_whey_ratios=ratios(R, 'whey'),
                training_soy_ratios=ratios(R, 'soy'), target_inputs=tg, predictions=out)


def score(pred):
    oc = load(ROOT / 'target_outcomes.json')
    res = {}
    for ep, cell in oc['endpoints'].items():
        obs = cell['ratio_hydro_over_intact']
        grp = pred['predictions'][cell.get('group', next(iter(pred['predictions'])))]
        if 'whey_family' not in grp:
            res[ep] = dict(status='prediction abstained'); continue
        e = {k: (abs(math.log(v / obs)) if v is not None else None) for k, v in grp['whey_family'].items()}
        es = {k: (abs(math.log(v / obs)) if v is not None else None) for k, v in grp['S1_soy_family_sensitivity'].items()}
        res[ep] = dict(definition=cell['definition'], observed_ratio=obs, observed_range=cell.get('ratio_range'),
                       abs_log_error=e, soy_sensitivity_abs_log_error=es,
                       error_range_over_observed_range={k: sorted(abs(math.log(v / o)) for o in cell['ratio_range'])
                                                        if v is not None and cell.get('ratio_range') else None for k, v in grp['whey_family'].items()},
                       source_statistics=cell.get('source_statistics'))
    return dict(status='Exposed outside-lab transfer; point errors; no paired CI', endpoints=res, coverage={
        k: sum(1 for r in res.values() if 'abs_log_error' in r and r['abs_log_error'][k] is not None) for k in
        ['R1_nearest_dose', 'R2_log_interpolation', 'R2x_boundary_hold', 'R3_flat', 'R4_log_mean_three']})


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


def dump(n, x): (ROOT / n).write_text(json.dumps(x, indent=2, allow_nan=True) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    cmd = sys.argv[1]
    p = json.loads(json.dumps(predict()))
    if cmd == 'predict':
        if (ROOT / 'PREDICTIONS.json').exists(): sys.exit('already frozen')
        dump('PREDICTIONS.json', p); print(json.dumps(p['predictions'], indent=1))
    elif cmd == 'score':
        assert same(p, load(ROOT / 'PREDICTIONS.json')); r = json.loads(json.dumps(score(p))); dump('RESULTS.json', r)
        print(json.dumps(r, indent=1))
    elif cmd == '--check':
        assert same(p, load(ROOT / 'PREDICTIONS.json')); assert same(json.loads(json.dumps(score(p))), load(ROOT / 'RESULTS.json'))
        print('PASS check')
