"""Post-result check of the two predeclared half-replacement contrasts (v2 reconciliation).

Reads frozen PREDICTIONS.json and admitted outcomes.json; modifies neither; no fitting.
python -I -X utf8 contrast_check.py           write CONTRAST_CHECK.json
python -I -X utf8 contrast_check.py --check   recompute and compare
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
PAIRS = [('W+5AA', 'W'), ('S+5AA', 'S')]
# Tie = total_protein (identical to no_change and printed_energy for these pairs).
MODELS = {'tie_total_protein': 'total_protein', 'leucine_whey_equivalent': 'leucine_whey_equivalent', 'intact_protein_only': 'intact_protein_only'}
COMPARE = [('leucine_whey_equivalent', 'tie_total_protein'), ('intact_protein_only', 'tie_total_protein'), ('leucine_whey_equivalent', 'intact_protein_only')]
NEAR_TIE = 0.005  # descriptive flag for |error difference| in log units; not a significance threshold


def load(n): return json.loads((ROOT / n).read_text(encoding='utf-8'))


def err(p, o): return abs(math.log(p / o))


def diff_range(pa, pb, lo, hi):
    """Range of err(pa,o)-err(pb,o) for o in [lo,hi]; piecewise monotone in ln o, kinks at o=pa, o=pb."""
    pts = [lo, hi] + [x for x in (pa, pb) if lo < x < hi]
    v = [err(pa, o) - err(pb, o) for o in pts]
    return [min(v), max(v)]


def err_range(p, lo, hi):
    pts = [lo, hi] + ([p] if lo < p < hi else [])
    v = [err(p, o) for o in pts]
    return [min(v), max(v)]


def run():
    pred, out = load('PREDICTIONS.json')['predictions'], load('outcomes.json')['endpoints']
    res = {}
    for ep in ['II_120', 'insulin_iAUC_0_30']:
        arms, half = out[ep]['arms'], 0.5 if ep == 'II_120' else 0.05  # printed precision: integer II; 0.1 for iAUC
        pairs = {}
        for a, b in PAIRS:
            obs = arms[a] / arms[b]
            lo, hi = (arms[a] - half) / (arms[b] + half), (arms[a] + half) / (arms[b] - half)
            p = {m: pred[k][a] / pred[k][b] for m, k in MODELS.items()}
            e = {m: err(v, obs) for m, v in p.items()}
            d = {f'{x}-{y}': e[x] - e[y] for x, y in COMPARE}
            pairs[f'{a}/{b}'] = dict(observed=obs, observed_ln=math.log(obs), predicted=p, abs_log_error=e, error_difference=d,
                                     near_tie={k: abs(v) < NEAR_TIE for k, v in d.items()},
                                     rounding=dict(half_unit=half, observed_range=[lo, hi],
                                                   abs_log_error_range={m: err_range(v, lo, hi) for m, v in p.items()},
                                                   error_difference_range={f'{x}-{y}': diff_range(p[x], p[y], lo, hi) for x, y in COMPARE}))
        mean = {m: sum(pairs[k]['abs_log_error'][m] for k in pairs) / len(pairs) for m in MODELS}
        mean_rng = {f'{x}-{y}': [sum(pairs[k]['rounding']['error_difference_range'][f'{x}-{y}'][i] for k in pairs) / len(pairs) for i in (0, 1)]
                    for x, y in COMPARE}  # conservative: each pair's extreme taken independently
        res[ep] = dict(pairs=pairs, mean_abs_log_contrast_error=mean,
                       mean_error_difference={f'{x}-{y}': mean[x] - mean[y] for x, y in COMPARE},
                       mean_error_difference_rounding_range_conservative=mean_rng,
                       correct_sign={m: sum((pairs[k]['predicted'][m] > 1) == (pairs[k]['observed'] > 1) and abs(pairs[k]['predicted'][m] - 1) > 1e-12
                                            for k in pairs) for m in MODELS})
    return dict(status='Post-result descriptive check on fixed forecasts/outcomes; point summaries of printed group/normalized means; no paired CI; not significance',
                endpoints_separate=True, near_tie_threshold_log=NEAR_TIE, results=res)


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    r = json.loads(json.dumps(run()))
    if '--check' in sys.argv:
        assert same(r, load('CONTRAST_CHECK.json')); print('PASS check'); sys.exit()
    (ROOT / 'CONTRAST_CHECK.json').write_text(json.dumps(r, indent=2) + '\n', encoding='utf-8', newline='\n')
    for ep, v in r['results'].items():
        print(ep, {m: round(x, 4) for m, x in v['mean_abs_log_contrast_error'].items()}, 'sign', v['correct_sign'])
        print('  mean diff', {k: round(x, 4) for k, x in v['mean_error_difference'].items()},
              'rounding', {k: [round(y, 4) for y in x] for k, x in v['mean_error_difference_rounding_range_conservative'].items()})
        for k, p in v['pairs'].items():
            print('  ', k, 'obs %.4f [%.4f,%.4f]' % (p['observed'], *p['rounding']['observed_range']),
                  {m: round(x, 4) for m, x in p['abs_log_error'].items()},
                  {d: [round(y, 4) for y in x] for d, x in p['rounding']['error_difference_range'].items()}, p['near_tie'])
