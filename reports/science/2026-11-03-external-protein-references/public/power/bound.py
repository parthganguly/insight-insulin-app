"""Structural check of the source-specific dose family Q(d) = [(1+a d)/(1+b d)]^beta (a > b >= 0, beta >= 0) against
Thondre et al. 2026 (doi 10.1371/journal.pone.0340386, Table 4: 0-120 min insulin iAUC group means; glucose 50 g fixed).
No fitting: a bound that holds for EVERY parameter value, evaluated on published point means.

Facts used:  g(d) = log(1+a d) - log(1+b d) has g(0)=0 and g''(d) = b^2/(1+bd)^2 - a^2/(1+ad)^2 <= 0 when a >= b >= 0,
so g is concave and g(2d) <= 2 g(d); beta >= 0 preserves this. Also Q is nondecreasing in d (a > b).
Hence for each source:  log Q(2d) <= 2 log Q(d)  and  Q(2d) >= Q(d).

python -I -X utf8 bound.py           write BOUND.json
python -I -X utf8 bound.py --check
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
T4 = dict(source='Thondre et al. 2026 PLoS ONE doi 10.1371/journal.pone.0340386, Table 4 (group means; SD large; n=30 crossover)',
          glucose=3373.4, pea10=4069.7, pea20=4104.9, whey10=4183.3, whey20=6043.07,
          protein_g={'pea10': 8.0, 'pea20': 16.0, 'whey10': 8.1, 'whey20': 16.2})
MODEL = dict(low_whey_over_pea=1.026, high_whey_over_pea=1.043, provenance='team-supplied frozen predictions (independent of Thondre fit)')


def run():
    q = {k: T4[k] / T4['glucose'] for k in ['pea10', 'pea20', 'whey10', 'whey20']}
    lq = {k: math.log(v) for k, v in q.items()}
    doubling = {s: dict(log_Q_low=lq[s + '10'], log_Q_high=lq[s + '20'], ratio_high_over_low_log=lq[s + '20'] / lq[s + '10'],
                        family_max_log_Q_high=2 * lq[s + '10'], observed_violates_family_bound=lq[s + '20'] > 2 * lq[s + '10'],
                        dose_exactly_doubled=math.isclose(T4['protein_g'][s + '20'], 2 * T4['protein_g'][s + '10']))
                for s in ['whey', 'pea']}
    obs_low, obs_high = q['whey10'] / q['pea10'], q['whey20'] / q['pea20']
    # If a family member reproduced both LOW-dose levels exactly: whey_high <= whey_low^2, pea_high >= pea_low.
    cap_cond = q['whey10'] ** 2 / q['pea10']
    # General: log C_high <= log C_low + log Wq_low (C = whey/pea contrast), for ANY family predictions.
    need_whey_low = math.exp(math.log(obs_high) - math.log(MODEL['low_whey_over_pea']))
    return dict(inputs=T4, model_predictions=MODEL, observed_level_vs_glucose=q, doubling_check=doubling,
                observed_contrast={'low': obs_low, 'high': obs_high, 'log_change': math.log(obs_high / obs_low)},
                model_errors={'low': abs(math.log(MODEL['low_whey_over_pea'] / obs_low)), 'high': abs(math.log(MODEL['high_whey_over_pea'] / obs_high)),
                              'flat_low': abs(math.log(obs_low)), 'flat_high': abs(math.log(obs_high))},
                family_contrast_cap_if_low_levels_exact=cap_cond,
                general_inequality='log C(2d) <= log C(d) + log Q_whey(d) for every family member',
                whey_low_level_needed_to_reach_observed_high_with_model_low_contrast=need_whey_low,
                caveats=['Point means only: Thondre SDs are large (whey20 SD about half the mean); superadditivity in means is not a population interaction.',
                         'Bound concerns the functional family, not the fitted parameters; no target mean was fitted.'])


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    r = json.loads(json.dumps(run(), allow_nan=False))
    if '--check' in sys.argv:
        assert same(r, json.loads((ROOT / 'BOUND.json').read_text(encoding='utf-8'))); print('PASS check'); sys.exit()
    (ROOT / 'BOUND.json').write_text(json.dumps(r, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({k: r[k] for k in ['doubling_check', 'observed_contrast', 'model_errors', 'family_contrast_cap_if_low_levels_exact',
                                        'whey_low_level_needed_to_reach_observed_high_with_model_low_contrast']}, indent=1))
