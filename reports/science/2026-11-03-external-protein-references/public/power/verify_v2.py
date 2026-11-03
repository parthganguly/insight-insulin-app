"""v2 verification with admitted full-text design facts (target_inputs_v2.json). Reuses frozen transfer.py
ratios()/rules() read-only; frozen PREDICTIONS/RESULTS/ADDENDUM unchanged.

python -I -X utf8 verify_v2.py           write VERIFIED_v2.json
python -I -X utf8 verify_v2.py --check
"""
from pathlib import Path
import itertools, json, math, runpy, sys

ROOT = Path(__file__).resolve().parent
T = runpy.run_path(str(ROOT / 'transfer.py'))
ratios, rules, load = T['ratios'], T['rules'], T['load']

# Target outcome as admitted (abstract + full-text definition via Sol/coordinator read)
OBS = dict(endpoint='3-h insulin AUC above baseline by trapezoids; group means (SEM); within-person; paired p = 0.21',
           WPH=10.8, WPI=7.6, sem_WPH=2.6, sem_WPI=0.9, unit='as printed in the abstract ("nM"); not converted')


def run():
    tr, tg = load(T['TRAIN']), load(ROOT / 'target_inputs_v2.json')
    R, h = tr['total_insulin_AUC'], tr['reading_half_width']
    g = tg['groups'][0]; bw = g['mean_body_mass_kg']; x = tg['protein_g'] / bw
    whey, info = rules(ratios(R, 'whey'), x); soy, _ = rules(ratios(R, 'soy'), x)
    box = {k: [math.inf, -math.inf] for k in whey}
    for sh in itertools.product((-h, h), repeat=6):
        v, _ = rules(ratios(R, 'whey', sh), x)
        for k, y in v.items():
            if y is not None: box[k] = [min(box[k][0], y), max(box[k][1], y)]
    obs = OBS['WPH'] / OBS['WPI']
    rr = [(OBS['WPH'] - .05) / (OBS['WPI'] + .05), (OBS['WPH'] + .05) / (OBS['WPI'] - .05)]
    scored = {}
    for k, p in list(whey.items()) + [('S1_soy_' + k, v) for k, v in soy.items() if k.startswith(('R1', 'R2'))]:
        if p is None: scored[k] = None; continue
        scored[k] = dict(predicted_ratio=p, abs_log_error=abs(math.log(p / obs)),
                         abs_log_error_over_rounding=sorted(abs(math.log(p / o)) for o in rr),
                         abs_log_error_over_training_box=sorted(abs(math.log(b / obs)) for b in box[k]) if k in box and box[k][0] != math.inf else None,
                         native_reference_calibrated={'WPH_from_measured_WPI': OBS['WPI'] * p, 'WPI_from_measured_WPH': OBS['WPH'] / p})
    spread = {f'{b}_kg': dict(dose_g_per_kg=45 / b, **rules(ratios(R, 'whey'), 45 / b)[1], R1=rules(ratios(R, 'whey'), 45 / b)[0]['R1_nearest_dose'])
              for b in g['body_mass_range_kg']}
    return dict(status='v2: exposed outside-lab transfer with admitted design facts; 2-h curve endpoint UNAVAILABLE (no figure image obtained)',
                source_reading_credit=tg['source_reading_credit'], dose_g_per_kg=x, nearest=info,
                predictions=whey, training_box_range=box, soy_sensitivity=soy,
                geometric_mean_three_whey_ratios=math.exp(sum(math.log(v) for v in ratios(R, 'whey')) / 3),
                target=dict(OBS, ratio_hydro_over_intact=obs, rounding_range=rr,
                            zero_correlation_log_sd_scenario=math.sqrt((OBS['sem_WPH'] / OBS['WPH']) ** 2 + (OBS['sem_WPI'] / OBS['WPI']) ** 2)),
                scored=scored, individual_dose_spread_descriptive=spread,
                estimand_mismatch='Training: signed net area, pre-drink to 120 min after finishing, protein only, ~250 mL. Target: area above baseline over 3 h, 500 mL, paracetamol co-ingested.')


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    r = json.loads(json.dumps(run()))
    if '--check' in sys.argv:
        assert same(r, load(ROOT / 'VERIFIED_v2.json')); print('PASS check'); sys.exit()
    (ROOT / 'VERIFIED_v2.json').write_text(json.dumps(r, indent=2) + '\n', encoding='utf-8', newline='\n')
    print('x', r['dose_g_per_kg'], r['nearest'], 'gm', r['geometric_mean_three_whey_ratios'])
    for k, v in r['scored'].items():
        if v: print(' ', k, round(v['predicted_ratio'], 6), round(v['abs_log_error'], 4), [round(z, 4) for z in (v['abs_log_error_over_training_box'] or [])],
                    {a: round(b, 3) for a, b in v['native_reference_calibrated'].items()})
    print('target', round(r['target']['ratio_hydro_over_intact'], 5), round(r['target']['zero_correlation_log_sd_scenario'], 4))
    print(json.dumps(r['individual_dose_spread_descriptive']))
