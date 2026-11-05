"""Addendum A (post-exposure, labelled): spec-faithful scoring when body mass is unavailable.

The frozen transfer.py abstains the whole group without body mass, although SPEC.md abstains only the
dose-mapped rules (R1/R2). This script reuses the frozen ratios()/rules() read-only, scores the dose-free rules
(R3 flat, R4 log-mean) and a body-mass-CONDITIONAL table (not an imputation; not scored as primary).

python -I -X utf8 addendum.py           write ADDENDUM.json
python -I -X utf8 addendum.py --check
"""
from pathlib import Path
import json, math, runpy, sys

ROOT = Path(__file__).resolve().parent
T = runpy.run_path(str(ROOT / 'transfer.py'))
ratios, rules, load = T['ratios'], T['rules'], T['load']


def run():
    tr, oc = load(T['TRAIN']), load(ROOT / 'target_outcomes.json')
    R = tr['total_insulin_AUC']
    whey, soy = ratios(R, 'whey'), ratios(R, 'soy')
    t2 = oc['endpoints']['T2_abstract_insulin_AUC']; obs, rng = t2['ratio_hydro_over_intact'], t2['ratio_range']
    lnm = math.exp(sum(math.log(v) for v in whey) / 3)
    dose_free = {'R3_flat': 1.0, 'R4_log_mean_three': lnm}
    scored = {k: dict(pred=v, abs_log_error=abs(math.log(v / obs)), error_over_rounding_range=sorted(abs(math.log(v / o)) for o in rng))
              for k, v in dose_free.items()}
    cond = []
    for bw in [60, 64.3, 70, 75, 80, 85, 90, 100, 112.5]:
        x = 45 / bw
        w, info = rules(whey, x); s, _ = rules(soy, x)
        cond.append(dict(body_mass_kg=bw, dose_g_per_kg=x, **info,
                         whey={k: v for k, v in w.items() if k.startswith(('R1', 'R2'))},
                         whey_abs_log_error={k: (abs(math.log(v / obs)) if v is not None else None) for k, v in w.items() if k.startswith(('R1', 'R2'))},
                         soy_R1=s['R1_nearest_dose']))
    return dict(status='Addendum A: post-exposure, spec-faithful dose-free scoring + body-mass-conditional table; frozen PREDICTIONS/RESULTS unchanged',
                code_spec_mismatch='transfer.py abstains all rules when body mass is missing; SPEC.md abstains only R1/R2',
                training_whey_ratios=whey, training_soy_ratios=soy,
                observed_T2_ratio=obs, observed_T2_rounding_range=rng,
                dose_free_scored=scored,
                body_mass_conditional_not_imputed=cond,
                note_nearest='For 45 g, nearest training dose is 0.6 g/kg for every body mass < 90 kg (R1 = 0.9226); interpolation between 0.4 and 0.6 needs 75-112.5 kg; below 75 kg is extrapolation beyond 0.6.',
                recorded_not_scored=oc['recorded_not_scored'])


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    r = json.loads(json.dumps(run()))
    if '--check' in sys.argv:
        assert same(r, load(ROOT / 'ADDENDUM.json')); print('PASS check'); sys.exit()
    (ROOT / 'ADDENDUM.json').write_text(json.dumps(r, indent=2) + '\n', encoding='utf-8', newline='\n')
    print({k: (round(v['pred'], 4), round(v['abs_log_error'], 4)) for k, v in r['dose_free_scored'].items()})
    for c in r['body_mass_conditional_not_imputed']:
        print(c['body_mass_kg'], round(c['dose_g_per_kg'], 3), c['R1_status'], {k: (round(v, 4) if v else None) for k, v in c['whey'].items()},
              {k: (round(v, 3) if v else None) for k, v in c['whey_abs_log_error'].items()}, round(c['soy_R1'], 4))
