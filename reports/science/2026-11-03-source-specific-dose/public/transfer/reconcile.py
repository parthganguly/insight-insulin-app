"""Reconciliation on the Astra/Sol reconciled reading (../figure_facts). Standard library only.
Frozen PREDICTIONS.json and score.py are reused read-only; Opus SCORES_* files are not touched.

python -I -X utf8 reconcile.py           write target_data_reconciled.json, SCORES_reconciled.json, RECONCILE.json
python -I -X utf8 reconcile.py --check   recompute and compare all three
"""
from pathlib import Path
import csv, json, math, runpy, sys

ROOT = Path(__file__).resolve().parent
FF = ROOT.parent / 'figure_facts'
ARM = {'control': '1', 'wheat_low': '2', 'wheat_high': '3', 'blend_low': '4', 'blend_high': '5'}
S = runpy.run_path(str(ROOT / 'score.py'))
PX_HALF = 6  # reconciled pixel stress (figure_facts/pixel-bounds.csv)


def rows(name):
    with (FF / name).open(encoding='utf-8', newline='') as f: return list(csv.DictReader(f))


def target():
    course = rows('target-course.csv')
    times = sorted({int(r['minute']) for r in course})
    curves = {ARM[a]: [float(next(r for r in course if r['arm'] == a and int(r['minute']) == t)['plasma_insulin_pmol_per_L_approx'])
                       for t in times] for a in ARM}
    bars = [r for r in rows('bars.csv') if r['figure'] == 'target_fig3']
    span = float(bars[0]['y_span_px']); scale = float(bars[0]['scale'])
    return {'provenance': 'Astra/Sol reconciled reading of J Nutr 2000 Fig. 2/3 (figure_facts/*.csv); old independent readings preserved separately',
            'times_min': times, 'curves': curves, 'curve_reading_half_width': PX_HALF * 1000 / 733,
            'curve_reading_note': '+/-6 px on a 733 px per 1000 pmol/L axis',
            'published_auc': {'window': '0-180 (Fig. 3 bars, plotted group means; axis printed pmol L-1 3h)',
                              'values': {ARM[r['arm']]: float(r['plot_units']) for r in bars}, 'half_width': PX_HALF * scale / span},
            'source_statistics': {'text_3h_vs_control_percent': {'4': '52 +/- 10', '5': '107 +/- 17'}, 'text_5_vs_4_percent': '36 +/- 6',
                                  'fig3_letters': {'1': 'c', '2': 'c', '3': 'c', '4': 'b', '5': 'a'}, 'n': 8}}


def checks(tg, sc):
    out = {}
    W = {k: v for k, v in sc['windows'].items()}
    # 1. contrasts, ratio-of-ratios, difference-of-differences, level gain vs contrast gain
    for w, d in W.items():
        A = d['areas']; o = d['observed']
        out[w] = dict(C_low=o['C_low'], C_high=o['C_high'], ratio_of_ratios=o['Delta'],
                      difference_of_differences=(A['5'] - A['3']) - (A['4'] - A['2']),
                      blend_dose_gain=o['D_mix'], wheat_dose_gain=o['D_wheat'],
                      identity_Delta_equals_Dmix_over_Dwheat=math.isclose(o['Delta'], o['D_mix'] / o['D_wheat'], rel_tol=1e-12),
                      ratio_of_ratios_bounds=d['reading_bounds']['Delta'] if d['reading_bounds'] else None)
    # 2. Fig 3 plotted means vs text percentages (provenance only)
    v = tg['published_auc']['values']
    out['fig3_vs_text'] = dict(plotted_ratio_4=v['4'] / v['1'], plotted_ratio_5=v['5'] / v['1'], plotted_5_over_4=v['5'] / v['4'],
                               text_ratio_4=1.52, text_ratio_5=2.07, text_5_over_4=1.36,
                               note='Both from the same source window (entire 3 h, Fig. 3). Text percentages carry +/- SEM; the paper does not state how they were computed. No calculation is asserted.')
    # 3. Existing frozen leucine substitution slope under three dose conventions (post hoc, coefficient NOT from targets)
    beta, leu_wheat = 0.1022204575597254, 0.056
    leu = {'2': 28.6 * leu_wheat, '3': 57.1 * leu_wheat, '4': 14.3 * leu_wheat + 7.1, '5': 28.6 * leu_wheat + 14.2}  # g/L
    conv = {'per_bolus_70kg_0.245L': 0.245, 'per_50g_carbohydrate': 50 / 171.3, 'cumulative_6_bolus_to_150': 0.245 * 6,
            'cumulative_4_bolus_to_90': 0.245 * 4}
    o1 = W['W1_0_120_signed_group']['observed']
    slope = {}
    for c, f in conv.items():
        ql, qh = math.exp(beta * (leu['4'] - leu['2']) * f), math.exp(beta * (leu['5'] - leu['3']) * f)
        slope[c] = dict(C_low=ql, C_high=qh, ratio_of_ratios=qh / ql,
                        err_W1={'C_low': abs(math.log(ql / o1['C_low'])), 'C_high': abs(math.log(qh / o1['C_high'])),
                                'ratio_of_ratios': abs(math.log(qh / ql / o1['Delta']))})
    out['leucine_slope_conventions'] = dict(results=slope, tie_err_W1={'C_low': abs(math.log(o1['C_low'])), 'C_high': abs(math.log(o1['C_high'])),
                                                                       'ratio_of_ratios': abs(math.log(o1['Delta']))},
                                            structural='Log-linear slope with doubled leucine difference forces C_high = C_low^2, i.e. ratio_of_ratios = C_low',
                                            observed_ratio_of_ratios_over_C_low=o1['Delta'] / o1['C_low'],
                                            confounds='blend also adds Phe and halves wheat hydrolysate (free vs bound, AA profile); slope fit on Gunnerud half-replacements')
    # 4. Positive-120 bounds claim: tie-beating thresholds
    pos = {'low': (1.213, 1.768, slope['per_bolus_70kg_0.245L']['C_low']), 'high': (1.577, 2.244, slope['per_bolus_70kg_0.245L']['C_high'])}
    out['positive_bound_check'] = {k: dict(interval=[lo, hi], prediction=p, beats_tie_iff_true_ratio_above=math.sqrt(p),
                                           beats_tie_throughout=lo > math.sqrt(p)) for k, (lo, hi, p) in pos.items()}
    out['positive_bound_check']['quotient_interval'] = [0.892, 1.850]
    out['positive_bound_check']['change_in_contrast_certified'] = False
    out['M7'] = 'Literal Claessens model has no blend lookup (coverage absent); any transplanted beta would be a new, optional sensitivity, not run'
    return out


def build():
    tg = target()
    pred = json.loads((ROOT / 'PREDICTIONS.json').read_text(encoding='utf-8'))
    sc = json.loads(json.dumps(S['score'](pred, tg), allow_nan=False))
    return tg, sc, json.loads(json.dumps(checks(tg, sc), allow_nan=False))


def dump(n, x): (ROOT / n).write_text(json.dumps(x, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    tg, sc, ck = build()
    names = ['target_data_reconciled.json', 'SCORES_reconciled.json', 'RECONCILE.json']
    if '--check' in sys.argv:
        for n, x in zip(names, (tg, sc, ck)): assert S['same'](json.loads(json.dumps(x)), json.loads((ROOT / n).read_text(encoding='utf-8'))), n
        print('PASS check'); sys.exit()
    for n, x in zip(names, (tg, sc, ck)): dump(n, x)
    for w, d in sc['windows'].items():
        print('==', w, {q: round(v, 3) for q, v in d['observed'].items()})
        for k, s in d['scores'].items():
            if k.startswith(('primary', 'sensB')):
                print('  ', k.split(':')[1], 'lvl', round(s['mean_level_error'], 3), 'con', round(s['mean_contrast_error'], 3), s['sign_agreement'])
    print(json.dumps({k: v for k, v in ck.items() if k in ('fig3_vs_text', 'leucine_slope_conventions', 'positive_bound_check')}, indent=1))
    for w in sc['windows']: print(w, {k: (round(v, 4) if isinstance(v, float) else v) for k, v in ck[w].items()})
