"""Necessary-condition test of the lentil-chain implication on an equal-available-carbohydrate rice vs potato comparison.
Target (found by Sol): Lan-Pidhainy 2011 thesis, chapter 5, healthy n = 9. Two DISTINCT operators, never pooled:
  (M) ratio of MEDIANS of individual positive 0-120 insulin areas: rice 9 / potato 20 nmol*min/L
  (I) ratio of MEAN individual normalized insulin indices: rice 60 / potato 128
If a shared lentil arm cancels at identical full replacement, the chain implies rice/potato = r_potato/r_rice (fixed)
or (r_potato/r_rice)^2 (scaled). This tests only that implied rice/potato ratio, not either lentil arm individually.
Standard library only.

python -I -X utf8 lan2011.py           write RESULTS.json
python -I -X utf8 lan2011.py --check
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
TARGET = {'medians_positive_iAUC_0_120': dict(rice=9.0, potato=20.0, unit='nmol*min/L', operator='ratio of medians of individual positive areas'),
          'mean_individual_insulin_index': dict(rice=60.0, potato=128.0, unit='index (normalized per participant)', operator='ratio of mean individual indices')}


def run():
    F = json.loads((ROOT.parent / 'model' / 'FORECASTS.json').read_text(encoding='utf-8'))['donor']
    rR, rP = F['ratios_starch']['rice'], F['ratios_starch']['potato']
    pred = {'tie_equal_AC': 1.0,
            'pooled_chain_cancels': 1.0,
            'direct_donor_controls_GM_rice_over_potato': 10.9 / 19.9,
            'lentil_chain_fixed': rP / rR,
            'lentil_chain_scaled': (rP / rR) ** 2}
    panels = {}
    for k, t in TARGET.items():
        obs = t['rice'] / t['potato']
        panels[k] = dict(observed_rice_over_potato=obs, operator=t['operator'], unit=t['unit'],
                         abs_log_error={m: abs(math.log(v / obs)) for m, v in pred.items()},
                         best=min(pred, key=lambda m: abs(math.log(pred[m] / obs))))
    return dict(status='Necessary-condition check; exposed target; operators kept separate; donor operator is GM of participant iAUC',
                predictions_rice_over_potato=pred, panels=panels,
                limits=['Does not test lentil arms individually (they cancel by construction).',
                        'Ratio of medians and ratio of mean indices are not geometric-mean ratios; no conversion.',
                        'n = 9; no dispersion or paired uncertainty admitted here.',
                        'Donor potato was instant potato; target preparation as reported in the thesis.'])


if __name__ == '__main__':
    r = json.loads(json.dumps(run(), allow_nan=False)); p = ROOT / 'RESULTS.json'
    if '--check' in sys.argv:
        sys.path.insert(0, str(ROOT.parents[1]))
        from reproduce import same
        same(r, json.loads(p.read_text(encoding='utf-8')))
        print('PASS check')
        sys.exit()
    p.write_text(json.dumps(r, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    print({k: round(v, 4) for k, v in r['predictions_rice_over_potato'].items()})
    for k, v in r['panels'].items(): print(k, round(v['observed_rice_over_potato'], 4), v['best'], {m: round(e, 3) for m, e in v['abs_log_error'].items()})
