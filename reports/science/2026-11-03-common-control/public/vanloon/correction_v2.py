"""Correction v2 analyses on frozen PREDICTIONS.json + admitted outcomes.json (unchanged). No fitting.

python -I -X utf8 correction_v2.py           write CORRECTION_v2.json
python -I -X utf8 correction_v2.py --check   recompute and compare
"""
from pathlib import Path
import json, math, sys

ROOT = Path(__file__).resolve().parent
D = [str(i) for i in range(2, 11)]
LAN_MAX = 30.0
GRID = 4001  # control-reading grid for shared-reading ranges (plus exact kink points)


def load(n): return json.loads((ROOT / n).read_text(encoding='utf-8'))


def convex_interval_test(R, h):
    lo_par, hi_par = min(R['3'], R['7']) - h, max(R['3'], R['7']) + h
    lo10, hi10 = R['10'] - h, R['10'] + h
    return dict(parent_interval_with_reading_bounds=[lo_par, hi_par], drink10_reading_interval=[lo10, hi10],
                central_drink10_below_both_parents=R['10'] < min(R['3'], R['7']),
                below_entire_parent_interval_for_all_readings=hi10 < lo_par,
                above_entire_parent_interval_for_all_readings=lo10 > hi_par,
                note='Graph-reading box only; not a sampling/confidence result. A 50:50 combination of measured full-dose '
                     'responses assumes linear mixing; no half-dose human arms exist. Nominal recipe: wheat 28.6 vs 57.1/2 = 28.55 g/L.')


def term_range(pa, pb, r1, lo, hi):
    """min/max over Rd in [lo,hi] of |ln pa - ln(Rd/r1)| - |ln pb - ln(Rd/r1)| (kinks at Rd = pa*r1, pb*r1)."""
    pts = [lo, hi] + [p * r1 for p in (pa, pb) if lo < p * r1 < hi]
    v = [abs(math.log(pa) - math.log(x / r1)) - abs(math.log(pb) - math.log(x / r1)) for x in pts]
    return min(v), max(v)


def shared_reading_range(pa, pb, R, h, drinks):
    """Range of mean_d[err_a - err_b] when ALL drinks (incl. control) take the SAME admissible readings."""
    r1s = [R['1'] - h + 2 * h * i / (GRID - 1) for i in range(GRID)]
    for d in drinks:  # exact kink locations in the control reading
        for p in (pa[d], pb[d]):
            for x in (R[d] - h, R[d] + h):
                if R['1'] - h < x / p < R['1'] + h: r1s.append(x / p)
    lo = hi = None
    for r1 in r1s:
        mn = sum(term_range(pa[d], pb[d], r1, R[d] - h, R[d] + h)[0] for d in drinks) / len(drinks)
        mx = sum(term_range(pa[d], pb[d], r1, R[d] - h, R[d] + h)[1] for d in drinks) / len(drinks)
        lo = mn if lo is None else min(lo, mn); hi = mx if hi is None else max(hi, mx)
    return [lo, hi]


def mean_err(p, R, drinks):
    return sum(abs(math.log(p[d] / (R[d] / R['1']))) for d in drinks) / len(drinks)


def run():
    pred, obs = load('PREDICTIONS.json'), load('outcomes.json')['endpoints']
    out = dict(endpoints={})
    for ep, cell in obs.items():
        R, h = cell['means'], cell['reading_half_width']
        e = dict(convex_interval_test=convex_interval_test(R, h), comparisons={}, lan_domain_only={})
        for basis, f in pred['forecasts'].items():
            fc, grams = f['ratio_vs_drink1'], f['grams']
            leu = fc['lan_leucine_whey_eq']
            for ref in ['energy', 'lan_mass']:
                for scope, drinks in [('all_9', D), ('excluding_drink2', [d for d in D if d != '2'])]:
                    key = f'{basis}:leucine_capped_minus_{ref}:{scope}'
                    e['comparisons'][key] = dict(
                        central=mean_err(leu, R, drinks) - mean_err(fc[ref], R, drinks),
                        shared_reading_range=shared_reading_range(leu, fc[ref], R, h, drinks),
                        settled_by_reading_box=None)
                    rng = e['comparisons'][key]['shared_reading_range']
                    e['comparisons'][key]['settled_by_reading_box'] = rng[1] < 0 or rng[0] > 0
            dom = [d for d in D if grams[d]['leucine_whey_eq_g'] <= LAN_MAX]
            e['lan_domain_only'][basis] = dict(
                covered_drinks=dom, abstained=[d for d in D if d not in dom],
                mean_abs_log_error={r: mean_err(fc[r], R, dom) for r in ['no_change', 'energy', 'lan_mass', 'lan_leucine_whey_eq']},
                leucine_minus_energy_shared_reading_range=shared_reading_range(leu, fc['energy'], R, h, dom),
                note='Strict Lan support: leucine whey-equivalent <= 30 g; capped/linear-tail values for other drinks are sensitivities only')
        e['ties_up_to_rounding'] = {b: {r: [min(f['ratio_vs_drink1'][r][d] for d in D), max(f['ratio_vs_drink1'][r][d] for d in D)]
                                        for r in ['energy', 'lan_mass']} for b, f in pred['forecasts'].items()}
        out['endpoints'][ep] = e
    out['notes'] = {
        'lan_aa_sum': 'Hydrolysate sums omit Table 2 dashes (wheat Lys/Trp, pea Trp, wheat Trp): lower-bound input scenario, not a measured total.',
        'exposure': "Drinks 3 and 9 were named in the abstract; the other 7 are 'not named in the abstract'. All scoring is retrospective.",
        'units': 'Axis labels as printed: Fig.6 nmol*h/L, Fig.5 nmol*2 h/L. Magnitudes (control ~18 and ~33) match a ~0.3 nmol/L increment (Fig.4) '
                 'integrated over 60 and 120 MINUTES, not hours; possible label/scale ambiguity. No conversion applied; ratios unaffected.'}
    return out


def same(a, b):
    if isinstance(a, dict): return isinstance(b, dict) and a.keys() == b.keys() and all(same(v, b[k]) for k, v in a.items())
    if isinstance(a, list): return isinstance(b, list) and len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float): return math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-12)
    return a == b


if __name__ == '__main__':
    r = json.loads(json.dumps(run()))
    if '--check' in sys.argv:
        assert same(r, load('CORRECTION_v2.json')); print('PASS check'); sys.exit()
    (ROOT / 'CORRECTION_v2.json').write_text(json.dumps(r, indent=2) + '\n', encoding='utf-8', newline='\n')
    for ep, v in r['endpoints'].items():
        print('==', ep, json.dumps(v['convex_interval_test'])[:400])
        for k, c in v['comparisons'].items(): print('  ', k, round(c['central'], 4), [round(x, 4) for x in c['shared_reading_range']], c['settled_by_reading_box'])
        for b, x in v['lan_domain_only'].items(): print('  domain', b, x['covered_drinks'], {k: round(y, 4) for k, y in x['mean_abs_log_error'].items()}, [round(y, 4) for y in x['leucine_minus_energy_shared_reading_range']])
        print('  ties', v['ties_up_to_rounding'])
