"""Outcome-free discrimination analysis for a two-group (independent) ratio-of-means comparison. Standard library only.

For independent groups of size n with coefficient of variation CV of the insulin summary, the delta-method log SE of the
ratio of means is about sqrt(2/n)*CV. The PLAN's discrimination criterion requires 2*SE < separation between the two
hypotheses' log predictions. This script reports the n per group required for each pair of frozen rules over a CV grid.

python -I -X utf8 design_power.py           write DESIGN_POWER.json
python -I -X utf8 design_power.py --check
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent


def run():
    P = json.loads((ROOT / 'PREDICTIONS.json').read_text(encoding='utf-8'))['predicted_ratio_high_over_low']
    pairs = {'P2_fixed_vs_P3_quantitative': (P['P2_fixed_enrichment_multiplier'], P['P3_quantitative_slope']),
             'P3_quantitative_vs_P0_equal': (P['P3_quantitative_slope'], P['P0_equal_response']),
             'P2_fixed_vs_P0_equal': (P['P2_fixed_enrichment_multiplier'], P['P0_equal_response']),
             'P3s_soy_vs_P3w_whey_slope': (P['P3s_soy_slope'], P['P3w_whey_slope'])}
    out = {}
    for name, (a, b) in pairs.items():
        sep = abs(math.log(a) - math.log(b))
        out[name] = dict(log_separation=sep, n_per_group_required={f'CV_{cv}': math.ceil(2 * (2 * cv / sep) ** 2) for cv in (0.2, 0.3, 0.4, 0.5, 0.6, 0.8)},
                         log_se_at_n8={f'CV_{cv}': math.sqrt(2 / 8) * cv for cv in (0.2, 0.3, 0.4, 0.5, 0.6, 0.8)})
    return dict(criterion='2*SE(ln ratio) < |ln pred_a - ln pred_b|, SE = sqrt(2/n)*CV (independent groups, equal n and CV)',
                note='Outcome-free; any additional between-person baseline difference or a near-zero protein-only insulin increment inflates CV further',
                pairs=out,
                identification='Two leucine levels per age: any one-parameter rule (free multiplier or free slope) can be tuned to fit each age exactly; only pre-existing coefficients are scored, so the test can rank P2 vs P3 but cannot show that a quantitative dose law is required.')


if __name__ == '__main__':
    r = json.loads(json.dumps(run(), allow_nan=False))
    p = ROOT / 'DESIGN_POWER.json'
    if '--check' in sys.argv:
        assert r == json.loads(p.read_text(encoding='utf-8')); print('PASS check'); sys.exit()
    p.write_text(json.dumps(r, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    for k, v in r['pairs'].items(): print(k, round(v['log_separation'], 4), v['n_per_group_required'])
