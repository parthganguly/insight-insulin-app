"""Katsanos 2006 leucine-proportion test (PLAN.md). Standard library only.

python -I -X utf8 katsanos.py predict   inputs.json -> PREDICTIONS.json (no outcomes read; refuses overwrite)
python -I -X utf8 katsanos.py score     + outcomes.json -> RESULTS.json
python -I -X utf8 katsanos.py --check   recompute both and compare
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
SLOPES = {'P3_quantitative_slope': 0.1022204575597254, 'P3w_whey_slope': 0.05273155134276091, 'P3s_soy_slope': 0.14126765570429567}
FIXED = 1.2670685255785012


def load(n): return json.loads((ROOT / n).read_text(encoding='utf-8'))


def predict():
    inp = load('inputs.json')
    dleu = inp['leucine_g']['high'] - inp['leucine_g']['low']
    p = {'P0_equal_response': 1.0, 'P1_generic_AA_flag': 1.0, 'P2_fixed_enrichment_multiplier': FIXED}
    p.update({k: math.exp(b * dleu) for k, b in SLOPES.items()})
    thr = {'P3_beats_P0_if_obs_above': math.sqrt(p['P3_quantitative_slope']),
           'P3_beats_P2_if_obs_below': math.sqrt(FIXED * p['P3_quantitative_slope']),
           'P2_beats_P0_if_obs_above': math.sqrt(FIXED),
           'separation_ln_P2_minus_ln_P3': math.log(FIXED) - math.log(p['P3_quantitative_slope'])}
    return dict(status='Frozen before outcome reading', delta_leucine_g=dleu, leucine_basis=inp['leucine_g']['basis'],
                predicted_ratio_high_over_low=p, predicted_age_interaction={k: 1.0 for k in p}, thresholds=thr,
                abstained={'per_50g_carbohydrate_basis': 'no carbohydrate in drinks', 'native_absolute': 'no externally calibrated reference arm'})


def score(pred):
    oc = load('outcomes.json'); res = {}
    for ep, cell in oc['endpoints'].items():
        ages = {}
        for age, g in cell['groups'].items():
            h, l = g['high'], g['low']
            native = dict(high=h['mean'], low=l['mean'], difference=h['mean'] - l['mean'])
            if min(h['mean'], l['mean']) <= 0 or (h.get('sem') is not None and h['sem'] >= h['mean']) or (l.get('sem') is not None and l['sem'] >= l['mean']):
                ages[age] = dict(native=native, status='UNAVAILABLE for log scoring (nonpositive summary or SEM >= mean)'); continue
            obs = h['mean'] / l['mean']
            se = math.sqrt((h['sem'] / h['mean']) ** 2 + (l['sem'] / l['mean']) ** 2) if h.get('sem') is not None and l.get('sem') is not None else None
            P = pred['predicted_ratio_high_over_low']
            err = {k: abs(math.log(v / obs)) for k, v in P.items()}
            z = {k: (math.log(obs) - math.log(v)) / se for k, v in P.items()} if se else None
            lr = {'P3_vs_P2': math.exp(-(z['P3_quantitative_slope'] ** 2 - z['P2_fixed_enrichment_multiplier'] ** 2) / 2),
                  'P3_vs_P0': math.exp(-(z['P3_quantitative_slope'] ** 2 - z['P0_equal_response'] ** 2) / 2),
                  'P2_vs_P0': math.exp(-(z['P2_fixed_enrichment_multiplier'] ** 2 - z['P0_equal_response'] ** 2) / 2)} if se else None
            ages[age] = dict(native=native, observed_ratio=obs, log_se=se,
                             approx_95_interval=[obs * math.exp(-1.96 * se), obs * math.exp(1.96 * se)] if se else None,
                             abs_log_error=err, z=z, gaussian_likelihood_ratio=lr,
                             can_discriminate_P2_P3=(2 * se < abs(pred['thresholds']['separation_ln_P2_minus_ln_P3'])) if se else None,
                             n={'high': h.get('n'), 'low': l.get('n')})
        inter = None
        if all('observed_ratio' in a for a in ages.values()) and len(ages) == 2:
            a = list(ages.values())
            inter = dict(observed_old_over_young=ages['old']['observed_ratio'] / ages['young']['observed_ratio'], predicted_all_rules=1.0,
                         log_se=math.sqrt(ages['old']['log_se'] ** 2 + ages['young']['log_se'] ** 2) if all(x['log_se'] for x in a) else None)
        res[ep] = dict(definition=cell['definition'], locator=cell.get('locator'), ages=ages, age_interaction=inter)
    return dict(status='Scored after freeze; between-group ratios of means; approximate delta-method SE (independent groups)', endpoints=res)


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


def dump(n, x): (ROOT / n).write_text(json.dumps(x, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    cmd = sys.argv[1]; p = json.loads(json.dumps(predict()))
    if cmd == 'predict':
        if (ROOT / 'PREDICTIONS.json').exists(): sys.exit('already frozen')
        dump('PREDICTIONS.json', p); print(json.dumps(p, indent=1))
    elif cmd == 'score':
        assert same(p, load('PREDICTIONS.json')); r = json.loads(json.dumps(score(p))); dump('RESULTS.json', r); print(json.dumps(r, indent=1))
    elif cmd == '--check':
        assert same(p, load('PREDICTIONS.json')); assert same(json.loads(json.dumps(score(p))), load('RESULTS.json')); print('PASS check')
