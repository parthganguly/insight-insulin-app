"""Collier direct lentil-vs-potato (f = 1) supplementary analysis. Standard library only.
Primary scoring uses the frozen ../model/evaluate.py (SCORES_collier.json); this adds per-arm discrimination,
zero-correlation uncertainty scenario and a labelled lognormal operator sensitivity (not an inference).

python -I -X utf8 collier.py           write COLLIER_EXTRA.json
python -I -X utf8 collier.py --check
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
ARMS = {'potato': (3333, 590), 'potato_butter': (3024, 452), 'lentil': (1796, 333), 'lentil_butter': (1324, 256)}
N = 7


def run():
    F = json.loads((ROOT.parent / 'model' / 'FORECASTS.json').read_text(encoding='utf-8'))
    p = F['forecasts_by_starch_and_f']['potato_f1.0']; mid = F['f1_thresholds']['potato']['fixed_vs_scaled_geometric_midpoint']
    out = {}
    for name, (l, c) in {'no_fat': ('lentil', 'potato'), 'butter': ('lentil_butter', 'potato_butter')}.items():
        (ml, sl), (mc, sc) = ARMS[l], ARMS[c]
        obs = ml / mc; se = math.sqrt((sl / ml) ** 2 + (sc / mc) ** 2)
        # labelled lognormal sensitivity: SD = SEM*sqrt(n); sigma_log = sqrt(ln(1+CV^2)); GM/AM = exp(-sigma^2/2)
        gm_am = lambda m, s: math.exp(-math.log(1 + (s * math.sqrt(N) / m) ** 2) / 2)
        lognormal_gm_ratio = obs * gm_am(ml, sl) / gm_am(mc, sc)
        out[name] = dict(observed_AM_ratio=obs, zero_correlation_log_se=se, approx_95_scenario=[obs * math.exp(-1.96 * se), obs * math.exp(1.96 * se)],
                         errors={k: abs(math.log(v / obs)) for k, v in p.items() if v},
                         fixed_vs_scaled_midpoint=mid, scaled_starch_closer_than_fixed=obs < mid, margin_log=abs(math.log(obs / mid)),
                         best_rule=min((k for k, v in p.items() if v), key=lambda k: abs(math.log(p[k] / obs))),
                         lognormal_sensitivity_GM_ratio=lognormal_gm_ratio,
                         lognormal_note='Illustrative only: assumes lognormal arms with SD = SEM*sqrt(7); NOT used to replace the reported AM ratio')
    out['butter_over_no_fat_ratio_of_ratios'] = out['butter']['observed_AM_ratio'] / out['no_fat']['observed_AM_ratio']
    out['scope'] = ('Four-hour sampling; the numerical paragraph does not state the area window, so this is a reported-area panel distinct from the '
                    'donor 0-120 GM panel. 75 g carbohydrate gram basis, not declared analytical available carbohydrate: f = 1 is a named-staple scenario. '
                    'Butter arms add fat to both meals (outside the plain-meal donor). Lentil colour unspecified (no colour rules). IV arms excluded. n = 7.')
    return out


if __name__ == '__main__':
    r = json.loads(json.dumps(run(), allow_nan=False)); p = ROOT / 'COLLIER_EXTRA.json'
    if '--check' in sys.argv:
        old = json.loads(p.read_text(encoding='utf-8'))
        assert json.dumps(r, sort_keys=True) == json.dumps(old, sort_keys=True); print('PASS check'); sys.exit()
    p.write_text(json.dumps(r, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    for k in ('no_fat', 'butter'):
        v = r[k]; print(k, round(v['observed_AM_ratio'], 4), 'best', v['best_rule'], 'scaled<mid', v['scaled_starch_closer_than_fixed'], round(v['margin_log'], 3),
                        [round(x, 3) for x in v['approx_95_scenario']], 'GMsens', round(v['lognormal_sensitivity_GM_ratio'], 4),
                        {a: round(b, 3) for a, b in v['errors'].items()})
    print('butter/no-fat', round(r['butter_over_no_fat_ratio_of_ratios'], 4))
