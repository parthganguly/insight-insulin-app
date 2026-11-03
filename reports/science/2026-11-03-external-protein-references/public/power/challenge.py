"""Challenge arithmetic for the mixed-food (Acheson) learning choice. Inputs are the team-supplied aggregate values
(not re-read by Opus) plus the frozen Claessens 2007 form ratios. No fitting.

python -I -X utf8 challenge.py           write CHALLENGE.json
python -I -X utf8 challenge.py --check
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
SUPPLIED = dict(acheson_whey_over_soy=1.506, predicted_whey_over_soy=1.549,
                acheson_glucose_normalized={'whey': 1.543, 'soy': 1.025}, predicted_vs_carbohydrate={'whey': 3.056, 'soy': 1.972},
                provenance='Coordinator/Astra-supplied aggregates for Acheson and the Claessens 2009 hydrolysate+maltodextrin reference; not independently re-read here')


def run():
    tr = json.loads((ROOT.parent / 'readings.json').read_text(encoding='utf-8'))['total_insulin_AUC']
    s = SUPPLIED
    lvl = {k: math.log(s['predicted_vs_carbohydrate'][k] / s['acheson_glucose_normalized'][k]) for k in ['whey', 'soy']}
    form = {}
    for d in ['0.3', '0.4', '0.6']:  # intact/hydrolysate factors from Claessens 2007 (same lab family, protein-only, 2 h signed)
        wi = tr['whey']['intact'][d] / tr['whey']['hydro'][d]; si = tr['soy']['intact'][d] / tr['soy']['hydro'][d]
        adj = s['predicted_whey_over_soy'] * wi / si
        form[d] = dict(whey_intact_over_hydro=wi, soy_intact_over_hydro=si, form_adjusted_prediction=adj,
                       abs_log_error=abs(math.log(adj / s['acheson_whey_over_soy'])))
    return dict(supplied=s,
                source_ratio_abs_log_error=abs(math.log(s['predicted_whey_over_soy'] / s['acheson_whey_over_soy'])),
                level_log_overprediction=lvl, level_offset_difference=lvl['whey'] - lvl['soy'],
                note_levels='Level over-predictions are ~0.68 and ~0.65 log: a nearly common multiplicative offset (denominator/reference mismatch) that cancels in the whey/soy ratio.',
                form_adjustment_sensitivity=form,
                note_form='Reference products are hydrolysates; Acheson proteins are intact. Applying Claessens 2007 intact/hydrolysate factors moves the 1.549 forecast across a wide range depending on the dose cell chosen, so the 1.506 agreement is not robust to the unmodelled form difference.')


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    r = json.loads(json.dumps(run()))
    if '--check' in sys.argv:
        assert same(r, json.loads((ROOT / 'CHALLENGE.json').read_text(encoding='utf-8'))); print('PASS check'); sys.exit()
    (ROOT / 'CHALLENGE.json').write_text(json.dumps(r, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(round(r['source_ratio_abs_log_error'], 4), {k: round(v, 4) for k, v in r['level_log_overprediction'].items()}, round(r['level_offset_difference'], 4))
    print({d: (round(v['form_adjusted_prediction'], 3), round(v['abs_log_error'], 3)) for d, v in r['form_adjustment_sensitivity'].items()})
